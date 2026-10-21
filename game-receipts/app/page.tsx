import Link from "next/link";
import { Lock, ScrollText, ShieldCheck, Swords, Trophy } from "lucide-react";
import { HeroLogo, Lockup } from "@/components/brand/Logo";
import { ReceiptCard } from "@/components/receipt/ReceiptCard";
import { LinkButton } from "@/components/ui/primitives";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { topCalls } from "@/lib/server/services/reputation";
import { viewPrediction } from "@/lib/server/views";
import { art } from "@/lib/server/art";

export default async function Landing() {
  const me = await currentUser();
  const d = db();
  const best = topCalls(d, 1)[0];
  const wide = art("hero-wide"), tall = art("hero-tall");
  return (
    <div className="relative min-h-dvh">
      {(wide || tall) && (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[92dvh] overflow-hidden">
          <picture>
            {wide && <source media="(min-width: 768px)" srcSet={wide} />}
            { }
            <img src={tall ?? wide!} alt="" className="size-full object-cover opacity-55" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-ink-950/60 to-ink-950" />
        </div>
      )}
      <header className="relative mx-auto flex h-16 max-w-6xl items-center px-5" style={{ marginTop: "var(--safe-top)" }}>
        <Lockup />
        <div className="ml-auto flex gap-2">
          {me ? <LinkButton href="/feed" size="sm">Open app</LinkButton> : <>
            <LinkButton href="/login" variant="ghost" size="sm">Log in</LinkButton>
            <LinkButton href="/signup" size="sm">Join free</LinkButton>
          </>}
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 md:grid-cols-2 md:pt-14">
        <div className="animate-rise">
          <HeroLogo className="mx-auto mb-6 w-56 drop-shadow-[0_0_40px_rgba(34,229,138,0.25)] md:hidden" />
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-volt">Call it. Lock it. Prove it.</p>
          <h1 className="mt-3 font-display text-5xl font-black uppercase italic leading-[0.92] tracking-tight text-white sm:text-6xl">
            Everyone talks sports.<br /><span className="text-volt-grad">We remember who was right.</span>
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink-300">
            Lock your predictions with a server timestamp you can’t edit. When the result is official, every take gets a transparent score — and the best calls become shareable receipts.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton href={me ? "/create" : "/signup"} size="lg">{me ? "Lock a take" : "Lock your first take"}</LinkButton>
            <LinkButton href="/how-scoring-works" variant="secondary" size="lg">How grading works</LinkButton>
          </div>
          <p className="mt-4 text-xs text-ink-500">Free to play.</p>
        </div>
        <div className="relative overflow-x-clip md:overflow-visible">
          <HeroLogo className="absolute -right-10 -top-16 hidden w-72 opacity-30 blur-[1px] md:block" />
          {best && <ReceiptCard v={viewPrediction(d, best, null)} award="Most impressive call" />}
        </div>
      </section>

      <section className="border-y border-ink-700/60 bg-ink-900/60">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Lock, t: "Lock it", b: "Say it your way. We turn it into a measurable claim you approve — then timestamp and seal it." },
            { icon: ShieldCheck, t: "Can’t be erased", b: "Every receipt is hash-chained. Edits are impossible; withdrawals stay on the record and still get graded." },
            { icon: Trophy, t: "Graded fairly", b: "Proper scoring rules, not vibes. Bold, early, specific calls earn Take Prestige." },
            { icon: Swords, t: "Settle it", b: "Battle friends on the same question, run a league, climb the leaderboards." },
          ].map(({ icon: Icon, t, b }) => (
            <div key={t} className="rounded-2xl bg-ink-850 p-5 ring-1 ring-ink-700/60">
              <Icon className="size-6 text-volt" />
              <div className="mt-3 font-display text-xl font-extrabold uppercase italic text-white">{t}</div>
              <p className="mt-1.5 text-sm text-ink-400">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <ScrollText className="mx-auto size-8 text-volt" />
        <h2 className="mt-3 font-display text-3xl font-black uppercase italic text-white">Reputation you can’t fake</h2>
        <p className="mx-auto mt-3 max-w-xl text-ink-400">One lucky call won’t top a long record. Grades are shrunk toward average until you’ve built a sample, and spamming contradictory picks is blocked by design.</p>
        <div className="mt-6"><Link href="/how-scoring-works" className="font-semibold text-volt hover:underline">Read the full grading rubric →</Link></div>
      </section>

      <footer className="border-t border-ink-700/60 px-5 py-8 text-center text-xs text-ink-500">
        © {new Date().getFullYear()} Game Receipts · Sports data in this build is mock/demo data, not a live feed. · Not affiliated with any league.
      </footer>
    </div>
  );
}
