import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getContext } from "@/lib/auth";
import { supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/lib/utils";
import { memberDestination } from "@/lib/oauth";

export const metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";
export default async function Login({ searchParams }: { searchParams: Promise<{ notice?: string; next?: string }> }) {
  const params = await searchParams;
  // If membership lookup failed after a successful exchange, show the friendly
  // retry notice instead of immediately repeating the failing lookup/redirect.
  const context = params.notice === "oauth-membership-error" ? null : await getContext();
  if (context?.user) redirect(memberDestination(params.next, context.rooms));
  return <AuthForm mode="login" configured={!!supabaseConfig()} notice={params.notice} next={safeNext(params.next)} />;
}