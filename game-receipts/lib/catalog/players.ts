import { GENERATED_TEAM_ID, type League } from "./teams";

/** MOCK player reference data. Team affiliations are illustrative and not live-synced. */
export interface Player {
  id: string;
  league: League;
  name: string;
  teamId: string | null;
  position: string;
  aliases: string[];
  rookie?: boolean;
  /** Headshot from a licensed data provider (none in the mock catalog). */
  imageUrl?: string;
}

const p = (league: League, name: string, teamId: string | null, position: string, aliases: string[] = [], rookie = false): Player => {
  const last = name.split(" ").slice(-1)[0].toLowerCase();
  return {
    id: `${league}-${name}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    league, name, teamId, position, rookie,
    aliases: [name.toLowerCase(), name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(), last, ...aliases],
  };
};

export const PLAYERS: Player[] = [
  // NFL
  p("NFL", "Josh Allen", "nfl-buf", "QB"), p("NFL", "Lamar Jackson", "nfl-bal", "QB", ["lamar"]),
  p("NFL", "Patrick Mahomes", "nfl-kc", "QB", ["mahomes"]), p("NFL", "Joe Burrow", "nfl-cin", "QB", ["burreaux"]),
  p("NFL", "Jalen Hurts", "nfl-phi", "QB"), p("NFL", "Jayden Daniels", "nfl-was", "QB"),
  p("NFL", "Drake Maye", "nfl-ne", "QB"), p("NFL", "C.J. Stroud", "nfl-hou", "QB", ["cj stroud", "stroud"]),
  p("NFL", "Jared Goff", "nfl-det", "QB"), p("NFL", "Justin Herbert", "nfl-lac", "QB"),
  p("NFL", "Bo Nix", "nfl-den", "QB"), p("NFL", "Caleb Williams", "nfl-chi", "QB", ["caleb"]),
  p("NFL", "Saquon Barkley", "nfl-phi", "RB", ["saquon"]), p("NFL", "Bijan Robinson", "nfl-atl", "RB", ["bijan"]),
  p("NFL", "Ja'Marr Chase", "nfl-cin", "WR", ["jamarr chase"]), p("NFL", "Justin Jefferson", "nfl-min", "WR", ["jjettas"]),
  p("NFL", "CeeDee Lamb", "nfl-dal", "WR", ["ceedee"]), p("NFL", "Puka Nacua", "nfl-lar", "WR", ["puka"]),
  p("NFL", "Micah Parsons", "nfl-gb", "EDGE"), p("NFL", "Myles Garrett", "nfl-cle", "EDGE"),
  // NBA
  p("NBA", "Shai Gilgeous-Alexander", "nba-okc", "G", ["sga", "shai"]), p("NBA", "Nikola Jokić", "nba-den", "C", ["joker", "jokic"]),
  p("NBA", "Victor Wembanyama", "nba-sas", "C", ["wemby", "wembanyama"]), p("NBA", "Giannis Antetokounmpo", "nba-mil", "F", ["giannis", "greek freak"]),
  p("NBA", "Luka Dončić", "nba-lal", "G", ["luka", "doncic"]), p("NBA", "Anthony Edwards", "nba-min", "G", ["ant", "ant-man", "edwards"]),
  p("NBA", "Jayson Tatum", "nba-bos", "F", ["tatum"]), p("NBA", "Cade Cunningham", "nba-det", "G", ["cade"]),
  p("NBA", "Jalen Brunson", "nba-nyk", "G", ["brunson"]), p("NBA", "Donovan Mitchell", "nba-cle", "G", ["spida"]),
  p("NBA", "Tyrese Haliburton", "nba-ind", "G", ["hali"]), p("NBA", "Stephen Curry", "nba-gsw", "G", ["steph", "curry"]),
  p("NBA", "LeBron James", "nba-lal", "F", ["lebron", "bron", "king james"]), p("NBA", "Kevin Durant", "nba-hou", "F", ["kd", "durant"]),
  p("NBA", "Paolo Banchero", "nba-orl", "F", ["paolo"]), p("NBA", "Evan Mobley", "nba-cle", "F", ["mobley"]),
  p("NBA", "Chet Holmgren", "nba-okc", "C", ["chet"]), p("NBA", "Jaren Jackson Jr.", "nba-mem", "F", ["jjj"]),
  p("NBA", "Cooper Flagg", "nba-dal", "F", ["flagg", "cooper"]), p("NBA", "Stephon Castle", "nba-sas", "G", ["castle"]),
  p("NBA", "AJ Dybantsa", null, "F", ["dybantsa"], true), p("NBA", "Darryn Peterson", null, "G", ["peterson"], true),
  p("NBA", "Cameron Boozer", null, "F", ["boozer"], true),
  // NHL
  p("NHL", "Auston Matthews", "nhl-tor", "C", ["matthews", "auston"]), p("NHL", "Connor McDavid", "nhl-edm", "C", ["mcdavid", "mcjesus"]),
  p("NHL", "William Nylander", "nhl-tor", "RW", ["nylander", "willy"]), p("NHL", "Nathan MacKinnon", "nhl-col", "C", ["mackinnon"]),
  p("NHL", "Leon Draisaitl", "nhl-edm", "C", ["leon", "draisaitl"]), p("NHL", "Lane Hutson", "nhl-mtl", "D", ["hutson"]),
  p("NHL", "Macklin Celebrini", "nhl-sjs", "C", ["celebrini", "macklin"]),
  // MLB
  p("MLB", "Shohei Ohtani", "mlb-lad", "DH/P", ["shohei", "ohtani"]), p("MLB", "Aaron Judge", "mlb-nyy", "RF", ["judge"]),
  p("MLB", "Vladimir Guerrero Jr.", "mlb-tor", "1B", ["vlad", "vladdy"]), p("MLB", "Cal Raleigh", "mlb-sea", "C", ["big dumper", "raleigh"]),
];

// Roster sync output replaces/extends the mock list with every athlete (and headshots).
import generated from "./generated/rosters.json";
type GenPlayer = { league: League; name: string; teamId: string | null; position: string; imageUrl?: string };
const byId = new Map(PLAYERS.map((x) => [x.id, x]));
for (const g of generated.players as GenPlayer[]) {
  const teamId = g.teamId && (GENERATED_TEAM_ID.get(g.teamId) ?? g.teamId);
  const made = p(g.league, g.name, teamId, g.position);
  const existing = byId.get(made.id);
  if (existing) Object.assign(existing, { teamId: teamId ?? existing.teamId, position: g.position || existing.position, imageUrl: g.imageUrl });
  // Bulk roster players match on full name only: thousands of bare surnames would collide with ordinary words ("Stanley Cup").
  else PLAYERS.push({ ...made, aliases: made.aliases.slice(0, 2), imageUrl: g.imageUrl });
}

export const playerById = (id: string) => PLAYERS.find((x) => x.id === id);
