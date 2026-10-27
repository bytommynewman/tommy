
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
export const QUESTIONS = [...BANK_A, ...BANK_B].map(([id, category, prompt, spec]) => ({
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

// ── state ──────────────────────────────────────────────────────────────────

function roundLimit(mode) {
  return mode === "endless" ? Infinity : CLASSIC_ROUNDS;
}

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

function freshRound(state, at) {
  const unused = QUESTIONS.filter((q) => !state.used.includes(q.id));
  if (!unused.length) return null;
  const [q, seed] = pick(state.seed, unused);
  return {
    ...state,
    seed,
    used: [...state.used, q.id],
    phase: "ask",
    round: { q: q.id, startedAt: at, tries: [], ended: null },
  };
}

export function setup(players) {
  return {
    player: players[0],
    phase: "lobby",       // lobby → ask → reveal → … → done
    mode: null,
    colour: "pink",
    seed: 1,
    used: [],
    round: null,
    history: [],          // finished rounds: { q, answer, tier, pts, part, timedOut }
    score: 0,
    strikes: 0,
    parts: [],
  };
}

const ACTIONS = new Set(["start", "answer", "skip", "next", "restart"]);

export function validateAction(state, playerId, action) {
  if (playerId !== state.player) return { ok: false, error: "not your Oddler" };
  if (!action || typeof action !== "object") return { ok: false, error: "action must be an object" };
  if (!ACTIONS.has(action.kind)) return { ok: false, error: "unknown action" };
  if (!Number.isFinite(action.at)) return { ok: false, error: "missing clock" };
  const { kind } = action;
  if (kind === "start") {
    if (state.phase !== "lobby" && state.phase !== "done") return { ok: false, error: "already playing" };
    if (!MODES.includes(action.mode)) return { ok: false, error: "unknown mode" };
    if (action.colour !== undefined && !COLOURS.includes(action.colour)) return { ok: false, error: "unknown colour" };
    return { ok: true };
  }
  if (kind === "restart") return { ok: true };
  if (kind === "answer") {
    if (state.phase !== "ask") return { ok: false, error: "no prompt open" };
    if (typeof action.text !== "string" || !normalize(action.text)) return { ok: false, error: "type an answer" };
    if (action.text.length > 80) return { ok: false, error: "answer too long" };
    return { ok: true };
  }
  if (kind === "skip") return state.phase === "ask" ? { ok: true } : { ok: false, error: "no prompt open" };
  // next
  return state.phase === "reveal" ? { ok: true } : { ok: false, error: "nothing to continue" };
}

function timedOut(state, at) {
  return state.mode !== "practice" && at > state.round.startedAt + ROUND_MS + GRACE_MS;
}

/** Close the open round with a result and move to the reveal screen. */
function endRound(state, result) {
  const q = BY_ID[state.round.q];
  const tier = result.answer ? result.answer.tier : 0;
  const pts = tier ? TIERS[tier].pts : 0;
  let parts = state.parts, seed = state.seed, part = null;
  if (tier) {
    const earned = earnPart(seed, tier, parts);
    part = earned[0]; seed = earned[1];
    if (part) parts = [...parts, part];
  }
  const entry = {
    q: q.id, prompt: q.prompt, answer: result.answer ? result.answer.name : null,
    typed: result.typed ?? null, tier, pts, part, timedOut: Boolean(result.timedOut),
  };
  return {
    ...state,
    seed, parts,
    score: state.score + pts,
    strikes: state.strikes + (tier ? 0 : 1),
    history: [...state.history, entry],
    round: { ...state.round, ended: entry },
    phase: "reveal",
  };
}

export function applyAction(state, playerId, action) {
  const at = action.at;
  switch (action.kind) {
    case "restart":
      return { ...setup([state.player]), colour: state.colour, seed: (at >>> 0) || 1 };
    case "start": {
      const base = {
        ...setup([state.player]),
        mode: action.mode,
        colour: action.colour ?? state.colour,
        seed: ((at ^ (action.seed | 0)) >>> 0) || 1,
      };
      return freshRound(base, at) ?? { ...base, phase: "done" };
    }
    case "skip":
      return endRound(state, { answer: null, timedOut: timedOut(state, at) });
    case "answer": {
      if (timedOut(state, at)) return endRound(state, { answer: null, typed: action.text, timedOut: true });
      const hit = matchAnswer(BY_ID[state.round.q], action.text);
      if (!hit) {
        // Not on the list: the player keeps the clock and may try again.
        const tries = [...state.round.tries, action.text.trim()].slice(-8);
        return { ...state, round: { ...state.round, tries } };
      }
      return endRound(state, { answer: hit.answer, typed: action.text.trim() });
    }
    case "next": {
      const finished = state.history.length;
      if (finished >= roundLimit(state.mode)) return { ...state, phase: "done", round: null };
      if (state.mode === "endless" && state.strikes >= ENDLESS_STRIKES) return { ...state, phase: "done", round: null };
      return freshRound(state, at) ?? { ...state, phase: "done", round: null };
    }
  }
  return state;
}

/** A single-player run never "ends" the room: Play Again is a `restart`. */
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

export function viewFor(state) {
  const q = state.round ? BY_ID[state.round.q] : null;
  const view = {
    phase: state.phase,
    mode: state.mode,
    colour: state.colour,
    score: state.score,
    strikes: state.strikes,
    parts: state.parts,
    history: state.history,
    roundNo: state.history.length + (state.phase === "ask" ? 1 : 0),
    totalRounds: state.mode === "endless" ? null : CLASSIC_ROUNDS,
    tiers: TIERS,
    roundMs: state.mode === "practice" ? null : ROUND_MS,
    round: null,
  };
  if (q && state.phase === "ask") {
    // The answer list stays server-side while the clock runs.
    view.round = {
      prompt: q.prompt, category: q.category, startedAt: state.round.startedAt,
      tries: state.round.tries, answerCount: q.answers.length,
    };
  } else if (q && state.phase === "reveal") {
    const e = state.round.ended;
    view.round = {
      prompt: q.prompt, category: q.category, ended: e,
      reason: e.tier ? TIERS[e.tier].odd : (e.timedOut ? "Out of time." : "Skipped."),
      odder: odderPicks(q, e.tier),
    };
  }
  return view;
}
