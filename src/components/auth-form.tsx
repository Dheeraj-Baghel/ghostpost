"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { signIn, signUp, signInWithGoogle, forgotPassword, resetPassword, joinOffice } from "@/app/actions/auth";
import { Button, Field, FormMessage, inputClass } from "./ui";
import type { ActionResult } from "@/lib/types";
import { oauthNotices } from "@/lib/oauth";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup" | "forgot" | "reset" | "join";
const copy: Record<Mode, { title: string; description: string; submit: string }> = {
  login: { title: "Welcome back, ghost.", description: "Your rooms and conversations are waiting.", submit: "Step inside" },
  signup: { title: "Leave your name at the door.", description: "Continue with Google, then join with a room key or create your own space. No separate GhostPost password needed.", submit: "Create your account" },
  forgot: { title: "Lost your way in?", description: "We'll send a password reset link to your email.", submit: "Send reset link" },
  reset: { title: "A fresh start.", description: "Choose a new password for your account.", submit: "Update password" },
  join: { title: "You're almost a ghost.", description: "Enter your private room key. Join up to six rooms, each with its own ghost nickname and up to 25 members.", submit: "Join room" },
};
const actions = { login: signIn, signup: signUp, forgot: forgotPassword, reset: resetPassword, join: joinOffice };

export function AuthForm({ mode, configured, notice, next, embedded = false }: { mode: Mode; configured: boolean; notice?: string; next?: string; embedded?: boolean }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(actions[mode], {});
  const [googleState, googleAction, googlePending] = useActionState<ActionResult, FormData>(signInWithGoogle, {});
  const googleFirst = mode === "login" || mode === "signup";
  const busy = pending || googlePending;
  const isPassword = ["login", "signup", "reset"].includes(mode);
  const messages: Record<string, string> = { ...oauthNotices, "signed-out": "You've signed out. See you on the other side.", "password-updated": "Password updated. Sign in with your new password.", "link-expired": "That link is expired or invalid. Request a fresh one below.", "confirmation-error": "That confirmation link couldn't be verified. Try signing in, or request a new password link." };
  const noticeIsError = !!notice && !["signed-out", "password-updated"].includes(notice);
  const passwordForm = <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next || "/feed"} />
      {mode !== "join" && mode !== "reset" && <Field label="Email address" id="email"><input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required className={inputClass} disabled={busy} /></Field>}
      {isPassword && <Field label={mode === "reset" ? "New password" : "Password"} id="password" hint={mode !== "login" ? "At least 10 characters. Make it a good secret." : undefined}><input id="password" name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "login" ? 1 : 10} maxLength={128} required placeholder={mode === "login" ? "Your password" : "Create a strong password"} className={inputClass} disabled={busy} /></Field>}
      {(mode === "signup" || mode === "reset") && <Field label="Confirm password" id="confirmPassword"><input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} maxLength={128} required className={inputClass} disabled={busy} placeholder="Once more, just to be sure" /></Field>}
      {mode === "join" && <Field label="Room key" id="code" hint="Keys are case-sensitive. Paste the entire key your room moderator shared."><input id="code" name="code" type="text" autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={12} maxLength={128} required className={inputClass} placeholder="Your private room key" disabled={busy} /></Field>}
      <FormMessage error={state.error} success={state.success} />
      {mode === "login" && <div className="text-right"><Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-semibold text-ink underline underline-offset-4">Forgot password?</Link></div>}
      <Button type="submit" variant={googleFirst ? "secondary" : "primary"} className="w-full" pending={pending} disabled={!configured || googlePending}>{copy[mode].submit}<ArrowRight size={16} /></Button>
    </form>;
  return <div className={cn("w-full bg-canvas", !embedded && "max-w-[480px] rounded-[32px] p-6 sm:p-8")}>
    <span className="mb-6 inline-flex size-12 items-center justify-center rounded-full bg-surface text-ink">{mode === "join" ? <KeyRound size={24} /> : mode === "forgot" ? <Mail size={24} /> : <LockKeyhole size={24} />}</span>
    {embedded ? <h2 className="pr-6 text-[28px] font-semibold leading-tight tracking-tight">{copy[mode].title}</h2> : <h1 className="text-[28px] font-semibold leading-tight tracking-tight">{copy[mode].title}</h1>}
    <p className="mb-7 mt-3 text-sm leading-6 text-muted">{copy[mode].description}</p>
    {!configured && <div className="mb-5 rounded-[16px] bg-surface p-4 text-sm leading-6 text-body">GhostPost isn&apos;t connected to Supabase yet. <Link href="/setup" className="font-semibold underline underline-offset-4">View setup requirements</Link>.</div>}
    {notice && messages[notice] && <div className="mb-5"><FormMessage success={!noticeIsError ? messages[notice] : undefined} error={noticeIsError ? messages[notice] : undefined} /></div>}
    {googleFirst && <><form action={googleAction} className="space-y-3">
      <input type="hidden" name="next" value={next || "/feed"} />
      <Button type="submit" className="w-full" pending={googlePending} disabled={!configured || pending}>Continue with Google<ArrowRight size={16} /></Button>
      <FormMessage error={googleState.error} />
    </form><p className="mt-3 text-xs leading-5 text-muted">Google verifies your account, not room access. Join with a moderator&apos;s key or create your own room.</p></>}
    {mode === "signup" ? <details className="mt-6 border-t border-border pt-4"><summary className="min-h-11 cursor-pointer rounded-[16px] py-3 text-sm text-body">Use email instead (requires email delivery)</summary><p className="mb-4 mt-3 text-xs leading-5 text-muted">Email signup needs a confirmation email. The default mail service is restricted; Google avoids that delivery requirement.</p>{passwordForm}</details> : <>{mode === "login" && <p className="my-5 border-t border-border pt-5 text-sm font-medium text-muted">Existing account? Sign in with your password</p>}{passwordForm}</>}
    {googleFirst && <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted"><ShieldCheck size={14} className="mt-0.5 shrink-0" />Your Google name, email and photo stay out of conversations. The server assigns a different stable ghost in each room. Pseudonymous to other members, not anonymous from Google, Supabase or the operator.</p>}
    {mode === "signup" && <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">Already a member? <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">Sign in</Link></p>}
    {mode === "login" && <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">New around here? <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">Find your ghost</Link></p>}
    {mode === "forgot" && <p className="mt-6 text-center text-sm"><Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4">Back to sign in</Link></p>}
  </div>;
}