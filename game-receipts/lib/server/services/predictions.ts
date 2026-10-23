import type { Category, DB, Prediction, Subject } from "../../domain";
import { inferSubject, isKnownSubject } from "../../catalog/subjects";
import {
  DAILY_LOCK_LIMIT, ForecastError, GRADING_VERSION, validateForecast, WITHDRAW_GRACE_MINUTES, type Forecast,
} from "../../scoring";
import { GENESIS_HASH, hashPrediction } from "../../integrity";
import { audit, newId, UserError } from "../util";
import { createDraftQuestion, getQuestion, shapeOf, type DraftQuestion } from "./questions";
import { describeForecast } from "../../describe";
import type { League } from "../../catalog/teams";

export interface LockInput {
  originalText: string;
  /** Existing catalog question… */
  questionId?: string;
  /** …or a user-approved draft question. */
  draft?: DraftQuestion;
  forecast?: Forecast;
  /** Free-form hot take: never graded. */
  debate?: { league: League | null };
  /** Player or team the take is about (shown as its avatar). */
  subject?: Subject | null;
}

export function describeForecastFor(d: DB, questionId: string, f: Forecast): string {
  return describeForecast(getQuestion(d, questionId)!, f);
}

function lastHash(d: DB, userId: string) {
  let last: Prediction | undefined;
  for (const p of d.predictions) if (p.userId === userId && (!last || p.lockedAt >= last.lockedAt)) last = p;
  return last?.hash ?? GENESIS_HASH;
}

export const activeOnQuestion = (d: DB, userId: string, questionId: string) =>
  d.predictions.find((p) => p.userId === userId && p.questionId === questionId && !p.supersededAt && !p.withdrawnAt && p.status === "pending");

function checkRate(d: DB, userId: string, now: Date) {
  const day = now.toISOString().slice(0, 10);
  const today = d.predictions.filter((p) => p.userId === userId && p.kind === "graded" && p.lockedAt.startsWith(day)).length;
  if (today >= DAILY_LOCK_LIMIT) throw new UserError(`Daily limit of ${DAILY_LOCK_LIMIT} locked predictions reached — quality over quantity.`);
}

function seal(d: DB, p: Omit<Prediction, "hash" | "prevHash">): Prediction {
  const prevHash = lastHash(d, p.userId);
  // Deep-copy so no caller-held reference can mutate a sealed record.
  const full = structuredClone({ ...p, prevHash, hash: "" }) as Prediction;
  full.hash = hashPrediction(full);
  d.predictions.push(full);
  return full;
}

/** Lock a prediction. The server sets the timestamp; the client never supplies it. */
export function lockPrediction(d: DB, userId: string, input: LockInput, now = new Date(), opts: { seed?: boolean } = {}): Prediction {
  const originalText = input.originalText.trim().slice(0, 500);
  if (!originalText) throw new UserError("Say what you're calling first");
  if (input.subject && !isKnownSubject(input.subject)) throw new UserError("Unknown player or team");
  const id = newId();
  const lockedAt = now.toISOString();
  const lifecycle = {
    status: "pending" as const, supersededAt: null, withdrawnAt: null, withdrawnInGrace: false,
    score: null, resolvedAt: null, hidden: false, ...(opts.seed ? { seed: true } : {}),
  };

  if (input.debate) {
    const p = seal(d, {
      id, userId, kind: "debate", questionId: null, league: input.debate.league, subject: input.subject ?? null, category: "debate",
      originalText, structuredText: originalText, criteria: "Debate — not objectively verifiable, so it is never graded.",
      resolvesBy: null, forecast: null, baselineSnapshot: null, gradingVersion: GRADING_VERSION, lockedAt,
      chainId: id, revisionOf: null, revisionNumber: 1, ...lifecycle,
    });
    audit(d, userId, "lock", "prediction", p.id, { hash: p.hash }, lockedAt);
    return p;
  }

  checkRate(d, userId, now);
  const q = input.questionId ? getQuestion(d, input.questionId) : input.draft ? createDraftQuestion(d, userId, input.draft, now) : undefined;
  if (!q) throw new UserError("Pick what you're predicting");
  if (q.status !== "open" || new Date(q.resolvesBy) <= now) throw new UserError("This question is closed for new predictions");
  if (q.reviewStatus === "rejected") throw new UserError("This question was rejected by moderators");
  if (activeOnQuestion(d, userId, q.id)) throw new UserError("You already have a live take on this — post a revision instead");
  if (!input.forecast) throw new UserError("Set your confidence");
  const shape = shapeOf(q);
  try {
    validateForecast(input.forecast, shape);
  } catch (e) {
    if (e instanceof ForecastError) throw new UserError(e.message);
    throw e;
  }
  // Ballot picks are the natural subject; otherwise use what the user picked, else whoever the question names.
  const pick = input.forecast.type === "categorical" ? input.forecast.primary.optionId : null;
  const subject: Subject | null = input.subject
    ?? (pick && isKnownSubject({ type: "player", id: pick }) ? { type: "player", id: pick } : pick && isKnownSubject({ type: "team", id: pick }) ? { type: "team", id: pick } : null)
    ?? inferSubject(q.title, q.league);
  const p = seal(d, {
    id, userId, kind: "graded", questionId: q.id, league: q.league, subject, category: q.category as Category,
    originalText, structuredText: describeForecastFor(d, q.id, input.forecast), criteria: q.criteria, resolvesBy: q.resolvesBy,
    forecast: input.forecast, baselineSnapshot: shape, gradingVersion: GRADING_VERSION, lockedAt,
    chainId: id, revisionOf: null, revisionNumber: 1, ...lifecycle,
  });
  audit(d, userId, "lock", "prediction", p.id, { hash: p.hash }, lockedAt);
  return p;
}

/** New timestamped revision. The original stays on record, marked superseded. */
export function revisePrediction(d: DB, userId: string, predictionId: string, forecast: Forecast, note: string, now = new Date()): Prediction {
  const orig = d.predictions.find((p) => p.id === predictionId);
  if (!orig || orig.userId !== userId) throw new UserError("Prediction not found");
  if (orig.kind !== "graded" || orig.status !== "pending" || orig.supersededAt || orig.withdrawnAt) throw new UserError("Only live graded predictions can be revised");
  const q = getQuestion(d, orig.questionId!)!;
  if (q.status !== "open" || new Date(q.resolvesBy) <= now) throw new UserError("This question is closed");
  checkRate(d, userId, now);
  const shape = shapeOf(q);
  try { validateForecast(forecast, shape); } catch (e) { if (e instanceof ForecastError) throw new UserError(e.message); throw e; }
  const lockedAt = now.toISOString();
  orig.supersededAt = lockedAt;
  const p = seal(d, {
    id: newId(), userId, kind: "graded", questionId: q.id, league: q.league, subject: orig.subject ?? null, category: orig.category,
    originalText: note.trim().slice(0, 500) || orig.originalText, structuredText: describeForecastFor(d, q.id, forecast),
    criteria: q.criteria, resolvesBy: q.resolvesBy, forecast, baselineSnapshot: shape, gradingVersion: GRADING_VERSION,
    lockedAt, chainId: orig.chainId, revisionOf: orig.id, revisionNumber: orig.revisionNumber + 1,
    status: "pending", supersededAt: null, withdrawnAt: null, withdrawnInGrace: false, score: null, resolvedAt: null, hidden: false,
  });
  audit(d, userId, "revise", "prediction", p.id, { revisionOf: orig.id, hash: p.hash }, lockedAt);
  return p;
}

/**
 * Withdraw. Inside the grace window (typo fixes) the take is voided and never graded.
 * After it, the record stays, is labelled withdrawn, and is STILL graded — so you
 * can't bury a losing call.
 */
export function withdrawPrediction(d: DB, userId: string, predictionId: string, now = new Date()): Prediction {
  const p = d.predictions.find((x) => x.id === predictionId);
  if (!p || p.userId !== userId) throw new UserError("Prediction not found");
  if (p.withdrawnAt || p.supersededAt || p.status !== "pending") throw new UserError("Only live predictions can be withdrawn");
  const inGrace = now.getTime() - new Date(p.lockedAt).getTime() <= WITHDRAW_GRACE_MINUTES * 60_000;
  p.withdrawnAt = now.toISOString();
  p.withdrawnInGrace = inGrace;
  if (inGrace || p.kind === "debate") p.status = "void";
  audit(d, userId, "withdraw", "prediction", p.id, { inGrace }, p.withdrawnAt);
  return p;
}

/** All revisions in a chain, oldest first. */
export const chainOf = (d: DB, chainId: string) =>
  d.predictions.filter((p) => p.chainId === chainId).sort((a, b) => a.lockedAt.localeCompare(b.lockedAt));
