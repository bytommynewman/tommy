
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
    .trim();
}

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
export const QUESTIONS = BANKS.map(([id, category, prompt, spec]) => ({
  id, category, prompt, answers: parseAnswers(spec),
}));

const BY_ID = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));

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
  let best = null, bestDist = Infinity, tie = false;
  for (const a of question.answers) {
    for (const k of a.keys) {
      const limit = Math.min(tolerance(k.length), tolerance(key.length));
      if (!limit || Math.abs(k.length - key.length) > limit) continue;
      const dist = editDistance(key, k);
      if (dist > limit) continue;
      if (dist < bestDist) { best = a; bestDist = dist; tie = false; }
      else if (dist === bestDist && best !== a) tie = true;
    }
  }
  return best && !tie ? { answer: best, exact: false } : null;
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
    const pool = PARTS.filter((p) => p.tier === t && free(p));
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
    profiles: {},         // duo: id → { colour, parts, pts }
    games: 0,             // duo games started (alternates who goes first)
    phase: "lobby",       // lobby → ask → reveal → … → done   (duo: duo-lobby first)
    mode: null,
    colour: "pink",
    seed: 1,
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
  return state.mode === "endless" ? Infinity : CLASSIC_ROUNDS;
}

function partsOf(state, id) {
  return state.kind === "duo" ? state.profiles[id].parts : state.parts;
}

function deadline(state) {
  return state.round.startedAt + ROUND_MS + GRACE_MS;
}

function timedOut(state, at) {
  return state.mode !== "practice" && at > deadline(state);
}

/** Whose turn the n-th round (0-based) of this duo game is. */
function turnFor(state, n) {
  return state.players[(state.games + n) % 2];
}

function freshRound(state, at) {
  let unused = QUESTIONS.filter((q) => !state.used.includes(q.id) && !state.seen.includes(q.id));
  // Everything already seen: better a repeat than no prompt.
  if (!unused.length) unused = QUESTIONS.filter((q) => !state.used.includes(q.id));
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

export function validateAction(state, playerId, action) {
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
    }
    if (action.colour !== undefined && !COLOURS.includes(action.colour)) return { ok: false, error: "unknown colour" };
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
    next.profiles = { ...state.profiles, [by]: { ...p, parts: owned, pts: p.pts + pts } };
  } else {
    next.parts = owned;
  }
  return next;
}

/** A clean slate for the same room: seats, colours and game count survive. */
function resetKeepingSeats(state, seed) {
  const base = setup([state.player]);
  const profiles = {};
  for (const id of state.players) profiles[id] = { ...state.profiles[id], parts: [], pts: 0 };
  return {
    ...base, kind: state.kind, players: state.players, profiles, games: state.games,
    colour: state.colour, seed, phase: state.kind === "duo" ? "duo-lobby" : "lobby",
  };
}

export function applyAction(state, playerId, action) {
  const at = action.at;
  switch (action.kind) {
    case "sit": {
      const colour = action.colour ?? "pink";
      const players = [...state.players, playerId];
      return {
        ...state, kind: "duo", phase: "duo-lobby", players,
        profiles: { ...state.profiles, [playerId]: { colour, parts: [], pts: 0 } },
      };
    }
    case "colour":
      if (state.kind === "duo") {
        return { ...state, profiles: { ...state.profiles, [playerId]: { ...state.profiles[playerId], colour: action.colour } } };
      }
      return { ...state, colour: action.colour };
    case "restart":
      return resetKeepingSeats(state, (at >>> 0) || 1);
    case "start": {
      const seed = ((at ^ (action.seed | 0)) >>> 0) || 1;
      const base = { ...resetKeepingSeats(state, seed), mode: action.mode, seen: Array.isArray(action.seen) ? action.seen : [] };
      if (state.kind === "duo") base.games = state.games + (state.phase === "done" ? 1 : 0);
      else if (action.colour) base.colour = action.colour;
      return freshRound(base, at) ?? { ...base, phase: "done" };
    }
    case "typing":
      return { ...state, round: { ...state.round, typing: action.text } };
    case "skip":
      return endRound(state, { answer: null, timedOut: timedOut(state, at) });
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
      if (finished >= roundLimit(state)) return { ...state, phase: "done", round: null };
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
  const q = state.round ? BY_ID[state.round.q] : null;
  const duo = state.kind === "duo";
  const view = {
    phase: state.phase,
    kind: state.kind,
    mode: state.mode,
    colour: state.colour,
    score: state.score,
    strikes: state.strikes,
    parts: state.parts,
    history: state.history,
    roundNo: state.history.length + (state.phase === "ask" ? 1 : 0),
    totalRounds: duo ? DUO_ROUNDS : state.mode === "endless" ? null : CLASSIC_ROUNDS,
    tiers: TIERS,
    roundMs: state.mode === "practice" ? null : ROUND_MS,
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
        id, ...state.profiles[id], isYou: id === playerId,
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
