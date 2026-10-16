// Explicit server-side operator workflow. Never imported by the web app.
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { idSchema } from "../src/lib/validation";

async function main() {
  if (!process.argv.includes("--legacy-single-office")) throw new Error("Legacy operator commands are retired for private rooms. Room creators manage keys and moderation in the app. Use --legacy-single-office only on the old three-migration schema, with explicit authorization.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) throw new Error("Set the project's Supabase URL and server-only SUPABASE_SECRET_KEY in .env.local.");
  const client = createClient<Database>(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const [command, value, capacity] = process.argv.slice(2);
  if (command === "invite") {
    const uses = Number(capacity || 50);
    if (!Number.isInteger(uses) || uses < 1 || uses > 10000) throw new Error("Invitation capacity must be 1-10000.");
    const code = `ghost_${randomBytes(24).toString("base64url")}`;
    const expires = new Date(Date.now() + 30 * 86400000).toISOString();
    const { data, error } = await client.rpc("operator_create_invite", { p_hash: createHash("sha256").update(code).digest("hex"), p_label: value || "Office invitation", p_max_uses: uses, p_expires_at: expires });
    if (error) throw new Error("Invitation creation failed. Check the key, migrations, and project URL.");
    console.log(`Invitation ID: ${data}\nValid until: ${expires}\nMaximum joins: ${uses}\nShare this code privately (shown only once):\n${code}`);
  } else if (command === "admin" || command === "demote") {
    const id = idSchema.parse(value);
    const { error } = await client.rpc("operator_set_admin", { p_user_id: id, p_admin: command === "admin" });
    if (error) throw new Error("Role update failed. The exact Auth user ID must already belong to an office member. Check the operator key and migrations.");
    console.log(command === "admin" ? "Existing office member promoted to administrator." : "Administrator role removed.");
  } else if (command === "revoke") {
    const id = idSchema.parse(value);
    const { error } = await client.rpc("operator_revoke_invite", { p_id: id });
    if (error) throw new Error("Revocation failed. Check your operator configuration.");
    console.log("Invitation revoked (if present).");
  } else throw new Error("Usage: operator.ts invite [label] [max-uses] | admin <auth-user-id> | demote <auth-user-id> | revoke <invitation-id>");
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Operator command failed."); process.exitCode = 1; });