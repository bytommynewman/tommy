import { describe, expect, it } from "vitest";
import { DraftQuestionSchema } from "../server/services/questions";
import { subjectsFor } from "./subjects";
import { settleValues, takeTemplates } from "./takes";
import { LEAGUES } from "./teams";

const now = new Date("2026-10-20T12:00:00Z");
const MAX = now.getTime() + 3 * 365 * 86_400_000;

describe("take templates", () => {
  it("every player and team gets takes, and every dropdown choice builds a valid, lockable question", () => {
    for (const league of LEAGUES) {
      for (const s of subjectsFor(league)) {
        const ts = takeTemplates(s, now);
        expect(ts.length, `${s.name} has takes`).toBeGreaterThanOrEqual(s.type === "team" ? 4 : 3);
        for (const t of ts) {
          const base = settleValues(t);
          for (const p of t.params(base)) {
            for (const o of p.options) {
              const v = settleValues(t, { ...base, [p.key]: o.value });
              const b = t.build(v);
              const parsed = DraftQuestionSchema.safeParse({ league, ...b, resolutionSource: "official" });
              expect(parsed.success, `${s.name} · ${t.id} · ${p.key}=${o.value}: ${parsed.error?.message}`).toBe(true);
              const by = new Date(b.resolvesBy).getTime();
              expect(by > now.getTime() && by < MAX, `${t.id} resolves in range`).toBe(true);
              expect(b.title).toContain(s.name);
            }
          }
        }
      }
    }
  });

  it("thresholds follow the chosen stat", () => {
    const qb = subjectsFor("NFL").find((s) => s.type === "player" && s.meta.startsWith("QB"))!;
    const stat = takeTemplates(qb, now).find((t) => t.id === "stat")!;
    const v = settleValues(stat, { stat: "passing touchdowns" });
    expect(stat.params(v).find((p) => p.key === "n")!.options.map((o) => o.value)).toContain("30");
    expect(stat.build(v).title).toMatch(/at least 30 passing touchdowns/);
  });

  it("picks position-appropriate stats", () => {
    const goalie = subjectsFor("NHL").find((s) => s.type === "player" && s.meta.startsWith("G "))!;
    const labels = takeTemplates(goalie, now).find((t) => t.id === "stat")!.params({})[0].options.map((o) => o.value);
    expect(labels).toContain("save percentage");
    expect(labels).not.toContain("goals");
  });
});
