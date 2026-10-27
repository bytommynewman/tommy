/**
 * Oddler client: the net harness (unchanged from the template) plus the
 * renderer. The server is authoritative — this file sends intents and draws
 * whatever `view` comes back. Server strings are never treated as markup.
 *
 * Rooms: a solo run lives in a room named after the player. Duo rooms are
 * named by a short code in `?room=`; two players seat themselves there.
 */

// ── net (keep this) ────────────────────────────────────────────────────────

const roomParam = (new URLSearchParams(location.search).get("room") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const room = roomParam || playerId();

/** Stable per-browser identity. One solo room per player, so it doubles as the room name. */
function playerId() {
  const key = "oddler:playerId";
  let id = localStorage.getItem(key);
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

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
    send({ type: "join", playerId: playerId() });
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
  // A room whose saved state the rules can no longer read: start it over
  // (once), rather than leaving the player staring at a dead screen.
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
};
const muteBtn = $("#mute");
function drawMute() {
  muteBtn.setAttribute("aria-pressed", String(!muted));
  muteBtn.setAttribute("aria-label", muted ? "Sound off" : "Sound on");
  muteBtn.textContent = muted ? "✕" : "♪";
}
muteBtn.addEventListener("click", () => { muted = !muted; store.set("muted", muted); drawMute(); if (!muted) sfx.click(); });
drawMute();

// ── the Oddler ─────────────────────────────────────────────────────────────

const BASE = { pink: "axo-base", mint: "col-mint", lav: "col-lav", sand: "col-sand", slate: "col-slate", char: "col-char" };
const COLOUR_NAMES = { pink: "Pink", mint: "Mint", lav: "Lavender", sand: "Sand", slate: "Slate", char: "Charcoal" };
const SWATCH = { pink: "#f08ca8", mint: "#7fe0b0", lav: "#b48fe0", sand: "#e9cfa0", slate: "#8fa4c4", char: "#4a3a4f" };
/** Where each slot sits on the base sprite, as % of its box. z<1 is behind the body. */
const ANCHORS = {
  horn: [{ x: 47, y: 2, w: 17, z: 5 }, { x: 34, y: 5, w: 14, z: 5, flip: true }, { x: 61, y: 5, w: 14, z: 5 }],
  back: [{ x: 50, y: 54, w: 38, z: 4 }],
  nub: [{ x: 28, y: 63, w: 12, z: 4 }, { x: 69, y: 63, w: 12, z: 4 }],
  wing: [{ x: 14, y: 66, w: 32, z: 0, flip: true }, { x: 86, y: 58, w: 32, z: 0 }],
  eye: [{ x: 30, y: 7, w: 12, z: 5 }, { x: 67, y: 7, w: 12, z: 5 }],
  antenna: [{ x: 51, y: -1, w: 17, z: 5 }],
  hat: [{ x: 48, y: 0, w: 30, z: 6 }],
  face: [{ x: 44, y: 37, w: 30, z: 6 }],
  flower: [{ x: 67, y: 22, w: 14, z: 6 }],
  held: [{ x: 29, y: 93, w: 14, z: 6 }],
  neck: [{ x: 50, y: 53, w: 28, z: 5 }],
  pack: [{ x: 73, y: 66, w: 22, z: 0 }],
};
const PART_NAMES = {
  "horn-00": "a curved horn", "horn-01": "an orange horn", "horn-02": "a lime horn", "horn-03": "a dark horn",
  "horn-04": "a spike ridge", "horn-05": "an orange spike ridge", "horn-06": "a lime spike ridge", "horn-07": "a dark spike ridge",
  "horn-08": "a tall spike", "horn-09": "an orange spike", "horn-10": "a lime spike", "horn-11": "a dark spike",
  "horn-12": "some grey nubs", "horn-13": "some orange warts", "horn-14": "some lime nubs", "horn-15": "some dark warts",
  "wing-00": "a bat wing", "wing-01": "an insect wing", "wing-02": "a purple bat wing", "wing-03": "a dragonfly wing",
  "wing-04": "a lime eye stalk", "wing-05": "a purple eye stalk", "wing-06": "an orange eye stalk", "wing-07": "a green eye stalk",
  "wing-08": "lime antennae", "wing-09": "a curling tentacle", "wing-10": "bobble antennae", "wing-11": "a lime tentacle",
  "wing-12": "a tiny crown", "wing-13": "a shark fin", "wing-14": "a mushroom cap", "wing-15": "a tuft of fur",
  "acc-00": "a party hat", "acc-01": "a bobble hat", "acc-02": "a wizard hat", "acc-03": "a flat cap",
  "acc-04": "round spectacles", "acc-05": "a flower", "acc-06": "a bandana", "acc-07": "headphones",
  "acc-08": "a tiny mug", "acc-09": "a lantern", "acc-10": "a little flag", "acc-11": "a magnifying glass",
  "acc-12": "a scarf", "acc-13": "a backpack", "acc-14": "a bow tie", "acc-15": "a cape",
};

function oddlerHTML(colour, parts, size = "", newId = null, label = "") {
  const used = {};
  const layers = [];
  for (const p of parts) {
    const list = ANCHORS[p.slot] || [];
    const i = used[p.slot] = (used[p.slot] ?? 0);
    used[p.slot] = i + 1;
    const a = list[i];
    if (!a) continue;
    layers.push(
      `<img class="part${a.flip ? " flip" : ""}${p.id === newId ? " new" : ""}" src="/art/${esc(p.id)}.png" alt="" ` +
      `style="left:${a.x}%;top:${a.y}%;width:${a.w}%;z-index:${a.z}">`,
    );
  }
  const idle = reduced ? "" : " idle";
  return `<div class="oddler ${size}${idle}" aria-label="${esc(label || "Your Oddler")} with ${parts.length} parts">` +
    `<img class="base" src="/art/${BASE[colour] || BASE.pink}.png" alt="">${layers.join("")}</div>`;
}

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
let satDown = false;
let TIERS_CACHE = [];
let booted = false;
let partnerCount = 0;

function onState(msg) {
  const v = msg.view;
  if (!v) { setStatus(msg.status === "waiting" ? "waiting…" : ""); return; }
  const prev = view;
  view = v;
  if (!booted) { booted = true; TIERS_CACHE = v.tiers.slice(1); }

  // Duo rooms: take a seat the moment we arrive, once.
  const duoRoom = Boolean(roomParam);
  if (duoRoom && !satDown && !(v.duo && v.duo.seated)) {
    const open = (!v.duo && v.phase === "lobby") || (v.duo && v.duo.players.length < 2 && v.phase === "duo-lobby");
    if (open) { satDown = true; act({ kind: "sit", colour: chosenColour }); }
  }
  if (v.duo) {
    const me = v.duo.players.find((p) => p.isYou);
    if (me) chosenColour = me.colour;
    if (v.duo.players.length > partnerCount && partnerCount > 0) sfx.join();
    partnerCount = v.duo.players.length;
  } else if (v.colour) chosenColour = v.colour;
  if (v.mode && v.mode !== "duo") chosenMode = v.mode;

  if (v.phase === "ask") {
    showingLobby = false;
    const key = v.round.startedAt;
    if (key !== roundKey) {
      roundKey = key;
      autoSkipped = false;
      // Fresh round: run a full clock locally. A reload mid-round (startedAt
      // already old) trusts the server's clock instead so the bar is honest.
      const age = Date.now() - key;
      roundLocalStart = performance.now() - (age > 3000 ? age : 0);
      lastNewPart = null;
    }
  } else {
    roundKey = null;
  }
  if (v.phase === "reveal" && prev?.phase === "ask") {
    rememberSeen(v.history.slice(-1));
    const e = v.round.ended;
    if (e.tier) sfx.score(e.tier); else sfx.miss();
    lastNewPart = e.part ? e.part.id : null;
  }
  if (v.phase === "done" && prev?.phase !== "done") recordBest(v);
  render();
}

function render() {
  const v = view;
  if (!v) return;
  if (!v.duo && !roomParam && v.phase === "lobby" && !store.get("seenTutorial", false)) { screen.innerHTML = tutorialHTML(); wireTutorial(); return; }
  // Mid-round updates (a partner's keystrokes, a miss) patch in place so the
  // typer never loses the input box or the clock.
  if (v.phase === "ask" && screen.dataset.phase === "ask" && screen.dataset.round === String(v.round.startedAt)) {
    const live = $("#livetyping"); if (live) live.textContent = v.round.typing || "";
    const tries = $(".tries"); if (tries) tries.innerHTML = triesHTML(v.round);
    return;
  }
  screen.dataset.phase = v.phase;
  screen.dataset.round = v.round ? String(v.round.startedAt) : "";
  clearInterval(timerHandle);
  const vig = $("#vignette"); if (vig) { vig.classList.remove("danger"); vig.style.setProperty("--urg", "0"); }
  if (v.duo && !v.duo.seated && (v.duo.players.length >= 2 || v.phase !== "duo-lobby")) screen.innerHTML = spectatorHTML(v);
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
  classic: ["Classic", "7 prompts · 5s each"],
  endless: ["Endless", "Until 3 misses"],
  practice: ["Practice", "No clock, same rules"],
};

function swatchesHTML(current) {
  return `<div class="swatches" role="group" aria-label="Oddler colour">
    ${Object.keys(BASE).map((c) => `<button class="swatch" type="button" data-colour="${c}" aria-pressed="${c === current}" aria-label="${COLOUR_NAMES[c]}" style="background:${SWATCH[c]}"></button>`).join("")}
  </div>`;
}

function lobbyHTML(v) {
  const best = store.get(bestKey("classic"), 0);
  const bestE = store.get(bestKey("endless"), 0);
  const bestD = store.get(bestKey("duo"), 0);
  const parts = v.phase === "done" ? v.parts : [];
  return `
    <section class="panel nest">
      ${oddlerHTML(chosenColour, parts, "big")}
      ${swatchesHTML(chosenColour)}
    </section>
    <section class="panel">
      <h2>The odd dive</h2>
      <p>Every prompt has lots of right answers. <b>Only the uncommon ones score.</b> Rarer answers grow your Oddler new parts.</p>
      <div class="tabs" role="group" aria-label="Mode">
        ${Object.entries(MODE_INFO).map(([m, [name, sub]]) => `<button class="tab" type="button" data-mode="${m}" aria-pressed="${m === chosenMode}">${name}<small>${sub}</small></button>`).join("")}
      </div>
      <p style="margin-top:14px"><button id="start" class="btn" type="button">▼ GO ODD ▼</button></p>
      <p><button id="duo" class="btn ghost" type="button">PLAY WITH A FRIEND</button></p>
      <p class="small dim" style="text-align:center;margin-top:-4px">Duo: 10 prompts, you take turns, one team score.</p>
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
        <p class="small">The prompts and their answer lists are written by hand for Oddler — general-knowledge categories (places, food, animals, sport, music, screens, science, everyday stuff), each with everything we could think of that counts, plus nicknames and alternate spellings.</p>
        <p class="small">Each accepted answer is given a rarity tier by the question writer, judging how quickly an average person would think of it. Plain is the first thing everyone says; One in an Oddlion is something almost nobody says. The tier sets the points (10 to 100). It is editorial, not live player statistics, so the same answer is worth the same to everyone.</p>
        <p class="small">Spelling slips are forgiven (one typo in a medium word, two in a long one). An answer not on our list keeps the clock running so you can try again. Odd-ish or better grows a part on your Oddler.</p>
      </details>
      <button id="gotit" class="btn lime" type="button">GOT IT</button>
    </section>`;
}

// duo lobby ------------------------------------------------------------------

function roomLink() { return `${location.origin}/?room=${encodeURIComponent(roomParam)}`; }

function duoLobbyHTML(v) {
  const me = v.duo.players.find((p) => p.isYou);
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
      <div class="team">
        <div class="seat">
          ${oddlerHTML(me.colour, [], "", null, "You")}
          <p class="px seatname">YOU</p>
        </div>
        <div class="seat ${partner ? "" : "empty"}">
          ${partner ? oddlerHTML(partner.colour, [], "", null, "Partner") : `<div class="oddler"><div class="waiting">waiting for<br>your partner…</div></div>`}
          <p class="px seatname">${partner ? "PARTNER" : "…"}</p>
        </div>
      </div>
      ${swatchesHTML(me.colour)}
      <p style="margin-top:14px">${isHost
        ? `<button id="start" class="btn" type="button" ${partner ? "" : "disabled"}>${partner ? "▼ START DUO ▼" : "WAITING FOR PARTNER"}</button>`
        : `<p class="px small dim" style="text-align:center">${partner ? "WAITING FOR THE HOST TO START" : "WAITING…"}</p>`}</p>
      <p class="small dim" style="text-align:center">10 prompts, 5 s each. You take turns; your partner sees you type. Points add up to one team score.</p>
      <p style="text-align:center"><a class="link" href="/">Leave room</a></p>
    </section>`;
}

function joiningHTML() {
  return `<section class="panel" style="text-align:center"><h2>Duo room</h2><p class="code">${esc(roomParam)}</p><p class="px small dim">TAKING A SEAT…</p></section>`;
}

function spectatorHTML(v) {
  return `
    <section class="panel" style="text-align:center">
      <h2>Room ${esc(roomParam)} is full</h2>
      <p>Two Oddlers are already seated here. You can watch, or <a class="link" href="/">start your own</a>.</p>
      <div class="team">${v.duo.players.map((p) => `<div class="seat">${oddlerHTML(p.colour, p.parts, "")}<p class="px seatname">${p.pts} ODD</p></div>`).join("")}</div>
      ${v.round ? `<p class="small dim">${esc(v.round.prompt)}</p>` : ""}
      <p class="bigscore" style="font-size:22px">${v.score} ODD</p>
    </section>`;
}

// ask ----------------------------------------------------------------------

function hudHTML(v) {
  let left;
  if (v.duo) left = `DUO · ROUND ${v.roundNo}/${v.totalRounds}`;
  else if (v.mode === "endless") left = `ENDLESS · ROUND ${v.roundNo} · <span class="strikes" aria-label="${v.strikes} of 3 misses">${"●".repeat(v.strikes)}${"○".repeat(3 - v.strikes)}</span>`;
  else if (v.mode === "practice") left = `PRACTICE · ${v.roundNo}/${v.totalRounds}`;
  else left = `ROUND ${v.roundNo}/${v.totalRounds}`;
  return `<div class="hud"><span>${left}</span><span class="score">${v.duo ? "TEAM " : ""}${v.score} ODD</span></div>`;
}

function teamHTML(v, newPart = null) {
  return `<div class="team compact">${v.duo.players.map((p) => `
    <div class="seat ${p.isTurn ? "turn" : ""}">
      ${oddlerHTML(p.colour, p.parts, "mini", newPart && newPart.by === p.id ? newPart.id : null, p.isYou ? "You" : "Partner")}
      <p class="px seatname">${p.isYou ? "YOU" : "PARTNER"} · ${p.pts}</p>
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
    : `<div class="live" aria-live="polite"><span class="px livelabel">PARTNER IS TYPING</span><div class="livetext"><span id="livetyping">${esc(r.typing || "")}</span><span class="caret"></span></div></div>`;
  const foot = v.duo
    ? teamHTML(v)
    : `<div class="askfoot"><button id="skip" class="link" type="button">Skip this one</button>${oddlerHTML(v.colour, v.parts, "mini")}</div>`;
  const duoSkip = v.duo && mine ? `<p style="text-align:right;margin:0"><button id="skip" class="link" type="button">Skip this one</button></p>` : "";
  return `
    <section class="panel ask" id="askpanel">
      ${hudHTML(v)}
      ${v.duo ? `<div class="onclock ${mine ? "you" : "them"}">${mine ? "▶ YOU'RE ON THE CLOCK ◀" : "PARTNER IS ON THE CLOCK"}</div>` : ""}
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
    const urg = 1 - left / v.roundMs;            // 0 calm → 1 out of time
    fill.style.width = `${(left / v.roundMs) * 100}%`;
    const whole = Math.ceil(left / 1000);
    if (whole !== lastWhole) {
      secs.textContent = String(whole);
      // Re-trigger the punch animation on every new digit.
      secs.classList.remove("punch"); void secs.offsetWidth; secs.classList.add("punch");
      if (whole > 0 && whole <= 3) sfx.tick();
      lastWhole = whole;
    }
    clock.classList.toggle("warn", left < 3000);
    clock.classList.toggle("danger", left < 1500);
    panel?.classList.toggle("shake", left < 1200 && left > 0 && !reduced);
    if (vignette) { vignette.style.setProperty("--urg", urg.toFixed(3)); vignette.classList.toggle("danger", left < 1500 && left > 0); }
    // Heartbeat that speeds up as the clock runs down.
    if (left > 0 && elapsed >= nextBeat) { sfx.beat(urg); nextBeat = elapsed + (900 - 600 * urg); }
    // The player on turn closes the round at zero; a partner only steps in
    // after the server's grace has passed too (their skip is refused before).
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
  const who = v.duo ? (r.yourTurn ? "You" : "Your partner") : "You";
  const title = tier ? `<span class="tier t${tier}">${esc(tierName(tier))}</span>` : `<span class="tier t0">${autoSkipped || e.timedOut ? "OUT OF TIME" : "SKIPPED"}</span>`;
  const yours = tier
    ? `<p class="yours">${esc(e.answer)}${e.typed && e.typed.toLowerCase() !== e.answer.toLowerCase() ? ` <span class="small dim">(${v.duo ? who.toLowerCase() : "you"} typed “${esc(e.typed)}”)</span>` : ""}</p>`
    : `<p class="yours dim">No answer landed.</p>`;
  const owner = v.duo ? (r.yourTurn ? "Your" : "Your partner's") : "Your";
  const earned = e.part
    ? `<div class="earned"><img src="/art/${esc(e.part.id)}.png" alt=""><div><b>New part!</b><br><span class="small">${owner} Oddler grew ${esc(PART_NAMES[e.part.id] || "something odd")}.</span></div></div>`
    : tier ? `<p class="small dim">Odd-ish or better grows a part. This one was ${tier < 3 ? "too plain" : "points only — every slot it fits is full"}.</p>` : "";
  const odder = r.odder.length
    ? `<p class="odder"><span class="dim">Odder picks:</span> ${r.odder.map((o) => `<b>${esc(o.name)}</b> <span class="small dim">(${esc(tierName(o.tier))}, ${TIERS_CACHE[o.tier - 1]?.pts ?? ""})</span>`).join(" · ")}</p>`
    : "";
  const last = v.mode !== "endless" && v.history.length >= v.totalRounds;
  const strikeOut = v.mode === "endless" && v.strikes >= 3;
  const foot = v.duo ? teamHTML(v, e.part ? { id: e.part.id, by: e.by } : null) : "";
  return `
    <section class="panel">
      ${hudHTML(v)}
      <p class="small dim" style="margin-top:12px">${esc(r.prompt)}${v.duo ? ` · <b>${who}</b>` : ""}</p>
      <p>${title} <span class="pts">${tier ? `+${e.pts}` : "+0"}</span></p>
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

function doneHTML(v) {
  const newBest = store.get("newbest", false) && v.mode !== "practice";
  const best = store.get(bestKey(v.mode), 0);
  const ladder = v.history.map((h) => `<span class="t${h.tier}" style="background:var(--t${h.tier || 1});${h.tier ? "" : "opacity:.35"}" title="${esc(h.answer || "miss")}">${h.tier || "·"}</span>`).join("");
  const rows = v.history.map((h) => `<li><span>${esc(h.prompt)}<br><b>${esc(h.answer || (h.timedOut ? "out of time" : "skipped"))}</b>${v.duo ? ` <span class="small dim">· ${h.by === v.duo.you ? "you" : "partner"}</span>` : ""}</span><span>${h.tier ? esc(tierName(h.tier)) : "—"} · ${h.pts}</span></li>`).join("");
  const label = v.duo ? "Duo" : v.mode === "endless" ? `${v.history.length} rounds` : "Classic";
  const isHost = v.duo && v.duo.host === v.duo.you;
  const creatures = v.duo
    ? `<div class="team">${v.duo.players.map((p) => `<div class="seat">${oddlerHTML(p.colour, p.parts, "", null, p.isYou ? "You" : "Partner")}<p class="px seatname">${p.isYou ? "YOU" : "PARTNER"} · ${p.pts}</p></div>`).join("")}</div>`
    : oddlerHTML(v.colour, v.parts, "big");
  const partsCount = v.duo ? v.duo.players.reduce((n, p) => n + p.parts.length, 0) : v.parts.length;
  const again = v.duo
    ? (isHost ? `<button id="again" class="btn" type="button">PLAY AGAIN</button>` : `<button class="btn" type="button" disabled>HOST STARTS NEXT</button>`)
    : `<button id="again" class="btn" type="button">PLAY AGAIN</button>`;
  return `
    <section class="panel nest">
      ${creatures}
      <p class="bigscore">${v.score} ODD</p>
      <p class="best ${newBest ? "new" : ""}">${v.mode === "practice" ? "PRACTICE RUN" : newBest ? "★ NEW PERSONAL BEST ★" : `BEST ${v.mode.toUpperCase()}: ${best}`}</p>
      <div class="ladder" aria-label="Round tiers" style="justify-content:center">${ladder}</div>
      <p class="small">${partsCount} part${partsCount === 1 ? "" : "s"} grown · ${label}</p>
      <div class="row">
        <button id="share" class="btn lime" type="button">SHARE</button>
        ${again}
      </div>
      <p>${v.duo ? `<a class="link" href="/">Leave room</a>` : `<button id="lobby" class="link" type="button">Change mode or colour</button>`}</p>
    </section>
    <section class="panel">
      <h2>Your dive</h2>
      <ul class="history">${rows}</ul>
    </section>`;
}

function shareText(v) {
  const tiers = v.history.map((h) => "·▁▂▃▅▆█"[h.tier] || "·").join("");
  const mode = v.duo ? "Duo" : v.mode === "endless" ? `Endless (${v.history.length} rounds)` : "Classic";
  return `ODDLER · ${mode} · ${v.score} odd\n${tiers}\n${location.origin}`;
}

// wiring -------------------------------------------------------------------

/** Prompts this browser has met, newest last, so later runs avoid them. */
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

function wire() {
  const v = view;
  $("#start")?.addEventListener("click", () => {
    sfx.click();
    showingLobby = false;
    if (v.duo) act({ kind: "start", mode: "duo", seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
    else act({ kind: "start", mode: chosenMode, colour: chosenColour, seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
  });
  $("#duo")?.addEventListener("click", () => { sfx.click(); location.href = `/?room=${makeCode()}`; });
  for (const b of document.querySelectorAll("[data-mode]")) {
    b.addEventListener("click", () => { chosenMode = b.dataset.mode; store.set("mode", chosenMode); sfx.click(); render(); });
  }
  for (const b of document.querySelectorAll("[data-colour]")) {
    b.addEventListener("click", () => {
      chosenColour = b.dataset.colour; store.set("colour", chosenColour); sfx.click();
      if (v.duo) act({ kind: "colour", colour: chosenColour }); else render();
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
  if (v.phase === "ask") startTimer(v);
  const next = $("#next");
  if (next) {
    next.focus({ preventScroll: true });
    next.addEventListener("click", () => { sfx.click(); act({ kind: "next" }); });
  }
  $("#again")?.addEventListener("click", () => {
    sfx.click();
    if (v.duo) act({ kind: "start", mode: "duo", seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
    else act({ kind: "start", mode: v.mode, colour: v.colour, seed: Math.floor(Math.random() * 2 ** 31), seen: seenPrompts() });
  });
  $("#lobby")?.addEventListener("click", () => { showingLobby = true; render(); });
  $("#share")?.addEventListener("click", async () => {
    const text = shareText(v);
    try {
      if (navigator.share) await navigator.share({ text });
      else { await navigator.clipboard.writeText(text); toast("COPIED"); }
    } catch { /* cancelled */ }
  });
  // Keyboard: Enter advances the reveal.
  document.onkeydown = (ev) => { if (ev.key === "Enter" && $("#next")) $("#next").click(); };
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

connect();
