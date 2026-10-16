import { ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getReports, parsePage } from "@/lib/data";
import { ReportCard } from "@/components/moderation";
import { Pagination } from "@/components/pagination";
import { RoomKeyManager } from "@/components/room-controls";
import type { RoomKey } from "@/lib/types";
export const metadata = { title: "Room moderation" };
export default async function Admin({ params, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { roomId } = await params;
  const { supabase } = await requireAdmin(roomId);
  const page = parsePage((await searchParams).page);
  const reports = await getReports(supabase, roomId, page);
  const key = await supabase.rpc("room_key", { p_room_id: roomId });
  if (key.error) throw new Error("Room key settings could not be loaded.");
  return <div className="mx-auto max-w-[860px]"><p className="mb-4 flex items-center gap-2 text-sm text-muted"><ShieldCheck size={18} /> Room moderator</p><h1 className="page-title">Keep the good ghost energy.</h1><p className="mb-10 mt-4 max-w-xl text-base leading-7 text-body">Only this room&apos;s moderators manage its key and reports. Account mappings and reporter identities are never shown here.</p><RoomKeyManager key={roomId} roomId={roomId} current={key.data as RoomKey | null} /><h2 className="section-title mb-6 mt-10">Reported posts</h2>{reports.items.length ? <div className="space-y-4">{reports.items.map(report => <ReportCard key={report.id} report={report} roomId={roomId} />)}</div> : <div className="rounded-[32px] bg-surface px-6 py-16 text-center"><ShieldCheck size={44} className="mx-auto mb-6" strokeWidth={1.5} /><h2 className="section-title">All clear on this page.</h2><p className="mt-4 text-base leading-7 text-muted">No open reports to review. Thanks for looking after the conversation.</p></div>}<Pagination base={`/rooms/${roomId}/admin`} page={page} hasMore={reports.has_more} /></div>;
}
