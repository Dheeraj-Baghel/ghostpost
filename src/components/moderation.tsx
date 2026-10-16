"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { moderateReport } from "@/app/actions/social";
import type { Report } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Avatar } from "./brand";
import { Button, ConfirmDialog } from "./ui";

export function ReportCard({ report, roomId }: { report: Report; roomId: string }) {
  const router = useRouter(); const [deleting, setDeleting] = useState(false); const [pending, start] = useTransition();
  function act(action: "remove" | "dismiss") { start(async () => { try { const result = await moderateReport(roomId, report.id, action); if (result.error) { toast.error(result.error); return; } toast.success(result.success); setDeleting(false); router.refresh(); } catch { toast.error("Moderation action failed. Please try again."); } }); }
  return <article className="rounded-[16px] bg-surface p-5 sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-2 text-sm font-medium"><Flag size={16} />{report.reason}</span><time dateTime={report.created_at} className="text-xs text-muted">{timeAgo(report.created_at)}</time></div>
    <div className="rounded-[16px] bg-canvas p-5"><div className="flex items-center gap-3"><Avatar alias={report.post.author_alias} size="small" /><span className="min-w-0 break-words text-sm font-semibold">{report.post.author_alias}</span><Link href={`/rooms/${roomId}/post/${report.post_id}`} aria-label="Open reported post" className="icon-button ml-auto shrink-0"><ExternalLink size={18} /></Link></div><p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-body">{report.post.content}</p></div>
    <p className="mb-5 mt-4 text-sm leading-6 text-muted">Review the context before acting. Removing a post resolves all reports on it. Dismissing this report leaves the post in place.</p>
    <div className="flex flex-wrap justify-end gap-3"><Button variant="secondary" onClick={() => act("dismiss")} disabled={pending}><Check size={16} />Dismiss report</Button><Button variant="danger" onClick={() => setDeleting(true)} disabled={pending}><Trash2 size={16} />Remove post</Button></div>
    <ConfirmDialog open={deleting} onOpenChange={setDeleting} title="Remove this reported post?" description="This permanently deletes the post, all comments, reactions, votes, and reports attached to it. There is no undo." onConfirm={() => act("remove")} pending={pending} />
  </article>;
}
