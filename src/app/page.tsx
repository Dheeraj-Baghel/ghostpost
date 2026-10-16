import Link from "next/link";
import { ArrowDown, ArrowUpRight, Ghost, LockKeyhole } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthEntry } from "@/components/auth-entry";
import { primaryClass, secondaryClass } from "@/lib/styles";
import { supabaseConfig } from "@/lib/supabase/config";

// These are explicitly labelled editorial examples, never a simulated live feed.
const samples = [
  { category: "Confession", text: "I still practise saying 'quick question' before asking a quick question.", alias: "chai-phantom", color: "bg-surface", height: "min-h-[260px]" },
  { category: "Hot Take", text: "Cancelled plans and a good book are an underrated weekend.", alias: "midnight-ghost", color: "bg-[#262622] text-white", height: "min-h-[320px]" },
  { category: "Question", text: "What is one small thing that made your day?", alias: "cosmic-potato", color: "bg-[#e5e5e0]", height: "min-h-[290px]" },
  { category: "Funny", text: "My most-used skill? Looking for the tab I just closed.", alias: "pixel-bhoot", color: "bg-surface", height: "min-h-[240px]" },
];

export default function LandingPage() {
  const configured = !!supabaseConfig();
  return <div className="bg-background">
    <header className="sticky top-0 z-20 bg-canvas">
      <div className="mx-auto flex min-h-[72px] max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <Brand small />
        <nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-6">
          <a href="#how-it-works" className="hidden min-h-11 items-center text-sm font-semibold md:inline-flex">How it works</a>
          <AuthEntry mode="login" configured={configured} className="inline-flex min-h-11 items-center rounded-[16px] px-3 text-sm font-semibold hover:bg-surface">Sign in</AuthEntry>
          <AuthEntry mode="signup" configured={configured} className={primaryClass}>Sign up</AuthEntry>
        </nav>
      </div>
    </header>
    <main id="main">
      <section className="mx-auto max-w-[1280px] px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="mb-6 text-sm font-medium text-muted">For your people, not the whole internet.</p>
          <h1 className="display-title text-balance">Less small talk.<br />More real talk.</h1>
          <p className="mx-auto mt-6 max-w-[390px] text-base leading-6 text-body">Private rooms to share a thought, ask a question, or get something off your chest. Friends, hobbies, classmates. Your kind of people.</p>
          <AuthEntry mode="signup" configured={configured} className={`${secondaryClass} mt-7`}>Find your ghost <ArrowUpRight size={18} /></AuthEntry>
          <p className="mt-4 text-xs text-muted">Up to 6 rooms. Up to 25 people in each. Join by private key.</p>
        </div>
        <div className="mt-12 sm:mt-16" aria-label="Illustrative conversations, not live room activity">
          <div className="mb-4 flex items-center justify-between gap-4 text-xs text-muted"><span>A few things you might hear</span><span>Illustrative examples</span></div>
          <div className="grid items-start gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {samples.map((sample, i) => <article key={sample.category} className={`${sample.color} ${sample.height} flex flex-col rounded-[16px] p-6 ${i === 0 || i === 2 ? "lg:mt-8" : ""}`}>
              <span className={`mb-8 w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${i === 1 ? "bg-white/15 text-white" : "bg-canvas text-body"}`}>{sample.category}</span>
              <p className="mb-8 text-[22px] font-semibold leading-[1.3] tracking-[-.3px]">{sample.text}</p>
              <div className={`mt-auto flex items-center gap-2 text-xs ${i === 1 ? "text-[#deded8]" : "text-muted"}`}><Ghost size={16} />{sample.alias}</div>
            </article>)}
          </div>
        </div>
        <a href="#how-it-works" aria-label="Learn how GhostPost works" className="icon-button mx-auto mt-8 flex w-11 bg-elevated"><ArrowDown size={20} /></a>
      </section>

      <section id="how-it-works" className="scroll-mt-24 bg-canvas py-12 sm:py-16">
        <div className="mx-auto grid max-w-[1152px] gap-8 px-6 md:grid-cols-2 md:items-center md:gap-16">
          <div className="rounded-[32px] bg-surface p-8 sm:p-12">
            <div className="mb-12 flex items-center justify-between"><span className="text-sm text-muted">Your people, your space</span><LockKeyhole size={20} /></div>
            <p className="max-w-sm text-[36px] font-semibold leading-[1.15] tracking-[-.8px]">A name you choose not to share.<br /><span className="text-muted">A voice that still belongs.</span></p>
            <div className="mt-12 flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-full bg-elevated"><Ghost size={28} /></span><div><p className="font-semibold">Your own ghost nickname</p><p className="mt-1 text-sm text-muted">Same ghost. Every time you return.</p></div></div>
          </div>
          <div className="py-4">
            <h2 className="section-title">Come as you are.<br />Leave your name at the door.</h2>
            <p className="mt-5 max-w-md text-base leading-7 text-body">Sign in with Google, then create a room or join with a private key. You get a different stable ghost nickname in every room, without putting your Google name or photo in the conversation.</p>
            <ol className="mt-8 divide-y divide-border">
              {[["01", "Sign in", "Use your Google account. No new password to remember."], ["02", "Find your room", "Join with a moderator's key, or create a private space for your group."], ["03", "Say your piece", "Post, reply, react, or put a question to a vote."]].map(([n, title, text]) => <li key={n} className="flex gap-5 py-5"><span className="pt-1 text-xs text-muted">{n}</span><div><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-muted">{text}</p></div></li>)}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1152px] gap-8 px-6 py-12 sm:py-16 md:grid-cols-2 md:items-center md:gap-16">
        <div className="md:order-1"><h2 className="section-title">Honest doesn&apos;t have<br />to mean unkind.</h2><p className="mt-5 max-w-md text-base leading-7 text-body">This isn&apos;t the whole internet. It&apos;s a group you chose. Keep personal details out, disagree with care, and report anything that crosses a line.</p><p className="mt-5 max-w-md text-sm leading-6 text-muted">Pseudonymous to other members—not anonymous from Google, Supabase, or the operator. Each room&apos;s moderator can review reports and remove posts, but cannot see private account mappings.</p><AuthEntry mode="signup" configured={configured} className={`${secondaryClass} mt-7`}>Join the conversation <ArrowUpRight size={17} /></AuthEntry></div>
        <div className="rounded-[32px] bg-elevated p-8 sm:p-12 md:order-2"><span className="text-sm text-muted">The house rules</span><ul className="mt-8 space-y-6 text-[22px] font-semibold leading-snug"><li>Be honest. Not hurtful.</li><li>No names. No personal details.</li><li>Make room for another view.</li><li>Report it when it crosses a line.</li></ul></div>
      </section>
    </main>
    <footer className="border-t border-border bg-canvas"><div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-6 px-6 py-8 sm:flex-row sm:items-center"><div><Brand small /><p className="mt-2 text-xs text-muted">say it without saying who you are</p></div><nav aria-label="Footer" className="flex flex-wrap items-center gap-6 text-sm"><a href="#how-it-works" className="inline-flex min-h-11 items-center">How it works</a><Link href="/login" className="inline-flex min-h-11 items-center">Sign in</Link><span className="text-xs text-muted">GhostPost · 2026</span></nav></div></footer>
  </div>;
}
