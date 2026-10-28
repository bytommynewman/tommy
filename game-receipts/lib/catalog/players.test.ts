import { describe, expect, it } from "vitest";
import { CATALOG_QUESTIONS } from "./questions";
import { PLAYERS } from "./players";
import { TEAMS } from "./teams";
import { subjectsFor } from "./subjects";

describe("catalog integrity", () => {
  it("every ballot option is a real player, team, or the field", () => {
    const ids = new Set([...PLAYERS.map((p) => p.id), ...TEAMS.map((t) => t.id), "field"]);
    for (const q of CATALOG_QUESTIONS) for (const o of q.options ?? []) expect(ids.has(o.id), `${q.id} → ${o.id}`).toBe(true);
  });
  it("player ids are unique and clean", () => {
    const ids = PLAYERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
  it("every league has teams in the picker", () => {
    for (const l of ["NFL", "NBA", "NCAAF", "NCAAB", "NHL", "MLB"] as const) expect(subjectsFor(l).length).toBeGreaterThan(0);
  });
});
