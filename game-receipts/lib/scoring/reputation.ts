import { MIN_RESOLVED_ALL_TIME, PRIOR_SCORE, PRIOR_WEIGHT } from "./config";

/** A graded prediction as reputation sees it. */
export interface GradedEntry {
  /** Root id of the revision chain — all revisions of one take share it. */
  chainId: string;
  league: string;
  lockedAt: string;
  /** When this revision stopped being the active one (superseded), else null. */
  supersededAt: string | null;
  resolvedAt: string;
  prestige: number;
  accuracy: number;
  correct: boolean;
}

export interface ChainScore {
  chainId: string;
  league: string;
  resolvedAt: string;
  prestige: number;
  accuracy: number;
  correct: boolean;
}

/**
 * Collapse revision chains into one score each, time-weighted by how long
 * each revision was the active forecast. Revising late can't erase an early
 * bad forecast, and many revisions can't multiply a good one.
 */
export function collapseChains(entries: GradedEntry[]): ChainScore[] {
  const byChain = new Map<string, GradedEntry[]>();
  for (const e of entries) byChain.set(e.chainId, [...(byChain.get(e.chainId) ?? []), e]);
  const out: ChainScore[] = [];
  for (const [chainId, revs] of byChain) {
    revs.sort((a, b) => a.lockedAt.localeCompare(b.lockedAt));
    let wSum = 0, p = 0, a = 0;
    for (const r of revs) {
      const end = new Date(r.supersededAt ?? r.resolvedAt).getTime();
      const w = Math.max(1, end - new Date(r.lockedAt).getTime()); // ≥1ms so instant revisions still count
      wSum += w; p += w * r.prestige; a += w * r.accuracy;
    }
    const last = revs[revs.length - 1];
    out.push({
      chainId,
      league: last.league,
      resolvedAt: last.resolvedAt,
      prestige: p / wSum,
      accuracy: a / wSum,
      correct: last.correct,
    });
  }
  return out;
}

/** Shrunk mean: (sum + k*prior) / (n + k). One lucky call can't top a long strong record. */
export function shrunkGrade(scores: number[], prior = PRIOR_SCORE, k = PRIOR_WEIGHT): number {
  const sum = scores.reduce((s, x) => s + x, 0);
  return Math.round(((sum + k * prior) / (scores.length + k)) * 10) / 10;
}

export function letterGrade(score: number): string {
  const table: [number, string][] = [
    [65, "A+"], [58, "A"], [53, "A-"], [49, "B+"], [45, "B"], [41, "B-"],
    [38, "C+"], [35, "C"], [32, "C-"], [26, "D"],
  ];
  for (const [min, g] of table) if (score >= min) return g;
  return "F";
}

export interface ReputationSummary {
  grade: number;
  letter: string;
  resolved: number;
  correct: number;
  hitRate: number | null;
  meanAccuracy: number | null;
  ranked: boolean;
}

export function summarise(chains: ChainScore[], minResolved = MIN_RESOLVED_ALL_TIME): ReputationSummary {
  const grade = shrunkGrade(chains.map((c) => c.prestige));
  const correct = chains.filter((c) => c.correct).length;
  const n = chains.length;
  return {
    grade,
    letter: letterGrade(grade),
    resolved: n,
    correct,
    hitRate: n ? Math.round((correct / n) * 1000) / 10 : null,
    meanAccuracy: n ? Math.round((chains.reduce((s, c) => s + c.accuracy, 0) / n) * 10) / 10 : null,
    ranked: n >= minResolved,
  };
}

/** UTC scoring period key, e.g. "2026-10". Predictions count toward the month they resolve in. */
export const periodKey = (iso: string) => iso.slice(0, 7);
