import Link from "next/link";
import { notFound } from "next/navigation";
import { Swords, Trophy } from "lucide-react";
import { ForecastBars } from "@/components/app/PredictionCard";
import { Avatar, Card, Chip, SectionTitle } from "@/components/ui/primitives";
import { fmtDate } from "@/lib/format";
import { requireUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { outcomeLabel } from "@/lib/server/services/grading";
import { viewPrediction } from "@/lib/server/views";
import { BattleRespond } from "./BattleRespond";

export const metadata = { title: "Battle" };

export default async function BattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireUser();
  const d = db();
  const b = d.battles.find((x) => x.id === id);
  if (!b) notFound();
  const q = d.questions.find((x) => x.id === b.questionId)!;
  const sides = [
    { u: d.users.find((u) => u.id === b.challengerId)!, p: d.predictions.find((p) => p.id === b.challengerPredictionId)!, role: "Challenger" },
    { u: d.users.find((u) => u.id === b.opponentId)!, p: d.predictions.find((p) => p.id === b.opponentPredictionId)!, role: "Defender" },
  ];
  return (
    <div className="space-y-5">
      <div className="text-center">
        <Chip tone={b.status === "resolved" ? "volt" : b.status === "open" ? "gold" : "default"}>{b.status === "open" ? "Awaiting response" : b.status === "accepted" ? "Live" : b.status}</Chip>
        <h1 className="mt-2 font-display text-2xl font-black uppercase italic leading-tight text-white">{q.title}</h1>
        <p className="mt-1 text-xs text-ink-400">{q.outcome ? `Result: ${outcomeLabel(q, q.outcome)}` : `Resolves ${fmtDate(q.resolvesBy)} · ${q.resolutionSource}`}</p>
        {b.message && <p className="mx-auto mt-3 max-w-md rounded-xl bg-ink-850 px-3 py-2 text-sm italic text-ink-200 ring-1 ring-ink-700">“{b.message}”</p>}
      </div>
      <div className="relative grid gap-3 sm:grid-cols-2">
        {sides.map(({ u, p, role }) => {
          const won = b.winnerId === u.id;
          return (
            <Card key={u.id} className={`p-4 ${won ? "ring-2 ring-volt" : ""}`}>
              <div className="flex items-center gap-2.5">
                <Avatar name={u.displayName} color={u.avatarColor} size={40} />
                <div className="min-w-0 flex-1"><Link href={`/u/${u.username}`} className="block truncate font-semibold text-white">@{u.username}</Link><div className="text-xs text-ink-400">{role}</div></div>
                {won && <Trophy className="size-6 text-volt" aria-label="Winner" />}
              </div>
              <div className="mt-4"><ForecastBars v={viewPrediction(d, p, me.id)} /></div>
              {p.score && <div className="mt-3 flex justify-between text-sm"><span className="text-ink-400">Accuracy</span><b className="tabular-nums text-white">{p.score.accuracy.toFixed(1)}</b></div>}
              <Link href={`/p/${p.id}`} className="mt-3 block text-xs font-semibold text-volt">View receipt →</Link>
            </Card>
          );
        })}
        <div className="pointer-events-none absolute left-1/2 top-1/2 hidden size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-ink-950 ring-1 ring-ink-700 sm:flex"><Swords className="size-5 text-volt" /></div>
      </div>
      {b.status === "open" && b.opponentId === me.id && <Card className="p-5"><SectionTitle>Your move</SectionTitle><BattleRespond id={b.id} /></Card>}
      {b.status === "resolved" && <Card className="p-4 text-center text-sm text-ink-300">{b.winnerId ? <>🏆 <b className="text-white">@{d.users.find((u) => u.id === b.winnerId)?.username}</b> wins on proper-score accuracy.</> : "Dead even — a push."}</Card>}
      <p className="text-center text-xs text-ink-500">Winner = higher Brier-based accuracy (time-weighted across revisions). Within 0.5 points is a push.</p>
    </div>
  );
}
