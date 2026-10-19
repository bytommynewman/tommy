// Sync every team + athlete (with photos) into lib/catalog/generated/rosters.json.
//
//   SPORTSDATAIO_KEY=... npm run roster:sync      → licensed headshots & logos (SportsDataIO; production)
//   npm run roster:sync -- --provider espn        → ESPN public endpoints (unofficial; local dev/prototyping only)
//
// Optional: --leagues NFL,NBA,NHL,MLB,NCAAF,NCAAB   (default: all)
// Player ids are derived from league + name, so existing questions/receipts keep pointing at the same people.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, "lib/catalog/generated/rosters.json");
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const KEY = process.env.SPORTSDATAIO_KEY;
const provider = arg("provider", KEY ? "sportsdataio" : "espn");
const leagues = arg("leagues", "NFL,NBA,NHL,MLB,NCAAF,NCAAB").split(",");

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const get = async (url) => {
  const res = await fetch(url, { headers: { "user-agent": "game-receipts-roster-sync" } });
  if (!res.ok) throw new Error(`${res.status} ${url.replace(/key=[^&]+/, "key=***")}`);
  return res.json();
};
const probe = async (url) => { try { return (await fetch(url, { method: "HEAD" })).ok ? url : undefined; } catch { return undefined; } };
// College catalogs are large; sync only the programs the app lists (lib/catalog/teams.ts).
const teamsTs = fs.readFileSync(path.join(root, "lib/catalog/teams.ts"), "utf8");
const collegeSchools = new Set([...teamsTs.matchAll(/t\("NCAA[FB]", "[^"]+", "([^"]+)"/g)].map((m) => m[1].toLowerCase()));

const teams = [], players = [];
const addTeam = (league, abbr, city, name, color, imageUrl) => {
  const id = `${league}-${abbr}`.toLowerCase();
  teams.push({ id, league, abbr, city, name, color: color ? `#${color.replace("#", "")}` : "#39424a", imageUrl });
  return id;
};
const addPlayer = (league, name, teamId, position, imageUrl) => name && players.push({ league, name, teamId, position: position ?? "", imageUrl: imageUrl || undefined });

// ---------- SportsDataIO (licensed) ----------
const SDIO = { NFL: "nfl", NBA: "nba", NHL: "nhl", MLB: "mlb", NCAAF: "cfb", NCAAB: "cbb" };
async function sportsdataio(league) {
  const s = SDIO[league];
  const base = `https://api.sportsdata.io/v3/${s}/scores/json`;
  const ts = await get(`${base}/${league.startsWith("NCAA") ? "teams" : "AllTeams"}?key=${KEY}`);
  const byKey = new Map();
  for (const t of ts) {
    const school = t.School ?? t.City ?? "";
    if (league.startsWith("NCAA") && !collegeSchools.has(school.toLowerCase())) continue;
    byKey.set(t.Key ?? t.TeamID, addTeam(league, t.Key, school, t.Name, t.PrimaryColor, t.WikipediaLogoUrl ?? t.TeamLogoUrl));
  }
  const ps = await get(`${base}/${league.startsWith("NCAA") ? "Players" : "Players"}?key=${KEY}`);
  for (const p of ps) {
    if (p.Status && !/active/i.test(p.Status)) continue;
    const teamId = byKey.get(p.Team ?? p.TeamID) ?? null;
    if (league.startsWith("NCAA") && !teamId) continue;
    addPlayer(league, p.Name ?? `${p.FirstName} ${p.LastName}`, teamId, p.Position, p.PhotoUrl);
  }
}

// ---------- ESPN (unofficial; dev only) ----------
const ESPN = { NFL: "football/nfl", NBA: "basketball/nba", NHL: "hockey/nhl", MLB: "baseball/mlb", NCAAF: "football/college-football", NCAAB: "basketball/mens-college-basketball" };
async function espn(league) {
  const s = ESPN[league];
  const data = await get(`https://site.api.espn.com/apis/site/v2/sports/${s}/teams?limit=1000`);
  const list = data.sports?.[0]?.leagues?.[0]?.teams?.map((x) => x.team) ?? [];
  for (const t of list) {
    const city = t.location, name = t.name ?? t.shortDisplayName;
    if (league.startsWith("NCAA") && !collegeSchools.has(String(city).toLowerCase())) continue;
    const teamId = addTeam(league, t.abbreviation, city, name, t.color, t.logos?.[0]?.href);
    const roster = await get(`https://site.api.espn.com/apis/site/v2/sports/${s}/teams/${t.id}/roster`);
    // NBA/NHL return a flat list; NFL/MLB/NCAAF group athletes by unit.
    const athletes = (roster.athletes ?? []).flatMap((a) => (Array.isArray(a.items) ? a.items : [a]));
    // Rosters often omit `headshot` even when ESPN hosts one at the standard path; probe it before giving up.
    const urls = await Promise.all(athletes.map((a) => a.headshot?.href ?? probe(`https://a.espncdn.com/i/headshots/${s.split("/")[1]}/players/full/${a.id}.png`)));
    athletes.forEach((a, i) => addPlayer(league, a.fullName ?? a.displayName, teamId, a.position?.abbreviation, urls[i]));
    process.stdout.write(".");
  }
}

const run = provider === "sportsdataio" ? sportsdataio : espn;
if (provider === "sportsdataio" && !KEY) { console.error("Set SPORTSDATAIO_KEY (server-side secret) or pass --provider espn."); process.exit(1); }
for (const l of leagues) {
  try { await run(l); console.log(`\n✓ ${l}`); } catch (e) { console.error(`\n✗ ${l}: ${e.message}`); process.exitCode = 1; }
}
// Every athlete in the picker must have a headshot; drop the ones the provider has no photo for.
const dropped = players.filter((p) => !p.imageUrl).length;
// Deduplicate by derived id (league + name), keeping the first (rostered) entry.
const seen = new Set();
const uniq = players.filter((p) => p.imageUrl).filter((p) => { const id = `${p.league}-${slug(p.name)}`; if (seen.has(id)) return false; seen.add(id); return true; });
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), source: provider, teams, players: uniq }));
console.log(`Wrote ${teams.length} teams and ${uniq.length} athletes from ${provider} → ${path.relative(root, out)} (dropped ${dropped} without a headshot)`);
if (provider === "espn") console.log("Note: ESPN data is unofficial and for local development only. Use a licensed provider (SportsDataIO) before launch.");
