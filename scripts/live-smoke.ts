// Explicit, opt-in live tests. Temporary Auth users/content are removed in finally.
// Never called from a build, migration, or seed. No SMTP delivery is assumed:
// generated signup token hashes exercise real GoTrue confirmation without email.
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

async function main() {
  if (!process.argv.includes("--legacy-single-office")) throw new Error("This historical live suite targets the single-office schema. Do not run it against private rooms. Current room isolation is tested locally in tests/database/rooms.test.ts; hosted room E2E needs separate authorization.");
  if (!process.argv.includes("--allow-project-tests")) throw new Error("Opt in with --allow-project-tests only for the dedicated GhostPost project. Temporary test accounts will be created and removed.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!url || !key || !secret || !dbUrl) throw new Error("Live tests require public, operator, and database configuration in .env.local.");
  const operator = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const users: string[] = [];
  let invitationId: string | undefined;
  const nonce = randomUUID().slice(0, 8);
  const inviteCode = `test_${randomBytes(24).toString("base64url")}`;
  async function member(name: string, join = true) {
    const email = `ghostpost-test-${nonce}-${name}@example.com`;
    const password = randomBytes(30).toString("base64url");
    const generated = await operator.auth.admin.generateLink({ type: "signup", email, password });
    if (generated.error || !generated.data.user) throw new Error(`Auth signup-token creation failed (${generated.error?.code || "no user"}).`);
    users.push(generated.data.user.id);
    const client = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } });
    const verified = await client.auth.verifyOtp({ token_hash: generated.data.properties.hashed_token, type: "email" });
    if (verified.error) throw new Error(`Auth token verification failed (${verified.error.code}).`);
    if (join) {
      const joined = await client.rpc("join_office", { p_code: inviteCode });
      if (joined.error) throw new Error(`Office joining failed (${joined.error.code}).`);
      assert.equal(joined.data.is_admin, false);
      assert.match(joined.data.alias, /^[a-z]+-[a-z]+-[a-f0-9]{8}$/);
    }
    return { email, password, client, id: generated.data.user.id };
  }
  try {
    const invite = await operator.rpc("operator_create_invite", { p_hash: createHash("sha256").update(inviteCode).digest("hex"), p_label: `LIVE TEST ${nonce}`, p_max_uses: 4, p_expires_at: new Date(Date.now() + 3600000).toISOString() });
    if (invite.error) throw new Error(`Invitation fixture failed (${invite.error.code}); apply migrations first.`);
    invitationId = invite.data;
    const a = await member("member");
    const b = await member("second");
    const moderator = await member("admin");
    const outsider = await member("outsider", false);
    const promoted = await operator.rpc("operator_set_admin", { p_user_id: moderator.id, p_admin: true });
    assert.equal(promoted.error, null);
    assert.ok((await anon.rpc("get_feed")).error);
    assert.ok((await outsider.client.rpc("get_feed")).error);
    assert.ok((await a.client.schema("private").from("profiles").select("*")).error);
    assert.ok((await a.client.rpc("operator_set_admin", { p_user_id: a.id, p_admin: true })).error);
    console.log("PASS: real Auth signup-token verification, joining, private mappings, nonmember denial, and operator-only promotion.");

    const created = await a.client.rpc("create_post", { p_content: "[LIVE TEST] This conversation verifies PostgreSQL persistence. It will be cleaned up after testing.", p_category: "Confession", p_options: null });
    assert.equal(created.error, null);
    const id = created.data as string;
    assert.ok((await b.client.rpc("edit_post", { p_id: id, p_content: "Not mine", p_category: "General" })).error);
    assert.ok((await b.client.rpc("delete_post", { p_id: id })).error);
    const reply = await b.client.rpc("add_comment", { p_post_id: id, p_content: "[LIVE TEST] A real, temporary database reply." });
    assert.equal(reply.error, null);
    assert.ok((await a.client.rpc("delete_comment", { p_id: reply.data })).error);
    assert.equal((await b.client.rpc("edit_comment", { p_id: reply.data, p_content: "[LIVE TEST] Edited reply." })).error, null);
    await Promise.all(["like", "laugh", "fire"].map(p_kind => a.client.rpc("set_reaction", { p_post_id: id, p_kind })));
    const current = await a.client.rpc("get_post", { p_id: id });
    assert.equal(current.error, null);
    assert.equal(Object.values(current.data.reactions as Record<string, number>).reduce((n, count) => n + count, 0), 1);
    assert.equal(current.data.comment_count, 1);
    assert.ok(!JSON.stringify(current.data).includes(a.id));
    assert.ok(!JSON.stringify(current.data).includes(a.email));
    assert.deepEqual((await b.client.from("reactions").select("*")).data, []);
    console.log("PASS: live PostgREST post/comment ownership, persistent counts, private identity payloads, and reaction uniqueness.");

    const poll = await a.client.rpc("create_post", { p_content: "[LIVE TEST] Which afternoon break sounds better?", p_category: "Question", p_options: ["A coffee", "Some chai", "A little walk"] });
    assert.equal(poll.error, null);
    const before = await a.client.rpc("get_post", { p_id: poll.data });
    assert.equal(before.data.poll.total_votes, null);
    const voteArgs = { p_poll_id: before.data.poll.id, p_option_id: before.data.poll.options[0].id };
    const votes = await Promise.all([a.client.rpc("vote_poll", voteArgs), a.client.rpc("vote_poll", voteArgs)]);
    assert.equal(votes.filter(v => !v.error).length, 1);
    assert.equal((await a.client.rpc("get_post", { p_id: poll.data })).data.poll.total_votes, 1);
    assert.ok((await a.client.rpc("edit_post", { p_id: poll.data, p_content: "Changed voted question", p_category: "Question" })).error);
    assert.equal((await b.client.rpc("report_post", { p_post_id: id, p_reason: "Other" })).error, null);
    assert.ok((await a.client.rpc("get_reports")).error);
    assert.deepEqual((await b.client.from("reports").select("id,reason")).data, []);
    const reports = await moderator.client.rpc("get_reports");
    assert.equal(reports.error, null);
    const report = reports.data.items.find((r: { post_id: string }) => r.post_id === id);
    assert.ok(report);
    assert.ok((await a.client.rpc("moderate_report", { p_report_id: report.id, p_action: "remove" })).error);
    assert.equal((await moderator.client.rpc("moderate_report", { p_report_id: report.id, p_action: "dismiss" })).error, null);
    for (const p_sort of ["latest", "trending"]) {
      const feed = await a.client.rpc("get_feed", { p_sort, p_category: null, p_page: 0 });
      assert.equal(feed.error, null); assert.ok(feed.data.items.length <= 20);
    }
    console.log("PASS: live polls/vote uniqueness, reports, administrator-only moderation, and Latest/Trending queries.");

    // Explicitly temporary content for natural-height card/layout coverage. No
    // activity is attributed to real office members; all rows cascade on cleanup.
    for (const fixture of [
      { p_content: "[LIVE TEST] The best part of my day is the five minutes before everyone else arrives.", p_category: "Confession" },
      { p_content: "[LIVE TEST] A quiet hour beats a new coffee machine. Every single time.", p_category: "Hot Take" },
      { p_content: "[LIVE TEST] Opened a new tab to do something important. Immediately forgot what it was. Closed the tab. Remembered.", p_category: "Funny" },
      { p_content: "[LIVE TEST] A longer thought to check reading comfort: the small things at work matter. Someone making space for your idea, a meeting ending on time, a question you can ask without worrying how it sounds. This card intentionally has more text so the natural-height feed is tested alongside short notes and polls. This is temporary test content, not an employee post.", p_category: "General" },
    ]) {
      const result = await b.client.rpc("create_post", { ...fixture, p_options: null });
      assert.equal(result.error, null);
    }

    const recovery = await operator.auth.admin.generateLink({ type: "recovery", email: b.email });
    if (recovery.error) throw new Error("Could not generate the temporary Auth recovery token.");

    const status = await new Promise<number>(resolve => {
      const child = spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "test:e2e"], {
        stdio: "inherit", env: { ...process.env, GHOSTPOST_E2E: "1", GHOSTPOST_E2E_EMAIL: a.email, GHOSTPOST_E2E_PASSWORD: a.password, GHOSTPOST_E2E_ADMIN_EMAIL: moderator.email, GHOSTPOST_E2E_ADMIN_PASSWORD: moderator.password, GHOSTPOST_E2E_NEW_EMAIL: outsider.email, GHOSTPOST_E2E_NEW_PASSWORD: outsider.password, GHOSTPOST_E2E_INVITE: inviteCode, GHOSTPOST_E2E_RECOVERY_HASH: recovery.data.properties.hashed_token, GHOSTPOST_E2E_RECOVERY_EMAIL: b.email },
      });
      child.on("error", () => resolve(1)); child.on("close", code => resolve(code ?? 1));
    });
    if (status !== 0) throw new Error("Live browser smoke tests failed; fixtures will still be cleaned up.");
  } finally {
    let clean = true;
    for (const id of users.reverse()) { const result = await operator.auth.admin.deleteUser(id); if (result.error) clean = false; }
    if (invitationId) {
      const db = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: true, ca: readFileSync("supabase/certs/prod-ca-2021.crt", "utf8") }, connectionTimeoutMillis: 15000 });
      try { await db.connect(); await db.query("delete from private.invitations where id = $1 and label = $2", [invitationId, `LIVE TEST ${nonce}`]); }
      catch { clean = false; } finally { await db.end(); }
    }
    if (!clean) throw new Error("Fixture cleanup incomplete. Inspect temporary ghostpost-test accounts and LIVE TEST invitations before release.");
    console.log("CLEANUP: temporary Auth accounts, profiles, posts, replies, reactions, votes, reports, and test invitation removed.");
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Live tests failed."); process.exitCode = 1; });