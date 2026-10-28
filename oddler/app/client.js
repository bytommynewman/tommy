/**
 * Oddler client: the net harness (unchanged from the template) plus the
 * renderer. The server is authoritative — this file sends intents and draws
 * whatever `view` comes back. Server strings are never treated as markup.
 *
 * Identity: the browser keeps a secret account token; its hash is the public
 * player id used in rooms and the key of the player's locker (/api/me).
 * Rooms: a solo run lives in a room named after the player id. Duo rooms are
 * named by a short code in `?room=`; two players seat themselves there.
 */

import { ANCHORS, BASE, COLOUR_NAMES, SWATCH, SLOT_NAMES, PART_NAMES, oddlerHTML } from "/anchors.js";

// ── identity ───────────────────────────────────────────────────────────────

const roomParam = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
// ?challenge=CODE&by=NAME&s=SCORE — a friend's "same 7 prompts, beat me" link. Name and score are display only.
const PARAMS = new URLSearchParams(location.search);
const challengeParam = (PARAMS.get("challenge") || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12);
const challengeBy = (PARAMS.get("by") || "").replace(/[^\p{L}\p{N} _.'-]/gu, "").trim().slice(0, 16);
const challengeScore = Math.max(0, Math.min(9999, parseInt(PARAMS.get("s") || "0", 10) || 0));
const DAILY_EPOCH = 20754, DAY_MS = 86_400_000;
function todayNo() { return Math.floor(Date.now() / DAY_MS); }
function dailyNo(day) { return day - DAILY_EPOCH + 1; }
function untilNextDaily() { const ms = (todayNo() + 1) * DAY_MS - Date.now(); const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000); return h ? `${h}h ${m}m` : `${m}m`; }
const TIER_EMOJI = ["⬛", "⬜", "🟦", "🟩", "🟨", "🟧", "🟪"];
function gridOf(history) { return history.map((h) => TIER_EMOJI[h.tier] || "⬛").join(""); }
function makeChallengeCode() { const a = "abcdefghjkmnpqrstuvwxyz23456789"; const b = crypto.getRandomValues(new Uint8Array(8)); return [...b].map((x) => a[x % a.length]).join(""); }
function challengeLink(code, score) { const u = new URL(location.origin + "/"); u.searchParams.set("challenge", code); if (me?.name) u.searchParams.set("by", me.name); u.searchParams.set("s", String(score)); return u.toString(); }

function hex(bytes) { return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function accountToken() {
  const key = "oddler:token";
  let t = localStorage.getItem(key);
  if (!/^[a-f0-9]{32,64}$/.test(t || "")) {
    t = hex(crypto.getRandomValues(new Uint8Array(16)));
    localStorage.setItem(key, t);
  }
  return t;
}
async function hashToken(token) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return hex(new Uint8Array(buf)).slice(0, 16);
}
const TOKEN = accountToken();
let PLAYER_ID = null;   // set at boot from the token
let room = null;

// ── net (keep this) ────────────────────────────────────────────────────────

const PING = "__ping";
const PONG = "__pong";
let socket = null;
let retry = 0;

function connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${proto}//${location.host}/ws/${encodeURIComponent(room)}`);
  socket.addEventListener("open", () => {
    retry = 0;
    setStatus("");
    send({ type: "join", playerId: PLAYER_ID });
  });
  socket.addEventListener("message", (event) => {
    if (event.data === PONG) return;
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }
    if (msg.type === "state") onState(msg);
    else if (msg.type === "error") onError(msg.error);
  });
  socket.addEventListener("close", () => {
    retry = Math.min(retry + 1, 6);
    const wait = 500 * 2 ** (retry - 1);
    setStatus(`reconnecting in ${Math.round(wait / 1000)}s…`, true);
    setTimeout(connect, wait);
  });
}

function send(msg) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(msg));
}
function act(action) { send({ type: "action", action }); }

setInterval(() => { if (socket?.readyState === WebSocket.OPEN) socket.send(PING); }, 30_000);

// ── the locker API ─────────────────────────────────────────────────────────

let me = null;          // the public profile from /api/me
let lockerOk = true;    // false when the deploy has no profile storage

async function api(method, body) {
  try {
    const res = await fetch("/api/me", {
      method,
      headers: { "x-oddler-token": TOKEN, ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 503) { lockerOk = false; return null; }
    if (!res.ok) return null;
    me = await res.json();
    return me;
  } catch { return null; }
}
/** Sign up / log in / log out. On success the browser switches to the account's session token. */
async function auth(path, body) {
  try {
    // Plain text on purpose: the hosting edge challenges JSON-typed POSTs from
    // some clients and the server parses the body as JSON regardless.
    const res = await fetch("/api/" + path, {
      method: "POST",
      headers: { "x-oddler-token": TOKEN, "content-type": "text/plain" },
      body: JSON.stringify(body || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data.error || `error ${res.status}` };
    return data;
  } catch { return { error: "network error" }; }
}
let saveTimer = 0;
function saveProfile(patch) {
  if (me) Object.assign(me, patch);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api("PUT", patch), 250);
}
function displayName() { return me?.name || "You"; }

// ── helpers ────────────────────────────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const screen = $("#screen");
const statusEl = $("#status");
const toastEl = $("#toast");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.classList.toggle("error", isError);
}
let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}
const QUIET_ERRORS = new Set(["type an answer", "already seated", "not your turn", "no prompt open"]);
let resetOnce = false;
function onError(error) {
  if (QUIET_ERRORS.has(error)) return;
  if (error === "server error" && !resetOnce) { resetOnce = true; send({ type: "reset" }); toast("ROOM RESET"); return; }
  toast(error);
}

const store = {
  get(k, d) { try { const v = localStorage.getItem("oddler:" + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("oddler:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

// ── sound (tiny synth, no assets) ──────────────────────────────────────────

let audio = null;
let muted = store.get("muted", false);
function beep(freq, ms, type = "square", gain = 0.05, when = 0) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(); const g = audio.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(audio.destination);
    const t = audio.currentTime + when;
    o.start(t); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    o.stop(t + ms / 1000 + 0.02);
  } catch { /* no audio */ }
}
const sfx = {
  tick: () => beep(880, 60, "square", 0.03),
  miss: () => { beep(200, 120, "sawtooth", 0.04); beep(150, 160, "sawtooth", 0.04, 0.1); },
  score: (tier) => { for (let i = 0; i <= tier; i++) beep(440 + i * 110, 90, "square", 0.04, i * 0.07); },
  click: () => beep(660, 40, "square", 0.02),
  join: () => { beep(523, 80, "square", 0.04); beep(784, 120, "square", 0.04, 0.09); },
  beat: (urg) => { const g = 0.05 + 0.08 * urg; beep(70 + 30 * urg, 70, "sine", g); beep(55 + 25 * urg, 90, "sine", g * 0.8, 0.12); },
  buzz: () => beep(110, 350, "sawtooth", 0.06),
  levelup: () => { [523, 659, 784, 1047].forEach((f, i) => beep(f, 160, "square", 0.05, i * 0.12)); },
};
const muteBtn = $("#mute");
function drawMute() {
  muteBtn.setAttribute("aria-pressed", String(!muted));
  muteBtn.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
  muteBtn.textContent = muted ? "✕" : "♪";
}
muteBtn.addEventListener("click", () => { muted = !muted; store.set("muted", muted); drawMute(); if (!muted) sfx.click(); });
drawMute();

// ── rendering ──────────────────────────────────────────────────────────────

let view = null;
let roundKey = null;        // startedAt of the round the timer is running for
let roundLocalStart = 0;    // performance.now() when this client first saw it
let timerHandle = 0;
let autoSkipped = false;
let chosenMode = store.get("mode", "classic");
let chosenColour = store.get("colour", "pink");
let lastNewPart = null;
let showingLobby = false;
let showingLocker = false;
let satDown = false;
let TIERS_CACHE = [];
let booted = false;
let partnerCount = 0;
let lastNotice = null;
let fanfare = null;         // { xpGained, levelBefore, levelAfter, newUnlocks } after a game
let profileBefore = null;   // snapshot at game start, to compute the fanfare

function partsById(ids) {
  return (ids || []).map((id) => { const p = CATALOGUE_BY_ID[id]; return p ? { id, slot: p.slot } : null; }).filter(Boolean);
}
let CATALOGUE_BY_ID = {};
function indexCatalogue() { CATALOGUE_BY_ID = Object.fromEntries((me?.catalogue || []).map((p) => [p.id, p])); }

function onState(msg) {
  const v = msg.view;
  if (!v) { setStatus(msg.status === "waiting" ? "waiting…" : ""); return; }
  const prev = view;
  view = v;
  if (!booted) {
    booted = true; TIERS_CACHE = v.tiers.slice(1);
    // A fresh page load after a finished game opens on the lobby, not stale results.
    if (v.phase === "done" && !v.duo) showingLobby = true;
  }

  const duoRoom = Boolean(roomParam);
  if (duoRoom && !satDown && !(v.duo && v.duo.seated)) {
    const open = (!v.duo && v.phase === "lobby") || (v.duo && v.duo.players.length < 2 && v.phase === "duo-lobby");
    if (open) { satDown = true; act({ kind: "sit", colour: me?.colour || chosenColour }); }
  }
  if (v.duo) {
    if (v.duo.players.length > partnerCount && partnerCount > 0) sfx.join();
    partnerCount = v.duo.players.length;
    if (v.notice && v.notice.text !== lastNotice && v.notice.by !== v.duo.you) { lastNotice = v.notice.text; toast(v.notice.text.toUpperCase()); sfx.miss(); }
  }
  if (v.mode && v.mode !== "duo" && v.mode !== "daily") chosenMode = v.mode;

  if (v.phase === "ask") {
    showingLobby = false; showingLocker = false;
    const key = v.round.startedAt;
    if (key !== roundKey) {
      roundKey = key;
      autoSkipped = false;
      const age = Date.now() - key;
      roundLocalStart = performance.now() - (age > 3000 ? age : 0);
      lastNewPart = null;
    }
    if (v.roundNo === 1 && prev?.phase !== "ask" && prev?.phase !== "reveal") profileBefore = me ? { ...me } : null;
  } else {
    roundKey = null;
  }
  if (v.phase === "reveal" && prev?.phase === "ask") {
    rememberSeen(v.history.slice(-1));
    const e = v.round.ended;
    if (e.tier) sfx.score(e.tier); else sfx.miss();
    lastNewPart = e.part ? e.part.id : null;
  }
  if (v.phase === "done" && prev?.phase !== "done") { recordBest(v); refreshAfterGame(); }
  render();
}

/** The room credited the locker when the game ended; fetch it and compute the fanfare. */
async function refreshAfterGame() {
  const before = profileBefore || me;
  await new Promise((r) => setTimeout(r, 400));
  const after = await api("GET");
  if (!after) return;
  indexCatalogue();
  if (before) {
    const beforeOwned = new Set((before.catalogue || []).filter((p) => p.unlocked).map((p) => p.id));
    fanfare = {
      xpGained: after.xp - before.xp,
      levelBefore: before.level, levelAfter: after.level,
      newUnlocks: after.catalogue.filter((p) => p.unlocked && !beforeOwned.has(p.id)).map((p) => p.id),
    };
    if (fanfare.levelAfter > fanfare.levelBefore) sfx.levelup();
  }
  if (view?.phase === "done") render();
}

function render() {
  const v = view;
  if (!v) return;
  if (!v.duo && !roomParam && v.phase === "lobby" && !store.get("seenTutorial", false)) { screen.innerHTML = tutorialHTML(); wireTutorial(); return; }
  if (v.phase === "ask" && screen.dataset.phase === "ask" && screen.dataset.round === String(v.round.startedAt)) {
    const live = $("#livetyping"); if (live) live.textContent = v.round.typing || "";
    const tries = $(".tries"); if (tries) tries.innerHTML = triesHTML(v.round);
    return;
  }
  screen.dataset.phase = v.phase;
  screen.dataset.round = v.round ? String(v.round.startedAt) : "";
  clearInterval(timerHandle);
  const vig = $("#vignette"); if (vig) { vig.classList.remove("danger"); vig.style.setProperty("--urg", "0"); }
  if (showingLocker && (v.phase === "lobby" || v.phase === "done" || v.phase === "duo-lobby")) screen.innerHTML = lockerHTML(v);
  else if (v.duo && !v.duo.seated && (v.duo.players.length >= 2 || v.phase !== "duo-lobby")) screen.innerHTML = spectatorHTML(v);
  else if (v.phase === "duo-lobby") screen.innerHTML = v.duo && v.duo.seated ? duoLobbyHTML(v) : joiningHTML();
  else if (v.phase === "lobby" || v.phase === "done" && showingLobby) screen.innerHTML = lobbyHTML(v);
  else if (v.phase === "ask") screen.innerHTML = askHTML(v);
  else if (v.phase === "reveal") screen.innerHTML = revealHTML(v);
  else if (v.phase === "done") screen.innerHTML = doneHTML(v);
  wire();
}

// lobby ----------------------------------------------------------------------

function bestKey(mode) { return "best:" + mode; }
function recordBest(v) {
  if (v.mode === "practice") return;
  const prev = store.get(bestKey(v.mode), 0);
  if (v.score > prev) { store.set(bestKey(v.mode), v.score); store.set("newbest", true); }
  else store.set("newbest", false);
}

const MODE_INFO = {
  classic: ["Classic", "7 prompts · 10s each"],
  endless: ["Endless", "Until 3 misses"],
  practice: ["Practice", "No clock, same rules"],
};

function swatchesHTML(current) {
  return `<div class="swatches" role="group" aria-label="Oddler colour">
    ${Object.keys(BASE).map((c) => `<button class="swatch" type="button" data-colour="${c}" aria-pressed="${c === current}" aria-label="${COLOUR_NAMES[c]}" style="background:${SWATCH[c]}"></button>`).join("")}
  </div>`;
}

function levelHTML() {
  if (!me) return lockerOk ? `<p class="px small dim">LOADING LOCKER…</p>` : "";
  const span = Math.max(1, me.nextLevelXp - me.levelXp);
  const pct = Math.min(100, Math.round(((me.xp - me.levelXp) / span) * 100));
  return `<div class="levelbar">
    <div class="levelrow">${plateHTML(displayName(), me.banner)}<span class="px lvl">LV ${me.level}${me.username ? ` <span class="dim">@${esc(me.username)}</span>` : ""}</span></div>
    <div class="xp"><div class="xpfill" style="width:${pct}%"></div></div>
    <div class="levelrow small dim"><span>${me.xp} xp</span><span>${toNextText(me.level, me.xp, me.nextLevelXp)}</span></div>
  </div>`;
}

function myLoadoutParts() { return me ? partsById(me.loadout) : []; }

/** A name on its banner. `banner` ids match the .nameplate.b-* styles. */
function plateHTML(name, banner, extra = "") {
  return `<span class="nameplate b-${esc(banner || "plain")}">${esc(String(name || "You").toUpperCase())}${extra}</span>`;
}
/** Mirror of the server's curve (profile.ts) so the XP bar can animate across levels. */
const MAX_LEVEL = 50, BAND = 5;
function xpForLevel(level) { const n = Math.max(0, level - 1); return Math.round(90 * n * n + 1.5 * n * n * n); }
function levelFor(xp) { let l = 1; while (l < MAX_LEVEL && xpForLevel(l + 1) <= xp) l++; return l; }
/** "LV 6–10": the five-level band a banner covers. */
function bandLabel(level) { const lo = Math.floor((level - 1) / BAND) * BAND + 1; return `LV ${lo}–${Math.min(MAX_LEVEL, lo + BAND - 1)}`; }
function toNextText(level, xp, nextXp) { return level >= MAX_LEVEL ? "MAX LEVEL" : `${nextXp - xp} to level ${level + 1}`; }

function dailyCardHTML(v) {
  const day = todayNo();
  const saved = store.get("daily:" + day, null);
  const done = saved || (v.dailyDone === day ? { score: v.mode === "daily" ? v.score : null, grid: v.mode === "daily" ? gridOf(v.history) : "" } : null);
  const no = dailyNo(day);
  if (done) {
    return `<section class="panel daily">
      <h2>Daily #${no}</h2>
      <p class="px small dim">DONE · ${done.score ?? "—"} ODD · NEXT IN ${untilNextDaily()}</p>
      ${done.grid ? `<p class="grid" aria-label="Your daily result">${done.grid}</p>` : ""}
      <p><button id="sharedaily" class="btn lime" type="button">SHARE RESULT</button></p>
    </section>`;
  }
  return `<section class="panel daily">
    <h2>Daily #${no}</h2>
    <p class="small">Same 7 prompts for everyone today. One go. Share your grid.</p>
    <p><button id="daily" class="btn" type="button">▼ PLAY DAILY #${no} ▼</button></p>
    <p class="px small dim">RESETS IN ${untilNextDaily()}</p>
  </section>`;
}

function challengeCardHTML(v) {
  if (!challengeParam || (!challengeBy && !challengeScore)) return "";
  const who = challengeBy || "A friend";
  return `<section class="panel challenge">
    <h2>Challenge from ${esc(who)}</h2>
    <p class="small">${challengeScore ? `<b>${esc(who)}</b> scored <b class="px">${challengeScore}</b> on 7 prompts. You get the exact same 7.` : `<b>${esc(who)}</b> sent you 7 prompts.`}</p>
    <p><button id="acceptchallenge" class="btn" type="button">▼ ${challengeScore ? "BEAT IT" : "TAKE IT ON"} ▼</button></p>
  </section>`;
}

function lobbyHTML(v) {
  const best = me?.best?.classic ?? store.get(bestKey("classic"), 0);
  const bestE = me?.best?.endless ?? store.get(bestKey("endless"), 0);
  const bestD = me?.best?.duo ?? store.get(bestKey("duo"), 0);
  const colour = me?.colour || chosenColour;
  return `
    <section class="panel nest">
      ${oddlerHTML(colour, myLoadoutParts(), "big")}
      ${levelHTML()}
      <p><button id="locker" class="btn ghost" type="button">OPEN LOCKER</button></p>
      ${me && !me.username ? `<p class="small dim" style="margin:0">Guest locker — <button id="locker2" class="link" type="button" style="font-size:14px;padding:0">create an account</button> to save it and use it anywhere.</p>` : ""}
    </section>
    ${challengeCardHTML(v)}
    ${dailyCardHTML(v)}
    <section class="panel">
      <h2>The odd dive</h2>
      <p>Every prompt has lots of right answers. <b>Only the uncommon ones score.</b> Rare answers earn your Oddler new parts for its locker.</p>
      <div class="tabs" role="group" aria-label="Mode">
        ${Object.entries(MODE_INFO).map(([m, [name, sub]]) => `<button class="tab" type="button" data-mode="${m}" aria-pressed="${m === chosenMode}">${name}<small>${sub}</small></button>`).join("")}
      </div>
      <p style="margin-top:14px"><button id="start" class="btn" type="button">▼ GO ODD ▼</button></p>
      <p><button id="duo" class="btn ghost" type="button">PLAY WITH A FRIEND</button></p>
      <p class="small dim" style="text-align:center;margin-top:-4px">Duo: 10 prompts, you take turns, one team score.</p>
      <p><button id="challenge" class="btn ghost" type="button">CHALLENGE A FRIEND</button></p>
      <p class="small dim" style="text-align:center;margin-top:-4px">Play 7 prompts, then send the link — they get the exact same 7 and your score to beat.</p>
      <p class="best">BEST CLASSIC: ${best} &nbsp;·&nbsp; ENDLESS: ${bestE} &nbsp;·&nbsp; DUO: ${bestD}</p>
      <p><button id="how" class="link" type="button">How does scoring work?</button></p>
    </section>`;
}

function tutorialHTML() {
  const ladder = TIERS_CACHE.map((t) => `<div><span class="tier t${t.id}">${esc(t.name)}</span><span class="px" style="font-size:11px">${t.pts}</span></div>`).join("");
  return `
    <section class="panel tut">
      <h2>How it works</h2>
      <p class="prompt" style="font-size:20px">Name a European country.</p>
      <p class="small dim">Both of these are correct. Tap each to see what it's worth.</p>
      <div class="ex">
        <button type="button" data-ex="plain">France</button>
        <button type="button" data-ex="odd">Liechtenstein</button>
      </div>
      <div id="exout" class="small" style="min-height:3.2em"></div>
      <p class="small">The ladder, from plain to peak odd:</p>
      <div class="ladderlist">${ladder}</div>
      <details class="about">
        <summary>Where do the questions and points come from?</summary>
        <p class="small">The prompts and their answer lists are written by hand for Oddler — general-knowledge categories (places, food, animals, sport, music, screens, science, everyday stuff), each with everything we could think of that counts, plus nicknames and alternate spellings. Some prompts have a twist to think around (letters, rhymes, borders, numbers). A fresh batch of prompts is added twice a day.</p>
        <p class="small">Each accepted answer is given a rarity tier by the question writer, judging how quickly an average person would think of it. Anything most people could name is Plain and worth 10, full stop. Odd-ish takes a moment to find, Rare is a real dig, Deep Cut is properly obscure, and One in an Oddlion is something almost nobody says (100). It is editorial, not live player statistics, so the same answer is worth the same to everyone.</p>
        <p class="small">The Daily deals everyone the same 7 prompts each day (one go, resets at midnight UTC) and a challenge link deals your friend the exact 7 you just played. Spelling slips are forgiven (one typo in a medium word, two in a long one). An answer not on our list keeps the clock running so you can try again. Odd-ish or better grows a mutation on your Oddler, which goes into your locker for keeps; every game also pays XP, and levels unlock hats and other accessories.</p>
      </details>
      <button id="gotit" class="btn lime" type="button">GOT IT</button>
    </section>`;
}

// locker ---------------------------------------------------------------------

const SLOT_ORDER = ["hat", "face", "flower", "horn", "eye", "antenna", "back", "wing", "nub", "neck", "pack", "held"];

function lockerHTML(v) {
  if (!me) return `<section class="panel"><h2>Locker</h2><p class="dim">${lockerOk ? "Loading…" : "Lockers are not available on this deploy."}</p><p><button id="closelocker" class="btn ghost" type="button">BACK</button></p></section>`;
  const worn = new Set(me.loadout);
  const bySlot = {};
  for (const p of me.catalogue) (bySlot[p.slot] ??= []).push(p);
  const grid = SLOT_ORDER.filter((s) => bySlot[s]).map((slot) => {
    const cap = ANCHORS[slot]?.length ?? 1;
    const wearing = me.loadout.filter((id) => CATALOGUE_BY_ID[id]?.slot === slot).length;
    const items = bySlot[slot].map((p) => {
      const how = p.level ? `LV ${p.level}` : `${TIERS_CACHE[p.tier - 1]?.name ?? "Rare"}+`;
      const state = worn.has(p.id) ? "worn" : p.unlocked ? "owned" : "locked";
      return `<button class="item ${state}" type="button" data-part="${p.id}" ${p.unlocked ? "" : "disabled"} aria-pressed="${worn.has(p.id)}" title="${esc(PART_NAMES[p.id] || p.id)}">
        <img src="/art/${p.id}.png" alt="">
        <span class="iname">${esc(PART_NAMES[p.id] || p.id)}</span>
        <span class="ihow">${p.unlocked ? (worn.has(p.id) ? "WORN" : "TAP TO WEAR") : p.level ? `UNLOCKS AT ${how}` : `EARN: ${esc(how)} ANSWER`}</span>
      </button>`;
    }).join("");
    return `<div class="slotgroup"><div class="slothead"><span class="px">${esc(SLOT_NAMES[slot] || slot)}</span><span class="px dim">${wearing}/${cap}</span></div><div class="items">${items}</div></div>`;
  }).join("");
  return `
    <section class="panel nest">
      ${oddlerHTML(me.colour, myLoadoutParts(), "big")}
      ${levelHTML()}
      <label class="namefield"><span class="px small">NAME</span><input id="name" type="text" maxlength="16" value="${esc(me.name)}" placeholder="Your Oddler's name" autocomplete="nickname" /></label>
      ${swatchesHTML(me.colour)}
      <div class="row" style="margin-top:12px">
        <button id="closelocker" class="btn" type="button">DONE</button>
        <button id="undress" class="btn ghost" type="button">TAKE ALL OFF</button>
      </div>
    </section>
    <section class="panel">
      <h2>Locker</h2>
      <p class="small dim">${me.games} game${me.games === 1 ? "" : "s"} played · ${me.catalogue.filter((p) => p.unlocked).length}/${me.catalogue.length} parts unlocked. Mutations come from Odd-ish-or-better answers in games; accessories unlock as you level up.</p>
      ${grid}
    </section>
    <section class="panel">
      <h2>Name banners</h2>
      <p class="small dim">The plate behind your name. Levels run 1 to ${MAX_LEVEL} in bands of five, and every band unlocks a new banner.</p>
      <div class="banners">${(me.banners || []).map((b) => `<button class="bannerpick ${b.unlocked ? "" : "locked"} ${me.banner === b.id ? "chosen" : ""}" type="button" data-banner="${esc(b.id)}" ${b.unlocked ? "" : "disabled"} aria-pressed="${me.banner === b.id}">
        ${plateHTML(displayName(), b.id)}<span class="ihow">${b.unlocked ? (me.banner === b.id ? "CHOSEN" : esc(b.name.toUpperCase())) : `${bandLabel(b.level)} · ${esc(b.name.toUpperCase())}`}</span></button>`).join("")}</div>
    </section>
    <section class="panel">
      ${accountHTML()}
    </section>`;
}

let authMode = "signup";
function accountHTML() {
  if (me?.username) {
    return `<h2>Account</h2>
      <p>Logged in as <b>@${esc(me.username)}</b>. Your locker is saved to this account — log in on any phone or computer to bring it with you.</p>
      <p><button id="logout" class="btn ghost" type="button">LOG OUT</button></p>`;
  }
  const signup = authMode === "signup";
  return `<h2>${signup ? "Save your locker" : "Log in"}</h2>
    <p class="small dim">${signup
      ? "Right now this locker only lives in this browser. Create an account and it's saved for good — everything you've earned comes with it, and you can log in on any device."
      : "Already have an account? Log in and this device switches to that locker."}</p>
    <form id="authform" class="authform">
      <input id="authuser" type="text" placeholder="username" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username" maxlength="16" required />
      <input id="authpass" type="password" placeholder="${signup ? "password (6+ characters)" : "password"}" autocomplete="${signup ? "new-password" : "current-password"}" minlength="6" required />
      <button class="btn lime" type="submit">${signup ? "CREATE ACCOUNT" : "LOG IN"}</button>
      <p id="autherr" class="tries" aria-live="polite"></p>
    </form>
    <p class="small"><button id="authswitch" class="link" type="button">${signup ? "I already have an account" : "I need an account"}</button></p>`;
}

// duo lobby ------------------------------------------------------------------

function roomLink() { return `${location.origin}/?room=${encodeURIComponent(roomParam)}`; }
function seatName(p) { return p.isYou ? (p.name || "You") : (p.name || "Partner"); }

function joiningHTML() {
  return `<section class="panel" style="text-align:center"><h2>Duo room</h2><p class="code">${esc(roomParam)}</p><p class="px small dim">TAKING A SEAT…</p></section>`;
}

function duoLobbyHTML(v) {
  const my = v.duo.players.find((p) => p.isYou);
  const partner = v.duo.players.find((p) => !p.isYou);
  const isHost = v.duo.host === v.duo.you;
  return `
    <section class="panel" style="text-align:center">
      <h2>Duo room</h2>
      <p class="code" aria-label="Room code">${esc(roomParam)}</p>
      <p class="small dim">Your partner opens <b>${esc(location.host)}</b> and enters this code, or uses your link.</p>
      <div class="row">
        <button id="copylink" class="btn ghost" type="button">COPY LINK</button>
        <button id="sharelink" class="btn ghost" type="button">SHARE</button>
      </div>
    </section>
    <section class="panel">
      ${v.notice ? `<p class="notice px small">${esc(v.notice.text.toUpperCase())}</p>` : ""}
      <div class="team">
        <div class="seat">
          ${oddlerHTML(my.colour, myLoadoutParts(), "", null, seatName(my))}
          <p class="seatname">${plateHTML(seatName(my), my.banner)}${me ? ` <span class="px dim">LV ${me.level}</span>` : ""}</p>
        </div>
        <div class="seat ${partner ? "" : "empty"}">
          ${partner ? oddlerHTML(partner.colour, [], "", null, seatName(partner)) : `<div class="oddler"><div class="waiting">waiting for<br>your partner…</div></div>`}
          <p class="seatname">${partner ? plateHTML(seatName(partner), partner.banner) : `<span class="px">…</span>`}</p>
        </div>
      </div>
      <p style="margin-top:14px">${isHost
        ? `<button id="start" class="btn" type="button" ${partner ? "" : "disabled"}>${partner ? "▼ START DUO ▼" : "WAITING FOR PARTNER"}</button>`
        : `<p class="px small dim" style="text-align:center">${partner ? "WAITING FOR THE HOST TO START" : "WAITING…"}</p>`}</p>
      <p class="small dim" style="text-align:center">10 prompts, 10 s each. You take turns; your partner sees you type. Points add up to one team score.</p>
      <p style="text-align:center"><button id="locker" class="link" type="button">Open locker</button> · <a class="link" href="/">Leave room</a></p>
    </section>`;
}

function spectatorHTML(v) {
  return `
    <section class="panel" style="text-align:center">
      <h2>Room ${esc(roomParam)} is full</h2>
      <p>Two Oddlers are already seated here. You can watch, or <a class="link" href="/">start your own</a>.</p>
      <div class="team">${v.duo.players.map((p) => `<div class="seat">${oddlerHTML(p.colour, p.parts, "")}<p class="seatname">${plateHTML(p.name || "Player", p.banner)} <span class="px dim">${p.pts}</span></p></div>`).join("")}</div>
      ${v.round ? `<p class="small dim">${esc(v.round.prompt)}</p>` : ""}
      <p class="bigscore" style="font-size:22px">${v.score} ODD</p>
    </section>`;
}

// ask ----------------------------------------------------------------------

/** Three outs, scoreboard style: a hollow ring is a life left, a red ring with an X through it is a life lost. */
function livesHTML(strikes, stamp = false) {
  const life = (i) => {
    const lost = i < strikes, fresh = stamp && i === strikes - 1;
    return `<svg class="life${lost ? " lost" : ""}${fresh ? " stamp" : ""}" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path class="x" d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>`;
  };
  const left = 3 - strikes;
  return `<span class="lives${strikes >= 3 ? " dead" : ""}" role="img" aria-label="${left} of 3 lives left">${[0, 1, 2].map(life).join("")}</span>`;
}

function hudHTML(v, stamp = false) {
  let left;
  if (v.duo) left = `DUO · ROUND ${v.roundNo}/${v.totalRounds}`;
  else if (v.mode === "endless") left = `ENDLESS · ROUND ${v.roundNo} ${livesHTML(v.strikes, stamp)}`;
  else if (v.mode === "practice") left = `PRACTICE · ${v.roundNo}/${v.totalRounds}`;
  else left = `ROUND ${v.roundNo}/${v.totalRounds}`;
  return `<div class="hud"><span>${left}</span><span><span class="score">${v.duo ? "TEAM " : ""}${v.score} ODD</span> <button id="quit" class="quit" type="button" aria-label="Quit this game">✕ QUIT</button></span></div>`;
}

function teamHTML(v, newPart = null) {
  return `<div class="team compact">${v.duo.players.map((p) => `
    <div class="seat ${p.isTurn ? "turn" : ""}">
      ${oddlerHTML(p.colour, p.parts, "mini", newPart && newPart.by === p.id ? newPart.id : null, seatName(p))}
      <p class="seatname">${plateHTML(seatName(p), p.banner)} <span class="px dim">${p.pts}</span></p>
    </div>`).join("")}</div>`;
}

function triesHTML(r) {
  return r.tries.length
    ? `<span>Not on our list: ${r.tries.map(esc).join(", ")}</span> <span class="ok">— ${r.yourTurn ? "keep trying" : "they're trying again"}</span>`
    : `<span class="ok">${r.answerCount} answers accepted. Think odd.</span>`;
}

function askHTML(v) {
  const r = v.round;
  const timed = v.roundMs != null;
  const mine = r.yourTurn;
  const partner = v.duo ? v.duo.players.find((p) => !p.isYou) : null;
  const tries = triesHTML(r);
  const timer = timed
    ? `<div class="clock" id="clock" aria-hidden="true"><div class="count" id="secs">${Math.ceil(v.roundMs / 1000)}</div><div class="bar"><div class="fill" id="fill"></div></div></div>`
    : `<p class="small dim">No clock — take your time.</p>`;
  const input = mine
    ? `<form class="answer" id="form" autocomplete="off">
        <label class="sr" for="answer">Your answer</label>
        <input id="answer" name="answer" type="text" placeholder="Type an uncommon answer…" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="send" maxlength="80" required />
        <button class="btn lime" type="submit">GO</button>
      </form>`
    : `<div class="live" aria-live="polite"><span class="px livelabel">${esc((partner?.name || "PARTNER").toUpperCase())} IS TYPING</span><div class="livetext"><span id="livetyping">${esc(r.typing || "")}</span><span class="caret"></span></div></div>`;
  const foot = v.duo
    ? teamHTML(v)
    : `<div class="askfoot"><button id="skip" class="link" type="button">Skip this one</button>${oddlerHTML(v.colour, v.parts, "mini")}</div>`;
  const duoSkip = v.duo && mine ? `<p style="text-align:right;margin:0"><button id="skip" class="link" type="button">Skip this one</button></p>` : "";
  const who = mine ? "▶ YOU'RE ON THE CLOCK ◀" : `${esc((partner?.name || "PARTNER").toUpperCase())} IS ON THE CLOCK`;
  return `
    <section class="panel ask" id="askpanel">
      ${hudHTML(v)}
      ${v.duo ? `<div class="onclock ${mine ? "you" : "them"}">${who}</div>` : ""}
      <p style="margin-top:${v.duo ? 8 : 12}px"><span class="chip">${esc(r.category)}</span></p>
      <p class="prompt" id="prompt">${esc(r.prompt)}</p>
      ${timer}
      ${input}
      <p class="tries" aria-live="polite">${tries}</p>
      ${duoSkip}
      ${foot}
    </section>`;
}

function startTimer(v) {
  const fill = $("#fill"), secs = $("#secs"), clock = $("#clock"), panel = $("#askpanel");
  const vignette = $("#vignette");
  if (!fill || v.roundMs == null) return;
  let lastWhole = Infinity;
  let nextBeat = 0;
  const mine = v.round.yourTurn;
  const tick = () => {
    const elapsed = performance.now() - roundLocalStart;
    const left = Math.max(0, v.roundMs - elapsed);
    const urg = 1 - left / v.roundMs;
    fill.style.width = `${(left / v.roundMs) * 100}%`;
    const whole = Math.ceil(left / 1000);
    if (whole !== lastWhole) {
      secs.textContent = String(whole);
      secs.classList.remove("punch"); void secs.offsetWidth; secs.classList.add("punch");
      if (whole > 0 && whole <= 3) sfx.tick();
      lastWhole = whole;
    }
    clock.classList.toggle("warn", left < 3000);
    clock.classList.toggle("danger", left < 1500);
    panel?.classList.toggle("shake", left < 1200 && left > 0 && !reduced);
    if (vignette) { vignette.style.setProperty("--urg", urg.toFixed(3)); vignette.classList.toggle("danger", left < 1500 && left > 0); }
    if (left > 0 && elapsed >= nextBeat) { sfx.beat(urg); nextBeat = elapsed + (900 - 600 * urg); }
    const slack = mine ? 0 : 2600;
    if (left <= 0 && elapsed >= v.roundMs + slack && !autoSkipped) {
      autoSkipped = true;
      clearInterval(timerHandle);
      panel?.classList.remove("shake");
      if (vignette) { vignette.classList.remove("danger"); vignette.style.setProperty("--urg", "0"); }
      sfx.buzz();
      act({ kind: "skip", timeout: true });
    }
  };
  tick();
  timerHandle = setInterval(tick, 50);
}

// reveal -------------------------------------------------------------------

function tierName(t) { return TIERS_CACHE[t - 1]?.name ?? "Miss"; }

function revealHTML(v) {
  const r = v.round, e = r.ended;
  const tier = e.tier;
  const partner = v.duo ? v.duo.players.find((p) => !p.isYou) : null;
  const who = v.duo ? (r.yourTurn ? "You" : (partner?.name || "Your partner")) : "You";
  const title = tier ? `<span class="tier t${tier}">${esc(tierName(tier))}</span>` : `<span class="tier t0">${autoSkipped || e.timedOut ? "OUT OF TIME" : "SKIPPED"}</span>`;
  const yours = tier
    ? `<p class="yours">${esc(e.answer)}${e.typed && e.typed.toLowerCase() !== e.answer.toLowerCase() ? ` <span class="small dim">(${esc(v.duo ? who : "you")} typed “${esc(e.typed)}”)</span>` : ""}</p>`
    : `<p class="yours dim">No answer landed.</p>`;
  const owner = v.duo ? (r.yourTurn ? "Your" : `${esc(who)}'s`) : "Your";
  const earned = e.part
    ? `<div class="earned"><img src="/art/${esc(e.part.id)}.png" alt=""><div><b>New part!</b><br><span class="small">${owner} Oddler grew ${esc((PART_NAMES[e.part.id] || "something odd").toLowerCase())} — it's in the locker for keeps.</span></div></div>`
    : tier ? `<p class="small dim">Odd-ish or better grows a part. This one was ${tier < 3 ? "too plain" : "points only — every slot it fits is full"}.</p>` : "";
  const odder = r.odder.length
    ? `<p class="odder"><span class="dim">Odder picks:</span> ${r.odder.map((o) => `<b>${esc(o.name)}</b> <span class="small dim">(${esc(tierName(o.tier))}, ${TIERS_CACHE[o.tier - 1]?.pts ?? ""})</span>`).join(" · ")}</p>`
    : "";
  const last = v.mode !== "endless" && v.history.length >= v.totalRounds;
  const strikeOut = v.mode === "endless" && v.strikes >= 3;
  const foot = v.duo ? teamHTML(v, e.part ? { id: e.part.id, by: e.by } : null) : "";
  const out = v.mode === "endless" && !tier;
  const outCall = out
    ? `<p class="px outcall">${strikeOut ? "THREE OUTS · RUN OVER" : `OUT! ${3 - v.strikes} ${3 - v.strikes === 1 ? "LIFE" : "LIVES"} LEFT`}</p>`
    : "";
  return `
    <section class="panel">
      ${hudHTML(v, out)}
      <p class="small dim" style="margin-top:12px">${esc(r.prompt)}${v.duo ? ` · <b>${esc(who)}</b>` : ""}</p>
      <p>${title} <span class="pts">${tier ? `+${e.pts}` : "+0"}</span></p>
      ${outCall}
      ${yours}
      <p class="small">${esc(r.reason)}</p>
      ${earned}
      ${odder}
      <p style="margin-top:14px"><button id="next" class="btn" type="button">${last || strikeOut ? "SEE RESULTS ▶" : "NEXT PROMPT ▶"}</button></p>
      ${foot}
    </section>
    ${v.duo ? "" : `<section class="nest">${oddlerHTML(v.colour, v.parts, "", lastNewPart)}</section>`}`;
}

// done ---------------------------------------------------------------------

function fanfareHTML() {
  if (!fanfare) return me ? `<p class="px small dim">UPDATING LOCKER…</p>` : "";
  const unlocks = fanfare.newUnlocks.map((id) => `<span class="unlock"><img src="/art/${esc(id)}.png" alt="">${esc(PART_NAMES[id] || id)}</span>`).join("");
  const bannerUnlocks = (me?.banners || []).filter((b) => b.unlocked && b.level > fanfare.levelBefore && b.level <= fanfare.levelAfter)
    .map((b) => `<span class="unlock">${plateHTML(displayName(), b.id)}</span>`).join("");
  return `<div class="fanfare" id="fanfare">
    <div class="levelrow"><span class="px" id="xpgain">+0 XP</span><span class="px lvl" id="xplvl">LV ${fanfare.levelBefore}</span></div>
    <div class="xp"><div class="xpfill" id="xpfill" style="width:0%"></div></div>
    <div class="levelrow small dim"><span id="xpnow"></span><span id="xpnext"></span></div>
    <p class="px xpflash" id="xpflash" aria-live="polite"></p>
    ${unlocks || bannerUnlocks ? `<div class="unlockwrap" id="unlockwrap" hidden><p class="small">New in your locker:</p><div class="unlocks">${unlocks}${bannerUnlocks}</div></div>` : ""}
  </div>`;
}

/** Fill the XP bar from the old total to the new one, rolling over at each level. */
function animateXp() {
  if (!fanfare || !me) return;
  const fill = $("#xpfill"), gain = $("#xpgain"), lvl = $("#xplvl"), now = $("#xpnow"), next = $("#xpnext"), flash = $("#xpflash"), wrap = $("#unlockwrap");
  if (!fill) return;
  const from = me.xp - fanfare.xpGained, to = me.xp;
  const duration = reduced ? 0 : Math.min(3200, 1200 + fanfare.xpGained * 2);
  const start = performance.now();
  let shownLevel = levelFor(from);
  let lastTick = 0;
  const draw = (xp) => {
    const level = levelFor(xp);
    const lo = xpForLevel(level), hi = xpForLevel(level + 1);
    fill.style.width = `${Math.min(100, ((xp - lo) / (hi - lo)) * 100)}%`;
    now.textContent = `${Math.round(xp)} xp`;
    next.textContent = toNextText(level, Math.round(xp), hi);
    lvl.textContent = `LV ${level}`;
    gain.textContent = `+${Math.round(xp - from)} XP`;
    if (level > shownLevel) {
      shownLevel = level;
      const banner = (me.banners || []).find((b) => b.level === level);
      flash.textContent = banner ? `LEVEL UP! LV ${level} · ${banner.name.toUpperCase()} BANNER` : `LEVEL UP! LV ${level}`;
      flash.classList.remove("show"); void flash.offsetWidth; flash.classList.add("show");
      $("#fanfare")?.classList.add("up");
      sfx.levelup();
    }
  };
  const step = (t) => {
    const k = duration ? Math.min(1, (t - start) / duration) : 1;
    const eased = 1 - Math.pow(1 - k, 3);
    const xp = from + (to - from) * eased;
    draw(xp);
    if (t - lastTick > 90 && k < 1) { lastTick = t; beep(600 + 500 * eased, 30, "square", 0.015); }
    if (k < 1) requestAnimationFrame(step);
    else { draw(to); if (wrap) wrap.hidden = false; }
  };
  requestAnimationFrame(step);
}

function doneHTML(v) {
  const newBest = store.get("newbest", false) && v.mode !== "practice";
  const best = me?.best?.[v.mode] ?? store.get(bestKey(v.mode), 0);
  const ladder = v.history.map((h) => `<span class="t${h.tier}" style="background:var(--t${h.tier || 1});${h.tier ? "" : "opacity:.35"}" title="${esc(h.answer || "miss")}">${h.tier || "·"}</span>`).join("");
  const nameOf = (id) => { const p = v.duo?.players.find((x) => x.id === id); return p ? seatName(p).toLowerCase() : ""; };
  const rows = v.history.map((h) => `<li><span>${esc(h.prompt)}<br><b>${esc(h.answer || (h.timedOut ? "out of time" : "skipped"))}</b>${v.duo ? ` <span class="small dim">· ${esc(nameOf(h.by))}</span>` : ""}</span><span>${h.tier ? esc(tierName(h.tier)) : "—"} · ${h.pts}</span></li>`).join("");
  const label = v.duo ? "Duo" : v.mode === "endless" ? `${v.history.length} rounds` : v.mode === "daily" ? `Daily #${dailyNo(v.day ?? todayNo())}` : v.challenge ? "Challenge" : "Classic";
  const daily = v.mode === "daily";
  if (daily && v.day !== null) store.set("daily:" + v.day, { score: v.score, grid: gridOf(v.history) });
  const verdict = v.challenge && challengeParam === v.challenge && challengeScore
    ? `<p class="best ${v.score > challengeScore ? "new" : ""}">${v.score > challengeScore ? `★ YOU BEAT ${esc((challengeBy || "THEM").toUpperCase())}'S ${challengeScore} ★` : v.score === challengeScore ? `TIED WITH ${esc((challengeBy || "THEM").toUpperCase())} AT ${challengeScore}` : `${esc((challengeBy || "THEY").toUpperCase())} STILL LEADS: ${challengeScore}`}</p>`
    : "";
  const isHost = v.duo && v.duo.host === v.duo.you;
  const creatures = v.duo
    ? `<div class="team">${v.duo.players.map((p) => `<div class="seat">${oddlerHTML(p.colour, p.parts, "", null, seatName(p))}<p class="seatname">${plateHTML(seatName(p), p.banner)} <span class="px dim">${p.pts}</span></p></div>`).join("")}</div>`
    : oddlerHTML(v.colour, v.parts, "big");
  const earnedCount = v.duo ? v.duo.players.reduce((n, p) => n + (p.earned?.length ?? 0), 0) : (v.earned?.length ?? 0);
  const again = v.duo
    ? (isHost ? `<button id="again" class="btn" type="button">PLAY AGAIN</button>` : `<button class="btn" type="button" disabled>HOST STARTS NEXT</button>`)
    : daily ? `<button class="btn" type="button" disabled>NEXT DAILY IN ${untilNextDaily()}</button>`
    : `<button id="again" class="btn" type="button">${v.challenge ? "TRY AGAIN" : "PLAY AGAIN"}</button>`;
  return `
    <section class="panel nest">
      ${creatures}
      <p class="bigscore">${v.score} ODD</p>
      <p class="best ${newBest ? "new" : ""}">${v.mode === "practice" ? "PRACTICE RUN" : newBest ? "★ NEW PERSONAL BEST ★" : `BEST ${v.mode.toUpperCase()}: ${best}`}</p>
      ${verdict}
      ${daily ? `<p class="grid" aria-label="Your daily grid">${gridOf(v.history)}</p>` : ""}
      ${fanfareHTML()}
      <div class="ladder" aria-label="Round tiers" style="justify-content:center">${ladder}</div>
      <p class="small">${earnedCount} part${earnedCount === 1 ? "" : "s"} earned · ${label}</p>
      <div class="row">
        <button id="share" class="btn lime" type="button">${daily ? "SHARE GRID" : v.challenge ? "SEND CHALLENGE" : "SHARE"}</button>
        ${again}
      </div>
      <p><button id="locker" class="link" type="button">Open locker</button> · ${v.duo ? `<a class="link" href="/">Leave room</a>` : `<button id="lobby" class="link" type="button">Change mode</button>`}</p>
    </section>
    <section class="panel">
      <h2>Your dive</h2>
      <ul class="history">${rows}</ul>
    </section>`;
}

function shareText(v) {
  if (v.mode === "daily") return `Oddler Daily #${dailyNo(v.day ?? todayNo())} · ${v.score} odd\n${gridOf(v.history)}\nOnly uncommon answers score. ${location.origin}`;
  if (v.challenge) return `I scored ${v.score} on Oddler. Same 7 prompts, your turn — beat me: ${challengeLink(v.challenge, v.score)}`;
  const tiers = v.history.map((h) => "·▁▂▃▅▆█"[h.tier] || "·").join("");
  const mode = v.duo ? "Duo" : v.mode === "endless" ? `Endless (${v.history.length} rounds)` : "Classic";
  return `ODDLER · ${mode} · ${v.score} odd${me ? ` · ${displayName()} LV ${me.level}` : ""}\n${tiers}\n${location.origin}`;
}

// wiring -------------------------------------------------------------------

function seenPrompts() { return store.get("seen", []).slice(-600); }
function rememberSeen(history) {
  const seen = store.get("seen", []);
  for (const h of history) if (h.q && !seen.includes(h.q)) seen.push(h.q);
  store.set("seen", seen.slice(-600));
}

function makeCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

let typingTimer = 0;
function sendTyping(text) {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => act({ kind: "typing", text: text.slice(0, 80) }), 120);
}

function toggleWear(id) {
  if (!me) return;
  const part = CATALOGUE_BY_ID[id];
  if (!part || !part.unlocked) return;
  let loadout = me.loadout.slice();
  if (loadout.includes(id)) loadout = loadout.filter((x) => x !== id);
  else {
    const cap = ANCHORS[part.slot]?.length ?? 1;
    const inSlot = loadout.filter((x) => CATALOGUE_BY_ID[x]?.slot === part.slot);
    if (inSlot.length >= cap) loadout = loadout.filter((x) => x !== inSlot[0]); // swap out the oldest
    loadout.push(id);
  }
  sfx.click();
  saveProfile({ loadout });
  render();
}

function wire() {
  const v = view;
  $("#start")?.addEventListener("click", () => {
    sfx.click();
    showingLobby = false;
    if (v.duo) act({ kind: "start", mode: "duo", seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
    else act({ kind: "start", mode: chosenMode, seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
  });
  $("#duo")?.addEventListener("click", () => { sfx.click(); location.href = `/?room=${makeCode()}`; });
  $("#daily")?.addEventListener("click", () => { sfx.click(); showingLobby = false; act({ kind: "start", mode: "daily", seed: 1, seen: [] }); });
  $("#challenge")?.addEventListener("click", () => {
    sfx.click(); showingLobby = false;
    const code = makeChallengeCode();
    history.replaceState(null, "", `/?challenge=${code}`);
    act({ kind: "start", mode: "classic", challenge: code, seed: 1, seen: [] });
  });
  $("#acceptchallenge")?.addEventListener("click", () => { sfx.click(); showingLobby = false; act({ kind: "start", mode: "classic", challenge: challengeParam, seed: 1, seen: [] }); });
  $("#sharedaily")?.addEventListener("click", async () => {
    const saved = store.get("daily:" + todayNo(), null);
    const text = `Oddler Daily #${dailyNo(todayNo())} · ${saved?.score ?? "?"} odd\n${saved?.grid ?? ""}\nOnly uncommon answers score. ${location.origin}`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("COPIED"); } } catch { /* cancelled */ }
  });
  $("#locker")?.addEventListener("click", () => { sfx.click(); showingLocker = true; render(); });
  $("#locker2")?.addEventListener("click", () => { sfx.click(); showingLocker = true; render(); setTimeout(() => $("#authuser")?.focus(), 50); });
  $("#closelocker")?.addEventListener("click", () => { sfx.click(); showingLocker = false; showingLobby = v.phase !== "duo-lobby"; render(); });
  $("#undress")?.addEventListener("click", () => { sfx.click(); saveProfile({ loadout: [] }); render(); });
  for (const b of document.querySelectorAll("[data-part]")) b.addEventListener("click", () => toggleWear(b.dataset.part));
  const name = $("#name");
  if (name) name.addEventListener("input", () => { saveProfile({ name: name.value.slice(0, 16) }); const lv = document.querySelector(".levelrow .px"); if (lv) lv.textContent = (name.value.trim() || "You").toUpperCase(); });
  $("#authswitch")?.addEventListener("click", () => { authMode = authMode === "signup" ? "login" : "signup"; render(); });
  $("#logout")?.addEventListener("click", async () => {
    await auth("logout");
    localStorage.removeItem("oddler:token");   // a fresh guest token is minted on reload
    location.href = "/";
  });
  $("#authform")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const err = $("#autherr"); err.textContent = "";
    const btn = ev.target.querySelector("button"); btn.disabled = true;
    const r = await auth(authMode, { username: $("#authuser").value.trim(), password: $("#authpass").value });
    btn.disabled = false;
    if (r.error) { err.textContent = r.error; return; }
    localStorage.setItem("oddler:token", r.token);
    toast(authMode === "signup" ? "ACCOUNT CREATED" : "LOGGED IN");
    setTimeout(() => { location.href = "/"; }, 500);
  });
  for (const b of document.querySelectorAll("[data-mode]")) {
    b.addEventListener("click", () => { chosenMode = b.dataset.mode; store.set("mode", chosenMode); sfx.click(); render(); });
  }
  for (const b of document.querySelectorAll("[data-colour]")) {
    b.addEventListener("click", () => {
      chosenColour = b.dataset.colour; store.set("colour", chosenColour); sfx.click();
      saveProfile({ colour: chosenColour });
      if (v.duo) act({ kind: "colour", colour: chosenColour });
      render();
    });
  }
  $("#how")?.addEventListener("click", () => { screen.innerHTML = tutorialHTML(); wireTutorial(); });
  $("#copylink")?.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(roomLink()); toast("LINK COPIED"); } catch { toast(roomLink()); }
  });
  $("#sharelink")?.addEventListener("click", async () => {
    const text = `Play Oddler with me — room ${roomParam}: ${roomLink()}`;
    try {
      if (navigator.share) await navigator.share({ text, url: roomLink() });
      else { await navigator.clipboard.writeText(text); toast("COPIED"); }
    } catch { /* cancelled */ }
  });
  const form = $("#form");
  if (form) {
    const input = $("#answer");
    input.focus({ preventScroll: true });
    if (v.duo) input.addEventListener("input", () => sendTyping(input.value));
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      clearTimeout(typingTimer);
      act({ kind: "answer", text });
      input.value = "";
      input.focus({ preventScroll: true });
    });
  }
  $("#skip")?.addEventListener("click", () => { sfx.click(); act({ kind: "skip" }); });
  $("#quit")?.addEventListener("click", () => {
    const msg = v.duo ? "Quit this game for both of you? Points so far are lost." : "Quit this run? Points so far are lost.";
    if (!confirm(msg)) return;
    sfx.click(); fanfare = null; showingLobby = true;
    act({ kind: "restart", quit: true });
  });
  for (const b of document.querySelectorAll("[data-banner]")) b.addEventListener("click", () => { sfx.click(); saveProfile({ banner: b.dataset.banner }); render(); });
  const fan = $("#fanfare");
  if (v.phase === "done" && fanfare && fan && !fan.dataset.ran) { fan.dataset.ran = "1"; animateXp(); }
  if (v.phase === "ask") startTimer(v);
  const next = $("#next");
  if (next) {
    next.focus({ preventScroll: true });
    next.addEventListener("click", () => { sfx.click(); act({ kind: "next" }); });
  }
  $("#again")?.addEventListener("click", () => {
    sfx.click();
    fanfare = null;
    if (v.duo) act({ kind: "start", mode: "duo", seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
    else if (v.challenge) act({ kind: "start", mode: "classic", challenge: v.challenge, seed: 1, seen: [] });
    else act({ kind: "start", mode: v.mode, seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
  });
  $("#lobby")?.addEventListener("click", () => { showingLobby = true; fanfare = null; render(); });
  $("#share")?.addEventListener("click", async () => {
    const text = shareText(v);
    try {
      if (navigator.share) await navigator.share(v.challenge ? { text, url: challengeLink(v.challenge, v.score) } : { text });
      else { await navigator.clipboard.writeText(text); toast("COPIED"); }
    } catch { /* cancelled */ }
  });
  document.onkeydown = (ev) => { if (ev.key === "Enter" && $("#next") && document.activeElement?.tagName !== "INPUT") $("#next").click(); };
}

function wireTutorial() {
  const out = $("#exout");
  const verdicts = {
    plain: `<span class="tier t1">Plain</span> <span class="px" style="font-size:11px;color:var(--lime)">+10</span><br>Correct, but it's the first country everyone names.`,
    odd: `<span class="tier t6">One in an Oddlion</span> <span class="px" style="font-size:11px;color:var(--lime)">+100</span><br>Also correct — and almost nobody says it. That grows a part.`,
  };
  for (const b of document.querySelectorAll("[data-ex]")) {
    b.addEventListener("click", () => {
      for (const o of document.querySelectorAll("[data-ex]")) o.setAttribute("aria-pressed", String(o === b));
      out.innerHTML = verdicts[b.dataset.ex];
      sfx.score(b.dataset.ex === "odd" ? 6 : 1);
    });
  }
  $("#gotit").addEventListener("click", () => { store.set("seenTutorial", true); showingLobby = true; render(); });
}

// ── boot ───────────────────────────────────────────────────────────────────

(async () => {
  // Locker first: it says who we are (an account's locker or this browser's
  // guest locker), what the creature wears and what it's called.
  await api("GET");
  indexCatalogue();
  PLAYER_ID = me?.id || await hashToken(TOKEN);
  room = roomParam || PLAYER_ID;
  if (me && !me.name && store.get("colour", null) && me.colour !== chosenColour) saveProfile({ colour: chosenColour });
  connect();
})();
