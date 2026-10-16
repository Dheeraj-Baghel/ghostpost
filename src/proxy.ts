import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const config = supabaseConfig();
  if (config) {
    const supabase = createServerClient(config.url, config.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    // Verified with Auth server; do not authorize from getSession().
    await supabase.auth.getUser();
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

export const config = { matcher: ["/rooms/:path*", "/feed/:path*", "/post/:path*", "/admin/:path*", "/join", "/login", "/signup", "/forgot-password", "/reset-password", "/auth/:path*"] };