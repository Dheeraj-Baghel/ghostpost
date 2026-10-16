"use client";
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Plus, LogOut, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createRoom, joinRoom, leaveRoom, manageRoomKey } from "@/app/actions/rooms";
import type { RoomKey } from "@/lib/types";
import { Button, ConfirmDialog, Field, FormMessage, inputClass } from "./ui";

export function RoomEntry({ count }: { count: number }) {
  const router = useRouter();
  const [name, setName] = useState(""); const [code, setCode] = useState("");
  const [error, setError] = useState<string>(); const [pending, start] = useTransition();
  function submit(event: FormEvent, mode: "create" | "join") {
    event.preventDefault(); setError(undefined);
    start(async () => { try {
      const result = mode === "create" ? await createRoom(name) : await joinRoom(code);
      if (result.error) { setError(result.error); return; }
      toast.success(result.success); setCode("");
      router.push(`/rooms/${result.id}/${mode === "create" ? "admin" : "feed"}`); router.refresh();
    } catch { setError("The room request could not be completed. Please try again."); } });
  }
  return <section className="mt-10" aria-label="Join or create a room"><div className="grid gap-6 md:grid-cols-2">
    <form id="join-room" onSubmit={e => submit(e, "join")} className="scroll-mt-24 space-y-4 rounded-[32px] bg-surface p-6 sm:p-8"><KeyRound aria-hidden="true" /><h2 className="section-title">Got a room key?</h2><p className="text-sm leading-6 text-muted">Ask your group&apos;s moderator for the private key. You only need it when joining, not every time you sign in.</p><Field label="Room key" id="room-code"><input id="room-code" value={code} onChange={e => setCode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} minLength={12} maxLength={128} required disabled={pending} className={inputClass} placeholder="Paste your room key" /></Field><Button type="submit" pending={pending}>Join room</Button></form>
    <form onSubmit={e => submit(e, "create")} className="space-y-4 rounded-[32px] bg-surface p-6 sm:p-8"><Plus aria-hidden="true" /><h2 className="section-title">Make space for your people.</h2><p className="text-sm leading-6 text-muted">Friends, hobbies, classmates, anything. You become the moderator and control the key. Created rooms count toward your six-room limit.</p><Field label="Room name" id="room-name"><input id="room-name" value={name} onChange={e => setName(e.target.value)} maxLength={60} required disabled={pending || count >= 6} className={inputClass} placeholder="The weekend crew" /></Field><Button type="submit" pending={pending} disabled={count >= 6}>Create room</Button><p className="text-xs leading-5 text-muted">Moderators cannot leave their own room in this version. Each room has up to 25 members.</p></form>
  </div><div className="mt-4"><FormMessage error={error} /></div>{count >= 6 && <p className="mt-4 text-sm text-muted">You belong to six rooms. Leave a room before creating or joining another. Reopening a room you already belong to does not use another slot.</p>}</section>;
}
export function LeaveRoomButton({ roomId, name }: { roomId: string; name: string }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [pending, start] = useTransition();
  function leave() { start(async () => { try {
    const result = await leaveRoom(roomId); if (result.error) { toast.error(result.error); return; }
    toast.success(result.success); setOpen(false); router.refresh();
  } catch { toast.error("Could not leave the room. Please try again."); } }); }
  return <><Button variant="ghost" onClick={() => setOpen(true)} aria-label={`Leave ${name}`}><LogOut size={16} />Leave</Button><ConfirmDialog open={open} onOpenChange={setOpen} title={`Leave ${name}?`} description="You will lose access immediately. Your existing posts and comments stay. To return, you need a valid key and available capacity; your room nickname will be restored." onConfirm={leave} pending={pending} /></>;
}
export function RoomKeyManager({ roomId, current }: { roomId: string; current: RoomKey | null }) {
  const router = useRouter(); const [label, setLabel] = useState(current?.label ?? "Room invitation"); const [days, setDays] = useState(30);
  const [code, setCode] = useState<string>(); const [error, setError] = useState<string>(); const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<"rotate" | "revoke" | null>(null);
  function act(action: string) { setError(undefined); start(async () => { try {
    const result = await manageRoomKey(roomId, action, label, days);
    if (result.error) { setError(result.error); return; }
    if (["generate", "rotate", "revoke"].includes(action)) setCode(result.code);
    setConfirm(null); toast.success(result.success); router.refresh();
  } catch { setError("The key could not be updated. Please try again."); } }); }
  const usable = current && !current.revoked;
  return <section className="space-y-5 rounded-[32px] bg-surface p-6 sm:p-8" aria-labelledby="key-heading"><div className="flex items-center gap-3"><KeyRound /><h2 id="key-heading" className="section-title">Room key</h2></div>
    <p className="text-sm leading-6 text-muted">Only moderators manage this key. Share it privately. Changing or deleting it never removes existing members. Keys are random, stored only as hashes, and cannot be retrieved after you leave this page.</p>
    <p className="text-sm font-medium">{current ? current.revoked ? "Joining disabled: key deleted." : `Expires ${new Date(current.expires_at).toLocaleDateString("en", { timeZone: "UTC" })} (UTC) · ${current.uses} joins used` : "No key generated yet. Generate one to invite your group."}</p>
    <Field label="Key label" id="key-label"><input id="key-label" className={inputClass} value={label} onChange={e => setLabel(e.target.value)} maxLength={100} disabled={pending} /></Field>
    <Field label="Validity from now" id="key-days"><select id="key-days" className={inputClass} value={days} onChange={e => setDays(Number(e.target.value))} disabled={pending}>{[1,7,30,90].map(d => <option key={d} value={d}>{d} {d === 1 ? "day" : "days"}</option>)}</select></Field>
    <div className="flex flex-wrap gap-3">{usable ? <><Button onClick={() => setConfirm("rotate")} disabled={pending}><RefreshCw size={16} />Replace key</Button><Button variant="secondary" onClick={() => act("update")} disabled={pending}>Save key settings</Button><Button variant="secondary" onClick={() => act("renew")} disabled={pending}>Renew key</Button><Button variant="danger" onClick={() => setConfirm("revoke")} disabled={pending}><Trash2 size={16} />Delete key</Button></> : <Button onClick={() => act("generate")} pending={pending}>Generate key</Button>}</div>
    <FormMessage error={error} />
    {code && <div className="space-y-3 rounded-[16px] border border-border bg-canvas p-5" role="status"><p className="text-sm font-semibold">Copy your new key now</p><p className="break-all font-mono text-base" data-testid="new-room-key">{code}</p><Button variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(code); toast.success("Key copied. Share it privately."); } catch { toast.error("Clipboard unavailable. Select and copy the key manually."); } }}><Copy size={16} />Copy key</Button></div>}
    <ConfirmDialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null); }} title={confirm === "revoke" ? "Delete this room key?" : "Replace this room key?"} description={confirm === "revoke" ? "All existing keys for this room stop accepting new members immediately. Current members keep access. Generate a new key to reopen joining." : "All old room keys will stop working immediately. Copy and privately share the new key. Current members keep access."} onConfirm={() => { if (confirm) act(confirm); }} pending={pending} />
  </section>;
}
