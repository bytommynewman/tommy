import type { Question, QuestionOption } from "../domain";
import { PLAYERS } from "./players";
import { OFFICIAL_SOURCE, SEASON } from "./seasons";
import { TEAMS, teamLabel, type League } from "./teams";

/**
 * MOCK question catalog. Open questions use invented consensus baselines.
 * Resolved questions are real historical outcomes (2024-25) used as demo
 * history; their baselines are also illustrative, not archived odds.
 */
const name = (id: string) => PLAYERS.find((p) => p.id === id)?.name ?? id;
const opts = (pairs: [string, number][], field = 0): QuestionOption[] => {
  const o = pairs.map(([id, b]) => ({ id, label: name(id), baseline: b }));
  if (field > 0) o.push({ id: "field", label: "Anyone else", baseline: field });
  return o;
};
/** Championship market over every team in the league; baseline = softmax of mock ratings. */
const titleOpts = (league: League, field = 0): QuestionOption[] => {
  const ts = TEAMS.filter((t) => t.league === league);
  const w = ts.map((t) => Math.exp(t.rating * 0.75));
  const s = w.reduce((a, b) => a + b, 0) / (1 - field);
  const o = ts.map((t, i) => ({ id: t.id, label: teamLabel(t), baseline: Math.round((w[i] / s) * 10000) / 10000 }));
  // College catalogs list top programs only, so the rest of the division is an explicit outcome.
  if (field > 0) o.push({ id: "field", label: "Any other program", baseline: field });
  return o;
};

const base = { status: "open" as const, createdBy: "system", createdAt: "2026-09-01T00:00:00.000Z", baselineSource: "mock-consensus" as const, reviewStatus: "approved" as const };

export const CATALOG_QUESTIONS: Question[] = [
  {
    ...base, id: "nba-mvp-2027", league: "NBA", category: "award", kind: "categorical", title: "2026-27 NBA MVP",
    criteria: "Resolves to the player officially announced as the 2026-27 NBA Most Valuable Player (Michael Jordan Trophy).",
    resolutionSource: "NBA.com official award announcement", specificity: 0.8, resolvesBy: "2027-05-25T00:00:00.000Z",
    options: opts([["nba-shai-gilgeous-alexander", 0.3], ["nba-nikola-jokic", 0.25], ["nba-victor-wembanyama", 0.14], ["nba-luka-doncic", 0.09],
      ["nba-giannis-antetokounmpo", 0.05], ["nba-cade-cunningham", 0.04], ["nba-anthony-edwards", 0.04], ["nba-jalen-brunson", 0.02],
      ["nba-donovan-mitchell", 0.015], ["nba-jayson-tatum", 0.01]], 0.035),
    developments: [{ at: "2026-10-21T00:00:00.000Z", text: "2026-27 NBA regular season tips off (expected)." }],
  },
  {
    ...base, id: "nba-roy-2027", league: "NBA", category: "award", kind: "categorical", title: "2026-27 NBA Rookie of the Year",
    criteria: "Resolves to the player officially announced as 2026-27 NBA Rookie of the Year.",
    resolutionSource: "NBA.com official award announcement", specificity: 0.8, resolvesBy: "2027-05-15T00:00:00.000Z",
    options: opts([["nba-aj-dybantsa", 0.34], ["nba-darryn-peterson", 0.3], ["nba-cameron-boozer", 0.2]], 0.16),
  },
  {
    ...base, id: "nba-dpoy-2027", league: "NBA", category: "award", kind: "categorical", title: "2026-27 NBA Defensive Player of the Year",
    criteria: "Resolves to the player officially announced as 2026-27 NBA Defensive Player of the Year.",
    resolutionSource: "NBA.com official award announcement", specificity: 0.75, resolvesBy: "2027-05-15T00:00:00.000Z",
    options: opts([["nba-victor-wembanyama", 0.55], ["nba-evan-mobley", 0.1], ["nba-chet-holmgren", 0.1], ["nba-jaren-jackson-jr", 0.08], ["nba-giannis-antetokounmpo", 0.03]], 0.14),
  },
  {
    ...base, id: "nfl-mvp-2026", league: "NFL", category: "award", kind: "categorical", title: "2026 NFL MVP",
    criteria: "Resolves to the player announced as the 2026 AP NFL Most Valuable Player at NFL Honors.",
    resolutionSource: "Associated Press / NFL Honors announcement", specificity: 0.8, resolvesBy: "2027-02-12T00:00:00.000Z",
    options: opts([["nfl-josh-allen", 0.19], ["nfl-lamar-jackson", 0.17], ["nfl-patrick-mahomes", 0.1], ["nfl-joe-burrow", 0.1], ["nfl-drake-maye", 0.08],
      ["nfl-jayden-daniels", 0.07], ["nfl-jalen-hurts", 0.06], ["nfl-justin-herbert", 0.05], ["nfl-jared-goff", 0.04], ["nfl-c-j-stroud", 0.03],
      ["nfl-bo-nix", 0.03], ["nfl-caleb-williams", 0.03]], 0.05),
    developments: [{ at: "2026-09-10T00:00:00.000Z", text: "2026 NFL regular season kicked off (mock timeline)." }],
  },
  {
    ...base, id: "nfl-sb-61", league: "NFL", category: "team", kind: "categorical", title: "Super Bowl LXI champion",
    criteria: "Resolves to the team that wins Super Bowl LXI.", resolutionSource: OFFICIAL_SOURCE.NFL,
    specificity: 0.85, resolvesBy: `${SEASON.NFL.titleDate}T23:59:00.000Z`, options: titleOpts("NFL"),
  },
  {
    ...base, id: "nba-champ-2027", league: "NBA", category: "team", kind: "categorical", title: "2027 NBA champion",
    criteria: "Resolves to the team that wins the 2027 NBA Finals.", resolutionSource: OFFICIAL_SOURCE.NBA,
    specificity: 0.85, resolvesBy: `${SEASON.NBA.titleDate}T23:59:00.000Z`, options: titleOpts("NBA"),
  },
  {
    ...base, id: "nba-giannis-traded-2027", league: "NBA", category: "trade", kind: "binary",
    title: "Giannis Antetokounmpo is traded before the 2027 NBA trade deadline",
    criteria: "YES if an official NBA transaction moving Giannis Antetokounmpo off the Bucks is announced before the 2027 trade deadline. NO otherwise.",
    resolutionSource: OFFICIAL_SOURCE.NBA, specificity: 0.6, baselineYes: 0.3, resolvesBy: `${SEASON.NBA.tradeDeadline}T23:59:00.000Z`,
  },
  {
    ...base, id: "nfl-maye-4000-2026", league: "NFL", category: "breakout", kind: "binary",
    title: "Drake Maye throws for 4,000+ yards in the 2026 regular season",
    criteria: "YES if Drake Maye's official 2026 regular-season passing yards total is 4,000 or more.",
    resolutionSource: OFFICIAL_SOURCE.NFL, specificity: 0.7, baselineYes: 0.45, resolvesBy: `${SEASON.NFL.regularSeasonEnd}T23:59:00.000Z`,
  },
  {
    ...base, id: "nhl-leafs-105-2027", league: "NHL", category: "team", kind: "binary",
    title: "Toronto Maple Leafs finish 2026-27 with 105+ points",
    criteria: "YES if the Maple Leafs finish the 2026-27 NHL regular season with at least 105 standings points.",
    resolutionSource: OFFICIAL_SOURCE.NHL, specificity: 0.7, baselineYes: 0.3, resolvesBy: `${SEASON.NHL.regularSeasonEnd}T23:59:00.000Z`,
  },
  {
    ...base, id: "nba-flagg-vs-castle-2027", league: "NBA", category: "comparison", kind: "binary",
    title: "Cooper Flagg scores more total points than Stephon Castle in 2026-27",
    criteria: "YES if Cooper Flagg's official 2026-27 regular-season total points exceed Stephon Castle's. Ties resolve NO.",
    resolutionSource: OFFICIAL_SOURCE.NBA, specificity: 0.6, baselineYes: 0.62, resolvesBy: `${SEASON.NBA.regularSeasonEnd}T23:59:00.000Z`,
  },
  {
    ...base, id: "nfl-chiefs-playoffs-2026", league: "NFL", category: "team", kind: "binary",
    title: "Kansas City Chiefs make the 2026 NFL playoffs",
    criteria: "YES if the Chiefs qualify for the postseason following the 2026 regular season.",
    resolutionSource: OFFICIAL_SOURCE.NFL, specificity: 0.4, baselineYes: 0.6, resolvesBy: `${SEASON.NFL.regularSeasonEnd}T23:59:00.000Z`,
  },
  {
    ...base, id: "nba-spurs-55-2027", league: "NBA", category: "team", kind: "binary",
    title: "San Antonio Spurs win 55+ games in 2026-27",
    criteria: "YES if the Spurs finish the 2026-27 regular season with at least 55 wins.",
    resolutionSource: OFFICIAL_SOURCE.NBA, specificity: 0.65, baselineYes: 0.35, resolvesBy: `${SEASON.NBA.regularSeasonEnd}T23:59:00.000Z`,
  },
  {
    ...base, id: "ncaaf-cfp-2026", league: "NCAAF", category: "team", kind: "categorical", title: "2026 College Football Playoff champion",
    criteria: "Resolves to the winner of the 2026-27 College Football Playoff National Championship game.", resolutionSource: OFFICIAL_SOURCE.NCAAF,
    specificity: 0.85, resolvesBy: `${SEASON.NCAAF.titleDate}T23:59:00.000Z`, options: titleOpts("NCAAF", 0.12),
  },
  {
    ...base, id: "ncaab-champ-2027", league: "NCAAB", category: "team", kind: "categorical", title: "2027 NCAA men's basketball champion",
    criteria: "Resolves to the winner of the 2027 NCAA Division I men's basketball tournament.", resolutionSource: OFFICIAL_SOURCE.NCAAB,
    specificity: 0.85, resolvesBy: `${SEASON.NCAAB.titleDate}T23:59:00.000Z`, options: titleOpts("NCAAB", 0.3),
  },
  // ---------- Resolved history (real outcomes, demo baselines) ----------
  {
    ...base, seed: true, id: "nba-mvp-2025", league: "NBA", category: "award", kind: "categorical", title: "2024-25 NBA MVP",
    criteria: "Resolves to the player announced as the 2024-25 NBA MVP.", resolutionSource: "NBA.com official award announcement",
    specificity: 0.8, resolvesBy: "2025-05-21T00:00:00.000Z", createdAt: "2024-09-01T00:00:00.000Z",
    options: opts([["nba-shai-gilgeous-alexander", 0.3], ["nba-nikola-jokic", 0.3], ["nba-giannis-antetokounmpo", 0.12], ["nba-luka-doncic", 0.12], ["nba-jayson-tatum", 0.08]], 0.08),
    status: "resolved", outcome: { type: "categorical", optionId: "nba-shai-gilgeous-alexander" }, resolvedAt: "2025-05-21T23:00:00.000Z", resolvedBy: "system",
    evidence: [{ source: "NBA.com", url: "https://www.nba.com/news/shai-gilgeous-alexander-wins-2024-25-kia-mvp", note: "Shai Gilgeous-Alexander named 2024-25 Kia MVP." }],
  },
  {
    ...base, seed: true, id: "nba-luka-traded-2025", league: "NBA", category: "trade", kind: "binary",
    title: "Luka Dončić is traded before the 2025 NBA trade deadline",
    criteria: "YES if an official transaction moves Luka Dončić off the Mavericks before the 2025 trade deadline.",
    resolutionSource: OFFICIAL_SOURCE.NBA, specificity: 0.6, baselineYes: 0.01, resolvesBy: "2025-02-06T00:00:00.000Z", createdAt: "2024-09-01T00:00:00.000Z",
    status: "resolved", outcome: { type: "binary", yes: true }, resolvedAt: "2025-02-02T15:00:00.000Z", resolvedBy: "system",
    evidence: [{ source: "NBA.com", url: "https://www.nba.com/news/lakers-mavs-jazz-trade", note: "Mavericks trade Luka Dončić to the Lakers in a three-team deal." }],
  },
  {
    ...base, seed: true, id: "nfl-mvp-2024", league: "NFL", category: "award", kind: "categorical", title: "2024 NFL MVP",
    criteria: "Resolves to the 2024 AP NFL MVP.", resolutionSource: "Associated Press / NFL Honors announcement",
    specificity: 0.8, resolvesBy: "2025-02-07T00:00:00.000Z", createdAt: "2024-08-01T00:00:00.000Z",
    options: opts([["nfl-patrick-mahomes", 0.2], ["nfl-josh-allen", 0.15], ["nfl-lamar-jackson", 0.15], ["nfl-joe-burrow", 0.1], ["nfl-c-j-stroud", 0.1], ["nfl-jalen-hurts", 0.08]], 0.22),
    status: "resolved", outcome: { type: "categorical", optionId: "nfl-josh-allen" }, resolvedAt: "2025-02-07T02:00:00.000Z", resolvedBy: "system",
    evidence: [{ source: "NFL.com", url: "https://www.nfl.com/news/bills-qb-josh-allen-wins-2024-ap-nfl-most-valuable-player-award", note: "Josh Allen wins 2024 AP NFL MVP." }],
  },
  {
    ...base, seed: true, id: "nfl-sb-59", league: "NFL", category: "team", kind: "categorical", title: "Super Bowl LIX champion",
    criteria: "Resolves to the winner of Super Bowl LIX.", resolutionSource: OFFICIAL_SOURCE.NFL,
    specificity: 0.85, resolvesBy: "2025-02-10T00:00:00.000Z", createdAt: "2024-08-01T00:00:00.000Z", options: titleOpts("NFL"),
    status: "resolved", outcome: { type: "categorical", optionId: "nfl-phi" }, resolvedAt: "2025-02-10T03:00:00.000Z", resolvedBy: "system",
    evidence: [{ source: "NFL.com", url: "https://www.nfl.com/super-bowl/", note: "Eagles defeat the Chiefs 40-22 in Super Bowl LIX." }],
  },
  {
    ...base, seed: true, id: "nba-champ-2025", league: "NBA", category: "team", kind: "categorical", title: "2025 NBA champion",
    criteria: "Resolves to the winner of the 2025 NBA Finals.", resolutionSource: OFFICIAL_SOURCE.NBA,
    specificity: 0.85, resolvesBy: "2025-06-23T00:00:00.000Z", createdAt: "2024-09-01T00:00:00.000Z", options: titleOpts("NBA"),
    status: "resolved", outcome: { type: "categorical", optionId: "nba-okc" }, resolvedAt: "2025-06-23T03:00:00.000Z", resolvedBy: "system",
    evidence: [{ source: "NBA.com", url: "https://www.nba.com/playoffs/2025/the-finals", note: "Thunder win Game 7 over the Pacers for the 2025 title." }],
  },
];
