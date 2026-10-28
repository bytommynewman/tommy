import { describe, expect, it } from "vitest";
import { buildSeed } from "../seed";
import { lockPrediction, revisePrediction, withdrawPrediction } from "./predictions";
import { resolveQuestion } from "./grading";
import { createBattle, respondBattle } from "./battles";
import { leaderboard, userReputation } from "./reputation";
import { verifyChain, verifyPrediction } from "../../integrity";
import { UserError } from "../util";

const fresh = () => buildSeed();
const T0 = new Date("2026-10-19T12:00:00Z");
const ev = [{ source: "NBA.com", url: "https://www.nba.com/x", note: "test" }];

describe("seed integrity", () => {
  it("every seeded prediction verifies and every user chain is intact", () => {
    const d = fresh();
    expect(d.predictions.every(verifyPrediction)).toBe(true);
    for (const u of d.users) {
      const mine = d.predictions.filter((p) => p.userId === u.id).sort((a, b) => a.lockedAt.localeCompare(b.lockedAt));
      expect(verifyChain(mine)).toBeNull();
    }
  });

  it("detects tampering with a locked field", () => {
    const d = fresh();
    const p = d.predictions.find((x) => x.forecast?.type === "binary")!;
    (p.forecast as { pYes: number }).pYes = 0.99;
    expect(verifyPrediction(p)).toBe(false);
  });

  it("dana's early Luka call earns the receipts awards", () => {
    const d = fresh();
    const q = d.questions.find((x) => x.id === "nba-luka-traded-2025")!;
    const dana = d.predictions.find((p) => p.id === q.awards?.mostImpressive)!;
    expect(dana.userId).toBe("seed-darkhorse_dana");
    expect(dana.score!.prestige).toBeGreaterThan(50);
  });
});

describe("locking rules", () => {
  it("rejects a second live take on the same question", () => {
    const d = fresh();
    lockPrediction(d, "seed-demo", { originalText: "x", questionId: "nba-mvp-2027", forecast: { type: "categorical", primary: { optionId: "nba-luka-doncic", p: 0.3 } } }, T0);
    expect(() => lockPrediction(d, "seed-demo", { originalText: "y", questionId: "nba-mvp-2027", forecast: { type: "categorical", primary: { optionId: "nba-nikola-jokic", p: 0.3 } } }, T0)).toThrow(UserError);
  });

  it("revision supersedes without altering the original record", () => {
    const d = fresh();
    const a = lockPrediction(d, "seed-demo", { originalText: "x", questionId: "nfl-maye-4000-2026", forecast: { type: "binary", pYes: 0.6 } }, T0);
    const hash = a.hash;
    const b = revisePrediction(d, "seed-demo", a.id, { type: "binary", pYes: 0.4 }, "injury news", new Date(T0.getTime() + 86_400_000));
    expect(a.supersededAt).toBe(b.lockedAt);
    expect(a.hash).toBe(hash);
    expect(verifyPrediction(a)).toBe(true);
    expect(b.chainId).toBe(a.chainId);
  });

  it("late withdrawal is still graded; grace withdrawal is voided", () => {
    const d = fresh();
    const a = lockPrediction(d, "seed-demo", { originalText: "x", questionId: "nba-giannis-traded-2027", forecast: { type: "binary", pYes: 0.9 } }, T0);
    withdrawPrediction(d, "seed-demo", a.id, new Date(T0.getTime() + 3 * 86_400_000));
    const b = lockPrediction(d, "seed-hoopshead_hanna", { originalText: "x", questionId: "nba-giannis-traded-2027", forecast: { type: "binary", pYes: 0.9 } }, T0);
    withdrawPrediction(d, "seed-hoopshead_hanna", b.id, new Date(T0.getTime() + 60_000));
    resolveQuestion(d, "seed-admin", "nba-giannis-traded-2027", { type: "binary", yes: false }, ev, new Date("2027-02-05T00:00:00Z"));
    expect(a.status).toBe("resolved");
    expect(a.score!.accuracy).toBeLessThan(25);
    expect(b.status).toBe("void");
    expect(b.score).toBeNull();
  });

  it("requires evidence to resolve", () => {
    const d = fresh();
    expect(() => resolveQuestion(d, "seed-admin", "nba-giannis-traded-2027", { type: "binary", yes: true }, [], T0)).toThrow(UserError);
  });

  it("user-drafted questions don't count toward reputation until approved", () => {
    const d = fresh();
    const p = lockPrediction(d, "seed-demo", { originalText: "Leafs", forecast: { type: "binary", pYes: 0.99 }, draft: {
      league: "NHL", category: "team", title: "Leafs win at least one game in 2026-27", criteria: "YES if they win a game this season.",
      resolutionSource: "NHL.com", specificity: 0.2, resolvesBy: "2027-04-15T00:00:00.000Z" } }, T0);
    const before = userReputation(d, "seed-demo").totals.resolved;
    resolveQuestion(d, "seed-admin", p.questionId!, { type: "binary", yes: true }, ev, new Date("2027-01-01T00:00:00Z"));
    expect(userReputation(d, "seed-demo").totals.resolved).toBe(before);
  });
});

describe("battles", () => {
  it("resolve with the more accurate side winning", () => {
    const d = fresh();
    const target = lockPrediction(d, "seed-demo", { originalText: "x", questionId: "nfl-chiefs-playoffs-2026", forecast: { type: "binary", pYes: 0.3 } }, T0);
    const b = createBattle(d, "seed-hoopshead_hanna", target.id, { type: "binary", pYes: 0.8 }, "nah", T0);
    expect(() => createBattle(d, "seed-hoopshead_hanna", target.id, { type: "binary", pYes: 0.8 }, "again", T0)).toThrow(UserError);
    respondBattle(d, "seed-demo", b.id, true);
    resolveQuestion(d, "seed-admin", "nfl-chiefs-playoffs-2026", { type: "binary", yes: true }, ev, new Date("2027-01-11T00:00:00Z"));
    expect(d.battles.find((x) => x.id === b.id)!.winnerId).toBe("seed-hoopshead_hanna");
  });

  it("the seeded SB LIX battle went to gabe", () => {
    const d = fresh();
    expect(d.battles.find((b) => b.id === "seed-battle-sb59")!.winnerId).toBe("seed-gridiron_gabe");
  });

  it("refuses non-opposing battles", () => {
    const d = fresh();
    const t = d.predictions.find((p) => p.userId === "seed-lockedin_larry" && p.questionId === "nba-mvp-2027")!;
    expect(() => createBattle(d, "seed-demo", t.id, { type: "categorical", primary: { optionId: "nba-shai-gilgeous-alexander", p: 0.4 } }, "", T0)).toThrow(UserError);
  });
});

describe("leaderboards", () => {
  it("all-time board ranks by shrunk grade and respects sample minimums", () => {
    const d = fresh();
    const rows = leaderboard(d, "all", null);
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) {
      if (rows[i].ranked === rows[i - 1].ranked) expect(rows[i - 1].grade).toBeGreaterThanOrEqual(rows[i].grade);
    }
  });
});
