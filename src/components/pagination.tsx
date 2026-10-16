import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { secondaryClass } from "@/lib/styles";

export function Pagination({ page, hasMore, base, params = {}, anchor = "" }: { page: number; hasMore: boolean; base: string; params?: Record<string, string>; anchor?: string }) {
  if (!page && !hasMore) return null;
  function url(n: number) { const query = new URLSearchParams({ ...params, page: String(n) }); return `${base}?${query}${anchor}`; }
  return <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">{page > 0 ? <Link href={url(page - 1)} className={`${secondaryClass} text-xs`}><ArrowLeft size={14} />Previous</Link> : <span />}<span className="text-xs text-muted">Page {page + 1}</span>{hasMore ? <Link href={url(page + 1)} className={`${secondaryClass} text-xs`}>Next<ArrowRight size={14} /></Link> : <span />}</nav>;
}