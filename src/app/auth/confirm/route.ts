import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/lib/utils";

// Token-hash templates work even when confirmation opens on another device.
// Only email confirmation/recovery are needed; reject arbitrary OTP types.
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!supabaseConfig()) return NextResponse.redirect(new URL("/setup", request.url));
  if (hash && (type === "email" || type === "recovery")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: hash, type });
    if (!error) {
      const next = type === "recovery" ? "/reset-password" : safeNext(request.nextUrl.searchParams.get("next"), "/join");
      const response = NextResponse.redirect(new URL(next, request.url));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }
  return NextResponse.redirect(new URL(type === "recovery" ? "/forgot-password?notice=link-expired" : "/login?notice=confirmation-error", request.url));
}