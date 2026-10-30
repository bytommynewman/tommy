/**
 * ODDLER — the rules.
 *
 * Open-answer trivia where only UNCOMMON correct answers score. Every prompt has
 * many right answers; the rarer yours is, the more "oddness" it earns, and
 * oddness is what grows your Oddler: an axolotl that collects horns, wings,
 * extra eyes and hats as you play.
 *
 * Pure rules, no imports, no clocks. Time arrives as `action.at`, stamped by
 * the room (see ../src/room.ts) — the client never supplies it. Randomness is a
 * seeded generator stored in state (`rng`), advanced inside applyAction.
 */

export const meta = { game: "Oddler", minPlayers: 1, maxPlayers: 2 };

export const ROUND_MS = 20_000;
/** Network slack past the clock: a late-but-honest answer still counts. */
export const GRACE_MS = 2_000;
export const CLASSIC_ROUNDS = 7;
/** Duo: ten prompts, partners alternate, one team score. */
export const DUO_ROUNDS = 10;
export const ENDLESS_STRIKES = 3;
export const MODES = ["classic", "endless", "practice", "daily", "blitz"];
/** Blitz: ten prompts, eight seconds each. */
export const BLITZ_MS = 8_000;
export const BLITZ_ROUNDS = 10;
/** Daily #1 was 2026-10-28 (UTC day number); dailies roll over at midnight UTC. */
export const DAILY_EPOCH = 20754;
export const DAY_MS = 86_400_000;
/** Max prompt ids a player may ask us to avoid (seen in earlier runs). */
export const SEEN_CAP = 600;
/** Longest display name a locker may carry. */
export const NAME_MAX = 16;
export const COLOURS = ["pink", "mint", "lav", "sand", "slate", "char"];

/** Rarity ladder. `odd` is the one-line reason shown on the reveal screen. */
export const TIERS = [
  null,
  { id: 1, name: "Plain", pts: 10, odd: "The first thing everyone thinks of." },
  { id: 2, name: "Too Clever", pts: 15, odd: "Technically right. Cheeky, but it counts." },
  { id: 3, name: "Odd-ish", pts: 30, odd: "Most people would need a second to find this." },
  { id: 4, name: "Rare", pts: 60, odd: "A real dig. Few players land here." },
  { id: 5, name: "Deep Cut", pts: 85, odd: "Properly obscure. Your Oddler approves." },
  { id: 6, name: "One in an Oddlion", pts: 100, odd: "Almost nobody says this. Peak odd." },
];

/**
 * Every collectable part, by sprite id (public/art/<id>.png). `slot` says where
 * it sits on the Oddler and how many of that slot exist; the client owns the
 * exact pixel anchors. `tier` is the lowest rarity that can earn it.
 */
export const PARTS = [
  // horn sheet — row 1 curved horns, row 2 spike ridges, row 3 tall spikes, row 4 nubs
  { id: "horn-00", slot: "horn", tier: 5 }, { id: "horn-01", slot: "horn", tier: 5 },
  { id: "horn-02", slot: "horn", tier: 5 }, { id: "horn-03", slot: "horn", tier: 5 },
  { id: "horn-04", slot: "back", tier: 5 }, { id: "horn-05", slot: "back", tier: 5 },
  { id: "horn-06", slot: "back", tier: 5 }, { id: "horn-07", slot: "back", tier: 5 },
  { id: "horn-08", slot: "horn", tier: 4 }, { id: "horn-09", slot: "horn", tier: 4 },
  { id: "horn-10", slot: "horn", tier: 4 }, { id: "horn-11", slot: "horn", tier: 4 },
  { id: "horn-12", slot: "nub", tier: 3 }, { id: "horn-13", slot: "nub", tier: 3 },
  { id: "horn-14", slot: "nub", tier: 3 }, { id: "horn-15", slot: "nub", tier: 3 },
  // wing sheet — row 1 wings, row 2 eye stalks, row 3 antennae/tentacles, row 4 novelties
  { id: "wing-00", slot: "wing", tier: 6 }, { id: "wing-01", slot: "wing", tier: 6 },
  { id: "wing-02", slot: "wing", tier: 6 }, { id: "wing-03", slot: "wing", tier: 6 },
  { id: "wing-04", slot: "eye", tier: 5 }, { id: "wing-05", slot: "eye", tier: 5 },
  { id: "wing-06", slot: "eye", tier: 5 }, { id: "wing-07", slot: "eye", tier: 5 },
  { id: "wing-08", slot: "antenna", tier: 4 }, { id: "wing-09", slot: "antenna", tier: 5 },
  { id: "wing-10", slot: "antenna", tier: 4 }, { id: "wing-11", slot: "antenna", tier: 5 },
  { id: "wing-12", slot: "hat", tier: 6 }, { id: "wing-13", slot: "back", tier: 6 },
  { id: "wing-14", slot: "hat", tier: 6 }, { id: "wing-15", slot: "hat", tier: 6 },
  // accessory sheet — level rewards, never earned mid-game (tier 0): one per level from 2
  { id: "acc-00", slot: "hat", tier: 0, level: 2 }, { id: "acc-12", slot: "neck", tier: 0, level: 3 },
  { id: "acc-04", slot: "face", tier: 0, level: 4 }, { id: "acc-08", slot: "held", tier: 0, level: 5 },
  { id: "acc-05", slot: "flower", tier: 0, level: 6 }, { id: "acc-03", slot: "hat", tier: 0, level: 8 },
  { id: "acc-14", slot: "neck", tier: 0, level: 10 }, { id: "acc-10", slot: "held", tier: 0, level: 12 },
  { id: "acc-13", slot: "pack", tier: 0, level: 14 }, { id: "acc-01", slot: "hat", tier: 0, level: 16 },
  { id: "acc-06", slot: "hat", tier: 0, level: 18 }, { id: "acc-11", slot: "held", tier: 0, level: 21 },
  { id: "acc-09", slot: "held", tier: 0, level: 24 }, { id: "acc-07", slot: "hat", tier: 0, level: 27 },
  { id: "acc-15", slot: "pack", tier: 0, level: 30 }, { id: "acc-02", slot: "hat", tier: 0, level: 34 },
];

/**
 * The question bank is assembled from every `1*-bank*.js` piece in this
 * folder (build-logic.sh concatenates them in name order). Each piece appends
 * its rows here, so an auto-generated file is just another piece.
 */
import bank_10_bank_a from "./banks/10-bank-a.js";
import bank_11_bank_b from "./banks/11-bank-b.js";
import bank_12_bank_c from "./banks/12-bank-c.js";
import bank_13_bank_d from "./banks/13-bank-d.js";
import bank_14_bank_auto_20261028_03 from "./banks/14-bank-auto-20261028-03.js";
import bank_14_bank_auto_20261028_17 from "./banks/14-bank-auto-20261028-17.js";
import bank_14_bank_auto_20261029_13 from "./banks/14-bank-auto-20261029-13.js";
import bank_15_bank_e from "./banks/15-bank-e.js";
import bank_16_bank_f from "./banks/16-bank-f.js";
export const BANKS = [].concat(bank_10_bank_a, bank_11_bank_b, bank_12_bank_c, bank_13_bank_d, bank_14_bank_auto_20261028_03, bank_14_bank_auto_20261028_17, bank_14_bank_auto_20261029_13, bank_15_bank_e, bank_16_bank_f);

/**
 * Name banners: the plate behind a player's name. Unlocked by level, picked in
 * the locker. The client owns the look (index.html .nameplate.b-<id>).
 */
/** Levels run 1–MAX_LEVEL in bands of five; each band unlocks the next name banner. */
export const MAX_LEVEL = 50;
export const BAND = 5;
export const BANNERS = [
  { id: "plain", name: "Plain", level: 1 },
  { id: "lime", name: "Lime Edge", level: 6 },
  { id: "stripe", name: "Hazard Stripe", level: 11 },
  { id: "ember", name: "Ember", level: 16 },
  { id: "storm", name: "Storm", level: 21 },
  { id: "neon", name: "Neon", level: 26 },
  { id: "holo", name: "Holo", level: 31 },
  { id: "legend", name: "Legend", level: 36 },
  { id: "void", name: "Void", level: 41 },
  { id: "oddlion", name: "Oddlion", level: 46 },
];

/** How many of each slot an Oddler can carry. */
export const SLOT_CAP = {
  horn: 3, back: 1, nub: 2, wing: 2, eye: 2, antenna: 1,
  hat: 1, face: 1, flower: 1, held: 1, neck: 1, pack: 1,
};

// ── bank parsing ───────────────────────────────────────────────────────────

/** Lowercase, strip accents/punctuation/articles, collapse whitespace. */
export function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an) /, "")
    .replace(/^(mount|mt) /, "")
    .replace(/\b(saint|st) /g, "st ")
    .trim();
}

/** The same string with spaces removed: "ice cream" and "icecream" are one answer. */
function compact(key) { return key.replace(/ /g, ""); }

/**
 * Singular/plural spellings of a normalized key that should count as the same
 * word, likeliest first. Nothing shorter than three letters is pluralized:
 * "u" is not "US" and "ies" is not "I".
 */
function numberForms(key) {
  const out = new Set();
  if (key.length < 3) return [];
  if (key.endsWith("ies")) out.add(key.slice(0, -3) + "y");
  if (key.endsWith("es")) out.add(key.slice(0, -2));
  if (key.endsWith("s")) out.add(key.slice(0, -1));
  out.add(key + "s");
  if (key.endsWith("y")) out.add(key.slice(0, -1) + "ies");
  if (/(s|x|z|ch|sh)$/.test(key)) out.add(key + "es");
  // wolves/wolf, knives/knife, calves/calf
  if (key.endsWith("ves")) { out.add(key.slice(0, -3) + "f"); out.add(key.slice(0, -3) + "fe"); }
  if (/fe?$/.test(key)) out.add(key.replace(/fe?$/, "ves"));
  out.delete(key);
  return [...out].filter((f) => f.length >= 2);
}

/** The digits of a key, in order: "big hero 6" → "6". Digits are never typos. */
function digitsOf(key) { return key.replace(/\D/g, ""); }

function parseAnswers(spec) {
  const seen = new Set();
  const out = [];
  for (const entry of spec.split("|")) {
    const colon = entry.lastIndexOf(":");
    if (colon < 0) continue;
    const tier = Number(entry.slice(colon + 1));
    const names = entry.slice(0, colon).split("=").map((s) => s.trim()).filter(Boolean);
    if (!names.length || !(tier >= 1 && tier <= 6)) continue;
    const keys = [];
    for (const n of names) {
      const k = normalize(n);
      if (k && !seen.has(k)) { seen.add(k); keys.push(k); }
    }
    if (!keys.length) continue;
    out.push({ name: names[0], tier, keys });
  }
  return out;
}

/** The parsed bank: one object per prompt, answers with normalized keys. */
/**
 * Bank authors tag prompts finely; players pick from broader groups so no
 * pick runs dry after a game or two. Anything not listed keeps its own name.
 */
export const CATEGORY_GROUPS = {
  Space: "Science", Body: "Science", Tech: "Science",
  Mythology: "History",
  Games: "Things", Everyday: "Things",
};
/** A category must hold at least this many prompts before it is offered as a pick. */
export const CATEGORY_MIN = 20;

export const QUESTIONS = BANKS.map(([id, category, prompt, spec, core]) => ({
  id, category: CATEGORY_GROUPS[category] ?? category, prompt, answers: parseAnswers(spec), core: Boolean(core),
}));

const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
/** The hand-written prompts: a stable pool, so a daily or a challenge code means the same 7 prompts for everyone. */
const CORE = QUESTIONS.filter((q) => q.core).map((q) => q.id).sort();

// ── matching ───────────────────────────────────────────────────────────────

/** Damerau–Levenshtein (adjacent transpositions count as one edit). */
function editDistance(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[m][n];
}

/** How many typos we forgive for a key of this length. */
function tolerance(len) {
  if (len >= 10) return 2;
  if (len >= 5) return 1;
  return 0;
}

/**
 * Find the accepted answer a typed string refers to. Exact (normalized) match
 * first; otherwise the closest key within typo tolerance, and only when that
 * closest key is unambiguous.
 */
export function matchAnswer(question, text) {
  const key = normalize(text);
  if (!key) return null;
  for (const a of question.answers) if (a.keys.includes(key)) return { answer: a, exact: true };
  // Spacing and number: "newzealand", "ice-cream", "ribs" for "rib".
  const ckey = compact(key);
  for (const a of question.answers) if (a.keys.some((k) => compact(k) === ckey)) return { answer: a, exact: true };
  // Likeliest form first, so "caves" is Cave before it is Cafe.
  for (const f of numberForms(key)) for (const a of question.answers) if (a.keys.includes(f)) return { answer: a, exact: true };
  let best = null, bestDist = Infinity, tie = false;
  const digits = digitsOf(key);
  for (const a of question.answers) {
    for (const k of a.keys) {
      const limit = Math.min(tolerance(k.length), tolerance(key.length));
      if (!limit || Math.abs(k.length - key.length) > limit) continue;
      // "Big Hero 7" is not a typo of "Big Hero 6".
      if (digitsOf(k) !== digits) continue;
      const dist = editDistance(key, k);
      if (dist > limit) continue;
      if (key.length < 8 && key[0] !== k[0]) continue;
      if (dist < bestDist) { best = a; bestDist = dist; tie = false; }
      else if (dist === bestDist && best !== a) tie = true;
    }
  }
  if (!best || tie) return null;
  // "dominican" is a word of "dominican republic", not a typo of "dominica": ambiguous, so ask for more.
  if (question.answers.some((a) => a !== best && a.keys.some((k) => k.startsWith(key + " ")))) return null;
  return { answer: best, exact: false };
}

// ── seeded randomness (mulberry32) ─────────────────────────────────────────

function nextRand(seed) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { seed: t, value: ((r ^ (r >>> 14)) >>> 0) / 4294967296 };
}

/** Pick one element; returns [element, nextSeed]. */
function pick(seed, list) {
  const { seed: s, value } = nextRand(seed);
  return [list[Math.floor(value * list.length)], s];
}

/** Fisher–Yates with the seeded generator: the same seed always gives the same order. */
function shuffle(seed, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRand(seed); seed = r.seed;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 32-bit FNV-1a of a string, for turning a challenge code or a day into a seed. */
function hashCode(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0) || 1;
}

export function dayOf(at) { return Math.floor(at / DAY_MS); }

/**
 * Today's seven. The core pool is dealt in rounds so a prompt cannot come
 * back until every other core prompt has had its day.
 */
export function dailyPrompts(day) {
  const per = CLASSIC_ROUNDS, cycle = Math.max(1, Math.floor(CORE.length / per));
  const deck = shuffle(hashCode("daily:" + Math.floor(day / cycle)), CORE);
  const start = (((day % cycle) + cycle) % cycle) * per;
  return deck.slice(start, start + per);
}

/** A challenge code's seven prompts: same code, same prompts, for anyone. */
export function challengePrompts(code) {
  return shuffle(hashCode("challenge:" + code), CORE).slice(0, CLASSIC_ROUNDS);
}
const CHALLENGE_RE = /^[a-z0-9]{4,12}$/;

// ── parts ──────────────────────────────────────────────────────────────────

function countSlot(parts, slot) {
  return parts.filter((p) => p.slot === slot).length;
}

/** The part a tier earns, if any slot can still take one. [part|null, seed] */
function earnPart(seed, tier, owned) {
  if (tier < 3) return [null, seed];
  const have = new Set(owned.map((p) => p.id));
  const free = (p) => !have.has(p.id) && countSlot(owned, p.slot) < SLOT_CAP[p.slot];
  // Prefer the earned tier, then step down so a late Plain-only run still grows.
  for (let t = tier; t >= 3; t--) {
    const pool = PARTS.filter((p) => p.tier === t && p.level === undefined && free(p));
    if (pool.length) {
      const [part, s] = pick(seed, pool);
      return [{ id: part.id, slot: part.slot }, s];
    }
  }
  return [null, seed];
}

// ── state ──────────────────────────────────────────────────────────────────

/**
 * One state shape serves both kinds of room:
 *   solo — the room is named after the player; `parts` grow on `colour`.
 *   duo  — a code-named room seats two; each has a profile with its own
 *          creature, and `score` is the team total.
 */
export function setup(players) {
  return {
    kind: "solo",
    player: players[0],   // solo: the player; duo: the host
    players: [],          // duo seats, in join order (host first)
    profiles: {},         // duo: id → { name, colour, parts, earned, pts }
    name: "",             // solo: the player's locker name
    banner: "plain",      // solo: the player's name banner
    notice: null,         // duo-lobby: "<name> quit the game", shown once
    earned: [],           // solo: parts earned this game (a locker credits these)
    games: 0,             // duo games started (alternates who goes first)
    phase: "lobby",       // lobby → ask → reveal → … → done   (duo: duo-lobby first)
    mode: null,
    colour: "pink",
    seed: 1,
    category: null,       // classic/blitz/endless: only deal prompts from this category
    fixed: null,          // daily/challenge: the exact prompt ids to deal, in order
    day: null,            // daily: UTC day number
    challenge: null,      // challenge code this game was dealt from
    dailyDone: null,      // the last daily day this room finished (kept across games)
    used: [],
    seen: [],             // prompt ids this player met in earlier runs (sent with `start`)
    round: null,
    history: [],          // finished rounds: { q, prompt, answer, typed, tier, pts, part, timedOut, by }
    score: 0,
    strikes: 0,
    parts: [],
  };
}

function roundLimit(state) {
  if (state.kind === "duo") return DUO_ROUNDS;
  if (state.mode === "endless") return Infinity;
  return state.mode === "blitz" ? BLITZ_ROUNDS : CLASSIC_ROUNDS;
}

/** How long a round's clock runs in this mode (null: no clock). */
function roundMsFor(state) {
  if (state.mode === "practice") return null;
  return state.mode === "blitz" ? BLITZ_MS : ROUND_MS;
}

/** The categories offered in the lobby: only those deep enough (CATEGORY_MIN prompts) to avoid repeats. */
export const CATEGORIES = [...new Set(QUESTIONS.map((q) => q.category))]
  .filter((c) => QUESTIONS.filter((q) => q.category === c).length >= CATEGORY_MIN)
  .sort();

function partsOf(state, id) {
  return state.kind === "duo" ? state.profiles[id].parts : state.parts;
}

function deadline(state) {
  return state.round.startedAt + (roundMsFor(state) ?? 0) + GRACE_MS;
}

function timedOut(state, at) {
  return state.mode !== "practice" && at > deadline(state);
}

/** Whose turn the n-th round (0-based) of this duo game is. */
function turnFor(state, n) {
  return state.players[(state.games + n) % 2];
}

function freshRound(state, at) {
  if (state.fixed) {
    const id = state.fixed[state.history.length];
    const q = id ? BY_ID[id] : null;
    if (!q) return null;
    return {
      ...state, used: [...state.used, q.id], phase: "ask",
      round: { q: q.id, startedAt: at, tries: [], ended: null, turn: state.player, typing: "" },
    };
  }
  const pool = state.category ? QUESTIONS.filter((q) => q.category === state.category) : QUESTIONS;
  let unused = pool.filter((q) => !state.used.includes(q.id) && !state.seen.includes(q.id));
  // Everything already seen: better a repeat than no prompt.
  if (!unused.length) unused = pool.filter((q) => !state.used.includes(q.id));
  if (!unused.length) return null;
  const [q, seed] = pick(state.seed, unused);
  const turn = state.kind === "duo" ? turnFor(state, state.history.length) : state.player;
  return {
    ...state,
    seed,
    used: [...state.used, q.id],
    phase: "ask",
    round: { q: q.id, startedAt: at, tries: [], ended: null, turn, typing: "" },
  };
}

const ACTIONS = new Set(["start", "answer", "skip", "next", "restart", "sit", "colour", "typing"]);

/**
 * Rooms persist their state on the server, so a room created by an older
 * version of these rules can arrive without the fields later versions added.
 * Fill the gaps before reading anything; a fresh state passes straight through.
 */
function migrate(state) {
  if (!state || typeof state !== "object") return setup(["?"]);
  // A prompt retired from the bank since this room saved it cannot be graded: the game ends instead of crashing.
  if (state.round && state.phase === "ask" && !BY_ID[state.round.q]) state = { ...state, round: null, phase: "done" };
  const fresh = state.kind !== undefined && Array.isArray(state.players) && state.profiles && Array.isArray(state.seen)
    && Number.isInteger(state.games) && (!state.round || state.round.turn !== undefined);
  if (fresh) return state;
  const s = { kind: "solo", players: [], profiles: {}, games: 0, seen: [], name: "", banner: "plain", notice: null, earned: [], ...state };
  if (!Array.isArray(s.used)) s.used = [];
  if (!Array.isArray(s.history)) s.history = [];
  if (!Array.isArray(s.parts)) s.parts = [];
  if (typeof s.score !== "number") s.score = 0;
  if (typeof s.strikes !== "number") s.strikes = 0;
  if (s.round && s.round.turn === undefined) s.round = { ...s.round, turn: s.player, typing: "" };
  return s;
}

export function validateAction(state, playerId, action) {
  state = migrate(state);
  if (!action || typeof action !== "object") return { ok: false, error: "action must be an object" };
  if (!ACTIONS.has(action.kind)) return { ok: false, error: "unknown action" };
  if (!Number.isFinite(action.at)) return { ok: false, error: "missing clock" };
  const { kind } = action;
  const duo = state.kind === "duo";
  const seated = duo ? state.players.includes(playerId) : playerId === state.player;

  // Taking a seat in a shared room is the one thing an unseated player may do.
  if (kind === "sit") {
    if (duo && state.players.includes(playerId)) return { ok: false, error: "already seated" };
    if (!duo && state.phase !== "lobby") return { ok: false, error: "room is mid-game" };
    if (duo && state.players.length >= 2) return { ok: false, error: "room is full" };
    if (duo && state.phase !== "duo-lobby") return { ok: false, error: "room is mid-game" };
    if (action.colour !== undefined && !COLOURS.includes(action.colour)) return { ok: false, error: "unknown colour" };
    if (action.name !== undefined && typeof action.name !== "string") return { ok: false, error: "bad name" };
    if (action.banner !== undefined && typeof action.banner !== "string") return { ok: false, error: "bad banner" };
    return { ok: true };
  }
  if (!seated) return { ok: false, error: duo ? "you are watching this room" : "not your Oddler" };

  if (kind === "colour") {
    if (!COLOURS.includes(action.colour)) return { ok: false, error: "unknown colour" };
    if (!["lobby", "duo-lobby", "done"].includes(state.phase)) return { ok: false, error: "finish the round first" };
    return { ok: true };
  }
  if (kind === "start") {
    if (!["lobby", "duo-lobby", "done"].includes(state.phase)) return { ok: false, error: "already playing" };
    if (duo) {
      if (playerId !== state.players[0]) return { ok: false, error: "only the host can start" };
      if (state.players.length < 2) return { ok: false, error: "waiting for your partner" };
      if (action.mode !== "duo") return { ok: false, error: "this room plays Duo" };
    } else {
      if (!MODES.includes(action.mode)) return { ok: false, error: "unknown mode" };
      if (action.mode === "daily" && state.dailyDone === dayOf(action.at)) return { ok: false, error: "you have played today's daily — back tomorrow" };
    }
    if (action.category !== undefined && action.category !== null) {
      if (duo || !["classic", "blitz", "endless", "practice"].includes(action.mode)) return { ok: false, error: "no category picks in this mode" };
      if (!CATEGORIES.includes(action.category)) return { ok: false, error: "unknown category" };
    }
    if (action.challenge !== undefined) {
      if (duo || action.mode !== "classic") return { ok: false, error: "challenges are Classic, solo" };
      if (typeof action.challenge !== "string" || !CHALLENGE_RE.test(action.challenge)) return { ok: false, error: "bad challenge code" };
    }
    if (action.colour !== undefined && !COLOURS.includes(action.colour)) return { ok: false, error: "unknown colour" };
    for (const k of ["names", "loadouts", "colours", "banners"]) {
      if (action[k] !== undefined && (typeof action[k] !== "object" || action[k] === null || Array.isArray(action[k]))) return { ok: false, error: "bad " + k };
    }
    if (action.seen !== undefined) {
      if (!Array.isArray(action.seen) || action.seen.length > SEEN_CAP) return { ok: false, error: "bad seen list" };
      if (!action.seen.every((id) => typeof id === "string" && id.length <= 48)) return { ok: false, error: "bad seen list" };
    }
    return { ok: true };
  }
  if (kind === "restart") return { ok: true };
  if (kind === "typing") {
    if (state.phase !== "ask") return { ok: false, error: "no prompt open" };
    if (state.round.turn !== playerId) return { ok: false, error: "not your turn" };
    if (typeof action.text !== "string" || action.text.length > 80) return { ok: false, error: "bad text" };
    return { ok: true };
  }
  if (kind === "answer") {
    if (state.phase !== "ask") return { ok: false, error: "no prompt open" };
    if (state.round.turn !== playerId) return { ok: false, error: "not your turn" };
    if (typeof action.text !== "string" || !normalize(action.text)) return { ok: false, error: "type an answer" };
    if (action.text.length > 80) return { ok: false, error: "answer too long" };
    return { ok: true };
  }
  if (kind === "skip") {
    if (state.phase !== "ask") return { ok: false, error: "no prompt open" };
    // A partner may only close a round the clock has already closed.
    if (state.round.turn !== playerId && !timedOut(state, action.at)) return { ok: false, error: "not your turn" };
    return { ok: true };
  }
  // next
  return state.phase === "reveal" ? { ok: true } : { ok: false, error: "nothing to continue" };
}

/** Close the open round with a result and move to the reveal screen. */
function endRound(state, result) {
  const q = BY_ID[state.round.q];
  const by = state.round.turn;
  const tier = result.answer ? result.answer.tier : 0;
  const pts = tier ? TIERS[tier].pts : 0;
  let seed = state.seed, part = null;
  let owned = partsOf(state, by);
  if (tier) {
    const earned = earnPart(seed, tier, owned);
    part = earned[0]; seed = earned[1];
    if (part) owned = [...owned, part];
  }
  const entry = {
    q: q.id, prompt: q.prompt, answer: result.answer ? result.answer.name : null,
    typed: result.typed ?? null, tier, pts, part, timedOut: Boolean(result.timedOut), by,
  };
  const next = {
    ...state,
    seed,
    score: state.score + pts,
    strikes: state.strikes + (tier ? 0 : 1),
    history: [...state.history, entry],
    round: { ...state.round, ended: entry, typing: "" },
    phase: "reveal",
  };
  if (state.kind === "duo") {
    const p = state.profiles[by];
    next.profiles = { ...state.profiles, [by]: { ...p, parts: owned, pts: p.pts + pts, earned: part ? [...(p.earned ?? []), part.id] : (p.earned ?? []) } };
  } else {
    next.parts = owned;
    next.earned = part ? [...(state.earned ?? []), part.id] : (state.earned ?? []);
  }
  return next;
}

/** A clean slate for the same room: seats, colours and game count survive. */
function resetKeepingSeats(state, seed) {
  const base = setup([state.player]);
  const profiles = {};
  for (const id of state.players) profiles[id] = { ...state.profiles[id], parts: [], earned: [], pts: 0 };
  return {
    ...base, kind: state.kind, players: state.players, profiles, games: state.games,
    colour: state.colour, name: state.name, banner: state.banner, seed, phase: state.kind === "duo" ? "duo-lobby" : "lobby",
    dailyDone: state.dailyDone ?? null,
  };
}

function cleanBanner(raw) {
  return BANNERS.some((b) => b.id === raw) ? raw : "plain";
}

function cleanName(raw) {
  return typeof raw === "string" ? raw.replace(/[^\p{L}\p{N} _.'-]/gu, "").replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "";
}

/** The parts a locker says to wear: known ids only, within slot caps. */
function wearable(ids) {
  if (!Array.isArray(ids)) return [];
  const out = [];
  const used = {};
  for (const id of ids) {
    const part = PARTS.find((p) => p.id === id);
    if (!part || out.some((o) => o.id === id)) continue;
    const n = used[part.slot] ?? 0;
    if (n >= SLOT_CAP[part.slot]) continue;
    used[part.slot] = n + 1;
    out.push({ id: part.id, slot: part.slot });
  }
  return out;
}

export function applyAction(state, playerId, action) {
  state = migrate(state);
  const at = action.at;
  switch (action.kind) {
    case "sit": {
      const colour = action.colour ?? "pink";
      const players = [...state.players, playerId];
      return {
        ...state, kind: "duo", phase: "duo-lobby", players,
        profiles: { ...state.profiles, [playerId]: { name: cleanName(action.name), banner: cleanBanner(action.banner), colour, parts: [], earned: [], pts: 0 } },
      };
    }
    case "colour":
      if (state.kind === "duo") {
        return { ...state, profiles: { ...state.profiles, [playerId]: { ...state.profiles[playerId], colour: action.colour } } };
      }
      return { ...state, colour: action.colour };
    case "restart": {
      const next = resetKeepingSeats(state, (at >>> 0) || 1);
      // Quitting mid-game: tell the room who walked, once.
      if (action.quit && state.kind === "duo" && state.phase !== "duo-lobby") {
        const who = state.profiles[playerId]?.name || "Your partner";
        next.notice = { by: playerId, text: `${who} quit the game` };
      }
      return next;
    }
    case "start": {
      const seed = ((at ^ (action.seed | 0)) >>> 0) || 1;
      const base = { ...resetKeepingSeats(state, seed), mode: action.mode, seen: Array.isArray(action.seen) ? action.seen : [] };
      if (action.category && !action.challenge) base.category = action.category;
      if (action.mode === "daily") { base.day = dayOf(at); base.fixed = dailyPrompts(base.day); }
      else if (action.challenge) { base.challenge = action.challenge; base.fixed = challengePrompts(action.challenge); }
      const names = action.names ?? {}, loadouts = action.loadouts ?? {}, colours = action.colours ?? {}, banners = action.banners ?? {};
      if (state.kind === "duo") {
        base.games = state.games + (state.phase === "done" ? 1 : 0);
        for (const id of base.players) {
          const p = base.profiles[id];
          base.profiles[id] = {
            ...p,
            name: names[id] !== undefined ? cleanName(names[id]) : p.name,
            banner: banners[id] !== undefined ? cleanBanner(banners[id]) : (p.banner ?? "plain"),
            colour: COLOURS.includes(colours[id]) ? colours[id] : p.colour,
            parts: wearable(loadouts[id]),
          };
        }
      } else {
        if (action.colour) base.colour = action.colour;
        else if (COLOURS.includes(colours[state.player])) base.colour = colours[state.player];
        if (names[state.player] !== undefined) base.name = cleanName(names[state.player]);
        if (banners[state.player] !== undefined) base.banner = cleanBanner(banners[state.player]);
        base.parts = wearable(loadouts[state.player]);
      }
      return freshRound(base, at) ?? { ...base, phase: "done" };
    }
    case "typing":
      return { ...state, round: { ...state.round, typing: action.text } };
    case "skip":
      // A client that hit zero says so; the server's own clock also counts.
      return endRound(state, { answer: null, timedOut: timedOut(state, at) || action.timeout === true });
    case "answer": {
      if (timedOut(state, at)) return endRound(state, { answer: null, typed: action.text, timedOut: true });
      const hit = matchAnswer(BY_ID[state.round.q], action.text);
      if (!hit) {
        // Not on the list: the player keeps the clock and may try again.
        const tries = [...state.round.tries, action.text.trim()].slice(-8);
        return { ...state, round: { ...state.round, tries, typing: "" } };
      }
      return endRound(state, { answer: hit.answer, typed: action.text.trim() });
    }
    case "next": {
      const finished = state.history.length;
      if (finished >= roundLimit(state)) return { ...state, phase: "done", round: null, dailyDone: state.mode === "daily" ? state.day : state.dailyDone ?? null };
      if (state.mode === "endless" && state.strikes >= ENDLESS_STRIKES) return { ...state, phase: "done", round: null };
      return freshRound(state, at) ?? { ...state, phase: "done", round: null };
    }
  }
  return state;
}

/** A room never "ends": Play Again is a `start` and the lobby is a `restart`. */
export function isGameOver() {
  return { over: false };
}

/** Odder-than-yours examples for the reveal: two rarer answers, rarest last. */
function odderPicks(q, tier) {
  const rarer = q.answers.filter((a) => a.tier > tier && a.tier >= 4);
  if (!rarer.length) return [];
  const sorted = [...rarer].sort((a, b) => a.tier - b.tier);
  const picks = [sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]];
  return [...new Set(picks)].map((a) => ({ name: a.name, tier: a.tier }));
}

export function viewFor(state, playerId) {
  state = migrate(state);
  // A prompt retired from the bank since this room saved it: close the round.
  const q = state.round && BY_ID[state.round.q] ? BY_ID[state.round.q] : null;
  const duo = state.kind === "duo";
  const view = {
    phase: state.phase,
    kind: state.kind,
    mode: state.mode,
    day: state.day ?? null,
    challenge: state.challenge ?? null,
    dailyDone: state.dailyDone ?? null,
    colour: state.colour,
    name: state.name,
    banner: state.banner,
    notice: state.notice,
    earned: state.earned,
    score: state.score,
    strikes: state.strikes,
    parts: state.parts,
    history: state.history,
    roundNo: state.history.length + (state.phase === "ask" ? 1 : 0),
    totalRounds: duo ? DUO_ROUNDS : roundLimit(state) === Infinity ? null : roundLimit(state),
    category: state.category ?? null,
    categories: CATEGORIES,
    tiers: TIERS,
    roundMs: roundMsFor(state),
    round: null,
    duo: null,
  };
  if (duo) {
    view.duo = {
      host: state.players[0],
      you: playerId,
      seated: state.players.includes(playerId),
      games: state.games,
      players: state.players.map((id) => ({
        id, name: "", banner: "plain", earned: [], ...state.profiles[id], isYou: id === playerId,
        isTurn: Boolean(state.round && state.phase === "ask" && state.round.turn === id),
      })),
    };
  }
  if (q && state.phase === "ask") {
    const yourTurn = state.round.turn === playerId;
    // The answer list stays server-side while the clock runs.
    view.round = {
      prompt: q.prompt, category: q.category, startedAt: state.round.startedAt,
      tries: state.round.tries, answerCount: q.answers.length,
      turn: state.round.turn, yourTurn,
      // Live keystrokes are only interesting to the one who is NOT typing.
      typing: yourTurn ? null : state.round.typing,
    };
  } else if (q && state.phase === "reveal") {
    const e = state.round.ended;
    view.round = {
      prompt: q.prompt, category: q.category, ended: e, turn: e.by, yourTurn: e.by === playerId,
      reason: e.tier ? TIERS[e.tier].odd : (e.timedOut ? "Out of time." : "Skipped."),
      odder: odderPicks(q, e.tier),
    };
  }
  return view;
}
