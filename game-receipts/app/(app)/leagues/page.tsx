import Link from "next/link";
import { PageHeader } from "@/components/app/Shell";
import { CreateLeagueForm, JoinLeagueForm } from "@/components/app/leagueForms";
import { Card, Chip, EmptyState, SectionTitle } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { openQuestions } from "@/lib/server/services/questions";

export const metadata = { title: "Leagues" };

export default async function LeaguesPage() {
  const me = await requireUser();
  const d = db();
  const memberOf = new Set(d.groupMembers.filter((m) => m.userId === me.id).map((m) => m.groupId));
  const mine = d.groups.filter((g) => memberOf.has(g.id));
  const pub = d.groups.filter((g) => g.visibility === "public" && !memberOf.has(g.id));
  const card = (g: (typeof d.groups)[number]) => (
    <Link key={g.id} href={`/leagues/${g.slug}`} className="block rounded-2xl bg-ink-850 p-4 ring-1 ring-ink-700 hover:ring-volt">
      <div className="flex items-center gap-2"><span className="font-display text-lg font-black italic text-white">{g.name}</span>{g.isCreatorLeague && <Chip tone="volt">Creator league</Chip>}</div>
      <div className="mt-0.5 text-sm text-ink-400">{g.description || "Private prediction league"}</div>
      <div className="mt-2 text-xs text-ink-500">{d.groupMembers.filter((m) => m.groupId === g.id).length} members · {g.questionIds.length || "all"} questions</div>
    </Link>
  );
  return (
    <div className="space-y-6">
      <PageHeader title="Leagues" sub="Private groups and creator communities with their own standings." />
      <Card className="p-4"><SectionTitle>Join with a code</SectionTitle><JoinLeagueForm /></Card>
      <section><SectionTitle>Your leagues</SectionTitle>{mine.length ? <div className="space-y-2">{mine.map(card)}</div> : <EmptyState title="No leagues yet" body="Start one for your group chat, or join a creator’s league." />}</section>
      {pub.length > 0 && <section><SectionTitle>Public leagues</SectionTitle><div className="space-y-2">{pub.map(card)}</div></section>}
      <Card className="p-5"><SectionTitle>Start a league</SectionTitle><CreateLeagueForm questions={openQuestions(d).filter((q) => q.reviewStatus === "approved").map((q) => ({ id: q.id, title: q.title, league: q.league }))} /></Card>
    </div>
  );
}
