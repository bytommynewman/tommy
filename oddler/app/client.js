/**
 * Oddler client: the net harness (unchanged from the template) plus the
 * renderer. The server is authoritative — this file sends intents and draws
 * whatever `view` comes back. Server strings are never treated as markup.
 */

// ── net (keep this) ────────────────────────────────────────────────────────

const room = new URLSearchParams(location.search).get("room") || playerId();

/** Stable per-browser identity. One room per player, so it doubles as the room name. */
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
function onError(error) {
  // Rule rejections are quiet hints, not crashes.
  if (error === "type an answer") return;
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

function oddlerHTML(colour, parts, size = "", newId = null) {
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
  return `<div class="oddler ${size}${idle}" aria-label="Your Oddler with ${parts.length} parts">` +
    `<img class="base" src="/art/${BASE[colour] || BASE.pink}.png" alt="">${layers.join("")}</div>`;
}

// ── rendering ──────────────────────────────────────────────────────────────

let view = null;
let lastPhase = null;
let roundKey = null;        // startedAt of the round the timer is running for
let roundLocalStart = 0;    // performance.now() when this client first saw it
let timerHandle = 0;
let autoSkipped = false;
let chosenMode = store.get("mode", "classic");
let chosenColour = store.get("colour", "pink");
let lastNewPart = null;

function onState(msg) {
  const v = msg.view;
  if (!v) { setStatus(msg.status === "waiting" ? "waiting…" : ""); return; }
  const prev = view;
  view = v;
  if (v.colour) chosenColour = v.colour;
  if (v.mode) chosenMode = v.mode;

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
    const e = v.round.ended;
    if (e.tier) sfx.score(e.tier); else sfx.miss();
    lastNewPart = e.part ? e.part.id : null;
  }
  if (v.phase === "done" && prev?.phase !== "done") recordBest(v);
  render();
  lastPhase = v.phase;
}

function draw() {
  clearInterval(timerHandle);
  const v = view;
  if (!v) return;
  if (v.phase === "lobby" || v.phase === "done" && showingLobby) screen.innerHTML = lobbyHTML(v);
  else if (v.phase === "ask") screen.innerHTML = askHTML(v);
  else if (v.phase === "reveal") screen.innerHTML = revealHTML(v);
  else if (v.phase === "done") screen.innerHTML = doneHTML(v);
  wire();
}
let showingLobby = false;

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

function lobbyHTML(v) {
  const best = store.get(bestKey("classic"), 0);
  const bestE = store.get(bestKey("endless"), 0);
  const parts = v.phase === "done" ? v.parts : [];
  return `
    <section class="panel nest">
      ${oddlerHTML(chosenColour, parts, "big")}
      <div class="swatches" role="group" aria-label="Oddler colour">
        ${Object.keys(BASE).map((c) => `<button class="swatch" type="button" data-colour="${c}" aria-pressed="${c === chosenColour}" aria-label="${COLOUR_NAMES[c]}" style="background:${SWATCH[c]}"></button>`).join("")}
      </div>
    </section>
    <section class="panel">
      <h2>The odd dive</h2>
      <p>Every prompt has lots of right answers. <b>Only the uncommon ones score.</b> Rarer answers grow your Oddler new parts.</p>
      <div class="tabs" role="group" aria-label="Mode">
        ${Object.entries(MODE_INFO).map(([m, [name, sub]]) => `<button class="tab" type="button" data-mode="${m}" aria-pressed="${m === chosenMode}">${name}<small>${sub}</small></button>`).join("")}
      </div>
      <p style="margin-top:14px"><button id="start" class="btn" type="button">▼ GO ODD ▼</button></p>
      <p class="best">BEST CLASSIC: ${best} &nbsp;·&nbsp; BEST ENDLESS: ${bestE}</p>
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
      <p class="small dim">Rarity is editorial — set by the question writer, not live player counts. Spelling slips are forgiven; an answer not on our list keeps the clock running so you can try again.</p>
      <button id="gotit" class="btn lime" type="button">GOT IT</button>
    </section>`;
}

// ask ----------------------------------------------------------------------

function hudHTML(v) {
  const left = v.mode === "endless"
    ? `ENDLESS · ROUND ${v.roundNo} · <span class="strikes" aria-label="${v.strikes} of 3 misses">${"●".repeat(v.strikes)}${"○".repeat(3 - v.strikes)}</span>`
    : v.mode === "practice" ? `PRACTICE · ${v.roundNo}/${v.totalRounds}` : `ROUND ${v.roundNo}/${v.totalRounds}`;
  return `<div class="hud"><span>${left}</span><span class="score">${v.score} ODD</span></div>`;
}

function askHTML(v) {
  const r = v.round;
  const timed = v.roundMs != null;
  const tries = r.tries.length
    ? `<span>Not on our list: ${r.tries.map(esc).join(", ")}</span> <span class="ok">— keep trying</span>`
    : `<span class="ok">${r.answerCount} answers accepted. Think odd.</span>`;
  return `
    <section class="panel">
      ${hudHTML(v)}
      <p style="margin-top:12px"><span class="chip">${esc(r.category)}</span></p>
      <p class="prompt" id="prompt">${esc(r.prompt)}</p>
      ${timed ? `<div class="timer" aria-hidden="true"><div class="bar"><div class="fill" id="fill"></div></div><span class="secs" id="secs">10</span></div>` : `<p class="small dim">No clock — take your time.</p>`}
      <form class="answer" id="form" autocomplete="off">
        <label class="sr" for="answer">Your answer</label>
        <input id="answer" name="answer" type="text" placeholder="Type an uncommon answer…" autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="send" maxlength="80" required />
        <button class="btn lime" type="submit">GO</button>
      </form>
      <p class="tries" aria-live="polite">${tries}</p>
      <div class="askfoot"><button id="skip" class="link" type="button">Skip this one</button>${oddlerHTML(v.colour, v.parts, "mini")}</div>
    </section>`;
}

function startTimer(v) {
  const fill = $("#fill"), secs = $("#secs");
  if (!fill || v.roundMs == null) return;
  let lastWhole = Infinity;
  const tick = () => {
    const elapsed = performance.now() - roundLocalStart;
    const left = Math.max(0, v.roundMs - elapsed);
    fill.style.width = `${(left / v.roundMs) * 100}%`;
    const whole = Math.ceil(left / 1000);
    secs.textContent = String(whole);
    const low = left < 4000;
    fill.classList.toggle("low", low); secs.classList.toggle("low", low);
    if (low && whole < lastWhole && whole > 0) sfx.tick();
    lastWhole = whole;
    if (left <= 0 && !autoSkipped) {
      autoSkipped = true;
      clearInterval(timerHandle);
      act({ kind: "skip" });
    }
  };
  tick();
  timerHandle = setInterval(tick, 100);
}

// reveal -------------------------------------------------------------------

let TIERS_CACHE = [];
function tierName(t) { return TIERS_CACHE[t - 1]?.name ?? "Miss"; }

function revealHTML(v) {
  const r = v.round, e = r.ended;
  const tier = e.tier;
  const title = tier ? `<span class="tier t${tier}">${esc(tierName(tier))}</span>` : `<span class="tier t0">${autoSkipped || e.timedOut ? "OUT OF TIME" : "SKIPPED"}</span>`;
  const yours = tier
    ? `<p class="yours">${esc(e.answer)}${e.typed && e.typed.toLowerCase() !== e.answer.toLowerCase() ? ` <span class="small dim">(you typed “${esc(e.typed)}”)</span>` : ""}</p>`
    : `<p class="yours dim">No answer landed.</p>`;
  const earned = e.part
    ? `<div class="earned"><img src="/art/${esc(e.part.id)}.png" alt=""><div><b>New part!</b><br><span class="small">Your Oddler grew ${esc(PART_NAMES[e.part.id] || "something odd")}.</span></div></div>`
    : tier ? `<p class="small dim">Odd-ish or better grows a part. This one was ${tier < 3 ? "too plain" : "points only — every slot it fits is full"}.</p>` : "";
  const odder = r.odder.length
    ? `<p class="odder"><span class="dim">Odder picks:</span> ${r.odder.map((o) => `<b>${esc(o.name)}</b> <span class="small dim">(${esc(tierName(o.tier))}, ${TIERS_CACHE[o.tier - 1]?.pts ?? ""})</span>`).join(" · ")}</p>`
    : "";
  const last = v.mode !== "endless" && v.history.length >= v.totalRounds;
  const strikeOut = v.mode === "endless" && v.strikes >= 3;
  return `
    <section class="panel">
      ${hudHTML(v)}
      <p class="small dim" style="margin-top:12px">${esc(r.prompt)}</p>
      <p>${title} <span class="pts">${tier ? `+${e.pts}` : "+0"}</span></p>
      ${yours}
      <p class="small">${esc(r.reason)}</p>
      ${earned}
      ${odder}
      <p style="margin-top:14px"><button id="next" class="btn" type="button">${last || strikeOut ? "SEE RESULTS ▶" : "NEXT PROMPT ▶"}</button></p>
    </section>
    <section class="nest">${oddlerHTML(v.colour, v.parts, "", lastNewPart)}</section>`;
}

// done ---------------------------------------------------------------------

function doneHTML(v) {
  const newBest = store.get("newbest", false) && v.mode !== "practice";
  const best = store.get(bestKey(v.mode), 0);
  const ladder = v.history.map((h) => `<span class="t${h.tier}" style="background:var(--t${h.tier || 1});${h.tier ? "" : "opacity:.35"}" title="${esc(h.answer || "miss")}">${h.tier || "·"}</span>`).join("");
  const rows = v.history.map((h) => `<li><span>${esc(h.prompt)}<br><b>${esc(h.answer || (h.timedOut ? "out of time" : "skipped"))}</b></span><span>${h.tier ? esc(tierName(h.tier)) : "—"} · ${h.pts}</span></li>`).join("");
  const label = v.mode === "endless" ? `${v.history.length} rounds` : "Classic";
  return `
    <section class="panel nest">
      ${oddlerHTML(v.colour, v.parts, "big")}
      <p class="bigscore">${v.score} ODD</p>
      <p class="best ${newBest ? "new" : ""}">${v.mode === "practice" ? "PRACTICE RUN" : newBest ? "★ NEW PERSONAL BEST ★" : `BEST ${v.mode.toUpperCase()}: ${best}`}</p>
      <div class="ladder" aria-label="Round tiers" style="justify-content:center">${ladder}</div>
      <p class="small">${v.parts.length} part${v.parts.length === 1 ? "" : "s"} grown · ${label}</p>
      <div class="row">
        <button id="share" class="btn lime" type="button">SHARE</button>
        <button id="again" class="btn" type="button">PLAY AGAIN</button>
      </div>
      <p><button id="lobby" class="link" type="button">Change mode or colour</button></p>
    </section>
    <section class="panel">
      <h2>Your dive</h2>
      <ul class="history">${rows}</ul>
    </section>`;
}

function shareText(v) {
  const tiers = v.history.map((h) => "·▁▂▃▅▆█"[h.tier] || "·").join("");
  return `ODDLER · ${v.mode === "endless" ? `Endless (${v.history.length} rounds)` : "Classic"} · ${v.score} odd · ${v.parts.length} parts\n${tiers}\n${location.origin}`;
}

// wiring -------------------------------------------------------------------

function wire() {
  const v = view;
  $("#start")?.addEventListener("click", () => {
    sfx.click();
    showingLobby = false;
    act({ kind: "start", mode: chosenMode, colour: chosenColour, seed: Math.floor(Math.random() * 2 ** 31) });
  });
  for (const b of document.querySelectorAll("[data-mode]")) {
    b.addEventListener("click", () => { chosenMode = b.dataset.mode; store.set("mode", chosenMode); sfx.click(); render(); });
  }
  for (const b of document.querySelectorAll("[data-colour]")) {
    b.addEventListener("click", () => { chosenColour = b.dataset.colour; store.set("colour", chosenColour); sfx.click(); render(); });
  }
  $("#how")?.addEventListener("click", () => { screen.innerHTML = tutorialHTML(); wireTutorial(); });
  const form = $("#form");
  if (form) {
    const input = $("#answer");
    input.focus({ preventScroll: true });
    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      act({ kind: "answer", text });
      input.value = "";
      input.focus({ preventScroll: true });
    });
    $("#skip").addEventListener("click", () => { sfx.click(); act({ kind: "skip" }); });
    startTimer(v);
  }
  const next = $("#next");
  if (next) {
    next.focus({ preventScroll: true });
    next.addEventListener("click", () => { sfx.click(); act({ kind: "next" }); });
  }
  $("#again")?.addEventListener("click", () => {
    sfx.click();
    act({ kind: "start", mode: v.mode, colour: v.colour, seed: Math.floor(Math.random() * 2 ** 31) });
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

// First visit: the 30-second tutorial before the lobby.
let booted = false;
function render() {
  if (!booted && view) {
    booted = true;
    TIERS_CACHE = view.tiers.slice(1);
    if (view.phase === "lobby" && !store.get("seenTutorial", false)) { screen.innerHTML = tutorialHTML(); wireTutorial(); return; }
  }
  draw();
}

connect();
