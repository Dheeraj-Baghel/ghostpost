"use client";
import { Button } from "@/components/ui";
import { Ghost } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <main id="main" className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-5 px-6 text-center"><Ghost size={44} /><h1 className="text-2xl font-bold">A little ghost in the machine.</h1><p className="text-sm leading-6 text-muted">We couldn&apos;t load this page. Check your connection and try again. If this keeps happening, ask the app operator to check Supabase and the private-rooms migration.</p><Button onClick={reset}>Try again</Button></main>; }