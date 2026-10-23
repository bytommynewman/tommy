import { describe, expect, it } from "vitest";
import { RuleStructurer } from "./rules";
import { CATALOG_QUESTIONS } from "../catalog/questions";

const ctx = {
  now: new Date("2026-10-19T12:00:00Z"),
  openQuestions: CATALOG_QUESTIONS.filter((q) => q.status === "open").map((q) => ({ id: q.id, league: q.league, category: q.category, kind: q.kind, title: q.title, options: q.options })),
};
const s = new RuleStructurer();

describe("rule structurer", () => {
  it("turns a vague Leafs take into the measurable 105-point question", async () => {
    const out = await s.suggest("The Leafs are going to have a crazy good season.", ctx);
    expect(out[0].questionId).toBe("nhl-leafs-105-2027");
  });

  it("maps an MVP take to the award ballot with the named player as primary", async () => {
    const out = await s.suggest("Wemby wins MVP this year", ctx);
    expect(out[0].questionId).toBe("nba-mvp-2027");
    expect(out[0].suggestedForecast).toMatchObject({ primary: { optionId: "nba-victor-wembanyama" } });
  });

  it("drafts a destination-specific trade question", async () => {
    const out = await s.suggest("Giannis gets traded to the Knicks", ctx);
    const d = out.find((x) => x.kind === "draft" && x.category === "trade")!;
    expect(d.draft!.title).toContain("New York Knicks");
    expect(d.draft!.specificity).toBeGreaterThan(0.8);
  });

  it("drafts stat thresholds", async () => {
    const out = await s.suggest("Drake Maye throws for 4,500 yards", ctx);
    expect(out.find((x) => x.category === "breakout")!.draft!.title).toContain("4,500 passing yards");
  });

  it("drafts player comparisons", async () => {
    const out = await s.suggest("Jokic will have more rebounds than Wemby", ctx);
    expect(out.find((x) => x.category === "comparison")!.statement).toMatch(/Nikola Jokić finishes with more rebounds than Victor Wembanyama/);
  });

  it("falls back to a debate when nothing is measurable", async () => {
    const out = await s.suggest("Load management is ruining basketball", ctx);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe("debate");
  });

  it("uses league context to disambiguate nicknames", async () => {
    const out = await s.suggest("The Panthers win the Stanley Cup", ctx);
    expect(out[0].league).toBe("NHL");
  });
});
