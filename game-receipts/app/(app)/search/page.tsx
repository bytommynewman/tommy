import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { PredictionCard } from "@/components/app/PredictionCard";
import { Avatar, Card, EmptyState, inputCls, SectionTitle } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { search } from "@/lib/server/services/social";
import { viewPrediction } from "@/lib/server/views";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireUser();
  const { q = "" } = await searchParams;
  const d = db();
  const r = search(d, me.id, q);
  const none = q.trim().length >= 2 && !r.users.length && !r.predictions.length && !r.questions.length;
  return (
    <div className="space-y-6">
      <PageHeader title="Search" />
      <form role="search"><input name="q" defaultValue={q} autoFocus placeholder="People, players, teams, takes…" className={inputCls} aria-label="Search" /></form>
      {none && <EmptyState title="No matches" body="Try a player, team or username." />}
      {r.users.length > 0 && <section><SectionTitle>People</SectionTitle><Card className="divide-y divide-ink-700/60">{r.users.map((u) => (
        <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-800/50"><Avatar name={u.displayName} color={u.avatarColor} size={36} /><div><div className="text-sm font-semibold text-white">{u.displayName}</div><div className="text-xs text-ink-400">@{u.username}</div></div></Link>
      ))}</Card></section>}
      {r.questions.length > 0 && <section><SectionTitle>Markets</SectionTitle><div className="space-y-2">{r.questions.map((x) => (
        <Link key={x.id} href={x.status === "open" ? `/create?q=${x.id}` : `/search?q=${encodeURIComponent(x.title)}`} className="block rounded-xl bg-ink-850 px-4 py-3 ring-1 ring-ink-700 hover:ring-volt"><div className="text-[11px] font-bold uppercase text-ink-400">{x.league} · {x.status}</div><div className="text-sm font-semibold text-white">{x.title}</div></Link>
      ))}</div></section>}
      {r.predictions.length > 0 && <section><SectionTitle>Takes</SectionTitle><div className="space-y-3">{r.predictions.map((p) => <PredictionCard key={p.id} v={viewPrediction(d, p, me.id)} />)}</div></section>}
    </div>
  );
}
