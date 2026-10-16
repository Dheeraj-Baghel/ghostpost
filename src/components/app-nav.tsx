"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";
export function AppNav({ member, rooms }: { member: Member; rooms: Member[] }) {
  const path = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  const base = `/rooms/${member.room_id}`;
  const links = [{ href: "/rooms", label: "My rooms" }, { href: `${base}/feed`, label: "Conversations" }, ...(member.is_admin ? [{ href: `${base}/admin`, label: "Moderation" }] : [])];
  const roomSelect = (id: string) => <><label htmlFor={id} className="sr-only">Switch room</label><select id={id} value={member.room_id} onChange={e => { setOpen(false); router.push(`/rooms/${e.target.value}/feed`); }} className="min-h-11 max-w-[180px] rounded-[16px] border border-border bg-surface px-3 text-sm">{rooms.map(room => <option key={room.room_id} value={room.room_id}>{room.name}</option>)}</select></>;
  return <>
    <nav aria-label="Room navigation" className="hidden items-center gap-1 lg:flex">{links.map(link => <Link key={link.href} href={link.href} aria-current={path === link.href ? "page" : undefined} className={cn("inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold", path === link.href ? "bg-ink text-white" : "text-body hover:bg-surface")}>{link.label}</Link>)}{roomSelect("desktop-room")}</nav>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger aria-label="Open room navigation" className="icon-button lg:hidden"><Menu size={22} /></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="modal-scrim fixed inset-0 z-40" /><Dialog.Content className="fixed inset-y-0 left-0 z-50 w-[min(320px,90vw)] rounded-r-[32px] bg-canvas p-8"><Dialog.Title className="mt-4 break-words text-[22px] font-semibold">{member.name}</Dialog.Title><Dialog.Description className="mb-6 mt-2 text-sm text-muted">Private conversations, your people.</Dialog.Description><Dialog.Close className="icon-button absolute right-3 top-3" aria-label="Close navigation"><X size={20} /></Dialog.Close>{roomSelect("mobile-room")}<nav aria-label="Mobile room navigation" className="mt-6 flex flex-col gap-2">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} aria-current={path === link.href ? "page" : undefined} className={cn("min-h-11 rounded-[16px] px-4 py-3 text-base font-semibold", path === link.href ? "bg-ink text-white" : "hover:bg-surface")}>{link.label}</Link>)}</nav></Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
