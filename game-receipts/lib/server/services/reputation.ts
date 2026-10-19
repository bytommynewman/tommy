import type { DB, Prediction } from "../../domain";
import {
  collapseChains, MIN_RESOLVED_ALL_TIME, MIN_RESOLVED_MONTHLY, periodKey, summarise, type ChainScore, type GradedEntry,
} from "../../scoring";
import type { League } from "../../catalog/teams";

export const gradedEntry = (p: Prediction): GradedEntry => ({
  chainId: p.chainId, league: p.league ?? "NFL", lockedAt: p.lockedAt, supersededAt: p.supersededAt,
  resolvedAt: p.resolvedAt!, prestige: p.score!.prestige, accuracy: p.score!.accuracy, correct: p.score!.correct,
});

/** Predictions that count toward reputation: graded, resolved, on approved questions, not voided in grace. */
export function countable(d: DB, userId: string): Prediction[] {
  const approved = new Set(d.questions.filter((q) => q.reviewStatus === "approved").map((q) => q.id));
  return d.predictions.filter((p) => p.userId === userId && p.kind === "graded" && p.status === "resolved" && p.score && approved.has(p.questionId!));
}

export function userChains(d: DB, userId: string, filter?: (p: Prediction) => boolean): ChainScore[] {
  const preds = countable(d, userId).filter((p) => (filter ? filter(p) : true));
  return collapseChains(preds.map(gradedEntry));
}

export function userReputation(d: DB, userId: string, now = new Date()) {
  const all = d.predictions.filter((p) => p.userId === userId);
  const chains = userChains(d, userId);
  const month = periodKey(now.toISOString());
  const leagues = [...new Set(chains.map((c) => c.league))] as League[];
  const byLeague = leagues
    .map((l) => ({ league: l, ...summarise(chains.filter((c) => c.league === l), MIN_RESOLVED_MONTHLY) }))
    .sort((a, b) => b.grade - a.grade);
  const categories = [...new Set(countable(d, userId).map((p) => p.category))];
  const byCategory = categories.map((c) => ({ category: c, ...summarise(userChains(d, userId, (p) => p.category === c), MIN_RESOLVED_MONTHLY) }));
  const best = countable(d, userId)
    .filter((p) => !p.supersededAt && p.score!.correct)
    .sort((a, b) => b.score!.prestige - a.score!.prestige)
    .slice(0, 5);
  return {
    overall: summarise(chains),
    monthly: { period: month, ...summarise(chains.filter((c) => periodKey(c.resolvedAt) === month), MIN_RESOLVED_MONTHLY) },
    byLeague,
    byCategory,
    best,
    calibration: calibration(d, countable(d, userId)),
    totals: {
      total: all.filter((p) => !p.supersededAt).length,
      graded: all.filter((p) => p.kind === "graded" && !p.supersededAt).length,
      debates: all.filter((p) => p.kind === "debate").length,
      pending: all.filter((p) => p.status === "pending" && !p.supersededAt).length,
      resolved: chains.length,
      correct: chains.filter((c) => c.correct).length,
      withdrawn: all.filter((p) => p.withdrawnAt).length,
    },
  };
}

/** Stated probability (P(yes) for binary, primary-pick confidence for ballots) vs how often it actually hit. */
function calibration(d: DB, preds: Prediction[]) {
  const buckets = [0, 0.2, 0.4, 0.6, 0.8].map((lo) => ({ lo, hi: lo + 0.2, n: 0, hits: 0, sumP: 0 }));
  for (const p of preds) {
    if (p.supersededAt || !p.forecast || !p.score) continue;
    let prob: number, hit: boolean;
    if (p.forecast.type === "binary") {
      prob = p.forecast.pYes;
      const q = d.questions.find((x) => x.id === p.questionId);
      hit = q?.outcome?.type === "binary" && q.outcome.yes;
    } else {
      prob = p.forecast.primary.p;
      hit = p.score.correct;
    }
    const b = buckets.find((x) => prob >= x.lo && prob < x.hi) ?? buckets[4];
    b.n++; b.sumP += prob; if (hit) b.hits++;
  }
  return buckets.map((b) => ({ label: `${Math.round(b.lo * 100)}–${Math.round(b.hi * 100)}%`, n: b.n, stated: b.n ? b.sumP / b.n : null, actual: b.n ? b.hits / b.n : null }));
}

export type BoardKind = "all" | "monthly" | "friends" | League;

export function leaderboard(d: DB, kind: BoardKind, viewerId: string | null, opts: { period?: string; category?: string } = {}) {
  let users = d.users.filter((u) => !u.private || u.id === viewerId);
  if (kind === "friends" && viewerId) {
    const following = new Set(d.follows.filter((f) => f.followerId === viewerId).map((f) => f.followeeId));
    users = users.filter((u) => u.id === viewerId || following.has(u.id));
  }
  const rows = users.map((u) => {
    let chains = userChains(d, u.id, opts.category ? (p) => p.category === opts.category : undefined);
    let min = MIN_RESOLVED_ALL_TIME;
    if (kind === "monthly") {
      chains = chains.filter((c) => periodKey(c.resolvedAt) === opts.period);
      min = MIN_RESOLVED_MONTHLY;
    } else if (kind !== "all" && kind !== "friends") {
      chains = chains.filter((c) => c.league === kind);
      min = MIN_RESOLVED_MONTHLY;
    }
    const s = summarise(chains, kind === "friends" ? 1 : min);
    return { user: u, ...s };
  });
  return rows
    .filter((r) => r.resolved > 0)
    .sort((a, b) => Number(b.ranked) - Number(a.ranked) || b.grade - a.grade);
}

/** Months (YYYY-MM) that have at least one resolution, newest first. */
export function periodsWithData(d: DB) {
  return [...new Set(d.predictions.filter((p) => p.resolvedAt).map((p) => periodKey(p.resolvedAt!)))].sort().reverse();
}

export function battleRecord(d: DB, userId: string) {
  const mine = d.battles.filter((b) => b.status === "resolved" && (b.challengerId === userId || b.opponentId === userId));
  const w = mine.filter((b) => b.winnerId === userId).length;
  const pushes = mine.filter((b) => b.winnerId === null).length;
  return { wins: w, losses: mine.length - w - pushes, pushes };
}

export function headToHeadBoard(d: DB) {
  return d.users
    .map((u) => ({ user: u, ...battleRecord(d, u.id) }))
    .filter((r) => r.wins + r.losses + r.pushes > 0)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

/** Top correct calls platform-wide by Take Prestige. */
export function topCalls(d: DB, limit = 10) {
  return d.predictions
    .filter((p) => p.status === "resolved" && p.score?.correct && !p.supersededAt && !p.hidden && !p.withdrawnAt)
    .sort((a, b) => b.score!.prestige - a.score!.prestige)
    .slice(0, limit);
}
