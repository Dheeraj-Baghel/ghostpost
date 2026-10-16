"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AuthForm } from "./auth-form";

// Marketing entry opens over the actual page. Direct /login and /signup remain
// available for callbacks, deep links and the existing session/route protection.
export function AuthEntry({ mode, configured, children, className }: { mode: "login" | "signup"; configured: boolean; children: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger className={className}>{children}</Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-scrim fixed inset-0 z-40" />
      <Dialog.Content className="modal-card z-50">
        <Dialog.Title className="sr-only">{mode === "login" ? "Sign in to GhostPost" : "Join GhostPost"}</Dialog.Title>
        <Dialog.Description className="sr-only">Private rooms for your people. Continue with Google or use email.</Dialog.Description>
        <Dialog.Close aria-label="Close authentication" className="icon-button absolute right-3 top-3"><X size={20} /></Dialog.Close>
        <AuthForm mode={mode} configured={configured} embedded />
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
