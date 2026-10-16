import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { callbackDestination } from "@/lib/oauth";

export async function GET(request: NextRequest) {
  let destination = "/setup";
  if (supabaseConfig()) {
    try { destination = await callbackDestination(request.nextUrl.searchParams, await createClient()); }
    catch { destination = "/login?notice=oauth-error"; }
  }
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}