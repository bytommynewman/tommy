/**
 * MOCK sports reference data for local development. Team names are real;
 * `rating` values are invented placeholders used only to derive mock
 * consensus baselines. Nothing here comes from a live or licensed feed.
 */
export type League = "NFL" | "NBA" | "NCAAF" | "NCAAB" | "NHL" | "MLB";
export const LEAGUES: League[] = ["NFL", "NBA", "NCAAF", "NCAAB", "NHL", "MLB"];
export const LEAGUE_NAME: Record<League, string> = {
  NFL: "Pro football", NBA: "Pro basketball", NCAAF: "College football", NCAAB: "College basketball", NHL: "Hockey", MLB: "Baseball",
};
export const PRIMARY_LEAGUES: League[] = ["NFL", "NBA"];

export interface Team {
  id: string;
  league: League;
  abbr: string;
  name: string;
  city: string;
  aliases: string[];
  rating: number;
  color: string;
  /** Team logo from the roster sync / licensed provider. */
  imageUrl?: string;
}

const t = (league: League, abbr: string, city: string, name: string, rating: number, color: string, aliases: string[] = []): Team => ({
  id: `${league}-${abbr}`.toLowerCase(), league, abbr, city, name, rating, color,
  aliases: [name.toLowerCase(), `${city} ${name}`.toLowerCase(), ...aliases],
});

export const TEAMS: Team[] = [
  // NFL
  t("NFL", "ARI", "Arizona", "Cardinals", 4, "#97233F"), t("NFL", "ATL", "Atlanta", "Falcons", 4.5, "#A71930"),
  t("NFL", "BAL", "Baltimore", "Ravens", 8, "#241773"), t("NFL", "BUF", "Buffalo", "Bills", 8.5, "#00338D"),
  t("NFL", "CAR", "Carolina", "Panthers", 3.5, "#0085CA"), t("NFL", "CHI", "Chicago", "Bears", 5.5, "#0B162A"),
  t("NFL", "CIN", "Cincinnati", "Bengals", 6, "#FB4F14"), t("NFL", "CLE", "Cleveland", "Browns", 3, "#311D00"),
  t("NFL", "DAL", "Dallas", "Cowboys", 5, "#041E42", ["boys"]), t("NFL", "DEN", "Denver", "Broncos", 6.5, "#FB4F14"),
  t("NFL", "DET", "Detroit", "Lions", 8, "#0076B6"), t("NFL", "GB", "Green Bay", "Packers", 7, "#203731", ["pack"]),
  t("NFL", "HOU", "Houston", "Texans", 6, "#03202F"), t("NFL", "IND", "Indianapolis", "Colts", 4.5, "#002C5F"),
  t("NFL", "JAX", "Jacksonville", "Jaguars", 5, "#006778", ["jags"]), t("NFL", "KC", "Kansas City", "Chiefs", 7.5, "#E31837"),
  t("NFL", "LV", "Las Vegas", "Raiders", 3.5, "#000000"), t("NFL", "LAC", "Los Angeles", "Chargers", 6.5, "#0080C6", ["bolts"]),
  t("NFL", "LAR", "Los Angeles", "Rams", 7, "#003594"), t("NFL", "MIA", "Miami", "Dolphins", 4.5, "#008E97", ["fins"]),
  t("NFL", "MIN", "Minnesota", "Vikings", 6.5, "#4F2683"), t("NFL", "NE", "New England", "Patriots", 6, "#002244", ["pats"]),
  t("NFL", "NO", "New Orleans", "Saints", 3, "#D3BC8D"), t("NFL", "NYG", "New York", "Giants", 3.5, "#0B2265"),
  t("NFL", "NYJ", "New York", "Jets", 3, "#125740"), t("NFL", "PHI", "Philadelphia", "Eagles", 8, "#004C54", ["birds"]),
  t("NFL", "PIT", "Pittsburgh", "Steelers", 5, "#FFB612"), t("NFL", "SF", "San Francisco", "49ers", 6.5, "#AA0000", ["niners"]),
  t("NFL", "SEA", "Seattle", "Seahawks", 6.5, "#002244", ["hawks"]), t("NFL", "TB", "Tampa Bay", "Buccaneers", 6, "#D50A0A", ["bucs"]),
  t("NFL", "TEN", "Tennessee", "Titans", 3, "#4B92DB"), t("NFL", "WAS", "Washington", "Commanders", 6, "#5A1414"),
  // NBA
  t("NBA", "ATL", "Atlanta", "Hawks", 5.5, "#E03A3E"), t("NBA", "BOS", "Boston", "Celtics", 6, "#007A33"),
  t("NBA", "BKN", "Brooklyn", "Nets", 2.5, "#000000"), t("NBA", "CHA", "Charlotte", "Hornets", 3.5, "#1D1160"),
  t("NBA", "CHI", "Chicago", "Bulls", 4, "#CE1141"), t("NBA", "CLE", "Cleveland", "Cavaliers", 7.5, "#860038", ["cavs"]),
  t("NBA", "DAL", "Dallas", "Mavericks", 5, "#00538C", ["mavs"]), t("NBA", "DEN", "Denver", "Nuggets", 7.5, "#0E2240"),
  t("NBA", "DET", "Detroit", "Pistons", 6.5, "#C8102E"), t("NBA", "GSW", "Golden State", "Warriors", 5.5, "#1D428A", ["dubs"]),
  t("NBA", "HOU", "Houston", "Rockets", 7, "#CE1141"), t("NBA", "IND", "Indiana", "Pacers", 4, "#002D62"),
  t("NBA", "LAC", "LA", "Clippers", 5.5, "#C8102E"), t("NBA", "LAL", "Los Angeles", "Lakers", 6, "#552583"),
  t("NBA", "MEM", "Memphis", "Grizzlies", 4.5, "#5D76A9", ["grizz"]), t("NBA", "MIA", "Miami", "Heat", 4.5, "#98002E"),
  t("NBA", "MIL", "Milwaukee", "Bucks", 4.5, "#00471B"), t("NBA", "MIN", "Minnesota", "Timberwolves", 6.5, "#0C2340", ["wolves"]),
  t("NBA", "NOP", "New Orleans", "Pelicans", 3, "#0C2340", ["pels"]), t("NBA", "NYK", "New York", "Knicks", 7, "#006BB6"),
  t("NBA", "OKC", "Oklahoma City", "Thunder", 9, "#007AC1", ["okc"]), t("NBA", "ORL", "Orlando", "Magic", 6.5, "#0077C0"),
  t("NBA", "PHI", "Philadelphia", "76ers", 4.5, "#006BB6", ["sixers"]), t("NBA", "PHX", "Phoenix", "Suns", 4, "#1D1160"),
  t("NBA", "POR", "Portland", "Trail Blazers", 3.5, "#E03A3E", ["blazers"]), t("NBA", "SAC", "Sacramento", "Kings", 3, "#5A2D81"),
  t("NBA", "SAS", "San Antonio", "Spurs", 7, "#C4CED4"), t("NBA", "TOR", "Toronto", "Raptors", 4.5, "#CE1141", ["raps"]),
  t("NBA", "UTA", "Utah", "Jazz", 2, "#002B5C"), t("NBA", "WAS", "Washington", "Wizards", 2, "#002B5C"),
  // NCAAF (partial — top programs; school stored as `city`)
  t("NCAAF", "UGA", "Georgia", "Bulldogs", 8, "#BA0C2F", ["dawgs"]), t("NCAAF", "OSU", "Ohio State", "Buckeyes", 8.5, "#BB0000", ["buckeyes"]),
  t("NCAAF", "TEX", "Texas", "Longhorns", 8, "#BF5700", ["horns"]), t("NCAAF", "ALA", "Alabama", "Crimson Tide", 7.5, "#9E1B32", ["bama", "roll tide"]),
  t("NCAAF", "MICH", "Michigan", "Wolverines", 6.5, "#00274C", ["wolverines"]), t("NCAAF", "ORE", "Oregon", "Ducks", 8, "#154733", ["ducks"]),
  t("NCAAF", "ND", "Notre Dame", "Fighting Irish", 7.5, "#0C2340", ["irish"]), t("NCAAF", "PSU", "Penn State", "Nittany Lions", 7.5, "#041E42"),
  t("NCAAF", "LSU", "LSU", "Tigers", 6.5, "#461D7C"), t("NCAAF", "CLEM", "Clemson", "Tigers", 6.5, "#F56600"),
  t("NCAAF", "USC", "USC", "Trojans", 6, "#990000", ["trojans"]), t("NCAAF", "MIA", "Miami (FL)", "Hurricanes", 7, "#F47321", ["canes", "the u"]),
  t("NCAAF", "FSU", "Florida State", "Seminoles", 5.5, "#782F40", ["noles"]), t("NCAAF", "TENN", "Tennessee", "Volunteers", 6.5, "#FF8200", ["vols"]),
  t("NCAAF", "OU", "Oklahoma", "Sooners", 6, "#841617", ["sooners"]), t("NCAAF", "MISS", "Ole Miss", "Rebels", 7, "#CE1126"),
  // NCAAB (partial)
  t("NCAAB", "DUKE", "Duke", "Blue Devils", 8, "#003087", ["blue devils"]), t("NCAAB", "CONN", "UConn", "Huskies", 7.5, "#000E2F"),
  t("NCAAB", "KU", "Kansas", "Jayhawks", 7, "#0051BA", ["jayhawks"]), t("NCAAB", "UK", "Kentucky", "Wildcats", 7, "#0033A0"),
  t("NCAAB", "UNC", "North Carolina", "Tar Heels", 6.5, "#7BAFD4", ["tar heels"]), t("NCAAB", "HOU", "Houston", "Cougars", 7.5, "#C8102E"),
  t("NCAAB", "PUR", "Purdue", "Boilermakers", 7, "#CEB888", ["boilers"]), t("NCAAB", "GONZ", "Gonzaga", "Bulldogs", 6.5, "#041E42", ["zags"]),
  t("NCAAB", "ARIZ", "Arizona", "Wildcats", 6.5, "#CC0033"), t("NCAAB", "AUB", "Auburn", "Tigers", 7, "#0C2340"),
  t("NCAAB", "FLA", "Florida", "Gators", 7.5, "#0021A5", ["gators"]), t("NCAAB", "MSU", "Michigan State", "Spartans", 6.5, "#18453B", ["sparty"]),
  // NHL (partial)
  t("NHL", "TOR", "Toronto", "Maple Leafs", 6.5, "#00205B", ["leafs"]), t("NHL", "EDM", "Edmonton", "Oilers", 7.5, "#041E42"),
  t("NHL", "FLA", "Florida", "Panthers", 7.5, "#C8102E", ["cats"]), t("NHL", "COL", "Colorado", "Avalanche", 7.5, "#6F263D", ["avs"]),
  t("NHL", "MTL", "Montreal", "Canadiens", 5, "#AF1E2D", ["habs"]), t("NHL", "SJS", "San Jose", "Sharks", 4, "#006D75"), t("NHL", "VAN", "Vancouver", "Canucks", 5, "#00205B"),
  t("NHL", "NYR", "New York", "Rangers", 5, "#0038A8"), t("NHL", "DAL", "Dallas", "Stars", 7, "#006847"),
  // MLB (partial)
  t("MLB", "LAD", "Los Angeles", "Dodgers", 8.5, "#005A9C"), t("MLB", "NYY", "New York", "Yankees", 7, "#0C2340"),
  t("MLB", "TOR", "Toronto", "Blue Jays", 6.5, "#134A8E", ["jays"]), t("MLB", "PHI", "Philadelphia", "Phillies", 7, "#E81828"),
  t("MLB", "ATL", "Atlanta", "Braves", 6, "#CE1141"), t("MLB", "SEA", "Seattle", "Mariners", 6.5, "#0C2C56"),
];

// Roster sync output (scripts/sync-rosters.mjs) adds every team in each league, with logos.
import generated from "./generated/rosters.json";
type GenTeam = { id: string; league: League; abbr: string; city: string; name: string; color: string; imageUrl?: string };
for (const g of generated.teams as GenTeam[]) {
  const existing = TEAMS.find((x) => x.id === g.id || (x.league === g.league && `${x.city} ${x.name}` === `${g.city} ${g.name}`));
  if (existing) existing.imageUrl = g.imageUrl ?? existing.imageUrl;
  else TEAMS.push({ ...g, rating: 5, aliases: [g.name.toLowerCase(), `${g.city} ${g.name}`.toLowerCase()] });
}

// Bare city names are aliases only when unambiguous across every league ("Buffalo" yes, "Toronto" no).
const cityCount = new Map<string, number>();
for (const x of TEAMS) cityCount.set(x.city, (cityCount.get(x.city) ?? 0) + 1);
for (const x of TEAMS) if (cityCount.get(x.city) === 1) x.aliases.push(x.city.toLowerCase());

export const teamById = (id: string) => TEAMS.find((x) => x.id === id);
export const teamsFor = (league: League) => TEAMS.filter((x) => x.league === league);
export const teamLabel = (x: Team) => `${x.city} ${x.name}`;
