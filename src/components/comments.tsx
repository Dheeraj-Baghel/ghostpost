"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { addComment, editComment, deleteComment } from "@/app/actions/social";
import { COMMENT_LIMIT, PAGE_SIZE } from "@/lib/constants";
import type { Comment, Member } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "./brand";
import { Button, ConfirmDialog, FormMessage, inputClass, Modal } from "./ui";

export function Comments({ comments, member, postId, total }: { comments: Comment[]; member: Member; postId: string; total: number }) {
  const router = useRouter(); const [content, setContent] = useState(""); const [pending, start] = useTransition(); const [error, setError] = useState<string>();
  function submit(event: FormEvent) {
    event.preventDefault(); setError(undefined);
    start(async () => { try { const result = await addComment(member.room_id, postId, content); if (result.error) { setError(result.error); return; } toast.success(result.success); setContent(""); router.push(`/rooms/${member.room_id}/post/${postId}?page=${Math.floor(total / PAGE_SIZE)}#comments`, { scroll: false }); router.refresh(); } catch { setError("Your reply didn't save. Please try again."); } });
  }
  return <section id="comments" className="scroll-mt-24">
    <div className="mb-6 mt-10 flex items-baseline gap-3"><h2 className="text-[22px] font-semibold">The conversation</h2><span className="text-sm text-muted">{total} {total === 1 ? "reply" : "replies"}</span></div>
    <form onSubmit={submit} className="mb-8 space-y-4 rounded-[16px] bg-surface p-5 sm:p-6">
      <div className="flex items-center gap-3"><Avatar alias={member.alias} size="small" /><label htmlFor="reply" className="min-w-0 break-words text-sm text-muted">Reply as <span className="font-semibold text-ink">{member.alias}</span></label></div>
      <textarea id="reply" value={content} onChange={e => setContent(e.target.value)} placeholder="Add to the conversation…" maxLength={COMMENT_LIMIT} rows={3} className={`${inputClass} leading-6`} required disabled={pending} />
      <FormMessage error={error} /><div className="flex items-center justify-between"><span className="text-xs text-muted">{content.length}/{COMMENT_LIMIT}</span><Button type="submit" pending={pending} disabled={!content.trim()}><Send size={16} />Post reply</Button></div>
    </form>
    {comments.length === 0 ? <div className="rounded-[16px] bg-surface p-8 text-center"><p className="text-sm text-muted">No replies yet. Start the conversation.</p></div> : <div className="divide-y divide-border">{comments.map(comment => <CommentCard key={comment.id} comment={comment} roomId={member.room_id} />)}</div>}
  </section>;
}

function CommentCard({ comment, roomId }: { comment: Comment; roomId: string }) {
  const router = useRouter(); const [editing, setEditing] = useState(false); const [deleting, setDeleting] = useState(false); const [content, setContent] = useState(comment.content); const [pending, start] = useTransition(); const [error, setError] = useState<string>();
  function save(event: FormEvent) { event.preventDefault(); setError(undefined); start(async () => { try { const result = await editComment(roomId, comment.id, comment.post_id, content); if (result.error) { setError(result.error); return; } toast.success(result.success); setEditing(false); router.refresh(); } catch { setError("Could not save your comment."); } }); }
  function remove() { start(async () => { try { const result = await deleteComment(roomId, comment.id, comment.post_id); if (result.error) { toast.error(result.error); return; } toast.success(result.success); setDeleting(false); router.refresh(); } catch { toast.error("Could not delete your comment."); } }); }
  return <article className="py-6">
    <header className="flex items-center gap-3"><Avatar alias={comment.author_alias} size="small" /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{comment.author_alias}{comment.is_owner && <span className="ml-2 text-xs font-normal text-muted">you</span>}</p><p className="mt-1 text-xs text-muted"><time dateTime={comment.created_at}>{timeAgo(comment.created_at)}</time>{comment.updated_at !== comment.created_at && " · edited"}</p></div>{comment.is_owner && <div className="flex items-center"><button aria-label="Edit comment" className="icon-button" onClick={() => { setContent(comment.content); setError(undefined); setEditing(true); }}><Pencil size={16} /></button><button aria-label="Delete comment" className="icon-button" onClick={() => setDeleting(true)}><Trash2 size={16} /></button></div>}</header>
    <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-body">{comment.content}</p>
    <Modal open={editing} onOpenChange={setEditing} title="Edit your reply" description="Update your comment below."><form onSubmit={save} className="space-y-4"><label htmlFor={`edit-${comment.id}`} className="sr-only">Comment text</label><textarea id={`edit-${comment.id}`} value={content} onChange={e => setContent(e.target.value)} required maxLength={COMMENT_LIMIT} rows={4} className={inputClass} disabled={pending} /><FormMessage error={error} /><Button type="submit" pending={pending}>Save comment</Button></form></Modal>
    <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Delete this reply?" description="Your comment will be permanently removed. This cannot be undone." onConfirm={remove} pending={pending} />
  </article>;
}
