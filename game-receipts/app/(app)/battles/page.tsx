import { BattleRow } from "@/components/app/BattleRow";
import { PageHeader } from "@/components/app/Shell";
import { Card, EmptyState, LinkButton, SectionTitle, Stat } from "@/components/ui/primitives";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { battleRecord } from "@/lib/server/services/reputation";

export const metadata = { title: "Battles" };

export default async function BattlesPage() {
  const me = await requireUser();
  const d = db();
  const mine = d.battles.filter((b) => b.challengerId === me.id || b.opponentId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const incoming = mine.filter((b) => b.status === "open" && b.opponentId === me.id);
  const live = mine.filter((b) => b.status === "accepted" || (b.status === "open" && b.challengerId === me.id));
  const done = mine.filter((b) => b.status === "resolved" || b.status === "declined");
  const following = new Set(d.follows.filter((f) => f.followerId === me.id).map((f) => f.followeeId));
  const friends = d.battles.filter((b) => b.status !== "declined" && !mine.includes(b) && (following.has(b.challengerId) || following.has(b.opponentId))).slice(0, 6);
  const rec = battleRecord(d, me.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Take battles" sub="Same question, opposite sides. The more accurate forecast wins." action={<LinkButton href="/leagues" variant="secondary" size="sm">Leagues</LinkButton>} />
      <div className="grid grid-cols-3 gap-2"><Stat label="Wins" value={rec.wins} accent /><Stat label="Losses" value={rec.losses} /><Stat label="Pushes" value={rec.pushes} /></div>
      {incoming.length > 0 && <section><SectionTitle>Incoming challenges</SectionTitle><div className="space-y-2">{incoming.map((b) => <BattleRow key={b.id} d={d} b={b} meId={me.id} />)}</div></section>}
      <section>
        <SectionTitle>Live</SectionTitle>
        {live.length ? <div className="space-y-2">{live.map((b) => <BattleRow key={b.id} d={d} b={b} meId={me.id} />)}</div>
          : <EmptyState title="No live battles" body="Open any pending take in the feed and hit Battle to challenge it." action={<LinkButton href="/feed?tab=trending">Find a take to fade</LinkButton>} />}
      </section>
      {done.length > 0 && <section><SectionTitle>History</SectionTitle><div className="space-y-2">{done.map((b) => <BattleRow key={b.id} d={d} b={b} meId={me.id} />)}</div></section>}
      {friends.length > 0 && <section><SectionTitle>Around your circle</SectionTitle><div className="space-y-2">{friends.map((b) => <BattleRow key={b.id} d={d} b={b} meId={me.id} />)}</div></section>}
      <Card className="p-4 text-xs text-ink-400">Battles are bragging rights only — no real money, wagers or paid entry, ever.</Card>
    </div>
  );
}
