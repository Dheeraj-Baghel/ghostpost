"use client";

import * as Dialog from "@radix-ui/react-dialog";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { LoaderCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClass, primaryClass, secondaryClass } from "@/lib/styles";
export { inputClass } from "@/lib/styles";

export function Button({ variant = "primary", pending, children, className, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; pending?: boolean }) {
  const style = variant === "primary" ? primaryClass : variant === "secondary" ? secondaryClass : cn(buttonClass, variant === "danger" ? "bg-[#fbe9e9] text-danger hover:bg-[#f4d2d2]" : "text-ink hover:bg-elevated");
  return <button disabled={disabled || pending} aria-busy={pending || undefined} className={cn(style, className)} {...props}>{pending && <LoaderCircle className="animate-spin" size={16} aria-hidden />}{children}</button>;
}

export function Field({ label, id, children, hint }: { label: string; id: string; children: ReactNode; hint?: string }) {
  return <div className="space-y-2"><label htmlFor={id} className="block text-sm font-semibold text-ink">{label}</label>{children}{hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}</div>;
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return <p role={error ? "alert" : "status"} className={cn("rounded-[16px] p-4 text-sm leading-relaxed", error ? "bg-[#fbe9e9] text-danger" : "bg-[#c7f0da] text-[#103c25]")}>{error || success}</p>;
}

export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="modal-scrim fixed inset-0 z-40" />
    <Dialog.Content className="modal-card z-50">
      <Dialog.Title className="pr-10 text-[22px] font-semibold tracking-tight">{title}</Dialog.Title>
      <Dialog.Description className="mb-6 mt-2 pr-6 text-sm leading-relaxed text-muted">{description}</Dialog.Description>
      <Dialog.Close aria-label="Close dialog" className="icon-button absolute right-4 top-4"><X size={20} /></Dialog.Close>
      {children}
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

export function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, pending }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; onConfirm: () => void; pending?: boolean }) {
  return <AlertDialog.Root open={open} onOpenChange={onOpenChange}><AlertDialog.Portal>
    <AlertDialog.Overlay className="modal-scrim fixed inset-0 z-50" />
    <AlertDialog.Content className="modal-card z-50">
      <AlertDialog.Title className="text-xl font-bold">{title}</AlertDialog.Title>
      <AlertDialog.Description className="mt-3 text-sm leading-relaxed text-muted">{description}</AlertDialog.Description>
      <div className="mt-6 flex flex-wrap justify-end gap-3"><AlertDialog.Cancel asChild><Button variant="secondary" disabled={pending}>Cancel</Button></AlertDialog.Cancel><Button variant="danger" pending={pending} onClick={onConfirm}>Delete permanently</Button></div>
    </AlertDialog.Content>
  </AlertDialog.Portal></AlertDialog.Root>;
}

export function SkeletonCards() {
  return <div aria-label="Loading conversations" role="status" className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <div key={i} className="animate-pulse rounded-[16px] bg-surface p-6"><div className="mb-5 h-10 w-3/4 rounded-full bg-elevated" /><div className="mb-3 h-4 w-full rounded-full bg-elevated" /><div className="mb-6 h-4 w-2/3 rounded-full bg-elevated" /><div className="h-11 w-2/3 rounded-[16px] bg-elevated" /></div>)}</div>;
}