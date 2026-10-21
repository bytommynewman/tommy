import type { Category } from "../domain";
import type { SubjectLite } from "./subjects";
import { OFFICIAL_SOURCE, SEASON } from "./seasons";
import type { League } from "./teams";

/**
 * Ready-made takes for a picked player or team. Each template has dropdowns
 * (stat, threshold, award, playoff round…) and builds a gradeable binary
 * question. Client-safe: no server imports.
 */
export interface TakeParam { key: string; label: string; options: { value: string; label: string }[]; initial: string }
export interface BuiltTake { title: string; criteria: string; category: Category; resolvesBy: string; specificity: number }
export type TakeValues = Record<string, string>;
/** `params` gets the current values so one dropdown can depend on another (e.g. thresholds follow the chosen stat). */
export interface TakeTemplate { id: string; label: string; blurb: string; params: (v: TakeValues) => TakeParam[]; build: (v: TakeValues) => BuiltTake }

const iso = (d: string) => `${d}T23:59:00.000Z`;
const opts = (values: (string | number)[], fmt: (v: string) => string = (v) => v) => values.map(String).map((v) => ({ value: v, label: fmt(v) }));
const range = (from: number, to: number, step: number) => Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
const param = (key: string, label: string, values: (string | number)[], initial: string | number, fmt?: (v: string) => string): TakeParam =>
  ({ key, label, options: opts(values, fmt), initial: String(initial) });
const choice = (key: string, label: string, pairs: [string, string][], initial = pairs[0][0]): TakeParam =>
  ({ key, label, options: pairs.map(([value, l]) => ({ value, label: l })), initial });
const num = (v: string) => Number(v).toLocaleString("en-US");

/** When each league's awards and all-star selections are announced (approximate, "expected" in the UI). */
const AWARDS_BY: Record<League, string> = { NFL: "2027-02-11", NBA: "2027-05-31", NHL: "2027-06-20", MLB: "2027-11-20", NCAAF: "2026-12-12", NCAAB: "2027-04-05" };
const ALL_STAR: Partial<Record<League, [string, string]>> = {
  NFL: ["named to the 2027 Pro Bowl", "2026-12-23"], NBA: ["named a 2027 NBA All-Star", "2027-02-01"], MLB: ["named a 2027 MLB All-Star", "2027-07-10"],
  NCAAF: ["named a 2026 AP All-American (any team)", "2026-12-16"], NCAAB: ["named a 2026-27 AP All-American (any team)", "2027-03-25"],
};
const AWARDS: Record<League, [string, string][]> = {
  NFL: [["MVP", "NFL MVP"], ["OPOY", "Offensive Player of the Year"], ["DPOY", "Defensive Player of the Year"], ["OROY", "Offensive Rookie of the Year"], ["DROY", "Defensive Rookie of the Year"], ["CPOY", "Comeback Player of the Year"]],
  NBA: [["MVP", "NBA MVP"], ["DPOY", "Defensive Player of the Year"], ["ROY", "Rookie of the Year"], ["6MOY", "Sixth Man of the Year"], ["MIP", "Most Improved Player"], ["CPOY", "Clutch Player of the Year"]],
  NHL: [["Hart", "Hart Trophy (MVP)"], ["Norris", "Norris Trophy (best defenseman)"], ["Vezina", "Vezina Trophy (best goalie)"], ["Calder", "Calder Trophy (top rookie)"], ["Rocket", "Rocket Richard Trophy (most goals)"], ["ArtRoss", "Art Ross Trophy (most points)"]],
  MLB: [["MVP", "MVP (either league)"], ["CY", "Cy Young (either league)"], ["ROY", "Rookie of the Year (either league)"], ["SS", "Silver Slugger"], ["GG", "Gold Glove"]],
  NCAAF: [["Heisman", "Heisman Trophy"], ["Maxwell", "Maxwell Award"], ["Bednarik", "Bednarik Award"], ["Biletnikoff", "Biletnikoff Award"], ["DoakWalker", "Doak Walker Award"]],
  NCAAB: [["Wooden", "Wooden Award"], ["Naismith", "Naismith Trophy"], ["AP", "AP Player of the Year"], ["FrPOY", "Freshman of the Year"]],
};

/** [value, label, title phrase, criteria phrase]. */
const FINISH: [string, string, string, string][] = [
  ["win", "Wins it", "", ""],
  ["runnerup", "Runner-up (2nd)", "finishes runner-up", "finishes exactly second"],
  ["top3", "Top 3 / finalist", "finishes top 3", "finishes in the top 3 (or is named a finalist)"],
  ["top5", "Top 5 in voting", "finishes top 5 in voting", "finishes in the top 5 of the voting"],
];

type Stat = { id: string; label: string; values: number[]; initial: number; perGame?: boolean; under?: boolean; fmt?: (v: string) => string };
const avg = (v: string) => Number(v).toFixed(3).replace(/^0/, "");
const era = (v: string) => Number(v).toFixed(2);

function statsFor(league: League, pos: string): Stat[] {
  const P = pos.toUpperCase();
  switch (league) {
    case "NBA": case "NCAAB": {
      const top = league === "NBA" ? 35 : 25;
      return [
        { id: "points", label: "points", values: range(10, top, 1), initial: league === "NBA" ? 20 : 15, perGame: true },
        { id: "rebounds", label: "rebounds", values: range(4, 15, 1), initial: 8, perGame: true },
        { id: "assists", label: "assists", values: range(3, 12, 1), initial: 6, perGame: true },
        { id: "threes", label: "made threes", values: [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5], initial: 2.5, perGame: true },
        { id: "steals+blocks", label: "steals + blocks", values: [1, 1.5, 2, 2.5, 3, 3.5, 4], initial: 2, perGame: true },
      ];
    }
    case "NFL": case "NCAAF": {
      const pass: Stat[] = [
        { id: "passing yards", label: "passing yards", values: range(2500, 5500, 250), initial: 4000 },
        { id: "passing touchdowns", label: "passing touchdowns", values: range(15, 50, 5), initial: 30 },
        { id: "rushing yards", label: "rushing yards", values: range(200, 1000, 100), initial: 400 },
      ];
      const rush: Stat[] = [
        { id: "rushing yards", label: "rushing yards", values: range(500, 2000, 100), initial: 1000 },
        { id: "rushing touchdowns", label: "rushing touchdowns", values: range(4, 20, 2), initial: 10 },
        { id: "scrimmage yards", label: "scrimmage yards", values: range(800, 2400, 100), initial: 1400 },
      ];
      const rec: Stat[] = [
        { id: "receiving yards", label: "receiving yards", values: range(500, 1900, 100), initial: 1000 },
        { id: "receptions", label: "receptions", values: range(40, 130, 10), initial: 80 },
        { id: "receiving touchdowns", label: "receiving touchdowns", values: range(4, 18, 2), initial: 8 },
      ];
      const def: Stat[] = [
        { id: "sacks", label: "sacks", values: [4, 6, 8, 10, 12, 14, 16, 18, 20], initial: 10 },
        { id: "interceptions", label: "interceptions", values: range(2, 10, 1), initial: 4 },
        { id: "total tackles", label: "total tackles", values: range(60, 160, 10), initial: 100 },
      ];
      const kick: Stat[] = [{ id: "field goals made", label: "field goals made", values: range(20, 40, 2), initial: 30 }];
      if (P === "QB") return pass;
      if (["RB", "FB", "HB"].includes(P)) return rush;
      if (["WR", "TE"].includes(P)) return rec;
      if (["DE", "DT", "NT", "LB", "OLB", "ILB", "MLB", "EDGE", "DL", "CB", "S", "FS", "SS", "DB"].includes(P)) return def;
      if (["K", "PK"].includes(P)) return kick;
      return [...rush, ...rec];
    }
    case "NHL":
      if (P === "G") return [
        { id: "wins", label: "wins", values: range(15, 45, 5), initial: 30 },
        { id: "save percentage", label: "save percentage", values: [0.9, 0.905, 0.91, 0.915, 0.92, 0.925], initial: 0.91, fmt: avg },
        { id: "shutouts", label: "shutouts", values: range(2, 10, 1), initial: 4 },
      ];
      return [
        { id: "goals", label: "goals", values: range(10, 60, 5), initial: 30 },
        { id: "assists", label: "assists", values: range(15, 90, 5), initial: 40 },
        { id: "points", label: "points", values: range(30, 140, 10), initial: 70 },
      ];
    case "MLB":
      if (["SP", "RP", "P"].includes(P)) return [
        { id: "strikeouts", label: "strikeouts", values: range(100, 300, 25), initial: 200 },
        { id: "wins", label: "wins", values: range(8, 20, 1), initial: 14 },
        { id: "ERA", label: "ERA (qualified)", values: [2, 2.5, 2.75, 3, 3.25, 3.5, 4], initial: 3, under: true, fmt: era },
        { id: "saves", label: "saves", values: range(10, 50, 5), initial: 30 },
      ];
      return [
        { id: "home runs", label: "home runs", values: range(10, 60, 5), initial: 30 },
        { id: "batting average", label: "batting average (qualified)", values: [0.25, 0.27, 0.28, 0.29, 0.3, 0.31, 0.32, 0.33], initial: 0.3, fmt: avg },
        { id: "RBI", label: "RBI", values: range(50, 140, 10), initial: 100 },
        { id: "stolen bases", label: "stolen bases", values: range(10, 70, 5), initial: 30 },
        { id: "hits", label: "hits", values: range(120, 220, 10), initial: 170 },
      ];
  }
}

const BIG_GAME: Record<League, (pos: string) => [string, string][]> = {
  NBA: () => [["50 points", "a 50-point game"], ["40 points", "a 40-point game"], ["triple-double", "a triple-double"], ["20 rebounds", "a 20-rebound game"]],
  NCAAB: () => [["40 points", "a 40-point game"], ["30 points", "a 30-point game"], ["triple-double", "a triple-double"], ["20 rebounds", "a 20-rebound game"]],
  NFL: (p) => p === "QB" ? [["400 passing", "a 400-passing-yard game"], ["5 TD passes", "a 5-touchdown-pass game"]] : [["200 scrimmage", "a 200-scrimmage-yard game"], ["3 TDs", "a 3-touchdown game"]],
  NCAAF: (p) => p === "QB" ? [["400 passing", "a 400-passing-yard game"], ["5 TD passes", "a 5-touchdown-pass game"]] : [["200 scrimmage", "a 200-scrimmage-yard game"], ["3 TDs", "a 3-touchdown game"]],
  NHL: (p) => p === "G" ? [["shutout", "a shutout"], ["50 saves", "a 50-save game"]] : [["hat trick", "a hat trick"], ["5 points", "a 5-point game"]],
  MLB: (p) => ["SP", "RP", "P"].includes(p) ? [["no-hitter", "a no-hitter"], ["15 Ks", "a 15-strikeout game"]] : [["3 HR", "a 3-home-run game"], ["cycle", "hits for the cycle"]],
};

const GAMES: Partial<Record<League, number[]>> = { NBA: range(50, 80, 5), NFL: range(10, 17, 1), NHL: range(50, 82, 4), MLB: range(100, 160, 10) };

function playerTemplates(s: SubjectLite): TakeTemplate[] {
  const L = s.league, S = SEASON[L], src = OFFICIAL_SOURCE[L], name = s.name;
  const pos = s.meta.split(" · ")[0] ?? "";
  const season = `the ${S.label} regular season`;
  const out: TakeTemplate[] = [];
  const stats = statsFor(L, pos);
  if (stats.length) out.push({
    id: "stat", label: "Season stat line", blurb: "Set the bar for a full-season number.",
    params: (v) => {
      const st = stats.find((x) => x.id === v.stat) ?? stats[0];
      return [
        choice("stat", "Stat", stats.map((x) => [x.id, x.perGame ? `${x.label} per game` : x.label])),
        choice("dir", "Over / under", [["over", "At least"], ["under", "Under"]], st.under ? "under" : "over"),
        param("n", st.perGame ? "Per game" : "Number", st.values, st.initial, st.fmt),
      ];
    },
    build: (v) => {
      const st = stats.find((x) => x.id === v.stat) ?? stats[0];
      const n = st.values.map(String).includes(v.n) ? v.n : String(st.initial);
      const shown = st.fmt ? st.fmt(n) : num(n);
      const over = v.dir !== "under";
      const what = st.perGame ? `${over ? "averages at least" : "averages under"} ${shown} ${st.label} per game` : `${over ? "finishes with at least" : "finishes with under"} ${shown} ${st.label}`;
      return {
        title: `${name} ${what} in ${season}`, category: "breakout", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.85,
        criteria: `YES if ${name}'s official ${S.label} regular-season ${st.label}${st.perGame ? " per game" : ""} is ${over ? "at least" : "under"} ${shown}, per ${src}. NO otherwise${over ? ", including if they don't play enough to qualify" : ""}.`,
      };
    },
  });
  out.push({
    id: "award", label: "Wins an award", blurb: "Hardware at the end of the year.",
    params: () => [choice("award", "Award", AWARDS[L]), choice("finish", "Finish", FINISH.map(([id, label]) => [id, label]))],
    build: (v) => {
      const a = AWARDS[L].find(([id]) => id === v.award) ?? AWARDS[L][0];
      const f = FINISH.find(([id]) => id === v.finish) ?? FINISH[0];
      const award = `${S.label} ${a[1].replace(/ \(.*\)$/, "")}`;
      return {
        title: f[0] === "win" ? `${name} wins the ${award}` : `${name} ${f[2]} for the ${award}`, category: "award", resolvesBy: iso(AWARDS_BY[L]), specificity: f[0] === "win" ? 0.9 : 0.8,
        criteria: f[0] === "win" ? `YES if ${name} is officially announced as the winner of the ${S.label} ${a[1]}. NO otherwise.`
          : `YES if ${name} ${f[3]} in the official ${S.label} ${a[1]} results (finalist or vote order as published). NO otherwise.`,
      };
    },
  });
  const star = ALL_STAR[L];
  if (star) out.push({
    id: "allstar", label: L === "NFL" ? "Makes the Pro Bowl" : L.startsWith("NCAA") ? "All-American" : "Makes the All-Star team", blurb: "Recognised as one of the best.", params: () => [],
    build: () => ({ title: `${name} is ${star[0]}`, category: "breakout", resolvesBy: iso(star[1]), specificity: 0.7, criteria: `YES if ${name} is ${star[0]} in the original announcement (injury replacements count). NO otherwise.` }),
  });
  out.push({
    id: "biggame", label: "Monster game", blurb: "One night to remember.",
    params: () => [choice("event", "Feat", BIG_GAME[L](pos.toUpperCase()))],
    build: (v) => {
      const e = BIG_GAME[L](pos.toUpperCase()).find(([id]) => id === v.event) ?? BIG_GAME[L](pos.toUpperCase())[0];
      const feat = e[1].startsWith("hits") ? e[1] : `records ${e[1]}`;
      return { title: `${name} ${feat} in ${season}`, category: "breakout", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.8, criteria: `YES if ${name} ${feat} in any ${S.label} regular-season game, per the official box score on ${src}. NO otherwise.` };
    },
  });
  const games = GAMES[L];
  if (games) out.push({
    id: "games", label: "Stays healthy", blurb: "Availability is the best ability.",
    params: () => [param("n", "Games played", games, games[Math.floor(games.length / 2)])],
    build: (v) => ({ title: `${name} plays in at least ${v.n} games in ${season}`, category: "breakout", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.75, criteria: `YES if ${name} appears in at least ${v.n} ${S.label} regular-season games, per ${src}. NO otherwise.` }),
  });
  if (!L.startsWith("NCAA") && new Date(iso(S.tradeDeadline)) > new Date()) out.push({
    id: "trade", label: "Gets traded", blurb: `Before the ${S.label} deadline.`, params: () => [],
    build: () => ({ title: `${name} is traded before the ${S.label} ${L} trade deadline`, category: "trade", resolvesBy: iso(S.tradeDeadline), specificity: 0.6, criteria: `YES if an official ${L} transaction moves ${name} to another team on or before ${S.tradeDeadline}. NO otherwise.` }),
  });
  return out;
}

/** [value, dropdown label, title phrase]. The first stage is "make the postseason" and drives the "miss" take. */
const STAGES: Record<League, [string, string, string][]> = {
  NFL: [["playoffs", "Make the playoffs", "make the 2026 NFL playoffs"], ["win1", "Win a playoff game", "win a playoff game in the 2026 NFL postseason"], ["conf", "Reach the conference title game", "reach the 2026 AFC or NFC Championship Game"], ["final", "Reach the Super Bowl", "reach Super Bowl LXI"], ["runnerup", "Runner-up (lose the final)", "lose Super Bowl LXI"], ["champ", "Win the Super Bowl", "win Super Bowl LXI"]],
  NBA: [["playoffs", "Make the playoffs", "make the 2027 NBA playoffs"], ["win1", "Win a playoff series", "win a series in the 2027 NBA playoffs"], ["conf", "Reach the conference finals", "reach the 2027 NBA conference finals"], ["final", "Reach the Finals", "reach the 2027 NBA Finals"], ["runnerup", "Runner-up (lose the final)", "lose in the 2027 NBA Finals"], ["champ", "Win the title", "win the 2027 NBA Finals"]],
  NHL: [["playoffs", "Make the playoffs", "make the 2027 Stanley Cup playoffs"], ["win1", "Win a playoff series", "win a series in the 2027 Stanley Cup playoffs"], ["conf", "Reach the conference final", "reach the 2027 NHL conference final"], ["final", "Reach the Cup Final", "reach the 2027 Stanley Cup Final"], ["runnerup", "Runner-up (lose the final)", "lose in the 2027 Stanley Cup Final"], ["champ", "Win the Stanley Cup", "win the 2027 Stanley Cup"]],
  MLB: [["playoffs", "Make the postseason", "make the 2027 MLB postseason"], ["win1", "Win a series", "win a series in the 2027 MLB postseason"], ["conf", "Reach the LCS", "reach the 2027 ALCS or NLCS"], ["final", "Reach the World Series", "reach the 2027 World Series"], ["runnerup", "Runner-up (lose the final)", "lose in the 2027 World Series"], ["champ", "Win the World Series", "win the 2027 World Series"]],
  NCAAF: [["playoffs", "Make the CFP", "make the 2026 College Football Playoff"], ["win1", "Win a CFP game", "win a game in the 2026 College Football Playoff"], ["conf", "Reach the semifinals", "reach the 2026 CFP semifinals"], ["final", "Reach the title game", "reach the 2026 CFP National Championship game"], ["runnerup", "Runner-up (lose the final)", "lose in the 2026 CFP National Championship game"], ["champ", "Win the national title", "win the 2026 CFP National Championship"]],
  NCAAB: [["playoffs", "Make the tournament", "make the 2027 NCAA Tournament"], ["win1", "Reach the Sweet 16", "reach the Sweet 16 of the 2027 NCAA Tournament"], ["conf", "Reach the Final Four", "reach the 2027 Final Four"], ["final", "Reach the title game", "reach the 2027 NCAA championship game"], ["runnerup", "Runner-up (lose the final)", "lose in the 2027 NCAA championship game"], ["champ", "Win it all", "win the 2027 NCAA championship"]],
};
const MISS: Record<League, string> = { NFL: "the 2026 NFL playoffs", NBA: "the 2027 NBA playoffs", NHL: "the 2027 Stanley Cup playoffs", MLB: "the 2027 MLB postseason", NCAAF: "the 2026 College Football Playoff", NCAAB: "the 2027 NCAA Tournament" };
const WINS: Record<League, { unit: string; values: number[]; initial: number }> = {
  NFL: { unit: "wins", values: range(3, 15, 1), initial: 10 }, NBA: { unit: "wins", values: range(20, 65, 5), initial: 45 },
  NHL: { unit: "points", values: range(70, 120, 5), initial: 95 }, MLB: { unit: "wins", values: range(65, 105, 5), initial: 90 },
  NCAAF: { unit: "wins", values: range(5, 12, 1), initial: 9 }, NCAAB: { unit: "wins", values: range(15, 30, 1), initial: 24 },
};

function teamTemplates(s: SubjectLite): TakeTemplate[] {
  const L = s.league, S = SEASON[L], src = OFFICIAL_SOURCE[L], team = `the ${s.name}`;
  const Team = `The ${s.name}`;
  const out: TakeTemplate[] = [{
    id: "run", label: "Playoff run", blurb: "How far they go.",
    params: () => [choice("stage", "How far", STAGES[L].map(([id, label]) => [id, label]))],
    build: (v) => {
      const st = STAGES[L].find(([id]) => id === v.stage) ?? STAGES[L][0];
      const deep = ["champ", "final", "runnerup"].includes(st[0]);
      return { title: `${Team} ${st[2]}`, category: "team", resolvesBy: iso(st[0] === "playoffs" && !L.startsWith("NCAA") ? S.regularSeasonEnd : S.titleDate), specificity: deep ? 0.8 : 0.7,
        criteria: `YES if ${team} ${st[2]}${L === "NBA" && st[0] === "playoffs" ? " (losing in the play-in doesn't count)" : ""}, per ${src}. NO otherwise.` };
    },
  }, {
    id: "miss", label: "Miss the playoffs", blurb: "Fade them.", params: () => [],
    build: () => ({ title: `${Team} miss ${MISS[L]}`, category: "team", resolvesBy: iso(L.startsWith("NCAA") ? S.titleDate : S.regularSeasonEnd), specificity: 0.6, criteria: `YES if ${team} do not qualify for ${MISS[L]}${L === "NBA" ? " (a play-in exit counts as missing)" : ""}, per ${src}. NO otherwise.` }),
  }, {
    id: "wins", label: L === "NHL" ? "Regular-season points" : "Regular-season wins", blurb: "Over or under a number.",
    params: () => [choice("dir", "Over / under", [["over", "At least"], ["under", "Fewer than"]]), param("n", WINS[L].unit === "points" ? "Points" : "Wins", WINS[L].values, WINS[L].initial)],
    build: (v) => {
      const over = v.dir !== "under", u = WINS[L].unit;
      return { title: `${Team} finish ${S.label} with ${over ? "at least" : "fewer than"} ${v.n} ${u}`, category: "team", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.85, criteria: `YES if ${team} finish the ${S.label} regular season with ${over ? "at least" : "fewer than"} ${v.n} ${u}, per ${src}. NO otherwise.` };
    },
  }];
  if (L.startsWith("NCAA")) out.push({
    id: "rank", label: "Final ranking", blurb: "Where the AP poll lands.",
    params: () => [choice("rank", "Finish", [["1", "No. 1"], ["2", "Runner-up (No. 2)"], ["5", "Top 5"], ["10", "Top 10"], ["25", "Ranked (Top 25)"]], "10")],
    build: (v) => ({ title: v.rank === "1" || v.rank === "2" ? `${Team} finish No. ${v.rank} in the final ${S.label} AP poll` : `${Team} finish in the top ${v.rank} of the final ${S.label} AP poll`, category: "team", resolvesBy: iso(S.titleDate), specificity: 0.8, criteria: `YES if ${team} are ranked ${v.rank === "1" || v.rank === "2" ? `exactly No. ${v.rank}` : `No. ${v.rank} or better`} in the final AP poll of the ${S.label} season. NO otherwise.` }),
  });
  else out.push({
    id: "record", label: "League standings", blurb: "Best or worst in the league.",
    params: () => [choice("which", "Finish with", [["best", "Best record in the league"], ["second", "Runner-up: 2nd-best record"], ["top3", "A top-3 record in the league"], ["worst", "Worst record in the league"]])],
    build: (v) => {
      const t = v.which === "worst" ? "the worst" : v.which === "top3" ? "a top-3" : v.which === "second" ? "the second-best" : "the best";
      return { title: `${Team} finish ${S.label} with ${t} regular-season record in the ${L}`, category: "team", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.85, criteria: `YES if ${team} finish the ${S.label} regular season with ${t} record (${L === "NHL" ? "points" : "winning percentage"}) in the ${L}, using official tiebreakers per ${src}. NO otherwise.` };
    },
  }, {
    id: "coach", label: "Coach fired", blurb: "Seat's getting hot.", params: () => [],
    build: () => ({ title: `${Team} fire their head coach before the end of the ${S.label} regular season`, category: "team", resolvesBy: iso(S.regularSeasonEnd), specificity: 0.7, criteria: `YES if ${team} officially dismiss their head coach on or before ${S.regularSeasonEnd}. Resignations announced as mutual count. NO otherwise.` }),
  });
  return out;
}

export function takeTemplates(s: SubjectLite, now = new Date()): TakeTemplate[] {
  const all = s.type === "team" ? teamTemplates(s) : playerTemplates(s);
  // Only offer takes that can still be locked (resolution date in the future).
  return all.filter((t) => new Date(t.build(initialValues(t)).resolvesBy) > now);
}

/** Keep each value if its dropdown still offers it, else fall back to that dropdown's default. Runs until stable because params can depend on values. */
export function settleValues(t: TakeTemplate, v: TakeValues = {}): TakeValues {
  let cur = { ...v };
  for (let i = 0; i < 4; i++) {
    const next = Object.fromEntries(t.params(cur).map((p) => [p.key, p.options.some((o) => o.value === cur[p.key]) ? cur[p.key] : p.initial]));
    if (JSON.stringify(next) === JSON.stringify(cur)) break;
    cur = next;
  }
  return cur;
}
export const initialValues = (t: TakeTemplate) => settleValues(t);

export const officialSource = (league: League) => OFFICIAL_SOURCE[league];
