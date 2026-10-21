import Link from "next/link";
import { BadgeCheck, Clock, Flame, MessageCircle, Swords, XCircle } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/domain";
import { fmtDate, pct, timeAgo, untilLabel } from "@/lib/format";
import type { PredictionView } from "@/lib/server/views";
import { forecastRows } from "@/lib/server/views";
import { Avatar, Card, Chip } from "../ui/primitives";
import { LikeButton } from "./interactive";
import { SubjectAvatar } from "./SubjectAvatar";
import { DateStamp } from "./DateStamp";
import { outcomeLabel } from "@/lib/server/services/grading";

export function StatusPill({ v }: { v: PredictionView }) {
  const { p, question } = v;
  if (p.kind === "debate") return <Chip tone="gold"><Flame className="size-3" />Hot take</Chip>;
  if (p.status === "void") return <Chip tone="muted">{p.withdrawnInGrace ? "Withdrawn (grace)" : "Voided"}</Chip>;
  if (p.status === "resolved" && p.score) {
    return p.score.correct
      ? <Chip tone="volt"><BadgeCheck className="size-3" />Cashed</Chip>
      : p.score.darkHorseHit ? <Chip tone="gold"><BadgeCheck className="size-3" />Dark horse hit</Chip>
      : <Chip tone="loss"><XCircle className="size-3" />Missed</Chip>;
  }
  return <Chip><Clock className="size-3" />{question ? untilLabel(question.resolvesBy) : "Pending"}</Chip>;
}

export function ForecastBars({ v, compact = false }: { v: PredictionView; compact?: boolean }) {
  const rows = forecastRows(v.question, v.p);
  if (!rows.length) return null;
  const outcome = v.question?.outcome;
  const won = (label: string, role: string) =>
    outcome && v.question && (outcome.type === "binary" ? (role === "yes") === outcome.yes && role !== "field" : outcomeLabel(v.question, outcome) === label);
  const shown = compact ? rows.filter((r) => r.role !== "field" && r.role !== "no") : rows;
  return (
    <div className="space-y-1.5">
      {shown.map((r) => (
        <div key={r.label + r.role} className="flex items-center gap-2 text-sm">
          <div className={`w-28 shrink-0 truncate ${r.role === "field" || r.role === "no" ? "text-ink-400" : "font-semibold text-white"}`}>
            {r.role === "dark" && <span className="mr-1 text-gold" title="Dark horse">★</span>}{r.label}
          </div>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink-700">
            <div className={`absolute inset-y-0 left-0 rounded-full ${r.role === "primary" || r.role === "yes" ? "bg-volt" : r.role === "dark" ? "bg-gold" : "bg-ink-500"}`} style={{ width: `${r.p * 100}%` }} />
          </div>
          <div className="w-10 text-right font-mono text-xs tabular-nums text-ink-200">{pct(r.p)}</div>
          {won(r.label, r.role) && <BadgeCheck className="size-4 text-volt" aria-label="Actual outcome" />}
        </div>
      ))}
    </div>
  );
}

export function PredictionCard({ v, now }: { v: PredictionView; now?: number }) {
  const { p, author } = v;
  return (
    <Card className="animate-rise overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${author.username}`} className="flex min-w-0 items-center gap-2.5">
            <Avatar name={author.displayName} color={author.avatarColor} size={36} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-white">{author.displayName}</div>
              <div className="truncate text-xs text-ink-400">@{author.username} · locked {timeAgo(p.lockedAt, now)}</div>
            </div>
          </Link>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            {p.seed && <Chip tone="muted">Demo</Chip>}
            <StatusPill v={v} />
          </div>
        </div>

        <Link href={`/p/${p.id}`} className="mt-3 block">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {p.league && <Chip>{p.league}</Chip>}
            <Chip tone="muted">{CATEGORY_LABEL[p.category]}</Chip>
            {p.revisionNumber > 1 && <Chip tone="muted">Rev {p.revisionNumber}</Chip>}
            {p.withdrawnAt && !p.withdrawnInGrace && <Chip tone="loss">Withdrawn — still graded</Chip>}
          </div>
          <div className="flex items-start gap-3">
            {v.subject && <SubjectAvatar s={v.subject} size={48} />}
            <div className="min-w-0 flex-1">
              {v.subject && <div className="truncate text-xs font-semibold text-ink-300">{v.subject.name}</div>}
              <p className="text-[15px] font-semibold leading-snug text-white">{v.question?.title ?? p.structuredText}</p>
            </div>
            <DateStamp at={p.lockedAt} tone={p.status === "resolved" && p.score && !p.score.correct ? "muted" : "volt"} className="mt-1 shrink-0" />
          </div>
          {p.kind === "graded" && p.originalText && p.originalText !== p.structuredText && p.originalText !== v.question?.title && (
            <p className="mt-1 line-clamp-2 text-sm italic text-ink-400">“{p.originalText}”</p>
          )}
          {p.kind === "graded" && p.forecast?.type === "categorical" && <div className="mt-3"><ForecastBars v={v} compact /></div>}
        </Link>
      </div>

      <div className="flex items-center gap-1 border-t border-ink-700/60 px-2 py-1.5">
        <LikeButton id={p.id} liked={v.likedByViewer} count={v.likes} />
        <Link href={`/p/${p.id}#comments`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-400 hover:bg-ink-800 hover:text-white">
          <MessageCircle className="size-4" /><span className="tabular-nums">{v.comments}</span>
        </Link>
        {p.status === "resolved" && p.score ? (
          <Link href={`/r/${p.id}`} className="ml-auto inline-flex items-center gap-2 rounded-lg px-2.5 py-1 hover:bg-ink-800">
            <span className="text-xs uppercase tracking-wider text-ink-400">Prestige</span>
            <span className={`font-display text-xl font-black italic tabular-nums ${p.score.prestige >= 60 ? "text-volt" : "text-white"}`}>{p.score.prestige.toFixed(0)}</span>
          </Link>
        ) : p.kind === "graded" && p.status === "pending" ? (
          <Link href={`/p/${p.id}#challenge`} className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm text-ink-400 hover:bg-ink-800 hover:text-white">
            <Swords className="size-4" />Battle
          </Link>
        ) : <span className="ml-auto px-2.5 text-xs text-ink-500">{fmtDate(p.lockedAt)}</span>}
      </div>
    </Card>
  );
}
