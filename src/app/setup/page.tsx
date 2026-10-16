import Link from "next/link";
import { Cable, ArrowLeft } from "lucide-react";
import { Brand } from "@/components/brand";
import { secondaryClass } from "@/lib/styles";

export const metadata = { title: "Connect GhostPost" };
export default function Setup() {
  return <div className="mx-auto max-w-2xl px-6 py-8"><Brand /><main id="main" className="py-16">
    <Cable size={40} className="mb-6" /><p className="mb-3 text-sm text-muted">Operator setup</p><h1 className="page-title">Give your ghosts a home.</h1>
    <p className="mt-5 text-base leading-7 text-body">GhostPost needs a Supabase connection before people can join. Private room conversations are stored in PostgreSQL, not a pretend feed.</p>
    <ol className="my-8 space-y-3">{[
      "Create a Supabase project and apply the versioned SQL migrations.",
      "Set the public Supabase URL, publishable key and site URL in your local environment.",
      "Configure Google sign-in and callback URLs, then restart the app.",
      "Sign in, create a room, and generate a key from its moderation screen. Each room creator is its moderator.",
    ].map((item, i) => <li key={item} className="flex gap-4 rounded-[16px] bg-surface p-5 text-sm leading-6"><span className="text-muted">0{i + 1}</span><span className="min-w-0">{item}</span></li>)}</ol>
    <p className="mb-8 text-xs leading-5 text-muted">Full commands are in the project README. Never paste secret keys into the browser.</p><Link href="/" className={secondaryClass}><ArrowLeft size={16} /> Back to GhostPost</Link>
  </main></div>;
}
