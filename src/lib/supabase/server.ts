import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { supabaseConfig } from "./config";

// New client for every request. Never use service_role in application requests.
export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  const store = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => store.set(name, value, options)); }
        catch { /* Read-only Server Component; proxy refreshes the cookie. */ }
      },
    },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
  });
}