import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GradeBadge } from "@/components/app/GradeBadge";
import { PageHeader } from "@/components/app/Shell";
import { Card, SectionTitle, Stat } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/lib/domain";
import { MIN_RESOLVED_ALL_TIME, MIN_RESOLVED_MONTHLY, PRIOR_SCORE, PRIOR_WEIGHT } from "@/lib/scoring";
import { db } from "@/lib/server/db";
import { userReputation } from "@/lib/server/services/reputation";
import { userByName } from "@/lib/server/views";

export const metadata = { title: "Reputation" };

export default async function ReputationPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const d = db();
  const u = userByName(d, username);
  if (!u) notFound();
  const rep = userReputation(d, u.id);
  const o = rep.overall;
  return (
    <div className="space-y-6">
      <Link href={`/u/${u.username}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-400 hover:text-white"><ArrowLeft className="size-4" />@{u.username}</Link>
      <PageHeader title="Reputation" sub={`How @${u.username}'s grade is built — every number here is reproducible.`} />
      <Card className="flex items-center gap-5 p-5">
        <GradeBadge grade={o.grade} letter={o.letter} ranked={o.ranked} size="lg" />
        <div className="text-sm text-ink-300">
          <div className="font-display text-xl font-black italic text-white">{o.ranked ? `All-time grade ${o.grade}` : "Unranked"}</div>
          {o.ranked ? <>Average Take Prestige over {o.resolved} resolved predictions, shrunk toward {PRIOR_SCORE} by {PRIOR_WEIGHT} phantom picks.</>
            : <>{o.resolved} of {MIN_RESOLVED_ALL_TIME} resolved predictions needed to rank. New accounts start at consensus level ({PRIOR_SCORE}).</>}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Mean accuracy" value={o.meanAccuracy?.toFixed(1) ?? "—"} sub="Brier-based, 0–100" />
        <Stat label="Hit rate" value={o.hitRate !== null ? `${o.hitRate.toFixed(0)}%` : "—"} sub={`${o.correct}/${o.resolved}`} />
        <Stat label={`Month ${rep.monthly.period}`} value={rep.monthly.resolved ? rep.monthly.grade.toFixed(1) : "—"} sub={rep.monthly.ranked ? "ranked" : `needs ${MIN_RESOLVED_MONTHLY} resolved`} />
        <Stat label="Pending" value={rep.totals.pending} />
        <Stat label="Hot takes" value={rep.totals.debates} sub="never graded" />
        <Stat label="Withdrawn" value={rep.totals.withdrawn} sub="late ones still graded" />
      </div>

      <section>
        <SectionTitle>By league</SectionTitle>
        <Card className="divide-y divide-ink-700/60">
          {rep.byLeague.length ? rep.byLeague.map((l) => (
            <div key={l.league} className="flex items-center gap-4 px-4 py-3">
              <div className="w-14 font-display text-lg font-black italic text-white">{l.league}</div>
              <div className="flex-1"><div className="h-2 overflow-hidden rounded-full bg-ink-700"><div className="h-full rounded-full bg-volt" style={{ width: `${Math.min(100, l.grade)}%` }} /></div></div>
              <div className="w-24 text-right text-sm"><b className="text-white">{l.ranked ? l.letter : "—"}</b> <span className="text-ink-400">· {l.resolved} res.</span></div>
            </div>
          )) : <p className="p-4 text-sm text-ink-400">No resolved predictions yet.</p>}
        </Card>
      </section>

      <section>
        <SectionTitle>By category</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {rep.byCategory.map((c) => <Stat key={c.category} label={CATEGORY_LABEL[c.category]} value={c.grade.toFixed(1)} sub={`${c.resolved} resolved · ${c.hitRate?.toFixed(0) ?? "—"}% hit`} />)}
        </div>
      </section>

      <section>
        <SectionTitle>Calibration</SectionTitle>
        <Card className="p-4">
          <p className="mb-3 text-xs text-ink-400">When @{u.username} says X%, how often does it happen? Well-calibrated forecasters land on the diagonal.</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink-400"><th className="pb-2">Stated</th><th className="pb-2 text-right">Picks</th><th className="pb-2 text-right">Avg stated</th><th className="pb-2 text-right">Happened</th></tr></thead>
            <tbody className="divide-y divide-ink-700/50">
              {rep.calibration.map((b) => (
                <tr key={b.label}><td className="py-2 text-ink-200">{b.label}</td><td className="py-2 text-right tabular-nums text-ink-400">{b.n}</td>
                  <td className="py-2 text-right tabular-nums text-ink-200">{b.stated !== null ? `${Math.round(b.stated * 100)}%` : "—"}</td>
                  <td className="py-2 text-right font-semibold tabular-nums text-white">{b.actual !== null ? `${Math.round(b.actual * 100)}%` : "—"}</td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
      <p className="text-center text-sm"><Link href="/how-scoring-works" className="font-semibold text-volt">How grading works →</Link></p>
    </div>
  );
}
