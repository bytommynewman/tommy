export type BinaryForecast = { type: "binary"; pYes: number };

/**
 * Award-style ballot. `primary` and optional `darkHorse` carry explicit
 * probabilities; the remainder (1 - p1 - p2) is spread across every other
 * option in proportion to its baseline, so the "field" is never one lumped
 * outcome a user can hide behind.
 */
export type CategoricalForecast = {
  type: "categorical";
  primary: { optionId: string; p: number };
  darkHorse?: { optionId: string; p: number };
};

export type Forecast = BinaryForecast | CategoricalForecast;

export type BinaryOutcome = { type: "binary"; yes: boolean };
export type CategoricalOutcome = { type: "categorical"; optionId: string };
export type Outcome = BinaryOutcome | CategoricalOutcome;

export interface OptionBaseline {
  id: string;
  baseline: number;
}

export interface QuestionShape {
  kind: "binary" | "categorical";
  /** Binary: consensus P(yes) at lock time. */
  baselineYes?: number;
  /** Categorical: options with consensus probabilities at lock time (normalised internally). */
  options?: OptionBaseline[];
  /** 0..1 — how narrow the claim is (set per question template). */
  specificity: number;
}

export interface ScoreBreakdown {
  gradingVersion: string;
  /** 0..100 — proper-scoring-rule accuracy: 100 * (1 - Brier/2). */
  accuracy: number;
  /** 0..100 — headline Take Prestige score. */
  prestige: number;
  components: {
    relativeAccuracy: number;
    boldness: number;
    timing: number;
    specificity: number;
  };
  brier: number;
  baselineBrier: number;
  /** Probability the user assigned to what actually happened. */
  pOutcome: number;
  /** Probability the baseline assigned to what actually happened. */
  baselinePOutcome: number;
  leadDays: number;
  /** Binary: >50% on the realised side. Categorical: primary pick won. */
  correct: boolean;
  darkHorseHit: boolean;
}
