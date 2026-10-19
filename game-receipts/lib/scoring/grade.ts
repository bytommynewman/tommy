import { GRADING_VERSION, PRESTIGE_WEIGHTS, TIMING_SATURATION_DAYS, type PrestigeWeights } from "./config";
import { baselineDistribution, forecastDistribution, outcomeKey, validateForecast } from "./distribution";
import type { Forecast, Outcome, QuestionShape, ScoreBreakdown } from "./types";

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Multi-category Brier score: sum over outcomes of (p_i - o_i)^2.
 * Range 0 (perfect) .. 2 (certain and wrong). Strictly proper, so the
 * best expected score comes from reporting your true belief.
 */
export function brier(dist: Map<string, number>, realised: string): number {
  if (!dist.has(realised)) throw new Error(`Outcome ${realised} not in distribution`);
  let s = 0;
  for (const [id, p] of dist) s += (p - (id === realised ? 1 : 0)) ** 2;
  return s;
}

export function leadDays(lockedAt: Date | string, resolvedAt: Date | string): number {
  const ms = new Date(resolvedAt).getTime() - new Date(lockedAt).getTime();
  return Math.max(0, ms / 86_400_000);
}

export interface GradeInput {
  forecast: Forecast;
  question: QuestionShape;
  outcome: Outcome;
  lockedAt: Date | string;
  resolvedAt: Date | string;
  weights?: PrestigeWeights;
}

/**
 * Deterministic grading. Same inputs always produce the same breakdown —
 * no model or randomness is involved in the score.
 */
export function gradePrediction(input: GradeInput): ScoreBreakdown {
  const { forecast, question, outcome } = input;
  const w = input.weights ?? PRESTIGE_WEIGHTS;
  validateForecast(forecast, question);

  const realised = outcomeKey(outcome);
  const userDist = forecastDistribution(forecast, question);
  const baseDist = baselineDistribution(question);

  const bUser = brier(userDist, realised);
  const bBase = brier(baseDist, realised);
  const u = userDist.get(realised) ?? 0;
  const b = baseDist.get(realised) ?? 0;

  // Accuracy: Brier normalised to 0..100.
  const accuracy = 100 * (1 - bUser / 2);

  // Relative accuracy: 50 = matched the consensus, 100 = max possible improvement.
  const relativeAccuracy = 100 * clamp01(0.5 + (bBase - bUser) / 4);

  // Boldness: rarity of the outcome, scaled by how far the user moved toward it beyond consensus.
  const rarity = 1 - b;
  const lean = b < 1 ? clamp01((u - b) / (1 - b)) : 0;
  const boldness = 100 * rarity * lean;

  // Timing and specificity only earn credit in proportion to the probability placed on what happened,
  // so an early, specific, wrong call is worth nothing.
  const days = leadDays(input.lockedAt, input.resolvedAt);
  const leadFactor = clamp01(Math.log1p(days) / Math.log1p(TIMING_SATURATION_DAYS));
  const timing = 100 * leadFactor * u;
  const specificity = 100 * clamp01(question.specificity) * u;

  const prestige =
    w.relativeAccuracy * relativeAccuracy + w.boldness * boldness + w.timing * timing + w.specificity * specificity;

  const correct =
    forecast.type === "binary" ? u > 0.5 : forecast.primary.optionId === realised;
  const darkHorseHit = forecast.type === "categorical" && forecast.darkHorse?.optionId === realised;

  return {
    gradingVersion: GRADING_VERSION,
    accuracy: round1(accuracy),
    prestige: round1(Math.min(100, Math.max(0, prestige))),
    components: {
      relativeAccuracy: round1(relativeAccuracy),
      boldness: round1(boldness),
      timing: round1(timing),
      specificity: round1(specificity),
    },
    brier: Math.round(bUser * 10000) / 10000,
    baselineBrier: Math.round(bBase * 10000) / 10000,
    pOutcome: Math.round(u * 10000) / 10000,
    baselinePOutcome: Math.round(b * 10000) / 10000,
    leadDays: round1(days),
    correct,
    darkHorseHit,
  };
}
