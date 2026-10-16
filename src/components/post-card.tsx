"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Ellipsis, Flag, MessageCircle, Pencil, Trash2, Vote } from "lucide-react";
import { toast } from "sonner";
import { deletePost, reactToPost, reportPost, votePoll } from "@/app/actions/social";
import { CATEGORY_STYLES, REACTIONS, REPORT_REASONS, type Reaction } from "@/lib/constants";
import type { Member, Post } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar } from "./brand";
import { Button, ConfirmDialog, FormMessage, Modal } from "./ui";
import { ComposerDialog } from "./composer";

const reactionLabels = { like: "Like", laugh: "Laugh", fire: "Fire", shocked: "Shocked" };
// Keep the existing persisted reaction keys/labels; emoji are presentation only.
const reactionEmojis: Record<Reaction, string> = { like: "👍", laugh: "😄", fire: "🔥", shocked: "😲" };
const menuClass = "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-[16px] px-4 py-3 text-sm outline-none data-[highlighted]:bg-surface";

export function PostCard({ post, member, detail = false }: { post: Post; member: Member; detail?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<string>("");
  const [inlineError, setInlineError] = useState<string>();
  const [reactionPop, setReactionPop] = useState<Reaction | null>(null);
  const reactionInFlight = useRef(false);
  useEffect(() => {
    if (!reactionPop) return;
    // Cleanup also works when animations are disabled or the card unmounts.
    const timeout = window.setTimeout(() => setReactionPop(null), 750);
    return () => window.clearTimeout(timeout);
  }, [reactionPop]);
  const poll = post.poll;
  function react(kind: Reaction) {
    if (reactionInFlight.current || pending) return;
    reactionInFlight.current = true;
    setReactionPop(null);
    const next = post.my_reaction === kind ? null : kind;
    start(async () => {
      try {
        const result = await reactToPost(member.room_id, post.id, next);
        if (result.error) { toast.error(result.error); return; }
        // Celebrate successful additions/changes only, not removals or errors.
        if (next) setReactionPop(next);
        router.refresh();
      } catch { toast.error("Reaction didn't save. Please try again."); }
      finally { reactionInFlight.current = false; }
    });
  }
  function remove() {
    start(async () => { try { const result = await deletePost(member.room_id, post.id); if (result.error) { toast.error(result.error); setDeleting(false); return; } toast.success(result.success); setDeleting(false); if (detail) router.push(`/rooms/${member.room_id}/feed`); router.refresh(); } catch { toast.error("Couldn't delete the post. Please try again."); } });
  }
  function vote(event: FormEvent) {
    event.preventDefault(); if (!poll || !selected) return;
    setInlineError(undefined);
    start(async () => { try { const result = await votePoll(member.room_id, post.id, poll.id, selected); if (result.error) { setInlineError(result.error); return; } toast.success(result.success); router.refresh(); } catch { setInlineError("Your vote didn't save. Please try again."); } });
  }
  return <article data-testid="post-card" className={cn("rounded-[16px] bg-surface p-5 sm:p-6", detail && "rounded-[32px] sm:p-8")}>
    <header className="flex items-center gap-3">
      <Avatar alias={post.author_alias} size="small" />
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-semibold leading-5">{post.author_alias}{post.is_owner && <span className="ml-2 text-xs font-normal text-muted">you</span>}</p>
        <p className="mt-1 text-xs text-muted"><time dateTime={post.created_at} title={new Date(post.created_at).toLocaleString()}>{timeAgo(post.created_at)}</time>{post.updated_at !== post.created_at && " · edited"}</p>
      </div>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger aria-label={`Post options for ${post.author_alias}`} className="icon-button shrink-0"><Ellipsis size={22} /></DropdownMenu.Trigger>
        <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={6} className="z-30 min-w-48 rounded-[16px] border border-border bg-canvas p-2">
          {post.is_owner && <><DropdownMenu.Item className={menuClass} onSelect={() => setEditing(true)}><Pencil size={16} />Edit post</DropdownMenu.Item><DropdownMenu.Item className={`${menuClass} text-danger`} onSelect={() => setDeleting(true)}><Trash2 size={16} />Delete post</DropdownMenu.Item><DropdownMenu.Separator className="my-1 h-px bg-border" /></>}
          <DropdownMenu.Item className={cn(menuClass, post.has_reported && "text-muted")} disabled={post.has_reported} onSelect={() => setReporting(true)}><Flag size={16} />{post.has_reported ? "Report submitted" : "Report post"}</DropdownMenu.Item>
        </DropdownMenu.Content></DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
    <div className="mb-5 mt-6 flex items-center gap-2"><span className={cn("inline-flex rounded-full px-3 py-1.5 text-xs font-medium", CATEGORY_STYLES[post.category])}>{post.category}</span>{poll && <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Vote size={15} />Poll</span>}</div>
    <div className={cn("mb-6 whitespace-pre-wrap break-words text-base leading-[1.65] text-body", poll && "text-[22px] font-semibold leading-snug text-ink", !poll && post.content.length < 190 && "text-[22px] font-semibold leading-[1.35] text-ink", detail && !poll && "text-xl")}>{post.content}</div>
    {poll && <div className="mb-6">
      {poll.my_option_id ? <div className="space-y-2" aria-label="Poll results">
        {poll.options.map(option => {
          const votes = option.votes ?? 0;
          const percentage = poll.total_votes ? Math.round(votes / poll.total_votes * 100) : 0;
          const mine = option.id === poll.my_option_id;
          return <div key={option.id} className={cn("relative min-h-12 overflow-hidden rounded-[16px] border bg-canvas px-4 py-3", mine ? "border-ink" : "border-border")}>
            <div className={cn("absolute inset-y-0 left-0", mine ? "bg-[#d6d6ce]" : "bg-elevated")} style={{ width: `${percentage}%` }} />
            <div className="relative flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2 break-words">{mine && <Check size={16} className="shrink-0" />}{option.label}</span><span className="shrink-0 text-xs tabular-nums text-body">{votes} · {percentage}%</span></div>
          </div>;
        })}
        <p className="pt-2 text-xs text-muted">{poll.total_votes} {poll.total_votes === 1 ? "vote" : "votes"} · Your vote is in</p>
      </div> : <form onSubmit={vote}>
        <fieldset disabled={pending} className="space-y-2"><legend className="sr-only">Choose one answer</legend>{poll.options.map(option => <label key={option.id} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] border bg-canvas px-4 py-3 text-sm", selected === option.id ? "border-ink" : "border-border hover:border-[#91918c]")}><input type="radio" name={`poll-${poll.id}`} value={option.id} required checked={selected === option.id} onChange={() => setSelected(option.id)} className="size-4 shrink-0 accent-black" /><span className="min-w-0 break-words">{option.label}</span></label>)}</fieldset>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted">Vote to see results</span><Button type="submit" variant="secondary" pending={pending} disabled={!selected}>Cast vote</Button></div>
      </form>}
      <div className="mt-2"><FormMessage error={inlineError} /></div>
    </div>}
    <footer className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border pt-3">
      <div role="group" aria-label="Post reactions" className="flex items-center gap-1">{REACTIONS.map(kind => {
        const active = post.my_reaction === kind;
        return <button key={kind} aria-label={`${reactionLabels[kind]}: ${post.reactions[kind]}`} aria-pressed={active} aria-busy={pending || undefined} title={reactionLabels[kind]} disabled={pending} onClick={() => react(kind)} className={cn("relative inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-2 text-xs tabular-nums transition-colors disabled:opacity-50", active ? "bg-ink text-white" : "text-body hover:bg-elevated")}>
          <span aria-hidden="true" className="reaction-icon">
            <span className={cn("reaction-emoji", reactionPop === kind && "reaction-bounce")}>{reactionEmojis[kind]}</span>
            {reactionPop === kind && <span className="reaction-pop" data-testid="reaction-pop">{reactionEmojis[kind]}</span>}
          </span>
          <span>{post.reactions[kind]}</span>
        </button>;
      })}</div>
      <Link href={`/rooms/${member.room_id}/post/${post.id}#comments`} aria-label={`${post.comment_count} ${post.comment_count === 1 ? "reply" : "replies"}`} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-xs text-body hover:bg-elevated"><MessageCircle size={17} /><span>{post.comment_count}</span><span className="sr-only">replies</span></Link>
    </footer>
    <ComposerDialog open={editing} onOpenChange={setEditing} post={post} member={member} />
    <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete this post?" description="This permanently deletes your post, its comments, and any reactions or poll votes. There's no undo." onConfirm={remove} pending={pending} />
    <Modal open={reporting} onOpenChange={setReporting} title="Report this post" description="Your report is private. This room's moderator will review the post. The author won't see who reported it.">{reporting && <ReportForm roomId={member.room_id} id={post.id} onDone={() => setReporting(false)} />}</Modal>
  </article>;
}

function ReportForm({ roomId, id, onDone }: { roomId: string; id: string; onDone: () => void }) {
  const router = useRouter(); const [reason, setReason] = useState(""); const [error, setError] = useState<string>(); const [pending, start] = useTransition();
  return <form onSubmit={event => { event.preventDefault(); setError(undefined); start(async () => { try { const result = await reportPost(roomId, id, reason); if (result.error) { setError(result.error); return; } toast.success(result.success); onDone(); router.refresh(); } catch { setError("Report couldn't be sent. Please try again."); } }); }} className="space-y-4">
    <fieldset className="space-y-2" disabled={pending}><legend className="sr-only">Report reason</legend>{REPORT_REASONS.map(value => <label key={value} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[16px] border border-border p-4 text-sm"><input type="radio" name="reason" value={value} required checked={reason === value} onChange={() => setReason(value)} className="size-4 accent-black" />{value}</label>)}</fieldset>
    <FormMessage error={error} /><Button type="submit" pending={pending} disabled={!reason} className="w-full"><Flag size={16} />Send report</Button>
  </form>;
}
