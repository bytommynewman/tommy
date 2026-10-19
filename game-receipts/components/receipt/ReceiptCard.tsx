import { BadgeCheck } from "lucide-react";
import { ReceiptMark } from "../brand/Logo";
import { durationLabel, fmtDateTime, pct } from "@/lib/format";
import type { PredictionView } from "@/lib/server/views";
import { outcomeLabel } from "@/lib/server/services/grading";

/** The shareable receipt. Pure markup so it renders in pages; the PNG export lives in /r/[id]/image. */
export function ReceiptCard({ v, award }: { v: PredictionView; award?: string }) {
  const { p, question, author } = v;
  const s = p.score;
  const callPct = p.forecast?.type === "binary" ? (s && question?.outcome?.type === "binary" && !question.outcome.yes ? 1 - p.forecast.pYes : p.forecast.pYes) : p.forecast?.primary.p;
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="absolute inset-x-0 -inset-y-6 rounded-[2rem] bg-volt/10 blur-2xl" aria-hidden />
      <div className="receipt-edge relative bg-gradient-to-b from-[#f6f7f8] to-[#dfe3e6] px-6 pb-9 pt-6 text-ink-950 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ReceiptMark className="size-6" />
            <span className="font-display text-sm font-black uppercase italic tracking-tight">Game Receipts</span>
          </div>
          <span className="font-mono text-[10px] text-ink-600">#{p.id.slice(0, 8).toUpperCase()}</span>
        </div>
        <div className="my-4 border-t-2 border-dashed border-ink-400/60" />
        <div className="font-mono text-[11px] uppercase tracking-wider text-ink-600">@{author.username} called it</div>
        <p className="mt-1 font-display text-xl font-extrabold italic leading-tight">{p.structuredText}</p>
        {p.originalText !== p.structuredText && <p className="mt-2 text-sm italic text-ink-600">“{p.originalText}”</p>}
        <dl className="mt-4 space-y-1.5 font-mono text-[12px]">
          <Row k="Locked" v={fmtDateTime(p.lockedAt)} />
          {question?.resolvedAt && <Row k="Confirmed" v={fmtDateTime(question.resolvedAt)} />}
          {s && <Row k="Called early by" v={durationLabel(s.leadDays)} />}
          {question?.outcome && <Row k="Outcome" v={outcomeLabel(question, question.outcome)} />}
          {callPct !== undefined && <Row k="Confidence" v={pct(callPct)} />}
          {s && <Row k="Consensus then" v={pct(s.baselinePOutcome)} />}
        </dl>
        <div className="my-4 border-t-2 border-dashed border-ink-400/60" />
        {s ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-ink-600">Take Prestige</div>
              <div className="font-display text-6xl font-black italic leading-none tabular-nums">{s.prestige.toFixed(0)}</div>
            </div>
            <div className={`-rotate-4 animate-stamp rounded-md border-[3px] px-2.5 py-1 font-display text-lg font-black uppercase italic ${s.correct ? "border-volt-deep text-volt-deep" : "border-loss text-loss"}`}>
              {s.correct ? <span className="inline-flex items-center gap-1"><BadgeCheck className="size-5" />Verified</span> : s.darkHorseHit ? "Dark horse" : "Missed"}
            </div>
          </div>
        ) : (
          <div className="font-display text-lg font-black uppercase italic text-ink-600">Locked · Pending</div>
        )}
        {award && <div className="mt-3 rounded-md bg-ink-950 px-2.5 py-1.5 text-center font-mono text-[11px] font-bold uppercase tracking-wider text-volt">🏆 {award}</div>}
        <div className="mt-4 text-center font-mono text-[10px] text-ink-600">Verify at gamereceipts.app/p/{p.id.slice(0, 8)} · SHA-256 {p.hash.slice(0, 12)}…</div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4"><dt className="text-ink-600">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>;
}
