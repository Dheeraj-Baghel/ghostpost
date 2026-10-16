import { AuthForm } from "@/components/auth-form";
import { supabaseConfig } from "@/lib/supabase/config";
export const metadata = { title: "Reset your password" };
export const dynamic = "force-dynamic";
export default async function Forgot({ searchParams }: { searchParams: Promise<{ notice?: string }> }) { return <AuthForm mode="forgot" configured={!!supabaseConfig()} notice={(await searchParams).notice} />; }