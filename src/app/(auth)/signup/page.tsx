import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getContext } from "@/lib/auth";
import { supabaseConfig } from "@/lib/supabase/config";

export const metadata = { title: "Join GhostPost" };
export const dynamic = "force-dynamic";
export default async function Signup() {
  const context = await getContext();
  if (context?.user) redirect("/rooms");
  return <AuthForm mode="signup" configured={!!supabaseConfig()} />;
}