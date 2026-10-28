/**
 * Grading rubric configuration. Every graded prediction records the
 * GRADING_VERSION it was locked under, so a future rubric change never
 * silently re-scores old receipts.
 */
export const GRADING_VERSION = "GR-2026.1";

export interface PrestigeWeights {
  /** Accuracy relative to the consensus baseline at lock time. */
  relativeAccuracy: number;
  /** How rare the realised outcome was, credited only if the user leaned toward it. */
  boldness: number;
  /** Lead time between lock and resolution. */
  timing: number;
  /** How narrow / specific the claim was. */
  specificity: number;
}

export const PRESTIGE_WEIGHTS: PrestigeWeights = {
  relativeAccuracy: 0.55,
  boldness: 0.2,
  timing: 0.15,
  specificity: 0.1,
};

/** Lead time (days) at which the timing component saturates at 100. */
export const TIMING_SATURATION_DAYS = 365;

/** Withdrawals inside this window (typo fixes) are not graded. After it, withdrawn takes are still graded. */
export const WITHDRAW_GRACE_MINUTES = 10;

/**
 * Bayesian shrinkage: a user's grade is pulled toward PRIOR_SCORE by PRIOR_WEIGHT phantom predictions.
 * 36 ≈ the expected prestige of someone who always copies the consensus (no skill), so a new
 * account starts at "consensus level" and must beat it to climb.
 */
export const PRIOR_SCORE = 36;
export const PRIOR_WEIGHT = 8;

/** Minimum resolved predictions to appear on ranked leaderboards. */
export const MIN_RESOLVED_ALL_TIME = 5;
export const MIN_RESOLVED_MONTHLY = 3;

/** Cap on new graded predictions per user per UTC day (anti mass-prediction). */
export const DAILY_LOCK_LIMIT = 20;

/** Receipts-engine awards require the take to have been locked at least this long before resolution. */
export const RECEIPT_MIN_LEAD_HOURS = 24;

/** Allowed probability range for any single stated probability. Extremes are clamped to keep scores finite and humble. */
export const MIN_PROB = 0.01;
export const MAX_PROB = 0.99;
