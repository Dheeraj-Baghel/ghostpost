import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";

// Real temporary PostgreSQL executes the actual migrations, functions, and RLS.
// The only shim is Supabase's auth schema/roles and auth.uid() JWT accessor.
// This does NOT claim to test GoTrue, PostgREST, email, or a cloud Supabase project.
let server: EmbeddedPostgres;
let admin: Client;
let directory: string;
const port = 55439;
const ids = { a: randomUUID(), b: randomUUID(), admin: randomUUID(), outsider: randomUUID(), unconfirmed: randomUUID() };
const code = "test-invite-" + randomUUID();
let postId: string;
let pollPostId: string;
let pollId: string;
let optionId: string;
let commentId: string;
let reportId: string;

async function actor<T = Record<string, unknown>>(id: string | null, sql: string, params: unknown[] = [], role = "authenticated") {
  const client = new Client({ host: "127.0.0.1", port, user: "postgres", password: "local-test-only", database: "postgres" });
  await client.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role === "anon" ? "anon" : role === "service_role" ? "service_role" : "authenticated"}`);
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [id ?? ""]);
    const result = await client.query(sql, params);
    await client.query("commit");
    return result.rows as T[];
  } finally { await client.end(); }
}
async function rpc<T = unknown>(id: string | null, name: string, params: unknown[] = []) {
  assert.match(name, /^[a-z_]+$/);
  const placeholders = params.map((_, i) => `$${i + 1}`).join(",");
  return (await actor<{ result: T }>(id, `select public.${name}(${placeholders}) as result`, params))[0].result;
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "ghostpost-db-"));
  server = new EmbeddedPostgres({ databaseDir: join(directory, "data"), user: "postgres", password: "local-test-only", port, persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"], onLog: () => {}, onError: () => {} });
  await server.initialise(); await server.start();
  admin = new Client({ host: "127.0.0.1", port, user: "postgres", password: "local-test-only", database: "postgres" });
  await admin.connect();
  await admin.query(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    create schema auth;
    create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  // Historical single-community contracts. rooms.test.ts tests ALL migrations,
  // legacy data conversion and the retired RPC denial on the current schema.
  for (const file of (await readdir("supabase/migrations")).filter(f => /^20261015000[123]_.*\.sql$/.test(f)).sort()) {
    await admin.query(await readFile(join("supabase/migrations", file), "utf8"));
  }
  for (const [name, id] of Object.entries(ids)) {
    await admin.query("insert into auth.users(id,email,email_confirmed_at) values ($1,$2,$3)", [id, `${name}@example.invalid`, name === "unconfirmed" ? null : new Date()]);
  }
  await actor(null, "select public.operator_create_invite($1,$2,$3,$4)", [createHash("sha256").update(code).digest("hex"), "Policy test", 20, new Date(Date.now() + 3600000)], "service_role");
}, { timeout: 120000 });

after(async () => { await admin?.end(); await server?.stop(); if (directory) await rm(directory, { recursive: true, force: true }); });

test("all nine tables enable RLS; no ordinary direct writes or private mapping reads", async () => {
  const tables = await admin.query("select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('private','public') and c.relkind='r'");
  assert.equal(tables.rows.length, 9); // profiles, invitations + seven content/interaction tables
  assert.ok(tables.rows.every(t => t.relrowsecurity));
  await assert.rejects(actor(ids.a, "select * from private.profiles"), /permission denied/);
  await assert.rejects(actor(ids.a, "select * from private.invitations"), /permission denied/);
  await assert.rejects(actor(ids.a, "update private.profiles set is_admin=true"), /permission denied/);
  await assert.rejects(actor(ids.a, "insert into public.posts(author_alias,content,category) values ('spoof','x','General')"), /permission denied/);
});

test("anonymous and authenticated nonmembers cannot read or write office data", async () => {
  await assert.rejects(actor(null, "select * from public.posts", [], "anon"), /permission denied/);
  await assert.rejects(actor(null, "select public.get_feed()", [], "anon"), /permission denied/);
  assert.deepEqual(await actor(ids.outsider, "select * from public.posts"), []);
  await assert.rejects(rpc(ids.outsider, "get_feed"), /Join the office/);
  await assert.rejects(rpc(ids.outsider, "create_post", ["hi", "General"]), /Join the office/);
});

test("join validates invitations and confirmation; aliases are private, stable and server assigned", async () => {
  await assert.rejects(rpc(ids.a, "join_office", ["incorrect-invite-code"]), /invalid or expired/);
  await assert.rejects(rpc(ids.unconfirmed, "join_office", [code]), /Confirm your email/);
  const members = await Promise.all([ids.a, ids.b, ids.admin].map(id => rpc<{ alias: string; is_admin: boolean }>(id, "join_office", [code])));
  for (const m of members) { assert.match(m.alias, /^[a-z]+-[a-z]+-[a-f0-9]{8}$/); assert.equal(m.is_admin, false); assert.deepEqual(Object.keys(m).sort(), ["alias", "is_admin"]); }
  assert.equal(new Set(members.map(m => m.alias)).size, 3);
  assert.deepEqual(await rpc(ids.a, "join_office", [code]), members[0]);
  assert.equal((await admin.query("select uses from private.invitations")).rows[0].uses, 3);
  await assert.rejects(rpc(ids.a, "operator_set_admin", [ids.a, true]), /permission denied/);
  await actor(null, "select public.operator_set_admin($1,true)", [ids.admin], "service_role");
});

test("invitation capacity is atomic under concurrent joins; failed retries never consume capacity", async () => {
  const x = randomUUID(), y = randomUUID(), single = "single-" + randomUUID();
  await admin.query("insert into auth.users(id,email_confirmed_at) values ($1,now()),($2,now())", [x,y]);
  await actor(null, "select public.operator_create_invite($1,'Single',1,$2)", [createHash("sha256").update(single).digest("hex"), new Date(Date.now()+3600000)], "service_role");
  const result = await Promise.allSettled([rpc(x,"join_office",[single]),rpc(y,"join_office",[single])]);
  assert.equal(result.filter(r => r.status === "fulfilled").length, 1);
  assert.equal(result.filter(r => r.status === "rejected").length, 1);
});

test("posts persist and only the owner can edit/delete; server rejects invalid text and category", async () => {
  postId = await rpc<string>(ids.a, "create_post", ["Office test post", "Confession"]);
  await assert.rejects(rpc(ids.a, "create_post", [" ", "General"]));
  await assert.rejects(rpc(ids.a, "create_post", ["\n\t\r", "General"]));
  await assert.rejects(rpc(ids.a, "create_post", ["\u00a0\u2000", "General"]));
  await assert.rejects(rpc(ids.a, "create_post", ["x".repeat(1001), "General"]));
  await assert.rejects(rpc(ids.a, "create_post", ["hello", "Invalid"]));
  await assert.rejects(rpc(ids.b, "edit_post", [postId, "stolen", "General"]), /own posts/);
  await assert.rejects(rpc(ids.b, "delete_post", [postId]), /own posts/);
  await rpc(ids.a, "edit_post", [postId, "Edited confession", "Confession"]);
  const p = await rpc<{ content: string; is_owner: boolean }>(ids.b, "get_post", [postId]);
  assert.equal(p.content, "Edited confession"); assert.equal(p.is_owner, false);
  const serialized = JSON.stringify(p);
  for (const id of Object.values(ids)) assert.ok(!serialized.includes(id));
  assert.ok(!serialized.includes("@example.invalid"));
});

test("reactions are unique under concurrent writes, changeable, removable and private", async () => {
  await Promise.all(["like", "laugh", "fire"].map(kind => rpc(ids.b,"set_reaction",[postId,kind])));
  assert.equal((await admin.query("select count(*)::int as n from public.reactions where post_id=$1",[postId])).rows[0].n,1);
  assert.deepEqual(await actor(ids.a,"select * from public.reactions"),[]);
  await rpc(ids.b,"set_reaction",[postId,"shocked"]);
  const p = await rpc<{ my_reaction: string; reactions: { shocked: number } }>(ids.b,"get_post",[postId]);
  assert.equal(p.my_reaction,"shocked"); assert.equal(p.reactions.shocked,1);
  await rpc(ids.b,"set_reaction",[postId,null]);
  assert.equal((await actor(ids.b,"select * from public.reactions")).length,0);
});

test("comments validate content, enforce ownership and update counts", async () => {
  commentId = await rpc<string>(ids.b,"add_comment",[postId,"A real reply"]);
  await assert.rejects(rpc(ids.b,"add_comment",[postId,"x".repeat(501)]));
  await assert.rejects(rpc(ids.b,"add_comment",[postId,"\n\t"]));
  await assert.rejects(rpc(ids.a,"edit_comment",[commentId,"not yours"]),/own comments/);
  await assert.rejects(rpc(ids.a,"delete_comment",[commentId]),/own comments/);
  await rpc(ids.b,"edit_comment",[commentId,"Updated reply"]);
  const p = await rpc<{comment_count: number}>(ids.a,"get_post",[postId]);
  assert.equal(p.comment_count,1);
});

test("poll creation is atomic; results are hidden before voting and votes are unique", async () => {
  await assert.rejects(rpc(ids.a,"create_post",["Invalid poll","Question",["one"]]));
  await assert.rejects(rpc(ids.a,"create_post",["Invalid poll","Question",["same","SAME"]]));
  await assert.rejects(rpc(ids.a,"create_post",["Invalid poll","Question",["yes","\n\t"]]));
  pollPostId = await rpc<string>(ids.a,"create_post",["Tea or coffee?","Question",["Tea","Coffee"]]);
  const p = await rpc<{ poll: { id: string; options: { id: string; votes: number | null }[]; total_votes: number | null } }>(ids.a,"get_post",[pollPostId]);
  pollId = p.poll.id; optionId = p.poll.options[0].id;
  assert.equal(p.poll.total_votes,null); assert.equal(p.poll.options[0].votes,null);
  const results = await Promise.allSettled([rpc(ids.b,"vote_poll",[pollId,optionId]),rpc(ids.b,"vote_poll",[pollId,p.poll.options[1].id])]);
  assert.equal(results.filter(r => r.status === "fulfilled").length,1);
  const voted = await rpc<typeof p>(ids.b,"get_post",[pollPostId]);
  assert.equal(voted.poll.total_votes,1);
  assert.deepEqual(await actor(ids.a,"select * from public.poll_votes"),[]);
  await assert.rejects(rpc(ids.a,"edit_post",[pollPostId,"Changed question","Question"]),/cannot change/);
  await rpc(ids.a,"edit_post",[pollPostId,"Tea or coffee?","General"]);
});

test("cross-poll options and direct poll definition changes are rejected", async () => {
  const other = await rpc<string>(ids.a,"create_post",["Another poll","Question",["Yes","No"]]);
  const p = await rpc<{poll:{id:string;options:{id:string}[]}}>(ids.a,"get_post",[other]);
  await assert.rejects(rpc(ids.a,"vote_poll",[pollId,p.poll.options[0].id]),/foreign key/);
  await assert.rejects(actor(ids.a,"update public.poll_options set label='spoof'"),/permission denied/);
});

test("reports are one per member/post and are private; moderation is admin-only", async () => {
  await rpc(ids.b,"report_post",[postId,"Spam"]);
  await assert.rejects(rpc(ids.b,"report_post",[postId,"Other"]),/already reported/);
  assert.deepEqual(await actor(ids.b,"select id,post_id,reason from public.reports"),[]);
  await assert.rejects(actor(ids.admin,"select reporter_id from public.reports"),/permission denied/);
  await assert.rejects(rpc(ids.b,"get_reports"),/Administrator/);
  const reports = await rpc<{items:{id:string}[]}>(ids.admin,"get_reports");
  reportId = reports.items[0].id;
  assert.ok(!JSON.stringify(reports).includes(ids.b));
  await assert.rejects(rpc(ids.b,"moderate_report",[reportId,"remove"]),/Administrator/);
  await rpc(ids.admin,"moderate_report",[reportId,"dismiss"]);
  assert.equal((await rpc<{items:unknown[]}>(ids.admin,"get_reports")).items.length,0);
  assert.ok(await rpc(ids.a,"get_post",[postId]));
});

test("admin removal and author deletion cascade without leaving accessible child data", async () => {
  await rpc(ids.a,"report_post",[postId,"Other"]);
  const reports = await rpc<{items:{id:string}[]}>(ids.admin,"get_reports");
  await rpc(ids.admin,"moderate_report",[reports.items[0].id,"remove"]);
  assert.equal(await rpc(ids.a,"get_post",[postId]),null);
  assert.equal((await rpc<{items:unknown[]}>(ids.a,"get_comments",[postId])).items.length,0);
  await rpc(ids.a,"delete_post",[pollPostId]);
  assert.equal((await actor(ids.b,"select * from public.poll_votes where poll_id=$1",[pollId])).length,0);
});

test("feed pagination, filters and trending are bounded and deterministic", async () => {
  for (let i=0;i<23;i++) await rpc(ids.a,"create_post",[`Pagination ${i}`,"Funny"]);
  const first = await rpc<{items:{id:string;category:string}[];has_more:boolean}>(ids.b,"get_feed",["latest","Funny",0]);
  const next = await rpc<typeof first>(ids.b,"get_feed",["latest","Funny",1]);
  assert.equal(first.items.length,20); assert.equal(first.has_more,true); assert.equal(next.items.length,3);
  assert.ok(first.items.every(p=>p.category==="Funny"));
  assert.ok(!next.items.some(p=>first.items.some(q=>q.id===p.id)));
  await rpc(ids.b,"set_reaction",[next.items[0].id,"fire"]);
  await rpc(ids.b,"add_comment",[next.items[0].id,"Boost recent discussion"]);
  const trending = await rpc<typeof first>(ids.a,"get_feed",["trending","Funny",0]);
  assert.equal(trending.items[0].id,next.items[0].id);
  await assert.rejects(rpc(ids.a,"get_feed",["latest",null,-1]),/Invalid/);
});

test("invitation expiry, revocation, anonymous joining and capacity cannot be bypassed", async () => {
  for (const state of ["expired", "revoked", "exhausted"]) {
    const raw = `${state}-${randomUUID()}`;
    await admin.query("insert into private.invitations(code_hash,expires_at,max_uses,uses,revoked) values($1,$2,1,$3,$4)", [createHash("sha256").update(raw).digest("hex"), new Date(Date.now() + (state === "expired" ? -1000 : 3600000)), state === "exhausted" ? 1 : 0, state === "revoked"]);
    await assert.rejects(rpc(ids.outsider,"join_office",[raw]),/invalid or expired/);
  }
  await assert.rejects(actor(null,"select public.join_office($1)",[code],"anon"),/permission denied/);
  assert.equal(await rpc(ids.outsider,"my_membership"),null);
});

test("private helper execution, role escalation and author spoofing remain denied", async () => {
  await assert.rejects(actor(ids.a,"select private.post_payload($1)",[randomUUID()]),/permission denied/);
  await assert.rejects(actor(ids.a,"update public.posts set author_alias='spoof'"),/permission denied/);
  await assert.rejects(actor(ids.a,"delete from public.posts"),/permission denied/);
  await assert.rejects(actor(ids.a,"insert into public.poll_votes(poll_id,user_id,option_id) values($1,$2,$3)",[randomUUID(),ids.b,randomUUID()]),/permission denied/);
  const helpers = await admin.query("select proname,proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.prosecdef");
  assert.ok(helpers.rows.length > 0);
  assert.ok(helpers.rows.every(f => f.proconfig?.includes('search_path=""')));
});

test("concurrent vote then edit serializes and cannot change a voted-on question", async () => {
  const id = await rpc<string>(ids.a,"create_post",["Race-proof question?","Question",["Yes","No"]]);
  const p = await rpc<{poll:{id:string;options:{id:string}[]}}>(ids.a,"get_post",[id]);
  await admin.query("begin");
  await admin.query("select id from public.posts where id=$1 for update",[id]);
  const vote = rpc(ids.b,"vote_poll",[p.poll.id,p.poll.options[0].id]);
  // Wait for the actual blocked query, rather than a timing-only assumption.
  for (let i=0;i<100;i++) {
    const blocked=await admin.query("select count(*)::int as n from pg_stat_activity where query like 'select public.vote_poll%' and wait_event_type='Lock'");
    if(blocked.rows[0].n>0) break;
    await new Promise(resolve=>setTimeout(resolve,10));
  }
  const edit = rpc(ids.a,"edit_post",[id,"Changed during a vote","Question"]);
  const settled = Promise.allSettled([vote,edit]);
  await admin.query("commit");
  const result = await settled;
  assert.equal(result[0].status,"fulfilled");
  assert.equal(result[1].status,"rejected");
  assert.equal((await rpc<{content:string}>(ids.a,"get_post",[id])).content,"Race-proof question?");
});

// Targeted cap migration tests; all fixtures remain in this disposable database.
// Baseline members/posts from the existing regression suite are preserved.
async function withMembershipCount(total: number, run: (fixtureIds: string[]) => Promise<void>) {
  const baseline = Number((await admin.query("select count(*) as n from private.profiles")).rows[0].n);
  const fixtureIds: string[] = [];
  try {
    for (let i = baseline; i < total; i++) {
      const id = randomUUID(); fixtureIds.push(id);
      await admin.query("insert into auth.users(id,email_confirmed_at) values($1,now())",[id]);
      // Privileged fixture setup simulates pre-existing members; not an app API.
      await admin.query("insert into private.profiles(user_id,alias) values($1,$2)",[id,`fixture-ghost-${id.slice(0,8)}`]);
    }
    await run(fixtureIds);
  } finally { await admin.query("delete from auth.users where id = any($1::uuid[])",[fixtureIds]); }
}
async function capCandidate(created: string[], confirmed = true, metadata = {}) {
  const id = randomUUID(); created.push(id);
  await admin.query("insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",[id,`${id}@example.invalid`,confirmed?new Date():null,metadata]);
  return id;
}
async function capInvite() {
  const code = `cap-${randomUUID()}`;
  const rows = await actor<{id:string}>(null,"select public.operator_create_invite($1,'CAP TEST',100,$2) as id",[createHash("sha256").update(code).digest("hex"),new Date(Date.now()+3600000)],"service_role");
  return {code,id:rows[0].id};
}
async function inviteUses(id: string) { return (await admin.query("select uses from private.invitations where id=$1",[id])).rows[0].uses as number; }

test("member 25 joins; member 26 is rejected across invitations without consuming usage", async () => {
  await withMembershipCount(24,async created => {
    const a=await capCandidate(created), b=await capCandidate(created);
    const first=await capInvite(), second=await capInvite();
    const member=await rpc<{alias:string;is_admin:boolean}>(a,"join_office",[first.code]);
    assert.equal(member.is_admin,false); assert.equal(await inviteUses(first.id),1);
    assert.equal(Number((await admin.query("select count(*) as n from private.profiles")).rows[0].n),25);
    await assert.rejects(rpc(b,"join_office",[second.code]),/This office has reached its 25-member limit/);
    assert.equal(await inviteUses(second.id),0); assert.equal(await rpc(b,"my_membership"),null);
    // Full-office retries do not require another valid invite or regenerate aliases.
    assert.deepEqual(await rpc(a,"join_office",["invalid"]),member);
    assert.equal(await inviteUses(first.id),1);
    assert.ok((await rpc<{is_admin:boolean}>(ids.admin,"my_membership")).is_admin);
  });
});

test("concurrent last-place claims across different invitations admit exactly one member", async () => {
  await withMembershipCount(24,async created => {
    const candidates:string[]=[];
    for(let i=0;i<6;i++)candidates.push(await capCandidate(created));
    const invitations=await Promise.all(candidates.map(()=>capInvite()));
    const result=await Promise.allSettled(candidates.map((id,i)=>rpc(id,"join_office",[invitations[i].code])));
    assert.equal(result.filter(r=>r.status==="fulfilled").length,1);
    for(const r of result)if(r.status==="rejected")assert.match(String(r.reason),/25-member limit/);
    let uses=0;for(const invitation of invitations)uses+=await inviteUses(invitation.id);
    assert.equal(uses,1);
    assert.equal(Number((await admin.query("select count(*) as n from private.profiles")).rows[0].n),25);
    assert.equal((await admin.query("select count(*)::int as n from private.profiles where user_id=any($1::uuid[])",[candidates])).rows[0].n,1);
  });
});

test("same-account concurrent joining is idempotent even for the last place", async () => {
  await withMembershipCount(24,async created => {
    const id=await capCandidate(created), first=await capInvite(), second=await capInvite();
    const result=await Promise.all([rpc(id,"join_office",[first.code]),rpc(id,"join_office",[second.code])]);
    assert.deepEqual(result[0],result[1]);
    assert.equal(await inviteUses(first.id)+await inviteUses(second.id),1);
  });
});

test("invalid/expired/revoked/exhausted invites are still rejected at capacity", async () => {
  await withMembershipCount(25,async created => {
    const id=await capCandidate(created);
    await assert.rejects(rpc(id,"join_office",["incorrect-office-invitation"]),/invalid or expired/);
    for(const kind of ["expired","revoked","exhausted"]){
      const invite=await capInvite();
      if(kind==="expired")await admin.query("update private.invitations set expires_at=now()-interval '1 hour' where id=$1",[invite.id]);
      if(kind==="revoked")await admin.query("update private.invitations set revoked=true where id=$1",[invite.id]);
      if(kind==="exhausted")await admin.query("update private.invitations set uses=max_uses where id=$1",[invite.id]);
      const before=await inviteUses(invite.id);
      await assert.rejects(rpc(id,"join_office",[invite.code]),/invalid or expired/);
      assert.equal(await inviteUses(invite.id),before);
    }
  });
});

test("Auth-account count is not membership count; client metadata cannot verify email or confer roles", async () => {
  const created:string[]=[];
  try {
    for(let i=0;i<28;i++)await capCandidate(created);
    const unconfirmed=await capCandidate(created,false,{email_verified:true,provider:"google",role:"admin"});
    const invite=await capInvite();
    await assert.rejects(rpc(unconfirmed,"join_office",[invite.code]),/Confirm your email/);
    assert.equal(await inviteUses(invite.id),0);
    const verified=await capCandidate(created,true,{name:"Private Google Name",email:"private-google@example.invalid",avatar_url:"https://example.invalid/private-avatar",sub:"private-google-sub",role:"admin"});
    // Models the trusted email_confirmed_at written by Supabase OAuth. This is
    // an SQL privacy/confirmation contract test, NOT real Google OAuth evidence.
    const membership=await rpc<{alias:string;is_admin:boolean}>(verified,"join_office",[invite.code]);
    assert.match(membership.alias,/^[a-z]+-[a-z]+-[a-f0-9]{8}$/); assert.equal(membership.is_admin,false);
    const id=await rpc<string>(verified,"create_post",["Privacy fixture","General"]);
    const reply=await rpc<string>(verified,"add_comment",[id,"Private identity not used"]);
    assert.ok(reply);
    const payload=JSON.stringify([await rpc(ids.a,"get_post",[id]),await rpc(ids.a,"get_comments",[id]),await rpc(ids.a,"get_feed")]);
    for(const value of [verified,"Private Google Name","private-google@example.invalid","private-avatar","private-google-sub"])assert.ok(!payload.includes(value));
    await assert.rejects(actor(ids.a,"select * from private.profiles"),/permission denied/);
    assert.deepEqual(await rpc(verified,"my_membership"),membership);
  }finally{await admin.query("delete from auth.users where id=any($1::uuid[])",[created]);}
});

test("migration preserves an already-over-cap office, aliases, content, roles and existing logins", async () => {
  await withMembershipCount(26,async created => {
    const before=(await admin.query("select user_id,alias,is_admin,joined_at from private.profiles order by user_id")).rows;
    const posts=(await admin.query("select id,content from public.posts order by id")).rows;
    // Reapply CREATE OR REPLACE to simulate applying to an existing >25 office.
    await admin.query(await readFile("supabase/migrations/202610150003_member_limit.sql","utf8"));
    assert.deepEqual((await admin.query("select user_id,alias,is_admin,joined_at from private.profiles order by user_id")).rows,before);
    assert.deepEqual((await admin.query("select id,content from public.posts order by id")).rows,posts);
    const existing=await rpc(ids.a,"my_membership");
    assert.deepEqual(await rpc(ids.a,"join_office",[null]),existing);
    assert.ok(await rpc(ids.a,"get_feed"));
    const id=await capCandidate(created), invite=await capInvite();
    await assert.rejects(rpc(id,"join_office",[invite.code]),/25-member limit/);
    assert.equal(await inviteUses(invite.id),0);
  });
});

test("snapshot-isolated new admission is rejected rather than risking stale capacity counts", async () => {
  const created:string[]=[]; const client=new Client({host:"127.0.0.1",port,user:"postgres",password:"local-test-only",database:"postgres"});
  try {
    const id=await capCandidate(created),invite=await capInvite();
    await client.connect();await client.query("begin isolation level repeatable read");await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
    await assert.rejects(client.query("select public.join_office($1)",[invite.code]),/fresh transaction/);
    await client.query("rollback");assert.equal(await inviteUses(invite.id),0);
  }finally{await client.end();await admin.query("delete from auth.users where id=any($1::uuid[])",[created]);}
});
