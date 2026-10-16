import { safeNext } from "./utils";
import type { Member } from "./types";

// Supabase owns PKCE, OAuth state, identity linking and session cookies. These
// helpers select only trusted configuration/allowlisted local destinations.
export function googleOAuthOptions(origin: string, next?: string | null) {
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", safeNext(next));
  return {
    provider: "google" as const,
    options: {
      redirectTo: callback.toString(),
      scopes: "openid email profile",
      skipBrowserRedirect: true,
    },
  };
}

export function isSupabaseAuthorizeUrl(value: string, supabaseUrl: string): boolean {
  try {
    const url = new URL(value);
    const base = new URL(supabaseUrl);
    return url.origin === base.origin && url.pathname === `${base.pathname.replace(/\/$/, "")}/auth/v1/authorize`
      && url.searchParams.get("provider") === "google" && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

export function memberDestination(next: string | null | undefined, rooms: Member[]): string {
  const destination = safeNext(next);
  // Recovery must stay available to authenticated existing password accounts,
  // including accounts that have not joined any room yet.
  if (destination === "/reset-password") return destination;
  const path = destination.split("?")[0];
  if (path.startsWith("/rooms/")) {
    const member = rooms.find(room => room.room_id === path.split("/")[2]);
    if (!member) return "/rooms?notice=room-unavailable";
    if (path.endsWith("/admin") && !member.is_admin) return `/rooms/${member.room_id}/feed?notice=admin-only`;
    return destination;
  }
  // Existing provider redirects keep working without dashboard changes.
  // Legacy post/admin URLs perform their own room authorization after redirect.
  if (path === "/admin" || path.startsWith("/post/")) return rooms.length ? destination : "/rooms";
  return "/rooms";
}

export const oauthNotices: Record<string, string> = {
  "oauth-cancelled": "Google sign-in was cancelled. You can try again when you're ready.",
  "oauth-error": "Google sign-in couldn't be completed. Please try again or use your existing password account.",
  "oauth-missing-code": "That sign-in link is incomplete. Start again with Continue with Google.",
  "oauth-exchange-failed": "That sign-in link expired or couldn't be verified. Start again in this browser.",
  "oauth-membership-error": "You're signed in, but we couldn't load your rooms. Please ask the operator to check the room migration.",
};

// Narrow SDK contract enables local tests of our routing, NOT a substitute Auth
// implementation. Production passes the existing request-scoped SSR client.
type CallbackClient = {
  auth: {
    exchangeCodeForSession(code: string): Promise<{ error: unknown }>;
    getUser(): Promise<{ data: { user: unknown | null }; error: unknown }>;
  };
  rpc(name: "my_rooms", args: Record<string, never>): PromiseLike<{ data: unknown; error: unknown }>;
};

export async function callbackDestination(params: URLSearchParams, client: CallbackClient): Promise<string> {
  const next = safeNext(params.get("next"));
  const recovery = next === "/reset-password";
  // Never display/log error_description, identity data, provider tokens or codes.
  if (params.has("error") || params.has("error_code")) {
    if (recovery) return "/forgot-password?notice=link-expired";
    return params.get("error") === "access_denied" || params.get("error_code") === "access_denied"
      ? "/login?notice=oauth-cancelled" : "/login?notice=oauth-error";
  }
  const code = params.get("code");
  if (!code || code.length > 4096 || params.getAll("code").length !== 1) {
    return recovery ? "/forgot-password?notice=link-expired" : "/login?notice=oauth-missing-code";
  }
  try {
    const exchange = await client.auth.exchangeCodeForSession(code);
    if (exchange.error) return recovery ? "/forgot-password?notice=link-expired" : "/login?notice=oauth-exchange-failed";
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return "/login?notice=oauth-exchange-failed";
    if (recovery) return "/reset-password";
    const membership = await client.rpc("my_rooms", {});
    if (membership.error) return "/login?notice=oauth-membership-error";
    if (!Array.isArray(membership.data) || !membership.data.every((m: Partial<Member> | null) => m && typeof m.room_id === "string" && typeof m.alias === "string" && typeof m.is_admin === "boolean")) return "/login?notice=oauth-membership-error";
    return memberDestination(next, membership.data as Member[]);
  } catch {
    return recovery ? "/forgot-password?notice=link-expired" : "/login?notice=oauth-error";
  }
}
