// Use the Supabase CLI's migration tracking; do not invent an application table.
// Credentials come only from the ignored local environment, never source.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

function main() {
  const configured = process.env.SUPABASE_DB_URL;
  if (!configured) throw new Error("Set SUPABASE_DB_URL in .env.local using Supabase > Connect. URL-encode the password and remove template brackets.");
  const uri = new URL(configured);
  if (!["postgres:", "postgresql:"].includes(uri.protocol)) throw new Error("Use a PostgreSQL connection URI.");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(uri.hostname);
  if (!local) {
    const ca = resolve(process.env.SUPABASE_DB_CA_PATH || "supabase/certs/prod-ca-2021.crt");
    if (!existsSync(ca)) throw new Error("Supply the Supabase CA certificate from Database Settings > SSL configuration.");
    uri.searchParams.set("sslmode", "verify-full");
    uri.searchParams.set("sslrootcert", ca);
  }
  // Supabase owns migration application/history. Never print the URI ourselves.
  const binary = resolve("node_modules/.bin", process.platform === "win32" ? "supabase.cmd" : "supabase");
  const args = ["db", "push", "--db-url", uri.toString(), "--yes"];
  if (process.argv.includes("--dry-run")) args.push("--dry-run");
  execFileSync(binary, args, { stdio: "inherit", env: process.env, timeout: 120000 });
}
try { main(); } catch { console.error("Migration command failed. Check the connection, TLS certificate, and Supabase CLI output above. Credentials were not logged by this script."); process.exitCode = 1; }