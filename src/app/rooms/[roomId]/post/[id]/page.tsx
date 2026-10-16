import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getComments, getPost, parsePage } from "@/lib/data";
import { idSchema } from "@/lib/validation";
import { PostCard } from "@/components/post-card";
import { Comments } from "@/components/comments";
import { Pagination } from "@/components/pagination";
export const metadata = { title: "The conversation" };
export default async function PostPage({ params, searchParams }: { params: Promise<{ roomId: string; id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id, roomId } = await params;
  const { supabase, member } = await requireMember(roomId);
  if (!idSchema.safeParse(id).success) notFound();
  const page = parsePage((await searchParams).page);
  const post = await getPost(supabase, roomId, id);
  if (!post) notFound();
  const comments = await getComments(supabase, roomId, id, page);
  return <div className="mx-auto max-w-[760px]"><Link href={`/rooms/${roomId}/feed`} className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-body hover:bg-surface"><ArrowLeft size={18} />Back to the conversation</Link><h1 className="sr-only">Post by {post.author_alias}</h1><PostCard post={post} member={member} detail /><Comments postId={id} member={member} comments={comments.items} total={post.comment_count} /><Pagination page={page} hasMore={comments.has_more} base={`/rooms/${roomId}/post/${id}`} anchor="#comments" /></div>;
}
