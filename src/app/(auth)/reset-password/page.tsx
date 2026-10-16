import { AuthForm } from "@/components/auth-form";
import { requireUser } from "@/lib/auth";
export const metadata = { title: "New password" };
export const dynamic = "force-dynamic";
export default async function Reset() { await requireUser(); return <AuthForm mode="reset" configured />; }