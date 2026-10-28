import { MAX_PROB, MIN_PROB } from "./config";
import type { CategoricalForecast, Forecast, Outcome, QuestionShape } from "./types";

export const clampProb = (p: number) => Math.min(MAX_PROB, Math.max(MIN_PROB, p));

export class ForecastError extends Error {}

/** Normalise baselines so they sum to 1; missing/zero baselines get a small floor so no option is impossible. */
export function normalisedBaselines(q: QuestionShape): Map<string, number> {
  const opts = q.options ?? [];
  if (opts.length < 2) throw new ForecastError("Categorical question needs at least two options");
  const floor = 0.001;
  const raw = opts.map((o) => Math.max(floor, Number.isFinite(o.baseline) ? o.baseline : 0));
  const sum = raw.reduce((a, b) => a + b, 0);
  return new Map(opts.map((o, i) => [o.id, raw[i] / sum]));
}

/** Throws ForecastError if the forecast is incoherent for the question. */
export function validateForecast(f: Forecast, q: QuestionShape): void {
  if (f.type !== q.kind) throw new ForecastError("Forecast type does not match question");
  if (f.type === "binary") {
    if (!(f.pYes >= MIN_PROB && f.pYes <= MAX_PROB)) throw new ForecastError(`Probability must be between ${MIN_PROB * 100}% and ${MAX_PROB * 100}%`);
    return;
  }
  const ids = new Set((q.options ?? []).map((o) => o.id));
  const { primary, darkHorse } = f;
  if (!ids.has(primary.optionId)) throw new ForecastError("Unknown primary pick");
  if (!(primary.p >= MIN_PROB && primary.p <= MAX_PROB)) throw new ForecastError("Primary confidence out of range");
  if (darkHorse) {
    if (!ids.has(darkHorse.optionId)) throw new ForecastError("Unknown dark-horse pick");
    if (darkHorse.optionId === primary.optionId) throw new ForecastError("Dark horse must differ from primary pick");
    if (!(darkHorse.p >= MIN_PROB && darkHorse.p <= MAX_PROB)) throw new ForecastError("Dark-horse confidence out of range");
    if (darkHorse.p > primary.p) throw new ForecastError("Dark horse cannot have more confidence than the primary pick");
  }
  const total = primary.p + (darkHorse?.p ?? 0);
  // Leave the rest of the field at least 1% so a single ballot can't claim certainty.
  if (total > 1 - MIN_PROB + 1e-9) throw new ForecastError("Primary + dark horse must leave at least 1% for the field");
}

/** Full probability vector implied by a categorical ballot. */
export function categoricalDistribution(f: CategoricalForecast, q: QuestionShape): Map<string, number> {
  const base = normalisedBaselines(q);
  const explicit = new Map<string, number>([[f.primary.optionId, f.primary.p]]);
  if (f.darkHorse) explicit.set(f.darkHorse.optionId, f.darkHorse.p);
  const remainder = Math.max(0, 1 - [...explicit.values()].reduce((a, b) => a + b, 0));
  let restBase = 0;
  for (const [id, b] of base) if (!explicit.has(id)) restBase += b;
  const dist = new Map<string, number>();
  for (const [id, b] of base) {
    dist.set(id, explicit.get(id) ?? (restBase > 0 ? (remainder * b) / restBase : 0));
  }
  return dist;
}

/** Probability vector for any forecast, keyed by outcome id ("yes"/"no" for binary). */
export function forecastDistribution(f: Forecast, q: QuestionShape): Map<string, number> {
  if (f.type === "binary") return new Map([["yes", f.pYes], ["no", 1 - f.pYes]]);
  return categoricalDistribution(f, q);
}

export function baselineDistribution(q: QuestionShape): Map<string, number> {
  if (q.kind === "binary") {
    const b = clampProb(q.baselineYes ?? 0.5);
    return new Map([["yes", b], ["no", 1 - b]]);
  }
  return normalisedBaselines(q);
}

export function outcomeKey(o: Outcome): string {
  return o.type === "binary" ? (o.yes ? "yes" : "no") : o.optionId;
}
