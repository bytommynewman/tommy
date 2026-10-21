import type { Metadata } from "next";
import Link from "next/link";
import { DateStamp } from "@/components/app/DateStamp";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, ExternalLink, Fingerprint, GitBranch, Lock, Newspaper, PartyPopper, ShieldCheck } from "lucide-react";
import { AppealForm, ChallengeBox, CommentForm, OwnerActions, ReportButton } from "@/components/app/detail";
import { DebateVote } from "@/components/app/interactive";
import { SubjectAvatar } from "@/components/app/SubjectAvatar";
import { ForecastBars, StatusPill } from "@/components/app/PredictionCard";
import { CopyButton, ScoreRing } from "@/components/ui/client";
import { Avatar, Card, Chip, LinkButton, SectionTitle } from "@/components/ui/primitives";
import { CATEGORY_LABEL } from "@/lib/domain";
import { durationLabel, fmtDate, fmtDateTime, nowMs, pct, timeAgo } from "@/lib/format";
import { verifyPrediction } from "@/lib/integrity";
import { PRESTIGE_WEIGHTS, WITHDRAW_GRACE_MINUTES } from "@/lib/scoring";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { AWARD_LABEL, outcomeLabel } from "@/lib/server/services/grading";
import { isBlocked } from "@/lib/server/services/notify";
import { activeOnQuestion, chainOf } from "@/lib/server/services/predictions";
import { toLite } from "@/lib/server/services/questions";
import { viewPrediction } from "@/lib/server/views";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ locked?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = db().predictions.find((x) => x.id === id);
  if (!p || p.hidden) return { title: "Prediction" };
  return { title: p.structuredText.slice(0, 70), openGraph: { images: [`/r/${p.id}/image`] } };
}

export default async function PredictionPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { locked } = await searchParams;
  const me = await currentUser();
  const d = db();
  const p = d.predictions.find((x) => x.id === id);
  if (!p) notFound();
  const isOwner = me?.id === p.userId;
  if ((p.hidden && !isOwner && me?.role !== "admin") || (me && isBlocked(d, me.id, p.userId))) notFound();
  const v = viewPrediction(d, p, me?.id ?? null);
  const q = v.question;
  const s = p.score;
  const chain = chainOf(d, p.chainId);
  const intact = verifyPrediction(p);
  const comments = d.comments.filter((c) => c.predictionId === p.id && !c.hidden && !(me && isBlocked(d, me.id, c.userId)));
  const votes = d.votes.filter((x) => x.predictionId === p.id);
  const awards = q?.awards ? (Object.entries(q.awards) as [keyof typeof AWARD_LABEL, string][]).filter(([, pid]) => pid === p.id).map(([k]) => AWARD_LABEL[k]) : [];
  const live = p.kind === "graded" && p.status === "pending" && !p.supersededAt && !p.withdrawnAt;
  const graceLeft = WITHDRAW_GRACE_MINUTES - (nowMs() - new Date(p.lockedAt).getTime()) / 60_000;
  const battles = d.battles.filter((b) => b.challengerPredictionId === p.id || b.opponentPredictionId === p.id);
  const timeline = [
    ...chain.map((c) => ({ at: c.lockedAt, icon: c.id === p.chainId ? Lock : GitBranch, text: c.id === p.chainId ? "Original take locked" : `Revision ${c.revisionNumber} locked`, href: c.id !== p.id ? `/p/${c.id}` : undefined, current: c.id === p.id })),
    ...(q?.developments ?? []).filter((x) => x.at >= chain[0].lockedAt).map((x) => ({ at: x.at, icon: Newspaper, text: x.text, href: undefined, current: false })),
    ...(p.withdrawnAt ? [{ at: p.withdrawnAt, icon: Clock, text: p.withdrawnInGrace ? "Withdrawn within grace window (voided)" : "Withdrawn — remains graded", href: undefined, current: false }] : []),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <div className="space-y-5">
      {locked && (
        <Card className="animate-rise flex items-center gap-3 bg-volt/10 p-4 ring-volt/40">
          <PartyPopper className="size-6 shrink-0 text-volt" />
          <div className="flex-1 text-sm"><b className="text-white">Locked.</b> <span className="text-ink-300">Timestamped {fmtDateTime(p.lockedAt)} and sealed. It’s on the record forever.</span></div>
          <LinkButton href={`/r/${p.id}`} size="sm">Share</LinkButton>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex items-center gap-3">
          <Link href={`/u/${v.author.username}`} className="flex items-center gap-2.5">
            <Avatar name={v.author.displayName} color={v.author.avatarColor} src={v.author.avatarUrl} size={44} />
            <div>
              <div className="font-semibold text-white">{v.author.displayName}</div>
              <div className="text-xs text-ink-400">@{v.author.username} · {timeAgo(p.lockedAt)}</div>
            </div>
          </Link>
          <div className="ml-auto flex items-center gap-1.5">{p.seed && <Chip tone="muted">Demo</Chip>}<StatusPill v={v} /></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {p.league && <Chip>{p.league}</Chip>}
          <Chip tone="muted">{CATEGORY_LABEL[p.category]}</Chip>
          {p.revisionNumber > 1 && <Chip tone="muted">Revision {p.revisionNumber}</Chip>}
          {p.supersededAt && <Chip tone="muted">Superseded</Chip>}
          {p.withdrawnAt && !p.withdrawnInGrace && <Chip tone="loss">Withdrawn — still graded</Chip>}
          {q?.reviewStatus === "pending" && <Chip tone="gold">Question in review</Chip>}
          {awards.map((a) => <Chip key={a} tone="volt">🏆 {a}</Chip>)}
        </div>
        <div className="mt-4 flex items-center gap-3">
          {v.subject && <>
            <SubjectAvatar s={v.subject} size={64} />
            <div className="min-w-0 flex-1"><div className="font-display text-xl font-black italic text-white">{v.subject.name}</div><div className="text-xs text-ink-400">{v.subject.league} · {v.subject.type === "team" ? "Team" : v.subject.meta}</div></div>
          </>}
          <DateStamp at={p.lockedAt} className="ml-auto shrink-0" />
        </div>
        <h1 className="mt-3 font-display text-2xl font-black italic leading-tight text-white">{p.structuredText}</h1>
        {p.originalText !== p.structuredText && p.originalText !== q?.title && <p className="mt-2 border-l-2 border-ink-600 pl-3 text-sm italic text-ink-300">“{p.originalText}”<span className="ml-1 not-italic text-ink-500">— original words</span></p>}
        {p.kind === "graded" && p.forecast?.type === "categorical" && <div className="mt-5"><ForecastBars v={v} /></div>}
        {p.kind === "debate" && (
          <div className="mt-5">
            {me ? <DebateVote id={p.id} agree={votes.filter((x) => x.agree).length} disagree={votes.filter((x) => !x.agree).length} mine={votes.find((x) => x.userId === me.id)?.agree ?? null} />
              : <p className="text-sm text-ink-400"><Link href="/login" className="text-volt">Log in</Link> to vote.</p>}
            <p className="mt-3 text-xs text-ink-500">Hot takes aren’t objectively verifiable, so they never affect anyone’s grade.</p>
          </div>
        )}
      </Card>

      {s && q?.outcome && (
        <Card className="overflow-hidden">
          <div className="flex flex-col items-center gap-5 p-5 sm:flex-row">
            <ScoreRing value={s.prestige} size={132} label="Prestige" />
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-400">Official outcome</div>
              <div className="font-display text-2xl font-black italic text-white">{outcomeLabel(q, q.outcome)}</div>
              <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                <Chip tone={s.correct ? "volt" : "loss"}>{s.correct ? "Correct" : s.darkHorseHit ? "Dark horse hit" : "Incorrect"}</Chip>
                <Chip>Accuracy {s.accuracy.toFixed(0)}</Chip>
                <Chip tone="muted">{s.leadDays < 1 ? "Locked same day" : `Called ${durationLabel(s.leadDays)} early`}</Chip>
              </div>
              <LinkButton href={`/r/${p.id}`} size="sm" className="mt-1">View receipt</LinkButton>
            </div>
          </div>
          <div className="border-t border-ink-700/60 p-5">
            <SectionTitle>Why this score</SectionTitle>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wider text-ink-400"><th className="pb-2 font-semibold">Component</th><th className="pb-2 pl-3 text-right font-semibold">Score</th><th className="pb-2 pl-3 text-right font-semibold">Weight</th><th className="pb-2 pl-3 text-right font-semibold">Points</th></tr></thead>
              <tbody className="divide-y divide-ink-700/50">
                {([
                  ["Accuracy vs. consensus", s.components.relativeAccuracy, PRESTIGE_WEIGHTS.relativeAccuracy, `Your Brier ${s.brier.toFixed(3)} vs consensus ${s.baselineBrier.toFixed(3)} (lower is better). 50 = matched consensus.`],
                  ["Boldness", s.components.boldness, PRESTIGE_WEIGHTS.boldness, `Consensus gave the outcome ${pct(s.baselinePOutcome)}; you gave it ${pct(s.pOutcome)}. Credit only for leaning toward what happened.`],
                  ["Timing", s.components.timing, PRESTIGE_WEIGHTS.timing, `Locked ${durationLabel(s.leadDays)} before confirmation, scaled by your probability on the outcome.`],
                  ["Specificity", s.components.specificity, PRESTIGE_WEIGHTS.specificity, "How narrow the claim was, scaled by your probability on the outcome."],
                ] as const).map(([k, val, w, why]) => (
                  <tr key={k} className="align-top">
                    <td className="py-2.5 pr-2"><div className="font-semibold text-white">{k}</div><div className="text-xs text-ink-400">{why}</div></td>
                    <td className="py-2.5 text-right tabular-nums text-ink-200">{val.toFixed(1)}</td>
                    <td className="py-2.5 text-right tabular-nums text-ink-400">{Math.round(w * 100)}%</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-white">{(val * w).toFixed(1)}</td>
                  </tr>
                ))}
                <tr><td className="pt-3 font-display font-extrabold uppercase italic text-white" colSpan={3}>Take Prestige</td><td className="pt-3 text-right font-display text-xl font-black italic text-volt">{s.prestige.toFixed(1)}</td></tr>
              </tbody>
            </table>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-ink-400">Submitted</dt><dd className="text-right text-ink-200">{fmtDateTime(p.lockedAt)}</dd>
              <dt className="text-ink-400">Resolved</dt><dd className="text-right text-ink-200">{fmtDateTime(q.resolvedAt!)}</dd>
              <dt className="text-ink-400">Baseline</dt><dd className="text-right text-ink-200">{q.baselineSource === "none" ? "None (50/50)" : "Mock consensus at lock"}</dd>
              <dt className="text-ink-400">Rubric</dt><dd className="text-right text-ink-200">{s.gradingVersion} · <Link href="/how-scoring-works" className="text-volt">details</Link></dd>
            </dl>
            {q.evidence?.length ? (
              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">Evidence</div>
                {q.evidence.map((e) => (
                  <a key={e.url} href={e.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 rounded-xl bg-ink-900 p-3 text-sm ring-1 ring-ink-700 hover:ring-ink-500">
                    <ExternalLink className="mt-0.5 size-4 shrink-0 text-volt" /><span><b className="text-white">{e.source}</b> <span className="text-ink-300">— {e.note}</span></span>
                  </a>
                ))}
              </div>
            ) : null}
            {isOwner && <div className="mt-4"><AppealForm predictionId={p.id} /></div>}
          </div>
        </Card>
      )}

      {q && !s && (
        <Card className="p-5">
          <SectionTitle>How this resolves</SectionTitle>
          <p className="text-sm text-ink-200">{q.criteria}</p>
          <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
            <dt className="text-ink-400">Expected by</dt><dd className="text-right text-ink-200">{fmtDate(q.resolvesBy)}</dd>
            <dt className="text-ink-400">Verified via</dt><dd className="text-right text-ink-200">{q.resolutionSource}</dd>
            <dt className="text-ink-400">Rubric</dt><dd className="text-right text-ink-200">{p.gradingVersion}</dd>
          </dl>
        </Card>
      )}

      {isOwner && live && q && p.forecast && (
        <Card className="p-5"><SectionTitle>Manage</SectionTitle><OwnerActions predictionId={p.id} q={toLite(q)} current={p.forecast} graceLeftMin={graceLeft} /></Card>
      )}

      {!isOwner && me && live && q && p.forecast && (
        <Card id="challenge" className="scroll-mt-20 p-5">
          <SectionTitle>Take battle</SectionTitle>
          <ChallengeBox targetId={p.id} q={toLite(q)} targetForecast={p.forecast} mine={activeOnQuestion(d, me.id, q.id)?.forecast ?? null} opponent={v.author.username} />
        </Card>
      )}

      {battles.length > 0 && (
        <Card className="p-5">
          <SectionTitle>Battles</SectionTitle>
          <ul className="space-y-2">{battles.map((b) => {
            const other = d.users.find((u) => u.id === (b.challengerId === p.userId ? b.opponentId : b.challengerId));
            return <li key={b.id}><Link href={`/battles/${b.id}`} className="flex items-center justify-between rounded-xl bg-ink-900 px-3 py-2.5 text-sm ring-1 ring-ink-700 hover:ring-ink-500"><span>vs <b className="text-white">@{other?.username}</b></span><Chip tone={b.status === "resolved" ? (b.winnerId === p.userId ? "volt" : b.winnerId ? "loss" : "default") : "muted"}>{b.status === "resolved" ? (b.winnerId === p.userId ? "Won" : b.winnerId ? "Lost" : "Push") : b.status}</Chip></Link></li>;
          })}</ul>
        </Card>
      )}

      {p.kind === "graded" && (
        <Card className="p-5">
          <SectionTitle>Timeline</SectionTitle>
          <ol className="relative space-y-4 border-l border-ink-700 pl-5">
            {timeline.map((t, i) => {
              const Icon = t.icon;
              const body = <><div className={`text-sm ${t.current ? "font-semibold text-white" : "text-ink-200"}`}>{t.text}</div><div className="text-xs text-ink-500">{fmtDateTime(t.at)}</div></>;
              return (
                <li key={i} className="relative">
                  <span className={`absolute -left-[29px] flex size-6 items-center justify-center rounded-full ring-4 ring-ink-850 ${t.current ? "bg-volt text-ink-950" : "bg-ink-700 text-ink-200"}`}><Icon className="size-3.5" /></span>
                  {t.href ? <Link href={t.href} className="block hover:opacity-80">{body}</Link> : body}
                </li>
              );
            })}
            <li className="relative">
              <span className={`absolute -left-[29px] flex size-6 items-center justify-center rounded-full ring-4 ring-ink-850 ${s ? "bg-volt text-ink-950" : "bg-ink-800 text-ink-500"}`}>{s ? <BadgeCheck className="size-3.5" /> : <Clock className="size-3.5" />}</span>
              <div className="text-sm text-ink-200">{q?.resolvedAt ? `Graded: Prestige ${s?.prestige.toFixed(1) ?? "—"}` : p.status === "void" ? "Voided — not graded" : `Official result expected ${q ? fmtDate(q.resolvesBy) : ""}`}</div>
              {q?.resolvedAt && <div className="text-xs text-ink-500">{fmtDateTime(q.resolvedAt)}</div>}
            </li>
          </ol>
        </Card>
      )}

      <Card className="p-5">
        <SectionTitle>Integrity</SectionTitle>
        <div className={`mb-3 flex items-center gap-2 text-sm font-semibold ${intact ? "text-volt" : "text-loss"}`}>
          <ShieldCheck className="size-5" />{intact ? "Record verified — unchanged since lock" : "Integrity check failed"}
        </div>
        <dl className="space-y-1.5 font-mono text-[11px]">
          <div className="flex justify-between gap-3"><dt className="shrink-0 whitespace-nowrap text-ink-400">Receipt ID</dt><dd className="truncate text-ink-200">{p.id}</dd></div>
          <div className="flex justify-between gap-3"><dt className="shrink-0 whitespace-nowrap text-ink-400">Server timestamp</dt><dd className="text-ink-200">{p.lockedAt}</dd></div>
          <div className="flex justify-between gap-3"><dt className="flex shrink-0 items-center gap-1 whitespace-nowrap text-ink-400"><Fingerprint className="size-3" />SHA-256</dt><dd className="truncate text-ink-200">{p.hash}</dd></div>
          <div className="flex justify-between gap-3"><dt className="shrink-0 whitespace-nowrap text-ink-400">Previous hash</dt><dd className="truncate text-ink-500">{p.prevHash}</dd></div>
        </dl>
        <p className="mt-3 text-xs text-ink-500">Each receipt’s hash covers its locked fields plus the author’s previous receipt hash, so any edit to history breaks the chain. This is a tamper-evident database record, not a blockchain.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3"><CopyButton text={`/p/${p.id}`} label="Copy verification link" />{me && !isOwner && <ReportButton targetType="prediction" targetId={p.id} />}</div>
      </Card>

      <section id="comments" className="scroll-mt-20">
        <SectionTitle>Comments ({comments.length})</SectionTitle>
        <div className="space-y-3">
          {comments.map((c) => {
            const u = d.users.find((x) => x.id === c.userId)!;
            return (
              <div key={c.id} className="flex gap-3">
                <Avatar name={u.displayName} color={u.avatarColor} src={u.avatarUrl} size={32} />
                <div className="min-w-0 flex-1 rounded-2xl bg-ink-850 px-3.5 py-2.5 ring-1 ring-ink-700/60">
                  <div className="flex items-center gap-2 text-xs"><Link href={`/u/${u.username}`} className="font-semibold text-white">@{u.username}</Link><span className="text-ink-500">{timeAgo(c.createdAt)}</span>
                    {me && me.id !== c.userId && <span className="ml-auto"><ReportButton targetType="comment" targetId={c.id} /></span>}</div>
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink-100">{c.body}</p>
                </div>
              </div>
            );
          })}
          {me ? <CommentForm predictionId={p.id} /> : <p className="text-sm text-ink-400"><Link href={`/login?next=/p/${p.id}`} className="font-semibold text-volt">Log in</Link> to comment.</p>}
        </div>
      </section>
    </div>
  );
}
