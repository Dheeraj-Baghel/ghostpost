export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try { if (!["http:", "https:"].includes(new URL(url).protocol)) return null; } catch { return null; }
  return { url, key };
}

export function siteUrl() {
  const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return new URL(url).origin;
}