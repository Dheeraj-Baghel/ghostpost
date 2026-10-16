import Link from "next/link";
import { Ghost } from "lucide-react";
import { primaryClass } from "@/lib/styles";

export default function NotFound() { return <main id="main" className="mx-auto flex min-h-[80vh] max-w-lg flex-col items-center justify-center gap-5 px-6 text-center"><Ghost size={48} /><h1 className="text-3xl font-bold">This one vanished.</h1><p className="text-muted">The post may have been deleted, or this page never existed.</p><Link className={primaryClass} href="/feed">Back to the feed</Link></main>; }