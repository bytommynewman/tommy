import type { DB, Evidence, Prediction, Question } from "../../domain";
import { battleWinner, collapseChains, gradePrediction, RECEIPT_MIN_LEAD_HOURS, type Outcome } from "../../scoring";
import { audit, UserError } from "../util";
import { notify } from "./notify";
import { getQuestion, optionLabel } from "./questions";
import { gradedEntry } from "./reputation";

export function outcomeLabel(q: Question, o: Outcome) {
  return o.type === "binary" ? (o.yes ? "YES" : "NO") : optionLabel(q, o.optionId);
}

function validateOutcome(q: Question, o: Outcome) {
  if (o.type !== q.kind) throw new UserError("Outcome type does not match question");
  if (o.type === "categorical" && !q.options?.some((x) => x.id === o.optionId)) throw new UserError("Unknown outcome option");
}

/**
 * Resolve (or correct) a question's outcome and deterministically grade every
 * locked prediction on it. Evidence with a source URL is mandatory.
 */
export function resolveQuestion(d: DB, actorId: string, questionId: string, outcome: Outcome, evidence: Evidence[], now = new Date()) {
  const q = getQuestion(d, questionId);
  if (!q) throw new UserError("Question not found");
  if (q.status === "void") throw new UserError("Question was voided");
  validateOutcome(q, outcome);
  if (!evidence.length || evidence.some((e) => !/^https?:\/\//.test(e.url) || !e.source.trim())) {
    throw new UserError("At least one evidence source with a URL is required");
  }
  const correction = q.status === "resolved";
  q.status = "resolved";
  q.outcome = outcome;
  q.resolvedAt = correction ? q.resolvedAt : now.toISOString();
  q.resolvedBy = actorId;
  q.evidence = evidence;
  q.developments = [...(q.developments ?? []), { at: now.toISOString(), text: `${correction ? "Outcome corrected" : "Officially resolved"}: ${outcomeLabel(q, outcome)}` }];
  gradeQuestion(d, q, now);
  audit(d, actorId, correction ? "outcome_corrected" : "resolve", "question", q.id, { outcome, evidence }, now.toISOString());
  return q;
}

export function gradeQuestion(d: DB, q: Question, now = new Date()) {
  const preds = d.predictions.filter((p) => p.questionId === q.id && p.kind === "graded" && !p.withdrawnInGrace && p.status !== "void");
  for (const p of preds) {
    p.score = gradePrediction({ forecast: p.forecast!, question: p.baselineSnapshot!, outcome: q.outcome!, lockedAt: p.lockedAt, resolvedAt: q.resolvedAt! });
    p.status = "resolved";
    p.resolvedAt = q.resolvedAt!;
    if (!p.supersededAt) {
      notify(d, p.userId, "resolved", `Graded: "${q.title}" — ${outcomeLabel(q, q.outcome!)}. Take Prestige ${p.score.prestige}.`, `/p/${p.id}`, undefined, now.toISOString());
    }
  }
  q.awards = computeAwards(d, q, preds);
  for (const [kind, pid] of Object.entries(q.awards)) {
    const p = preds.find((x) => x.id === pid);
    if (p) notify(d, p.userId, "receipt", `🧾 Receipt earned: ${AWARD_LABEL[kind as keyof typeof AWARD_LABEL]} on "${q.title}"`, `/r/${p.id}`, undefined, now.toISOString());
  }
  resolveBattles(d, q, now);
}

export const AWARD_LABEL = {
  earliestCorrect: "Earliest correct call",
  mostImpressive: "Most impressive call",
  bestCalibrated: "Best calibrated",
} as const;

/**
 * Receipts-engine awards. Eligibility: final revision of its chain, graded,
 * correct, not withdrawn or hidden, locked ≥ RECEIPT_MIN_LEAD_HOURS before resolution.
 * One live chain per user per question means mass contradictory picks can't farm these.
 */
function computeAwards(d: DB, q: Question, preds: Prediction[]) {
  const resolvedMs = new Date(q.resolvedAt!).getTime();
  const eligible = preds.filter((p) =>
    !p.supersededAt && !p.withdrawnAt && !p.hidden && p.score?.correct &&
    resolvedMs - new Date(p.lockedAt).getTime() >= RECEIPT_MIN_LEAD_HOURS * 3_600_000);
  if (!eligible.length) return {};
  // Earliest correct uses the chain's first lock, provided the chain ended correct.
  const chainStart = (p: Prediction) => d.predictions.filter((x) => x.chainId === p.chainId).reduce((m, x) => (x.lockedAt < m ? x.lockedAt : m), p.lockedAt);
  const by = <T,>(arr: Prediction[], f: (p: Prediction) => T, better: (a: T, b: T) => boolean) =>
    arr.reduce((best, p) => (better(f(p), f(best)) ? p : best), arr[0]);
  return {
    earliestCorrect: by(eligible, chainStart, (a, b) => a < b).id,
    mostImpressive: by(eligible, (p) => p.score!.prestige, (a, b) => a > b).id,
    bestCalibrated: by(eligible, (p) => p.score!.accuracy, (a, b) => a > b).id,
  };
}

function chainAccuracy(d: DB, chainId: string) {
  const entries = d.predictions.filter((p) => p.chainId === chainId && p.score && !p.withdrawnInGrace).map(gradedEntry);
  return collapseChains(entries)[0]?.accuracy ?? 0;
}

function resolveBattles(d: DB, q: Question, now: Date) {
  for (const b of d.battles.filter((x) => x.questionId === q.id && (x.status === "accepted" || x.status === "open"))) {
    if (b.status === "open" || !b.opponentPredictionId) {
      b.status = "declined";
      continue;
    }
    const cp = d.predictions.find((p) => p.id === b.challengerPredictionId)!;
    const op = d.predictions.find((p) => p.id === b.opponentPredictionId)!;
    b.winnerId = battleWinner(
      { userId: b.challengerId, accuracy: chainAccuracy(d, cp.chainId) },
      { userId: b.opponentId, accuracy: chainAccuracy(d, op.chainId) },
    );
    b.status = "resolved";
    b.resolvedAt = now.toISOString();
    for (const uid of [b.challengerId, b.opponentId]) {
      const text = b.winnerId === null ? `Battle on "${q.title}" ended in a push.` : b.winnerId === uid ? `You won your battle on "${q.title}" 🏆` : `You lost your battle on "${q.title}".`;
      notify(d, uid, "battle", text, `/battles/${b.id}`, undefined, now.toISOString());
    }
  }
}

export function voidQuestion(d: DB, actorId: string, questionId: string, reason: string, now = new Date()) {
  const q = getQuestion(d, questionId);
  if (!q) throw new UserError("Question not found");
  q.status = "void";
  q.reviewStatus = q.createdBy === "system" ? q.reviewStatus : "rejected";
  for (const p of d.predictions.filter((x) => x.questionId === q.id)) {
    p.status = "void";
    p.score = null;
    if (!p.supersededAt) notify(d, p.userId, "resolved", `"${q.title}" was voided: ${reason}`, `/p/${p.id}`, undefined, now.toISOString());
  }
  for (const b of d.battles.filter((x) => x.questionId === q.id && x.status !== "resolved")) b.status = "declined";
  audit(d, actorId, "void", "question", q.id, { reason }, now.toISOString());
}
