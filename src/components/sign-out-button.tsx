"use client";
import { useTransition } from "react";
import { LogOut, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/app/actions/auth";

export function SignOutButton({ showLabel = false }: { showLabel?: boolean }) {
  const [pending, start] = useTransition();
  return <button type="button" aria-label="Sign out" title="Sign out" disabled={pending} onClick={() => start(async () => {
    try { const result = await signOut(); if (result?.error) toast.error(result.error); }
    catch { toast.error("Couldn't sign out. Please try again."); }
  })} className="icon-button gap-2 px-3 text-sm disabled:opacity-50">{pending ? <LoaderCircle size={18} className="animate-spin" /> : <LogOut size={18} />}{showLabel && "Use a different account · Sign out"}</button>;
}