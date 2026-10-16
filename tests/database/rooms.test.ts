import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import EmbeddedPostgres from "embedded-postgres";
import { Client } from "pg";
import type { Member, Post, Page } from "../../src/lib/types";

// Actual PostgreSQL, all migrations, roles/RLS and concurrent independent sessions.
// No hosted credentials, real users, GoTrue or outbound mail are involved.
const port = 55440;
const config = { host: "127.0.0.1", port, user: "postgres", password: "local-test-only", database: "postgres" };
let server: EmbeddedPostgres, admin: Client, directory: string;
const legacy = randomUUID(), a = randomUUID(), b = randomUUID(), outsider = randomUUID();
const legacyRoom = "00000000-0000-4000-8000-000000000001";
let legacyPost: string, legacyAlias: string, roomA: string, roomB: string, keyA: string, keyB: string;
async function actor<T = Record<string, unknown>>(user: string | null, sql: string, params: unknown[] = [], role = "authenticated") {
  const c = new Client(config); await c.connect();
  try {
    await c.query("begin"); await c.query(`set local role ${role === "anon" ? "anon" : "authenticated"}`);
    await c.query("select set_config('request.jwt.claim.sub',$1,true)", [user ?? ""]);
    const result = await c.query(sql, params); await c.query("commit"); return result.rows as T[];
  } finally { await c.end(); }
}
async function rpc<T = unknown>(user: string | null, name: string, params: unknown[] = []) {
  assert.match(name, /^[a-z_]+$/);
  return (await actor<{ result: T }>(user, `select public.${name}(${params.map((_, i) => `$${i + 1}`).join(",")}) result`, params))[0].result;
}
async function account(confirmed = true) {
  const id = randomUUID(); await admin.query("insert into auth.users(id,email_confirmed_at) values($1,$2)", [id, confirmed ? new Date() : null]); return id;
}
async function key(user: string, room: string, action = "generate") {
  return (await rpc<{ code: string }>(user, "room_key_manage", [room, action, "Private invite", 30])).code;
}
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "ghostpost-rooms-"));
  server = new EmbeddedPostgres({ databaseDir: join(directory, "data"), user: "postgres", password: "local-test-only", port, persistent: false, initdbFlags: ["--encoding=UTF8", "--locale=C"], onLog: () => {}, onError: () => {} });
  await server.initialise(); await server.start(); admin = new Client(config); await admin.connect();
  await admin.query(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon,authenticated,service_role;
    create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  const files = (await readdir("supabase/migrations")).filter(f => f.endsWith(".sql")).sort();
  for (const file of files.slice(0, 3)) await admin.query(await readFile(join("supabase/migrations", file), "utf8"));
  await admin.query("insert into auth.users(id,email_confirmed_at) values($1,now()),($2,now()),($3,now()),($4,now())", [legacy,a,b,outsider]);
  const oldCode = "legacy-" + randomUUID();
  await admin.query("select public.operator_create_invite($1,'Legacy',25,now()+interval '1 day')", [createHash("sha256").update(oldCode).digest("hex")]);
  legacyAlias = (await rpc<{ alias: string }>(legacy,"join_office",[oldCode])).alias;
  await admin.query("select public.operator_set_admin($1,true)",[legacy]);
  legacyPost = await rpc<string>(legacy,"create_post",["Preserve me","General"]);
  for (const file of files.slice(3)) await admin.query(await readFile(join("supabase/migrations",file),"utf8"));
}, { timeout: 120000 });
after(async () => { await admin?.end(); await server?.stop(); if (directory) await rm(directory,{ recursive: true,force: true }); });

test("migration preserves original content, aliases, roles and invitation accounting", async () => {
  const rooms = await rpc<Member[]>(legacy,"my_rooms");
  assert.equal(rooms.length,1); assert.equal(rooms[0].room_id,legacyRoom); assert.equal(rooms[0].alias,legacyAlias); assert.equal(rooms[0].is_admin,true);
  assert.equal((await rpc<Post>(legacy,"room_post",[legacyRoom,legacyPost])).content,"Preserve me");
  assert.equal((await admin.query("select uses from private.invitations where room_id=$1",[legacyRoom])).rows[0].uses,1);
});
test("all current tables have RLS and retired global RPCs cannot bypass rooms", async () => {
  const tables = (await admin.query("select c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('private','public') and c.relkind='r'")).rows;
  assert.equal(tables.length,11); assert.ok(tables.every(t=>t.relrowsecurity));
  for (const table of ["rooms","room_memberships","profiles","invitations"]) await assert.rejects(actor(a,`select * from private.${table}`),/permission denied/);
  for (const name of ["get_feed","my_membership","get_reports"]) await assert.rejects(rpc(legacy,name),/permission denied/);
  await assert.rejects(rpc(legacy,"join_office",["anything"]),/permission denied/);
  await assert.rejects(rpc(legacy,"create_post",["bypass","General"]),/permission denied/);
  await assert.rejects(rpc(legacy,"operator_set_admin",[a,true]),/permission denied/);
  await assert.rejects(actor(null,"select public.my_rooms()",[],"anon"),/permission denied/);
  await assert.rejects(actor(a,"select private.room_payload($1)",[legacyPost]),/permission denied/);
  assert.deepEqual(await actor(a,"select * from public.posts"),[]);
});
test("create and join use verified auth, per-room aliases, private keys and creator-only moderation",async()=>{
  await assert.rejects(rpc(await account(false),"room_create",["Not confirmed"]),/Confirm your email/);
  roomA=await rpc<string>(a,"room_create",["Friends"]); roomB=await rpc<string>(b,"room_create",["Hobbies"]);
  keyA=await key(a,roomA); keyB=await key(b,roomB); assert.match(keyA,/^[a-f0-9]{32}$/);
  await rpc(b,"room_join",[keyA]); await rpc(a,"room_join",[keyB]);
  const rooms=await rpc<Member[]>(a,"my_rooms"); assert.equal(rooms.length,2); assert.notEqual(rooms[0].alias,rooms[1].alias);
  assert.ok(rooms.find(r=>r.room_id===roomA)?.is_admin); assert.equal(rooms.find(r=>r.room_id===roomB)?.is_admin,false);
  assert.ok(!JSON.stringify(rooms).includes(a));
  const stored=(await admin.query("select code_hash from private.invitations where room_id=$1",[roomA])).rows[0].code_hash;
  assert.equal(stored,createHash("sha256").update(keyA).digest("hex"));
  await assert.rejects(rpc(b,"room_key",[roomA]),/moderator/);
  await assert.rejects(key(b,roomA),/moderator/);
  await assert.rejects(rpc(legacy,"room_key",[roomA]),/Join this room/);
  await assert.rejects(rpc(await account(false),"room_join",[keyA]),/Confirm your email/);
});
test("every read, direct RLS, interaction and moderation is room scoped",async()=>{
  const post=await rpc<string>(a,"room_create_post",[roomA,"A secret","General",["Yes","No"]]);
  const p=await rpc<Post>(a,"room_post",[roomA,post]); const q=p.poll!;
  const comment=await rpc<string>(b,"room_add_comment",[roomA,post,"Reply"]);
  await rpc(b,"room_report_post",[roomA,post,"Other"]);
  const report=(await admin.query("select id from public.reports where post_id=$1",[post])).rows[0].id;
  assert.equal(await rpc(a,"room_post",[roomB,post]),null);
  const denied: [string, unknown[]][] = [
    ["room_edit_post",[roomB,post,"hack","General"]],["room_delete_post",[roomB,post]],
    ["room_add_comment",[roomB,post,"hack"]],["room_edit_comment",[roomB,comment,"hack"]],["room_delete_comment",[roomB,comment]],
    ["room_set_reaction",[roomB,post,"fire"]],["room_vote_poll",[roomB,q.id,q.options[0].id]],
    ["room_report_post",[roomB,post,"Other"]],["room_comments",[roomB,post]],
    ["room_moderate_report",[roomB,report,"remove"]],
  ];
  for(const [name,args] of denied) await assert.rejects(rpc(b,name,args));
  for(const name of ["room_feed","room_reports"]) await assert.rejects(rpc(outsider,name,[roomA]));
  await assert.rejects(rpc(outsider,"room_post",[roomA,post]));
  await assert.rejects(rpc(b,"room_reports",[roomA]),/moderator/);
  for(const table of ["posts","comments","polls","poll_options","reactions","poll_votes"]) assert.deepEqual(await actor(outsider,`select * from public.${table}`),[]);
  assert.deepEqual(await actor(b,"select id from public.reports"),[]);
  await assert.rejects(actor(a,"select reporter_id from public.reports"),/permission denied/);
  await assert.rejects(actor(a,"update public.posts set content='bypass'"),/permission denied/);
  const feed=await rpc<Page<Post>>(a,"room_feed",[roomB]); assert.equal(feed.items.length,0);
  assert.ok(!JSON.stringify(await rpc(a,"room_reports",[roomA])).includes(b));
});
test("posts/comments ownership, poll locks/uniqueness, reactions and moderation still work",async()=>{
  const post=await rpc<string>(a,"room_create_post",[roomA,"Poll","Question",["One","Two"]]);
  const p=await rpc<Post>(a,"room_post",[roomA,post]); const q=p.poll!;
  assert.equal(q.total_votes,null); assert.ok(q.options.every(o=>o.votes===null));
  await assert.rejects(rpc(b,"room_edit_post",[roomA,post,"bad","General"]),/own posts/);
  await assert.rejects(rpc(b,"room_delete_post",[roomA,post]),/own posts/);
  await rpc(a,"room_edit_post",[roomA,post,"Updated poll","Question"]);
  await rpc(b,"room_vote_poll",[roomA,q.id,q.options[0].id]);
  await assert.rejects(rpc(b,"room_vote_poll",[roomA,q.id,q.options[1].id]),/already voted/);
  await assert.rejects(rpc(a,"room_edit_post",[roomA,post,"Changed","Question"]),/cannot change/);
  await rpc(b,"room_set_reaction",[roomA,post,"like"]); await rpc(b,"room_set_reaction",[roomA,post,"fire"]);
  let next=await rpc<Post>(b,"room_post",[roomA,post]); assert.equal(next.reactions.fire,1); assert.equal(next.reactions.like,0); assert.equal(next.poll?.total_votes,1);
  await rpc(b,"room_set_reaction",[roomA,post,null]);
  const c=await rpc<string>(b,"room_add_comment",[roomA,post,"Hello"]);
  await assert.rejects(rpc(a,"room_edit_comment",[roomA,c,"no"]),/own comments/);
  await assert.rejects(rpc(a,"room_delete_comment",[roomA,c]),/own comments/);
  await rpc(b,"room_edit_comment",[roomA,c,"Edited"]); await rpc(b,"room_delete_comment",[roomA,c]);
  next=await rpc<Post>(a,"room_post",[roomA,post]); assert.equal(next.comment_count,0); assert.equal(next.is_owner,true);
  await rpc(b,"room_report_post",[roomA,post,"Spam"]); await assert.rejects(rpc(b,"room_report_post",[roomA,post,"Other"]),/already reported/);
  const r=(await admin.query("select id from public.reports where post_id=$1",[post])).rows[0].id;
  await rpc(a,"room_moderate_report",[roomA,r,"remove"]); assert.equal(await rpc(a,"room_post",[roomA,post]),null);
  assert.equal((await admin.query("select count(*)::int n from public.poll_votes where poll_id=$1",[q.id])).rows[0].n,0);
});
test("key editing, renewal, rotation and deletion only affect future admission",async()=>{
  await rpc(a,"room_key_manage",[roomA,"update","Weekend friends",7]);
  assert.equal((await rpc<{label:string}>(a,"room_key",[roomA])).label,"Weekend friends");
  await admin.query("update private.invitations set expires_at=now()-interval '1 day' where room_id=$1 and not revoked",[roomA]);
  await assert.rejects(rpc(outsider,"room_join",[keyA]),/invalid or expired/);
  await rpc(a,"room_key_manage",[roomA,"renew","Weekend friends",30]);
  await rpc(outsider,"room_join",[keyA]);
  const old=keyA; keyA=await key(a,roomA,"rotate"); await assert.rejects(rpc(outsider,"room_join",[old]),/invalid or expired/);
  await rpc(a,"room_key_manage",[roomA,"revoke","Weekend friends",30]);
  await assert.rejects(rpc(outsider,"room_join",[keyA]),/invalid or expired/);
  assert.ok((await rpc<Member[]>(outsider,"my_rooms")).some(r=>r.room_id===roomA));
  await assert.rejects(rpc(a,"room_key_manage",[roomA,"renew","Weekend friends",30]),/Generate a new key/);
  keyA=await key(a,roomA);
});
test("leaving frees a slot, removes access immediately, preserves posts and rejoin alias",async()=>{
  const before=(await rpc<Member[]>(outsider,"my_rooms"))[0];
  const post=await rpc<string>(outsider,"room_create_post",[roomA,"Keep this","General"]);
  await rpc(outsider,"room_leave",[roomA]);
  await assert.rejects(rpc(outsider,"room_feed",[roomA]),/Join this room/);
  await assert.rejects(rpc(outsider,"room_edit_post",[roomA,post,"no","General"]),/Join this room/);
  assert.equal((await rpc<Post>(a,"room_post",[roomA,post])).content,"Keep this");
  await rpc(outsider,"room_join",[keyA]); assert.equal((await rpc<Member[]>(outsider,"my_rooms"))[0].alias,before.alias);
  await assert.rejects(rpc(a,"room_leave",[roomA]),/moderator cannot leave/);
});
test("six-room cap includes created rooms and concurrent create/join attempts",async()=>{
  const u=await account(); for(let i=0;i<5;i++) await rpc(u,"room_create",[`Room ${i}`]);
  const results=await Promise.allSettled([rpc(u,"room_create",["Sixth"]),rpc(u,"room_join",[keyA]),rpc(u,"room_join",[keyB])]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal((await rpc<Member[]>(u,"my_rooms")).length,6);
  await assert.rejects(rpc(u,"room_create",["Seventh"]),/at most 6/);
  const keys=(await admin.query("select id,uses from private.invitations order by id")).rows;
  if ((await rpc<Member[]>(u,"my_rooms")).some(r=>r.room_id===roomB)) assert.equal(await rpc(u,"room_join",[keyB]),roomB);
  else await assert.rejects(rpc(u,"room_join",[keyB]),/at most 6/);
  assert.deepEqual((await admin.query("select id,uses from private.invitations order by id")).rows,keys);
});
test("25-member room cap is atomic across keys, idempotent and rollback-safe",async()=>{
  const owner=await account(); const room=await rpc<string>(owner,"room_create",["Capacity"]); const first=await key(owner,room);
  const second="legacy-extra-"+randomUUID();
  await admin.query("insert into private.invitations(room_id,code_hash,label,max_uses,expires_at) values($1,$2,'Second legacy invite',100,now()+interval '1 day')",[room,createHash('sha256').update(second).digest('hex')]);
  // 24 members including the owner; contend for the last slot on distinct keys.
  for(let i=0;i<23;i++) await rpc(await account(),"room_join",[first]);
  const x=await account(), y=await account();
  const results=await Promise.allSettled([rpc(x,"room_join",[first]),rpc(y,"room_join",[second])]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal((await admin.query("select count(*)::int n from private.room_memberships where room_id=$1 and active",[room])).rows[0].n,25);
  const counts=(await admin.query("select sum(uses)::int n from private.invitations where room_id=$1",[room])).rows[0].n; assert.equal(counts,24);
  const winner=results[0].status==='fulfilled'?x:y; const winnerKey=results[0].status==='fulfilled'?first:second;
  assert.equal(await rpc(winner,"room_join",[winnerKey]),room);
  await assert.rejects(rpc(await account(),"room_join",[first]),/25-member/);
  assert.equal((await admin.query("select sum(uses)::int n from private.invitations where room_id=$1",[room])).rows[0].n,counts);
});
test("bounded Latest/Trending and category pagination never mix rooms",async()=>{
  const u=await account(); const room=await rpc<string>(u,"room_create",["Pagination"]);
  for(let i=0;i<23;i++) await rpc(u,"room_create_post",[room,`Entry ${i}`,"Funny"]);
  for(const sort of ["latest","trending"]) {
    const first=await rpc<Page<Post>>(u,"room_feed",[room,sort,"Funny",0]); const second=await rpc<Page<Post>>(u,"room_feed",[room,sort,"Funny",1]);
    assert.equal(first.items.length,20); assert.equal(first.has_more,true); assert.equal(second.items.length,3); assert.equal(second.has_more,false);
    assert.equal(new Set([...first.items,...second.items].map(p=>p.id)).size,23); assert.ok(first.items.every(p=>p.room_id===room));
  }
  await assert.rejects(rpc(u,"room_create_post",[room,"\n\t","General"]));
  await assert.rejects(rpc(u,"room_create_post",[room,"Bad poll","General",["Same","same"]]));
});

test("same-account joins are idempotent and unauthorized callers cannot use ANY key operation",async()=>{
  const u=await account();
  const before=(await admin.query("select uses from private.invitations where room_id=$1 and not revoked",[roomA])).rows[0].uses;
  const joined=await Promise.all([rpc(u,"room_join",[keyA]),rpc(u,"room_join",[keyA])]);
  assert.deepEqual(joined,[roomA,roomA]);
  assert.equal((await admin.query("select uses from private.invitations where room_id=$1 and not revoked",[roomA])).rows[0].uses,before+1);
  for(const action of ["generate","rotate","update","renew","revoke"]) await assert.rejects(rpc(u,"room_key_manage",[roomA,action,"Spoof",30]),/moderator/);
  assert.equal((await rpc<Member[]>(u,"my_rooms")).length,1);
});

test("exhausted keys fail atomically and forged metadata cannot confirm or elevate an account",async()=>{
  const u=await account(false);
  await admin.query("update auth.users set raw_user_meta_data=$2 where id=$1",[u,{email_verified:true,role:"admin",is_moderator:true}]);
  await assert.rejects(rpc(u,"room_join",[keyA]),/Confirm your email/);
  assert.equal((await admin.query("select count(*)::int n from private.profiles where user_id=$1",[u])).rows[0].n,0);
  const owner=await account();const room=await rpc<string>(owner,"room_create",["Exhausted key"]);const code=await key(owner,room);
  await admin.query("update private.invitations set max_uses=1,uses=1 where room_id=$1",[room]);
  const before=(await rpc<Member[]>(u,"my_rooms")).length;
  await assert.rejects(rpc(u,"room_join",[code]),/invalid or expired/);
  assert.equal((await rpc<Member[]>(u,"my_rooms")).length,before);
});

test("snapshot-isolated admission fails closed rather than over-admitting",async()=>{
  const u=await account();const client=new Client(config);await client.connect();
  try{
    await client.query("begin isolation level repeatable read;set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub',$1,true)",[u]);
    await assert.rejects(client.query("select public.room_join($1)",[keyA]),/fresh transaction/);
  }finally{await client.end();}
  assert.equal((await rpc<Member[]>(u,"my_rooms")).length,0);
});

test("room-scoped poll voting serializes with a concurrent question edit",async()=>{
  const post=await rpc<string>(a,"room_create_post",[roomA,"Concurrent poll","Question",["A","B"]]);
  const poll=(await rpc<Post>(a,"room_post",[roomA,post])).poll!;
  const client=new Client(config);await client.connect();
  try{
    await client.query("begin;set local role authenticated");await client.query("select set_config('request.jwt.claim.sub',$1,true)",[b]);
    await client.query("select public.room_vote_poll($1,$2,$3)",[roomA,poll.id,poll.options[0].id]);
    const edit=rpc(a,"room_edit_post",[roomA,post,"Should not change","Question"]);
    const denied=assert.rejects(edit,/cannot change/);
    await new Promise(r=>setTimeout(r,100));await client.query("commit");await denied;
    assert.equal((await rpc<Post>(a,"room_post",[roomA,post])).content,"Concurrent poll");
  }finally{await client.end();}
});

test("privileged account deletion retains original cascade semantics without bypassing room isolation",async()=>{
  const u=await account();await rpc(u,"room_join",[keyA]);
  const post=await rpc<string>(u,"room_create_post",[roomA,"Disposable author","General"]);
  await rpc(a,"room_add_comment",[roomA,post,"Disposable reply"]);
  await rpc(a,"room_set_reaction",[roomA,post,"like"]);
  await admin.query("delete from auth.users where id=$1",[u]);
  assert.equal(await rpc(a,"room_post",[roomA,post]),null);
  assert.equal((await admin.query("select count(*)::int n from public.comments where post_id=$1",[post])).rows[0].n,0);
});
