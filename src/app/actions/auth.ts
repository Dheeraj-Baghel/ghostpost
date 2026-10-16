"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfig } from "@/lib/supabase/config";
import { emailSchema, passwordSchema, inviteSchema, firstError } from "@/lib/validation";
import { friendlyError, safeAuthDiagnostic } from "@/lib/errors";
import { requireUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";
import type { ActionResult } from "@/lib/types";
import { googleOAuthOptions, isSupabaseAuthorizeUrl } from "@/lib/oauth";

export async function signInWithGoogle(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const config = supabaseConfig();
  if (!config) return { error: "Google sign-in needs GhostPost's Supabase connection. Please contact the operator." };
  let authorizeUrl: string;
  try {
    const supabase = await createClient();
    const requestedNext = form.get("next");
    const { data, error } = await supabase.auth.signInWithOAuth(googleOAuthOptions(siteUrl(), typeof requestedNext === "string" ? requestedNext : null));
    if (error || !data.url || !isSupabaseAuthorizeUrl(data.url, config.url)) {
      return { error: "Couldn't start Google sign-in. Please try again or ask the operator to check the Google provider setup." };
    }
    authorizeUrl = data.url;
  } catch {
    return { error: "Couldn't reach the sign-in service. Please try again shortly." };
  }
  // Redirect outside the catch: Next's redirect is a control-flow exception.
  // Supabase SSR has stored the PKCE verifier in this response's cookies.
  redirect(authorizeUrl);
}

export async function signIn(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (!supabaseConfig()) return { error: "GhostPost isn't connected yet. Ask the operator to finish Supabase setup." };
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: firstError(email) };
  const password = form.get("password");
  if (typeof password !== "string" || !password || password.length > 128) return { error: "Enter your password." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next") as string));
}

export async function signUp(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (!supabaseConfig()) return { error: "GhostPost isn't connected yet. Ask the operator to finish Supabase setup." };
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));
  if (!email.success) return { error: firstError(email) };
  if (!password.success) return { error: firstError(password) };
  if (password.data !== form.get("confirmPassword")) return { error: "Your passwords don't match." };
  const supabase = await createClient();
  // No client metadata is used for membership, alias, or administrator role.
  const { data, error } = await supabase.auth.signUp({ email: email.data, password: password.data, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/join` } });
  if (error) {
    console.error("[GhostPost signup failure]", safeAuthDiagnostic(error));
    return { error: friendlyError(error) };
  }
  if (data.session) { revalidatePath("/", "layout"); redirect("/join"); }
  return { success: "Check your inbox for a confirmation link. After confirming, join with a room key or create your own room. If you already have an account, sign in instead." };
}

export async function signOut(): Promise<ActionResult> {
  if (supabaseConfig()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "We couldn't sign you out. Check your connection and try again." };
  }
  revalidatePath("/", "layout");
  redirect("/login?notice=signed-out");
}

export async function forgotPassword(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  if (!supabaseConfig()) return { error: "Password recovery needs a configured Supabase project." };
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: firstError(email) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  if (error) return { error: friendlyError(error) };
  return { success: "If that email has an account, a reset link is on its way. Open it in this browser. Check spam too." };
}

export async function resetPassword(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { error: firstError(password) };
  if (password.data !== form.get("confirmPassword")) return { error: "Your passwords don't match." };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) return { error: friendlyError(error) };
  // Re-authenticate after recovery rather than leaving a recovery session open.
  const signedOut = await supabase.auth.signOut({ scope: "global" });
  if (signedOut.error) return { success: "Your password changed, but we couldn't close your sessions. Please sign out and sign in with your new password." };
  revalidatePath("/", "layout");
  redirect("/login?notice=password-updated");
}

export async function joinOffice(_previous: ActionResult, form: FormData): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const code = inviteSchema.safeParse(form.get("code"));
  if (!code.success) return { error: firstError(code) };
  const { data, error } = await supabase.rpc("room_join", { p_code: code.data });
  if (error) return { error: friendlyError(error) };
  revalidatePath("/", "layout");
  redirect(`/rooms/${data}/feed?notice=welcome`);
}