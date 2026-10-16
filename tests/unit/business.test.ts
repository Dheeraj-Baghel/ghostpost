import { test } from "node:test";
import assert from "node:assert/strict";
import { categorySchema, commentSchema, contentSchema, emailSchema, inviteSchema, optionsSchema, passwordSchema, postSchema, reactionSchema, reportSchema } from "../../src/lib/validation";
import { safeNext, timeAgo, trendingScore } from "../../src/lib/utils";
import { friendlyError, safeAuthDiagnostic } from "../../src/lib/errors";
import { supabaseConfig } from "../../src/lib/supabase/config";

test("posts are trimmed, nonempty and capped at 1000 characters", () => {
  assert.equal(contentSchema.parse("  hello  "), "hello");
  assert.ok(!contentSchema.safeParse(" \n ").success);
  assert.ok(contentSchema.safeParse("a".repeat(1000)).success);
  assert.ok(!contentSchema.safeParse("a".repeat(1001)).success);
});
test("comments enforce a separate 500-character limit", () => {
  assert.ok(commentSchema.safeParse("a".repeat(500)).success);
  assert.ok(!commentSchema.safeParse("a".repeat(501)).success);
  assert.ok(!commentSchema.safeParse("").success);
});
test("only specified categories, reactions and report reasons are accepted", () => {
  assert.ok(categorySchema.safeParse("Confession").success);
  assert.ok(!categorySchema.safeParse("news").success);
  for (const kind of ["like", "laugh", "fire", "shocked", null]) assert.ok(reactionSchema.safeParse(kind).success);
  assert.ok(!reactionSchema.safeParse("angry").success);
  assert.ok(reportSchema.safeParse("Harassment").success);
  assert.ok(!reportSchema.safeParse("invented").success);
});
test("polls require 2-4 distinct bounded options; no partial options", () => {
  assert.ok(optionsSchema.safeParse(["Tea", "Coffee"]).success);
  assert.ok(optionsSchema.safeParse(["a", "b", "c", "d"]).success);
  for (const options of [["one"], ["a","b","c","d","e"], ["a","A"], ["a", " a "], ["a", " "], ["a", "x".repeat(121)]]) assert.ok(!optionsSchema.safeParse(options).success);
  assert.ok(!postSchema.safeParse({ content: "Question?", category: "Question", options: [] }).success);
});
test("auth and invitations have bounded server-side validation", () => {
  assert.ok(emailSchema.safeParse("person@example.com").success);
  assert.ok(!emailSchema.safeParse("not an email").success);
  assert.ok(!passwordSchema.safeParse("short").success);
  assert.ok(!passwordSchema.safeParse("x".repeat(129)).success);
  assert.ok(!inviteSchema.safeParse("guess").success);
  assert.equal(inviteSchema.parse("  ghost_1234567890123456  "), "ghost_1234567890123456");
});
test("safe redirects reject external, scheme-relative, escaped and unknown targets", () => {
  for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", "/feed\n", "/api/admin", "javascript:alert(1)", "/%2f%2fevil.example", "/feed/../../outside"]) assert.equal(safeNext(value), "/feed");
  assert.equal(safeNext("/join"), "/join");
  assert.equal(safeNext("/reset-password"), "/reset-password");
  assert.equal(safeNext("/feed?sort=trending"), "/feed?sort=trending");
  assert.equal(safeNext(null, "/join"), "/join");
});
test("trending rewards recent conversation and freshness", () => {
  assert.ok(trendingScore(5, 2, 1) > trendingScore(0, 0, 1));
  assert.ok(trendingScore(5, 2, 1) > trendingScore(5, 2, 25));
  assert.ok(trendingScore(0, 1, 1) > trendingScore(1, 0, 1));
  assert.equal(trendingScore(0,0,-2), trendingScore(0,0,0));
});
test("auth errors are friendly; SQL and account details never get forwarded", () => {
  assert.match(friendlyError({ code: "invalid_credentials" }), /don't match/);
  assert.match(friendlyError({ code: "email_not_confirmed" }), /confirm/);
  assert.equal(friendlyError({ code: "22023", message: "This invitation is invalid or expired." }), "This invitation is invalid or expired.");
  assert.ok(!friendlyError({ message: "private.profiles user_id=user@example.com" }).includes("user@example.com"));
});
test("missing Supabase configuration is not replaced with fake data", () => {
  const oldUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.equal(supabaseConfig(), null);
  if (oldUrl !== undefined) process.env.NEXT_PUBLIC_SUPABASE_URL = oldUrl;
});
test("email failures are actionable without claiming an unproven SMTP cause", () => {
  assert.match(friendlyError({message:"Error sending confirmation email",code:"unexpected_failure"}),/couldn't send/);
  assert.match(friendlyError({code:"unexpected_failure"}),/authentication service/);
  assert.match(friendlyError({code:"email_address_not_authorized"}),/recipient restrictions/);
  const secret = "private-token-and-email@example.com";
  assert.deepEqual(safeAuthDiagnostic({code:secret,message:secret,status:500}),{code:"unclassified_auth_error",status:500,emailSendFailed:false});
  assert.deepEqual(safeAuthDiagnostic({code:"unexpected_failure",message:"Error sending confirmation email",status:500}),{code:"unexpected_failure",status:500,emailSendFailed:true});
  assert.ok(!JSON.stringify(safeAuthDiagnostic({message:secret})).includes(secret));
});
test("timestamps are stable and friendly", () => {
  const now = Date.UTC(2026, 0, 1, 12);
  assert.equal(timeAgo(new Date(now).toISOString(), now), "just now");
  assert.equal(timeAgo(new Date(now - 3600000).toISOString(), now), "1h ago");
});
test("default email restrictions distinguish hourly quota from request throttling", () => {
  assert.match(friendlyError({code:"email_address_not_authorized"}), /Supabase organization team members/);
  assert.match(friendlyError({code:"over_email_send_rate_limit"}), /quota to reset/);
  assert.doesNotMatch(friendlyError({code:"over_email_send_rate_limit"}), /minute/);
  assert.match(friendlyError({code:"over_request_rate_limit"}), /Too many requests/);
});