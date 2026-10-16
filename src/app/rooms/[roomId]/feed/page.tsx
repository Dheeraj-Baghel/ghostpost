import Link from "next/link";
import { Ghost } from "lucide-react";
import { requireMember } from "@/lib/auth";
import { getFeed, parsePage } from "@/lib/data";
import { CATEGORIES, type Category } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Composer } from "@/components/composer";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { Notice } from "@/components/notice";
export const metadata = { title: "Room conversations" };
export default async function Feed({ params: routeParams, searchParams }: { params: Promise<{ roomId: string }>; searchParams: Promise<{ sort?: string; category?: string; page?: string; notice?: string }> }) {
  const { roomId } = await routeParams;
  const { supabase, member } = await requireMember(roomId);
  const params = await searchParams;
  const sort = params.sort === "trending" ? "trending" : "latest";
  const category = CATEGORIES.includes(params.category as Category) ? params.category as Category : null;
  const page = parsePage(params.page);
  const feed = await getFeed(supabase, roomId, sort, category, page);
  function url(s: string, c: string | null) { const q = new URLSearchParams({ sort: s }); if (c) q.set("category", c); return `/rooms/${roomId}/feed?${q}`; }
  return <><Notice notice={params.notice} />
    <div className="mb-8 flex flex-wrap items-end justify-between gap-6 sm:mb-10"><div className="min-w-0"><p className="mb-3 text-sm text-muted">Your private corner of the internet</p><h1 className="page-title break-words">{member.name}</h1><p className="mt-4 text-base text-body">Something on your mind? You&apos;re in good company.</p></div><Composer member={member} /></div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border"><nav aria-label="Feed order" className="flex gap-8">{["latest", "trending"].map(value => <Link key={value} href={url(value, category)} aria-current={sort === value ? "page" : undefined} className={cn("inline-flex min-h-12 items-center border-b-[3px] pb-2 text-base font-semibold", sort === value ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink")}>{value === "latest" ? "Latest" : "Trending"}</Link>)}</nav><span className="pb-3 text-xs text-muted">Private conversations · {member.member_count}/25 members</span></div>
    <nav aria-label="Category filters" className="mb-8 flex flex-wrap gap-2">{[null, ...CATEGORIES].map(value => <Link key={value || "all"} href={url(sort, value)} aria-current={category === value ? "page" : undefined} className="filter-chip">{value || "All thoughts"}</Link>)}</nav>
    {sort === "trending" && <p className="mb-5 text-sm leading-6 text-muted">Recent reactions + 2× replies, with a freshness boost. Rankings change as people join in.</p>}
    {feed.items.length ? <div className="conversation-grid" data-testid="conversation-grid">{feed.items.map(post => <PostCard key={post.id} post={post} member={member} />)}</div> : <section className="rounded-[32px] bg-surface px-6 py-16 text-center"><Ghost size={48} strokeWidth={1.5} className="mx-auto mb-6" /><h2 className="section-title">A little quiet in here.</h2><p className="mx-auto mt-4 max-w-sm text-base leading-7 text-muted">{category ? `No ${category.toLowerCase()} posts on this page yet. Try another category, or share the first thought.` : "No conversations yet. Use Create post above to start one."}</p></section>}
    <Pagination page={page} hasMore={feed.has_more} base={`/rooms/${roomId}/feed`} params={{ sort, ...(category ? { category } : {}) }} />
  </>;
}
