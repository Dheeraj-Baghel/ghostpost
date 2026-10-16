"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MessageSquareText, Plus, Send, Vote, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { createPost, editPost } from "@/app/actions/social";
import { CATEGORIES, POST_LIMIT, type Category } from "@/lib/constants";
import type { Member, Post } from "@/lib/types";
import { Avatar } from "./brand";
import { Button, Field, FormMessage, inputClass, Modal } from "./ui";
import { cn } from "@/lib/utils";
import { primaryClass } from "@/lib/styles";

export function Composer({ member, trigger, initialPoll = false }: { member: Member; trigger?: ReactNode; initialPoll?: boolean }) {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)} className={trigger ? "min-h-11 w-full rounded-[16px] text-left" : primaryClass}>{trigger || <><Plus size={18} />Create post</>}</button><ComposerDialog open={open} onOpenChange={setOpen} member={member} initialPoll={initialPoll} /></>;
}

export function ComposerDialog({ open, onOpenChange, member, post, initialPoll }: { open: boolean; onOpenChange: (open: boolean) => void; member: Member; post?: Post; initialPoll?: boolean }) {
  return <Modal open={open} onOpenChange={onOpenChange} title={post ? "Edit your post" : "What's on your mind?"} description={post ? "Update your words. Your nickname stays the same." : "A thought, a question, or something to put to a vote."}>
    {open && <ComposerForm member={member} post={post} initialPoll={initialPoll} onDone={() => onOpenChange(false)} />}
  </Modal>;
}

function ComposerForm({ member, post, initialPoll = false, onDone }: { member: Member; post?: Post; initialPoll?: boolean; onDone: () => void }) {
  const router = useRouter();
  const [content, setContent] = useState(post?.content || "");
  const [category, setCategory] = useState<Category>(post?.category || "General");
  const [poll, setPoll] = useState(!!post?.poll || initialPoll);
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const frozen = !!post?.poll?.has_votes;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(undefined);
    start(async () => {
      try {
        const result = post ? await editPost(member.room_id, post.id, content, category) : await createPost(member.room_id, { content, category, ...(poll ? { options } : {}) });
        if (result.error) { setError(result.error); return; }
        toast.success(result.success); onDone();
        if (!post && result.id) router.push(`/rooms/${member.room_id}/post/${result.id}`);
        router.refresh();
      } catch { setError("We couldn't save this thought. Please try again."); }
    });
  }
  return <form onSubmit={submit} className="space-y-5">
    <div className="flex items-center gap-3"><Avatar alias={member.alias} /><div><p className="text-sm font-semibold">{member.alias}</p><p className="mt-0.5 text-xs text-muted">Posting as your ghost</p></div></div>
    {!post && <div className="grid grid-cols-2 gap-2 rounded-[16px] bg-surface p-1" role="group" aria-label="Post type"><button type="button" disabled={pending} aria-pressed={!poll} onClick={() => setPoll(false)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-[16px] py-3 text-sm font-semibold", !poll ? "bg-ink text-white" : "text-body")}><MessageSquareText size={16} />Thought</button><button type="button" disabled={pending} aria-pressed={poll} onClick={() => setPoll(true)} className={cn("flex min-h-11 items-center justify-center gap-2 rounded-[16px] py-3 text-sm font-semibold", poll ? "bg-ink text-white" : "text-body")}><Vote size={16} />Poll</button></div>}
    <Field label={poll ? "Your question" : "Your thought"} id="post-content"><textarea id="post-content" value={content} onChange={e => setContent(e.target.value)} required maxLength={POST_LIMIT} rows={poll ? 3 : 5} disabled={pending || frozen} placeholder={poll ? "Let the room settle this…" : "The thought you almost didn't share…"} className={`${inputClass} leading-6`} /><div className="flex items-center justify-between gap-3 text-xs text-muted"><span>{frozen ? "This poll has votes, so its question is locked." : "Keep it kind. Keep it real."}</span><span>{content.length}/{POST_LIMIT}</span></div></Field>
    <Field label="Category" id="category"><select id="category" value={category} disabled={pending} onChange={e => setCategory(e.target.value as Category)} className={inputClass}>{CATEGORIES.map(value => <option key={value}>{value}</option>)}</select></Field>
    {poll && !post && <fieldset className="space-y-3"><legend className="mb-2 text-sm font-semibold">Poll options</legend>{options.map((option, index) => <div key={index} className="flex items-center gap-2"><input aria-label={`Option ${index + 1}`} value={option} placeholder={`Option ${index + 1}`} required maxLength={120} disabled={pending} onChange={e => setOptions(prev => prev.map((value, i) => i === index ? e.target.value : value))} className={inputClass} />{options.length > 2 && <button type="button" disabled={pending} aria-label={`Remove option ${index + 1}`} onClick={() => setOptions(prev => prev.filter((_, i) => i !== index))} className="icon-button shrink-0"><X size={18} /></button>}</div>)}{options.length < 4 && <Button type="button" variant="ghost" disabled={pending} onClick={() => setOptions(prev => [...prev, ""])}><Plus size={16} />Add option</Button>}<p className="text-xs leading-5 text-muted">One vote per ghost. Options are fixed once published. Results appear after voting.</p></fieldset>}
    <FormMessage error={error} />
    <div className="modal-actions flex flex-wrap items-center justify-between gap-3 border-t border-border"><span className="flex items-center gap-1.5 text-xs text-muted"><ShieldCheck size={14} /> Room members only</span><Button type="submit" pending={pending}>{post ? "Save changes" : "Post anonymously"}<Send size={16} /></Button></div>
  </form>;
}