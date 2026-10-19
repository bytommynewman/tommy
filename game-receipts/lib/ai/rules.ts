import { PLAYERS, type Player } from "../catalog/players";
import { OFFICIAL_SOURCE, SEASON } from "../catalog/seasons";
import { TEAMS, teamLabel, type League, type Team } from "../catalog/teams";
import type { PredictionStructurer, StructurerContext, Suggestion } from "./types";

/**
 * Deterministic, offline structurer (the default "AI" provider). It only
 * proposes interpretations grounded in the catalog; it never invents
 * outcomes or scores. Swap in the LLM adapter via AI_PROVIDER.
 */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[’']/g, "'");
const hasWord = (text: string, w: string) => new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(text);

function find<T extends { aliases: string[] }>(items: T[], text: string) {
  // Prefer longer alias matches so "maple leafs" beats "leafs"-ambiguity and multi-word names win.
  const hits: { item: T; at: number }[] = [];
  for (const item of items) {
    const alias = [...item.aliases].sort((a, b) => b.length - a.length).find((a) => a.length > 2 && hasWord(text, a));
    if (alias) hits.push({ item, at: text.indexOf(alias) });
  }
  return hits.sort((a, b) => a.at - b.at).map((h) => h.item);
}

const LEAGUE_WORDS: [League, RegExp][] = [
  ["NFL", /\b(nfl|super bowl|touchdowns?|qb|quarterback|passing yards|rushing)\b/],
  ["NBA", /\b(nba|finals mvp|rebounds?|assists?|triple[- ]doubles?)\b/],
  ["NHL", /\b(nhl|stanley cup|goals?|hat trick)\b/],
  ["MLB", /\b(mlb|world series|home runs?|homers?|cy young|era)\b/],
];

const STAT_WORDS: Record<string, string> = {
  yards: "passing yards", "passing yards": "passing yards", "rushing yards": "rushing yards", "receiving yards": "receiving yards",
  touchdowns: "touchdowns", tds: "touchdowns", points: "points", ppg: "points per game", rebounds: "rebounds",
  assists: "assists", goals: "goals", "home runs": "home runs", homers: "home runs", sacks: "sacks",
};

const iso = (d: string) => `${d}T23:59:00.000Z`;
const pct = (n: number) => Math.round(n * 100) / 100;

export class RuleStructurer implements PredictionStructurer {
  readonly name = "rules-v1";

  async suggest(raw: string, ctx: StructurerContext): Promise<Suggestion[]> {
    const text = norm(raw);
    const players = find(PLAYERS, text);
    const leagueWord = LEAGUE_WORDS.find(([, re]) => re.test(text))?.[0];
    const ctxLeague = players[0]?.league ?? leagueWord;
    // Same nickname in two leagues (Panthers, Kings…): prefer the league the rest of the text implies.
    const teams = find(TEAMS, text).sort((a, b) => Number(b.league === ctxLeague) - Number(a.league === ctxLeague));
    const league: League | null = ctxLeague ?? teams[0]?.league ?? null;
    const out: Suggestion[] = [];
    const push = (s: Omit<Suggestion, "key">) => {
      const key = `${s.kind}:${s.questionId ?? s.draft?.title ?? s.statement}`;
      if (!out.some((x) => x.key === key)) out.push({ key, ...s });
    };
    const q = (pred: (x: StructurerContext["openQuestions"][number]) => boolean) => ctx.openQuestions.find(pred);

    // ---- Awards ----
    const award =
      /\b(mvp|most valuable)\b/.test(text) ? "MVP" :
      /\b(roy|rookie of the year)\b/.test(text) ? "Rookie of the Year" :
      /\b(dpoy|defensive player of the year)\b/.test(text) ? "Defensive Player of the Year" : null;
    if (award) {
      const aq = q((x) => x.category === "award" && (!league || x.league === league) && x.title.includes(award));
      if (aq) {
        const pick = players.find((p) => aq.options?.some((o) => o.id === p.id));
        push({
          kind: "existing", questionId: aq.id, league: aq.league, category: "award",
          statement: pick ? `${pick.name} wins the ${aq.title}` : `Your ballot for the ${aq.title}`,
          suggestedForecast: pick ? { type: "categorical", primary: { optionId: pick.id, p: 0.35 } } : undefined,
          rationale: "Award predictions resolve on the official announcement. Add a dark horse to hedge — the rest of the field is weighted by consensus.",
        });
      }
    }

    // ---- Championship ----
    if (/\b(win (it all|the (title|ring|championship|chip|cup|finals|super bowl|world series))|champions?|super bowl|title|ring|chip|finals|stanley cup)\b/.test(text)) {
      for (const t of teams.filter((x) => !ctxLeague || x.league === ctxLeague).slice(0, 2)) {
        const cq = q((x) => x.category === "team" && x.kind === "categorical" && x.league === t.league && !!x.options?.some((o) => o.id === t.id));
        const s = SEASON[t.league];
        if (!cq) push(draft(t.league, "team", `The ${teamLabel(t)} win the ${s.label} ${s.title}`,
          `YES if the ${teamLabel(t)} win the ${s.label} ${s.title}. NO otherwise.`, iso(s.titleDate), 0.85, 0.2,
          "Championship calls resolve on the official result."));
        else push({
          kind: "existing", questionId: cq.id, league: t.league, category: "team", statement: `${teamLabel(t)} win the ${cq.title.replace(/ champion$/, "")}`,
          suggestedForecast: { type: "categorical", primary: { optionId: t.id, p: 0.2 } },
          rationale: "Title picks are scored against every team's consensus odds, so a long shot that hits is worth a lot.",
        });
      }
    }

    // ---- Trades ----
    if (/\b(trade[sd]?|traded|dealt|moved|ship(ped)? out|gets? moved|acquire[sd]?)\b/.test(text) && players.length) {
      const p = players[0];
      const existing = q((x) => x.category === "trade" && x.title.includes(p.name));
      const dest = teams.find((t) => t.league === p.league && t.id !== p.teamId);
      if (existing && !dest) {
        push({ kind: "existing", questionId: existing.id, league: p.league, category: "trade", statement: existing.title,
          suggestedForecast: { type: "binary", pYes: 0.6 }, rationale: "Matches an open trade question with official transaction criteria." });
      }
      const deadline = SEASON[p.league].tradeDeadline;
      const title = dest ? `${p.name} is traded to the ${teamLabel(dest)} before the ${SEASON[p.league].label} ${p.league} trade deadline`
        : `${p.name} is traded before the ${SEASON[p.league].label} ${p.league} trade deadline`;
      if (new Date(iso(deadline)) > ctx.now) push(draft(p.league, "trade", title,
        `YES if an official ${p.league} transaction ${dest ? `sends ${p.name} to the ${teamLabel(dest)}` : `moves ${p.name} to another team`} is announced on or before ${deadline}. NO otherwise.`,
        iso(deadline), dest ? 0.85 : 0.6, 0.6, dest ? "Naming the destination makes this far more specific — and worth more if it hits." : "Trade calls resolve on official league transactions."));
    }

    // ---- Stat thresholds (breakouts) ----
    const num = text.match(/(\d{1,2}(?:,\d{3})|\d+(?:\.\d+)?)\s*(\+|plus|or more)?\s*(passing yards|rushing yards|receiving yards|yards|touchdowns|tds|points|ppg|rebounds|assists|goals|home runs|homers|sacks)/);
    if (num && players.length) {
      const p = players[0];
      const n = Number(num[1].replace(",", ""));
      const stat = STAT_WORDS[num[3]] ?? num[3];
      const s = SEASON[p.league];
      push(draft(p.league, "breakout", `${p.name} records at least ${n.toLocaleString("en-US")} ${stat} in the ${s.label} regular season`,
        `YES if ${p.name}'s official ${s.label} regular-season ${stat} total is ${n.toLocaleString("en-US")} or more. NO otherwise, including if injured.`,
        iso(s.regularSeasonEnd), 0.7, 0.65, "Stat thresholds resolve on official season totals."));
    }

    // ---- Head-to-head comparisons ----
    if (players.length >= 2 && /\b(more|better|outscore|over|higher|ahead of|vs\.?|versus)\b/.test(text) && players[0].league === players[1].league) {
      const [a, b] = players;
      const stat = Object.keys(STAT_WORDS).find((w) => hasWord(text, w));
      const label = stat ? STAT_WORDS[stat] : a.league === "NFL" ? "scrimmage yards" : a.league === "MLB" ? "home runs" : "points";
      const s = SEASON[a.league];
      push(draft(a.league, "comparison", `${a.name} finishes with more ${label} than ${b.name} in the ${s.label} regular season`,
        `YES if ${a.name}'s official ${s.label} regular-season ${label} total exceeds ${b.name}'s. Ties resolve NO.`,
        iso(s.regularSeasonEnd), 0.6, 0.65, "Comparisons resolve on official season totals for both players."));
    }

    // ---- Team season outcomes ----
    for (const t of teams.slice(0, 1)) {
      const s = SEASON[t.league];
      if (/\b(playoffs?|postseason|make it in|get in)\b/.test(text) && !/\b(miss|out of)\b/.test(text)) {
        const ex = q((x) => x.kind === "binary" && x.title.includes(t.name) && /playoffs/.test(x.title));
        if (ex) push({ kind: "existing", questionId: ex.id, league: t.league, category: "team", statement: ex.title, suggestedForecast: { type: "binary", pYes: 0.7 }, rationale: "Matches an open playoff question." });
        else push(draft(t.league, "team", `The ${teamLabel(t)} make the ${s.label} ${t.league} playoffs`,
          `YES if the ${teamLabel(t)} qualify for the ${s.label} postseason (play-in losses do not count). NO otherwise.`,
          iso(s.regularSeasonEnd), 0.4, 0.7, "Playoff qualification is official at the end of the regular season."));
      }
      if (/\b(miss(es)? the playoffs|won'?t make the playoffs)\b/.test(text)) {
        push(draft(t.league, "team", `The ${teamLabel(t)} miss the ${s.label} ${t.league} playoffs`,
          `YES if the ${teamLabel(t)} do not qualify for the ${s.label} postseason. NO otherwise.`, iso(s.regularSeasonEnd), 0.4, 0.7, "Resolves when the regular season ends."));
      }
      if (/\b(good|great|elite|crazy|huge|dominant|special|best) (season|year)\b|\b(dominate|cook|run the league)\b/.test(text) || (out.length === 0 && teams.length)) {
        const th = thresholdFor(t);
        const ex = q((x) => x.kind === "binary" && x.title.includes(t.name) && x.title.includes(th.short));
        if (ex) push({ kind: "existing", questionId: ex.id, league: t.league, category: "team", statement: ex.title, suggestedForecast: { type: "binary", pYes: 0.7 }, rationale: `"Good season" made measurable: ${th.short}.` });
        else push(draft(t.league, "team", `The ${teamLabel(t)} finish the ${s.label} regular season with ${th.short}`,
          `YES if the ${teamLabel(t)} finish the ${s.label} regular season with ${th.long}. NO otherwise.`, iso(s.regularSeasonEnd), 0.65, 0.7,
          `"Good season" is vague, so we made it measurable: ${th.short} is a strong-season benchmark in the ${t.league}.`));
      }
    }

    // ---- Fallback: hot take ----
    push({
      kind: "debate", league, category: "debate", statement: raw.trim(),
      rationale: out.length ? "Or post it as-is as a hot take. Debates get community votes, never an accuracy grade." :
        "This isn't objectively verifiable, so it posts as a hot take: community votes, no accuracy grade.",
    });
    return out;
  }
}

function thresholdFor(t: Team) {
  switch (t.league) {
    case "NHL": return { short: "105+ points", long: "at least 105 standings points" };
    case "NBA": return { short: "50+ wins", long: "at least 50 wins" };
    case "NFL": return { short: "11+ wins", long: "at least 11 wins" };
    case "MLB": return { short: "92+ wins", long: "at least 92 wins" };
  }
}

function draft(league: League, category: Suggestion["category"] & string, title: string, criteria: string, resolvesBy: string, specificity: number, pYes: number, rationale: string): Omit<Suggestion, "key"> {
  return {
    kind: "draft", league, category: category as Suggestion["category"], statement: title, rationale,
    draft: { league, category: category as "trade", title, criteria, resolutionSource: OFFICIAL_SOURCE[league], specificity, resolvesBy },
    suggestedForecast: { type: "binary", pYes: pct(pYes) },
  };
}

export type { Player };
