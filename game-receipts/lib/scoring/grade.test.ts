import { describe, expect, it } from "vitest";
import {
  battleWinner, categoricalDistribution, collapseChains, ForecastError, gradePrediction,
  shrunkGrade, summarise, validateForecast, type QuestionShape,
} from "./index";

const binQ: QuestionShape = { kind: "binary", baselineYes: 0.2, specificity: 0.5 };
const mvp: QuestionShape = {
  kind: "categorical",
  specificity: 0.8,
  options: [
    { id: "a", baseline: 0.4 }, { id: "b", baseline: 0.3 }, { id: "c", baseline: 0.2 },
    { id: "d", baseline: 0.08 }, { id: "field", baseline: 0.02 },
  ],
};
const lock = "2026-01-01T00:00:00Z";
const res = "2026-07-01T00:00:00Z";

describe("binary grading", () => {
  it("matches hand-computed Brier", () => {
    const s = gradePrediction({ forecast: { type: "binary", pYes: 0.7 }, question: binQ, outcome: { type: "binary", yes: true }, lockedAt: lock, resolvedAt: res });
    // two-category Brier: (0.7-1)^2 + (0.3-0)^2 = 0.18
    expect(s.brier).toBeCloseTo(0.18, 4);
    expect(s.accuracy).toBe(91);
    expect(s.correct).toBe(true);
    expect(s.components.boldness).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const i = { forecast: { type: "binary" as const, pYes: 0.33 }, question: binQ, outcome: { type: "binary" as const, yes: false }, lockedAt: lock, resolvedAt: res };
    expect(gradePrediction(i)).toEqual(gradePrediction(i));
  });

  it("gives zero boldness/timing/specificity credit to a confident wrong call", () => {
    const s = gradePrediction({ forecast: { type: "binary", pYes: 0.99 }, question: binQ, outcome: { type: "binary", yes: false }, lockedAt: lock, resolvedAt: res });
    expect(s.components.boldness).toBe(0);
    expect(s.components.timing).toBeLessThan(1);
    expect(s.accuracy).toBeLessThan(5);
    expect(s.correct).toBe(false);
  });

  it("copying consensus earns relative accuracy of exactly 50", () => {
    const s = gradePrediction({ forecast: { type: "binary", pYes: 0.2 }, question: binQ, outcome: { type: "binary", yes: true }, lockedAt: lock, resolvedAt: res });
    expect(s.components.relativeAccuracy).toBe(50);
    expect(s.components.boldness).toBe(0);
  });

  it("is proper: honest reporting maximises expected accuracy", () => {
    const belief = 0.65;
    const expected = (p: number) =>
      belief * gradePrediction({ forecast: { type: "binary", pYes: p }, question: binQ, outcome: { type: "binary", yes: true }, lockedAt: lock, resolvedAt: res }).accuracy +
      (1 - belief) * gradePrediction({ forecast: { type: "binary", pYes: p }, question: binQ, outcome: { type: "binary", yes: false }, lockedAt: lock, resolvedAt: res }).accuracy;
    for (const p of [0.3, 0.5, 0.8, 0.95]) expect(expected(belief)).toBeGreaterThanOrEqual(expected(p));
  });

  it("earlier locks earn more timing credit", () => {
    const f = { type: "binary" as const, pYes: 0.8 };
    const early = gradePrediction({ forecast: f, question: binQ, outcome: { type: "binary", yes: true }, lockedAt: "2025-07-01T00:00:00Z", resolvedAt: res });
    const late = gradePrediction({ forecast: f, question: binQ, outcome: { type: "binary", yes: true }, lockedAt: "2026-06-25T00:00:00Z", resolvedAt: res });
    expect(early.components.timing).toBeGreaterThan(late.components.timing);
    expect(early.prestige).toBeGreaterThan(late.prestige);
  });
});

describe("categorical ballots", () => {
  it("spreads the remainder across the field by baseline, never as one lump", () => {
    const d = categoricalDistribution({ type: "categorical", primary: { optionId: "a", p: 0.5 }, darkHorse: { optionId: "d", p: 0.2 } }, mvp);
    expect([...d.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    // remainder 0.3 over b,c,field (baselines .3,.2,.02 of .52)
    expect(d.get("b")).toBeCloseTo((0.3 * 0.3) / 0.52, 10);
    expect(d.get("field")).toBeCloseTo((0.3 * 0.02) / 0.52, 10);
  });

  it("rewards a dark-horse hit over missing entirely, but less than a primary hit", () => {
    const outcome = { type: "categorical" as const, optionId: "d" };
    const dh = gradePrediction({ forecast: { type: "categorical", primary: { optionId: "a", p: 0.5 }, darkHorse: { optionId: "d", p: 0.2 } }, question: mvp, outcome, lockedAt: lock, resolvedAt: res });
    const none = gradePrediction({ forecast: { type: "categorical", primary: { optionId: "a", p: 0.5 } }, question: mvp, outcome, lockedAt: lock, resolvedAt: res });
    const prim = gradePrediction({ forecast: { type: "categorical", primary: { optionId: "d", p: 0.5 } }, question: mvp, outcome, lockedAt: lock, resolvedAt: res });
    expect(dh.darkHorseHit).toBe(true);
    expect(dh.correct).toBe(false);
    expect(dh.prestige).toBeGreaterThan(none.prestige);
    expect(prim.prestige).toBeGreaterThan(dh.prestige);
    expect(dh.components.boldness).toBeGreaterThan(0);
  });

  it("rejects incoherent ballots", () => {
    const bad = [
      { type: "categorical" as const, primary: { optionId: "a", p: 0.7 }, darkHorse: { optionId: "b", p: 0.3 } },
      { type: "categorical" as const, primary: { optionId: "a", p: 0.2 }, darkHorse: { optionId: "b", p: 0.3 } },
      { type: "categorical" as const, primary: { optionId: "a", p: 0.5 }, darkHorse: { optionId: "a", p: 0.1 } },
      { type: "categorical" as const, primary: { optionId: "zzz", p: 0.5 } },
    ];
    for (const f of bad) expect(() => validateForecast(f, mvp)).toThrow(ForecastError);
  });
});

describe("reputation", () => {
  it("one lucky call does not outrank a long strong record", () => {
    expect(shrunkGrade([95])).toBeLessThan(shrunkGrade(Array(30).fill(60)));
  });

  it("time-weights revisions so a late flip can't erase an early bad take", () => {
    const [c] = collapseChains([
      { chainId: "x", league: "NBA", lockedAt: "2026-01-01T00:00:00Z", supersededAt: "2026-06-01T00:00:00Z", resolvedAt: "2026-06-11T00:00:00Z", prestige: 10, accuracy: 10, correct: false },
      { chainId: "x", league: "NBA", lockedAt: "2026-06-01T00:00:00Z", supersededAt: null, resolvedAt: "2026-06-11T00:00:00Z", prestige: 90, accuracy: 95, correct: true },
    ]);
    expect(c.prestige).toBeLessThan(20);
  });

  it("flags unranked users below the sample minimum", () => {
    expect(summarise([]).ranked).toBe(false);
    expect(summarise([]).hitRate).toBeNull();
  });
});

describe("battles", () => {
  it("picks higher accuracy, pushes on near-ties", () => {
    expect(battleWinner({ userId: "a", accuracy: 80 }, { userId: "b", accuracy: 60 })).toBe("a");
    expect(battleWinner({ userId: "a", accuracy: 70.2 }, { userId: "b", accuracy: 70 })).toBeNull();
  });
});
