// Local development only. Never part of a build, migration, or deployment.
// Requires an explicit disposable account; never hardcodes real credentials.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { emailSchema, passwordSchema } from "../src/lib/validation";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname) || process.env.NODE_ENV === "production" || process.env.VERCEL) {
    throw new Error("Seed refused: only an explicitly configured local Supabase instance is allowed.");
  }
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!secret || !publicKey) throw new Error("Set both the local public and server-only operator keys.");
  const email = emailSchema.parse(process.env.GHOSTPOST_SEED_EMAIL);
  const password = passwordSchema.parse(process.env.GHOSTPOST_SEED_PASSWORD);
  const operator = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const member = createClient<Database>(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const created = await operator.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) throw new Error("Could not create the seed account. Use a new disposable local email; seeding is not automatic or repeatable against the same account.");
  const userId = created.data.user.id;
  try {
    const signedIn = await member.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw new Error("Seed sign-in failed.");
    const room = await member.rpc("room_create", { p_name: "[DEVELOPMENT SAMPLE] Friends" });
    if (room.error) throw new Error("Seed room failed. Apply the private-rooms migration locally first.");
    const posts = [
      { content: "[DEVELOPMENT SAMPLE] I rehearse 'you too' before every coffee run, and still say it when someone says enjoy your drink.", category: "Confession", options: null },
      { content: "[DEVELOPMENT SAMPLE] Hot take: rainy weekends are the best weekends.", category: "Hot Take", options: null },
      { content: "[DEVELOPMENT SAMPLE] If this group had a theme song, what would it be?", category: "Funny", options: null },
      { content: "[DEVELOPMENT SAMPLE] The important question: what powers your afternoon?", category: "Question", options: ["Chai", "Coffee", "A walk", "Optimism"] },
    ];
    for (const post of posts) {
      const result = await member.rpc("room_create_post", { p_room_id: room.data, p_content: post.content, p_category: post.category, p_options: post.options });
      if (result.error) throw new Error("A sample post failed to save.");
    }
    console.log("Created 4 clearly labeled development posts, including 1 poll. No fake votes, reactions, or comments were added. Sign in using your configured seed account.");
  } catch (error) {
    // Auth deletion cascades through the private profile and seeded content.
    await operator.auth.admin.deleteUser(userId);
    throw error;
  } finally { await member.auth.signOut({ scope: "local" }); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Seed failed."); process.exitCode = 1; });