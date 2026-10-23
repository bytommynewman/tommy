import type { DB, Question, User } from "../domain";
import { CATALOG_QUESTIONS } from "../catalog/questions";
import type { League } from "../catalog/teams";
import type { Forecast } from "../scoring";
import { marketingCapture } from "../marketing";
import { hashPassword } from "./password";
import { gradeQuestion } from "./services/grading";
import { lockPrediction } from "./services/predictions";

/**
 * DEMO seed for local development only. Users, takes and engagement are
 * fictional; seeded predictions carry `seed: true` and are badged "Demo"
 * in the UI because their timestamps are back-dated, not server-observed.
 */
export const DEMO_PASSWORD = "receipts-demo";

// GR_MARKETING_CAPTURE: the account ad footage is recorded with. The seed key stays "demo" internally (ids, follows, likes);
// only what the UI shows changes, so no demo wording or handle ever appears on screen.
const MARKETING = marketingCapture();
const users: [string, string, string, League[], string, Partial<User>?][] = [
  MARKETING
    ? ["demo", "Jordan", "Calls it early, keeps the receipts.", ["NFL", "NBA"], "#22E58A", { username: "jordan_calls" }]
    : ["demo", "You (Demo)", "Demo account. Lock a take and see how grading works.", ["NFL", "NBA"], "#22E58A"],
  ["lockedin_larry", "Larry Locks", "Spreadsheets > vibes. Calibrated since '09.", ["NBA", "NFL"], "#5B8CFF"],
  ["darkhorse_dana", "Dana", "I only fade the chalk. Long shots, loud receipts.", ["NBA"], "#FF6B5B"],
  ["chalk_charlie", "Charlie", "Favourites win for a reason.", ["NFL", "NBA"], "#F5C542"],
  ["gridiron_gabe", "Gabe", "Film-room guy. NFL only.", ["NFL"], "#B57BFF"],
  ["hoopshead_hanna", "Hanna", "League Pass insomniac.", ["NBA"], "#3DD6D0"],
  ["the_film_room", "The Film Room Pod", "Weekly NFL + NBA podcast. Join our league with code FILMROOM.", ["NFL", "NBA"], "#FF9F43", { isCreator: true }],
  ["admin", "GR Admin", "Outcome verification & moderation.", ["NFL", "NBA"], "#8A949B", { role: "admin" }],
];

type Pick = [user: string, question: string, at: string, f: Forecast, text: string];
const bin = (pYes: number): Forecast => ({ type: "binary", pYes });
const cat = (a: string, pa: number, b?: string, pb?: number): Forecast =>
  ({ type: "categorical", primary: { optionId: a, p: pa }, ...(b ? { darkHorse: { optionId: b, p: pb! } } : {}) });

const resolvedPicks: Pick[] = [
  ["darkhorse_dana", "nba-luka-traded-2025", "2024-12-01T18:22:00Z", bin(0.6), "Dallas is going to blow it up and move Luka. Write it down."],
  ["lockedin_larry", "nba-luka-traded-2025", "2024-11-02T14:00:00Z", bin(0.04), "Franchise players don't get traded in their prime."],
  ["chalk_charlie", "nba-luka-traded-2025", "2024-10-20T12:00:00Z", bin(0.02), "Zero chance Luka moves."],
  ["hoopshead_hanna", "nba-luka-traded-2025", "2024-12-15T12:00:00Z", bin(0.06), "Small chance, but the fit is weird."],
  ["lockedin_larry", "nba-mvp-2025", "2024-11-15T16:00:00Z", cat("nba-shai-gilgeous-alexander", 0.5, "nba-nikola-jokic", 0.3), "SGA's efficiency on a 60-win team is an MVP case."],
  ["chalk_charlie", "nba-mvp-2025", "2024-11-01T16:00:00Z", cat("nba-nikola-jokic", 0.5, "nba-shai-gilgeous-alexander", 0.3), "Jokić until proven otherwise."],
  ["darkhorse_dana", "nba-mvp-2025", "2024-10-25T16:00:00Z", cat("nba-luka-doncic", 0.3, "nba-shai-gilgeous-alexander", 0.25), "Luka takes it, but watch SGA."],
  ["hoopshead_hanna", "nba-mvp-2025", "2024-10-20T16:00:00Z", cat("nba-shai-gilgeous-alexander", 0.45, "nba-giannis-antetokounmpo", 0.15), "Shai's year."],
  ["the_film_room", "nba-mvp-2025", "2024-12-01T16:00:00Z", cat("nba-shai-gilgeous-alexander", 0.4, "nba-nikola-jokic", 0.35), "Pod pick: SGA in a tight race."],
  ["gridiron_gabe", "nfl-mvp-2024", "2024-09-01T15:00:00Z", cat("nfl-josh-allen", 0.35, "nfl-lamar-jackson", 0.25), "Allen finally gets the narrative."],
  ["chalk_charlie", "nfl-mvp-2024", "2024-09-01T15:00:00Z", cat("nfl-patrick-mahomes", 0.35, "nfl-josh-allen", 0.2), "Mahomes is the default."],
  ["lockedin_larry", "nfl-mvp-2024", "2024-09-03T15:00:00Z", cat("nfl-lamar-jackson", 0.4, "nfl-josh-allen", 0.3), "Lamar's numbers win it."],
  ["darkhorse_dana", "nfl-mvp-2024", "2024-09-04T15:00:00Z", cat("nfl-joe-burrow", 0.3, "nfl-josh-allen", 0.2), "Burrow, healthy, is the best QB alive."],
  ["the_film_room", "nfl-mvp-2024", "2024-09-05T15:00:00Z", cat("nfl-josh-allen", 0.3, "nfl-patrick-mahomes", 0.2), "Allen."],
  ["gridiron_gabe", "nfl-sb-59", "2024-09-05T15:00:00Z", cat("nfl-phi", 0.3, "nfl-det", 0.2), "Saquon changes everything in Philly."],
  ["chalk_charlie", "nfl-sb-59", "2024-09-05T15:00:00Z", cat("nfl-kc", 0.4, "nfl-bal", 0.2), "Three-peat."],
  ["lockedin_larry", "nfl-sb-59", "2024-09-06T15:00:00Z", cat("nfl-det", 0.3, "nfl-phi", 0.2), "Lions' roster is the deepest."],
  ["the_film_room", "nfl-sb-59", "2024-09-07T15:00:00Z", cat("nfl-bal", 0.3, "nfl-phi", 0.15), "Ravens."],
  ["darkhorse_dana", "nfl-sb-59", "2024-09-08T15:00:00Z", cat("nfl-phi", 0.25, "nfl-hou", 0.1), "Eagles, then the Texans as a dark horse."],
  ["lockedin_larry", "nba-champ-2025", "2024-10-15T15:00:00Z", cat("nba-okc", 0.35, "nba-bos", 0.25), "OKC's depth is absurd."],
  ["chalk_charlie", "nba-champ-2025", "2024-10-15T15:00:00Z", cat("nba-bos", 0.45, "nba-okc", 0.2), "Celtics repeat."],
  ["hoopshead_hanna", "nba-champ-2025", "2024-10-16T15:00:00Z", cat("nba-okc", 0.4, "nba-den", 0.15), "Thunder."],
  ["darkhorse_dana", "nba-champ-2025", "2024-10-17T15:00:00Z", cat("nba-ind", 0.25, "nba-okc", 0.2), "Pacers make a run nobody sees coming."],
  ["gridiron_gabe", "nba-champ-2025", "2024-10-18T15:00:00Z", cat("nba-bos", 0.3, "nba-nyk", 0.2), "Boston."],
  ["the_film_room", "nba-champ-2025", "2024-10-19T15:00:00Z", cat("nba-okc", 0.3, "nba-bos", 0.3), "OKC vs BOS coin flip, OKC by a hair."],
];

const openPicks: Pick[] = [
  ["lockedin_larry", "nba-mvp-2027", "2026-10-05T15:00:00Z", cat("nba-shai-gilgeous-alexander", 0.35, "nba-victor-wembanyama", 0.2), "SGA again, Wemby closing fast."],
  ["darkhorse_dana", "nba-mvp-2027", "2026-10-06T15:00:00Z", cat("nba-victor-wembanyama", 0.35, "nba-cade-cunningham", 0.12), "Wemby MVP. Cade as the shock pick."],
  ["chalk_charlie", "nba-mvp-2027", "2026-10-07T15:00:00Z", cat("nba-nikola-jokic", 0.35, "nba-shai-gilgeous-alexander", 0.3), "Jokić."],
  ["hoopshead_hanna", "nba-roy-2027", "2026-10-08T15:00:00Z", cat("nba-darryn-peterson", 0.4, "nba-aj-dybantsa", 0.3), "Peterson is the most NBA-ready."],
  ["gridiron_gabe", "nfl-mvp-2026", "2026-09-08T15:00:00Z", cat("nfl-drake-maye", 0.2, "nfl-josh-allen", 0.18), "Year 3 Maye leap."],
  ["chalk_charlie", "nfl-mvp-2026", "2026-09-08T16:00:00Z", cat("nfl-josh-allen", 0.25, "nfl-lamar-jackson", 0.2), "Allen back-to-back."],
  ["gridiron_gabe", "nfl-maye-4000-2026", "2026-09-09T15:00:00Z", bin(0.62), "Maye clears 4K easily."],
  ["darkhorse_dana", "nba-giannis-traded-2027", "2026-10-01T15:00:00Z", bin(0.55), "Giannis is gone by the deadline."],
  ["lockedin_larry", "nba-giannis-traded-2027", "2026-10-02T15:00:00Z", bin(0.25), "Bucks hold."],
  ["the_film_room", "nfl-sb-61", "2026-09-10T15:00:00Z", cat("nfl-buf", 0.18, "nfl-det", 0.12), "Pod consensus: Bills finally do it."],
  ["hoopshead_hanna", "nba-flagg-vs-castle-2027", "2026-10-10T15:00:00Z", bin(0.7), "Flagg's usage is way higher."],
  ["chalk_charlie", "nfl-chiefs-playoffs-2026", "2026-09-07T15:00:00Z", bin(0.75), "Chiefs always get in."],
];

const debates: [string, string, League | null, string][] = [
  ["darkhorse_dana", "Wemby is already the best defensive player I've ever watched.", "NBA", "2026-10-12T19:00:00Z"],
  ["gridiron_gabe", "The two-high safety era is over. Teams that blitz will win this year.", "NFL", "2026-10-11T19:00:00Z"],
  ["chalk_charlie", "Load management is ruining the regular season.", "NBA", "2026-10-14T19:00:00Z"],
];

export function buildSeed(): DB {
  const d: DB = {
    version: 1, users: [], questions: [], predictions: [], follows: [], blocks: [], likes: [], comments: [], votes: [],
    battles: [], groups: [], groupMembers: [], notifications: [], reports: [], appeals: [], audit: [], waitlist: [],
  };
  // Catalog questions always load; demo users/takes only outside production.
  const resolved = new Map<string, Question>();
  for (const q of CATALOG_QUESTIONS) {
    const copy = structuredClone(q);
    if (copy.status === "resolved") {
      resolved.set(copy.id, structuredClone(copy));
      Object.assign(copy, { status: "open", outcome: undefined, resolvedAt: undefined, evidence: undefined, resolvedBy: undefined });
    }
    d.questions.push(copy);
  }
  if (process.env.NODE_ENV === "production" && !process.env.GR_SEED_DEMO) {
    for (const [id, r] of resolved) Object.assign(d.questions.find((q) => q.id === id)!, r);
    return d;
  }

  const pw = hashPassword(DEMO_PASSWORD);
  const id = (u: string) => `seed-${u}`;
  for (const [key, displayName, bio, leagues, color, extra] of users) {
    const username = extra?.username ?? key;
    d.users.push({
      id: id(key), email: MARKETING ? `${username}@gamereceipts.test` : `${key}@demo.gamereceipts.dev`, username, displayName, passwordHash: pw, bio,
      avatarColor: color, favoriteLeagues: leagues, favoriteTeams: [], role: "user", plan: "free", onboarded: true,
      isCreator: false, createdAt: "2024-08-01T00:00:00.000Z", private: false, seed: true, ...extra,
    });
  }
  const pid: Record<string, string> = {};
  const all = [...resolvedPicks, ...openPicks].sort((a, b) => a[2].localeCompare(b[2]));
  for (const [u, q, at, f, text] of all) {
    const p = lockPrediction(d, id(u), { originalText: text, questionId: q, forecast: f }, new Date(at), { seed: true });
    pid[`${u}:${q}`] = p.id;
  }
  for (const [u, text, league, at] of debates) lockPrediction(d, id(u), { originalText: text, debate: { league } }, new Date(at), { seed: true });

  // Battle seeded before resolution so it resolves through the real engine.
  d.battles.push({
    id: "seed-battle-sb59", questionId: "nfl-sb-59", challengerId: id("gridiron_gabe"), opponentId: id("chalk_charlie"),
    challengerPredictionId: pid["gridiron_gabe:nfl-sb-59"], opponentPredictionId: pid["chalk_charlie:nfl-sb-59"],
    message: "Philly over KC. Loser changes their avatar.", status: "accepted", winnerId: null, createdAt: "2024-09-06T00:00:00.000Z", resolvedAt: null,
  });
  d.battles.push({
    id: "seed-battle-mvp27", questionId: "nba-mvp-2027", challengerId: id("darkhorse_dana"), opponentId: id("lockedin_larry"),
    challengerPredictionId: pid["darkhorse_dana:nba-mvp-2027"], opponentPredictionId: pid["lockedin_larry:nba-mvp-2027"],
    message: "Wemby > SGA. Receipts in May.", status: "accepted", winnerId: null, createdAt: "2026-10-06T16:00:00.000Z", resolvedAt: null,
  });

  for (const [qid, r] of resolved) {
    const q = d.questions.find((x) => x.id === qid)!;
    Object.assign(q, { status: "resolved", outcome: r.outcome, resolvedAt: r.resolvedAt, resolvedBy: "system", evidence: r.evidence });
    gradeQuestion(d, q, new Date(r.resolvedAt!));
  }

  const follow = (a: string, b: string) => d.follows.push({ followerId: id(a), followeeId: id(b), createdAt: "2026-09-01T00:00:00.000Z" });
  for (const u of ["lockedin_larry", "darkhorse_dana", "gridiron_gabe", "the_film_room"]) follow("demo", u);
  for (const [a, b] of [["lockedin_larry", "darkhorse_dana"], ["darkhorse_dana", "lockedin_larry"], ["darkhorse_dana", "demo"], ["gridiron_gabe", "demo"],
    ["chalk_charlie", "gridiron_gabe"], ["gridiron_gabe", "chalk_charlie"], ["hoopshead_hanna", "the_film_room"], ["chalk_charlie", "the_film_room"]]) follow(a, b);

  const like = (u: string, key: string) => pid[key] && d.likes.push({ userId: id(u), predictionId: pid[key], createdAt: "2026-10-15T00:00:00.000Z" });
  for (const u of ["demo", "lockedin_larry", "gridiron_gabe", "hoopshead_hanna", "the_film_room"]) like(u, "darkhorse_dana:nba-luka-traded-2025");
  for (const u of ["demo", "chalk_charlie"]) like(u, "darkhorse_dana:nba-mvp-2027");
  like("demo", "gridiron_gabe:nfl-mvp-2026");
  d.comments.push(
    { id: "seed-c1", userId: id("lockedin_larry"), predictionId: pid["darkhorse_dana:nba-luka-traded-2025"], body: "I'll never doubt you again. Maybe.", createdAt: "2025-02-02T16:00:00.000Z", hidden: false },
    { id: "seed-c2", userId: id("the_film_room"), predictionId: pid["darkhorse_dana:nba-luka-traded-2025"], body: "Reading this on the pod this week 🧾", createdAt: "2025-02-03T16:00:00.000Z", hidden: false },
    { id: "seed-c3", userId: id("lockedin_larry"), predictionId: pid["darkhorse_dana:nba-mvp-2027"], body: "Bold. Love it. Still SGA.", createdAt: "2026-10-07T16:00:00.000Z", hidden: false },
  );

  const g = { id: "seed-group-filmroom", name: "The Film Room League", slug: "the-film-room", description: "Our listeners vs. us. Lock your MVP and title picks.",
    ownerId: id("the_film_room"), inviteCode: "FILMROOM", visibility: "public" as const, isCreatorLeague: true,
    questionIds: ["nfl-mvp-2026", "nfl-sb-61", "nba-mvp-2027", "nba-champ-2027", "nba-mvp-2025", "nfl-mvp-2024", "nfl-sb-59", "nba-champ-2025"], createdAt: "2024-08-15T00:00:00.000Z" };
  d.groups.push(g);
  for (const u of ["the_film_room", "chalk_charlie", "hoopshead_hanna", "gridiron_gabe", "lockedin_larry"]) {
    d.groupMembers.push({ groupId: g.id, userId: id(u), role: u === "the_film_room" ? "owner" : "member", joinedAt: g.createdAt });
  }
  // Seed-time notifications are noise for the demo; keep only the demo user's.
  d.notifications = d.notifications.filter((n) => n.userId === id("demo"));
  return d;
}
