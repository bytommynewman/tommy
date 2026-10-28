import type { DB, Question } from "../../domain";
import type { QuestionShape } from "../../scoring";
import { LEAGUES } from "../../catalog/teams";
import { UserError } from "../util";
import { z } from "zod";

export function shapeOf(q: Question): QuestionShape {
  return q.kind === "binary"
    ? { kind: "binary", baselineYes: q.baselineYes ?? 0.5, specificity: q.specificity }
    : { kind: "categorical", options: (q.options ?? []).map((o) => ({ id: o.id, baseline: o.baseline })), specificity: q.specificity };
}

export const getQuestion = (d: DB, id: string) => d.questions.find((q) => q.id === id);

export function optionLabel(q: Question, optionId: string) {
  return q.options?.find((o) => o.id === optionId)?.label ?? optionId;
}

export function openQuestions(d: DB, now = new Date()) {
  return d.questions.filter((q) => q.status === "open" && q.reviewStatus !== "rejected" && new Date(q.resolvesBy) > now);
}

/** A user-proposed binary question, produced by the structurer and reviewed by the user before lock. */
export const DraftQuestionSchema = z.object({
  league: z.enum(LEAGUES as [string, ...string[]]),
  category: z.enum(["award", "trade", "breakout", "team", "comparison"]),
  title: z.string().trim().min(8).max(200),
  criteria: z.string().trim().min(10).max(600),
  resolutionSource: z.string().trim().min(3).max(200),
  specificity: z.number().min(0).max(1),
  resolvesBy: z.string().datetime(),
});
export type DraftQuestion = z.infer<typeof DraftQuestionSchema>;

const MAX_HORIZON_MS = 3 * 365 * 86_400_000;

export function createDraftQuestion(d: DB, userId: string, draft: DraftQuestion, now: Date): Question {
  const parsed = DraftQuestionSchema.parse(draft);
  const by = new Date(parsed.resolvesBy);
  if (by <= now) throw new UserError("Resolution date must be in the future");
  if (by.getTime() - now.getTime() > MAX_HORIZON_MS) throw new UserError("Predictions can resolve at most 3 years out");
  // Reuse an identical open question rather than fragmenting the market.
  const existing = d.questions.find((q) => q.status === "open" && q.title.toLowerCase() === parsed.title.toLowerCase() && q.league === parsed.league);
  if (existing) return existing;
  const q: Question = {
    id: `u-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    league: parsed.league as Question["league"],
    category: parsed.category,
    kind: "binary",
    title: parsed.title,
    criteria: parsed.criteria,
    resolutionSource: parsed.resolutionSource,
    specificity: parsed.specificity,
    baselineYes: 0.5,
    baselineSource: "none",
    resolvesBy: parsed.resolvesBy,
    status: "open",
    reviewStatus: "pending",
    createdBy: userId,
    createdAt: now.toISOString(),
  };
  d.questions.push(q);
  return q;
}

export function toLite(q: Question): import("../../describe").QuestionLite {
  return {
    id: q.id, league: q.league, category: q.category, kind: q.kind, title: q.title, criteria: q.criteria,
    resolutionSource: q.resolutionSource, resolvesBy: q.resolvesBy, baselineYes: q.baselineYes, baselineSource: q.baselineSource,
    options: q.options?.map((o) => ({ ...o })),
  };
}
