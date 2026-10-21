import type { Subject } from "../domain";
import { PLAYERS } from "./players";
import { TEAMS, teamById, teamLabel, type League } from "./teams";

/** Client-safe description of a player or team, used for the picker and avatars. */
export interface SubjectLite {
  type: "player" | "team";
  id: string;
  league: League;
  name: string;
  /** "QB · BUF" for players, league name for teams. */
  meta: string;
  /** Initials (players) or abbreviation (teams) shown in the avatar. */
  mark: string;
  color: string;
  /** Licensed headshot/logo URL when a data provider supplies one; avatars fall back to `mark`. */
  imageUrl?: string;
}

const initials = (name: string) => name.replace(/[^A-Za-zÀ-ž' -]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export function subjectLite(s: Subject | null | undefined): SubjectLite | null {
  if (!s) return null;
  if (s.type === "team") {
    const t = teamById(s.id);
    return t ? { type: "team", id: t.id, league: t.league, name: teamLabel(t), meta: t.league, mark: t.abbr, color: t.color, imageUrl: t.imageUrl } : null;
  }
  const p = PLAYERS.find((x) => x.id === s.id);
  if (!p) return null;
  const team = p.teamId ? teamById(p.teamId) : undefined;
  return {
    type: "player", id: p.id, league: p.league, name: p.name,
    meta: [p.position, team?.abbr ?? (p.rookie ? "Rookie" : "FA")].join(" · "),
    mark: initials(p.name), color: team?.color ?? "#39424a", imageUrl: p.imageUrl,
  };
}

/** Every team and player in a league, teams first, alphabetical. */
export function subjectsFor(league: League): SubjectLite[] {
  const teams = TEAMS.filter((t) => t.league === league).map((t) => subjectLite({ type: "team", id: t.id })!);
  const players = PLAYERS.filter((p) => p.league === league).map((p) => subjectLite({ type: "player", id: p.id })!);
  const byName = (a: SubjectLite, b: SubjectLite) => a.name.localeCompare(b.name);
  return [...teams.sort(byName), ...players.sort(byName)];
}

export const isKnownSubject = (s: Subject) => subjectLite(s) !== null;

/** Best-effort subject for a question-based take: a named player, else a named team. */
export function inferSubject(text: string, league: League | null): Subject | null {
  const p = PLAYERS.find((x) => (!league || x.league === league) && text.includes(x.name));
  if (p) return { type: "player", id: p.id };
  const t = TEAMS.find((x) => (!league || x.league === league) && text.includes(teamLabel(x)));
  return t ? { type: "team", id: t.id } : null;
}
