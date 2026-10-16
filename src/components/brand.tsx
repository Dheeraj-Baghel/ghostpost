import Link from "next/link";
import { Ghost } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ href = "/", small = false }: { href?: string; small?: boolean }) {
  return <Link href={href} aria-label="GhostPost home" className="inline-flex min-h-11 shrink-0 items-center gap-2 font-bold tracking-tight text-accent">
    <Ghost size={small ? 28 : 32} strokeWidth={2.2} aria-hidden />
    <span className={small ? "text-[22px]" : "text-[26px]"}>GhostPost</span>
  </Link>;
}

export function Avatar({ alias, size = "normal" }: { alias: string; size?: "small" | "normal" | "large" }) {
  const tones = ["bg-[#e5e5e0] text-ink", "bg-[#d7d7cf] text-ink", "bg-[#262622] text-white"];
  const tone = tones[Array.from(alias).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % tones.length];
  return <span aria-hidden className={cn("inline-flex shrink-0 items-center justify-center rounded-full", tone, size === "small" ? "size-8" : size === "large" ? "size-12" : "size-10")}><Ghost size={size === "small" ? 18 : size === "large" ? 27 : 23} strokeWidth={1.7} /></span>;
}