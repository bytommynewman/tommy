#!/usr/bin/env bash
# Concatenate the rule pieces into one import-free logic.js and sanity-check it.
set -euo pipefail
cd "$(dirname "$0")"
cat 00-header.js 1*-bank*.js 20-rules.js > logic.js
node --input-type=module -e '
import * as L from "./logic.js";
const need = ["meta","setup","validateAction","applyAction","isGameOver","viewFor"];
for (const n of need) if (!(n in L)) throw new Error("missing export " + n);
const at0 = 1_700_000_000_000;
let s = L.setup(["p1"]);
const act = (a) => { const v = L.validateAction(s, "p1", a); if (!v.ok) throw new Error(a.kind + ": " + v.error); s = L.applyAction(s, "p1", a); };
act({ kind: "start", mode: "classic", colour: "mint", seed: 42, at: at0 });
let totalAnswers = 0; for (const q of L.QUESTIONS) totalAnswers += q.answers.length;
console.log("questions:", L.QUESTIONS.length, "answers:", totalAnswers);
for (let r = 0; r < 7; r++) {
  const v = L.viewFor(s, "p1");
  if (v.phase !== "ask") throw new Error("expected ask, got " + v.phase);
  // answer with the rarest listed answer of the open question (cheating via internals, for the test)
  const q = L.QUESTIONS.find((x) => x.prompt === v.round.prompt);
  const best = [...q.answers].sort((a, b) => b.tier - a.tier)[0];
  act({ kind: "answer", text: "zzzz not an answer", at: at0 + 1000 });
  if (L.viewFor(s).round.tries.length !== 1) throw new Error("miss should keep the round open");
  act({ kind: "answer", text: best.name.toUpperCase() + "!", at: at0 + 2000 });
  const rv = L.viewFor(s);
  if (rv.phase !== "reveal" || rv.round.ended.tier !== best.tier) throw new Error("reveal mismatch " + JSON.stringify(rv.round));
  act({ kind: "next", at: at0 + 3000 });
}
const done = L.viewFor(s);
if (done.phase !== "done") throw new Error("expected done, got " + done.phase);
console.log("classic run OK — score", done.score, "parts", done.parts.length, done.parts.map(p => p.id).join(","));
// timeout path
s = L.setup(["p1"]); act({ kind: "start", mode: "classic", at: at0 });
act({ kind: "answer", text: "France", at: at0 + 60_000 });
if (!L.viewFor(s).round.ended.timedOut) throw new Error("late answer should time out");
// fuzzy matching
const eu = L.QUESTIONS.find((q) => q.id === "eu-country");
for (const [t, want] of [["Liechtenstien","Liechtenstein"],["germny","Germany"],["the netherlands","Netherlands"],["Holland","Netherlands"],["UK","United Kingdom"],["Czechia","Czech Republic"],["xx", null]]) {
  const m = L.matchAnswer(eu, t); const got = m ? m.answer.name : null;
  if (got !== want) throw new Error(`match ${t}: got ${got}, want ${want}`);
}
// determinism: same inputs → same state
const a = L.applyAction(L.setup(["p1"]), "p1", { kind: "start", mode: "classic", seed: 7, at: at0 });
const b = L.applyAction(L.setup(["p1"]), "p1", { kind: "start", mode: "classic", seed: 7, at: at0 });
if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error("nondeterministic start");
// endless strikes
s = L.setup(["p1"]); act({ kind: "start", mode: "endless", at: at0 });
for (let i = 0; i < 3; i++) { act({ kind: "skip", at: at0 + 1 }); act({ kind: "next", at: at0 + 2 }); }
if (L.viewFor(s).phase !== "done") throw new Error("endless should end after 3 strikes");
// seen memory: prompts a player already met are avoided
{ const ids = L.QUESTIONS.slice(0, L.QUESTIONS.length - 2).map((q) => q.id);
  let t = L.setup(["p"]); t = L.applyAction(t, "p", { kind: "start", mode: "classic", seen: ids, at: at0 });
  if (ids.includes(L.viewFor(t, "p") && t.round.q)) throw new Error("seen prompt was dealt");
  const bad = L.validateAction(L.setup(["p"]), "p", { kind: "start", mode: "classic", seen: "nope", at: at0 });
  if (bad.ok) throw new Error("seen must be an array"); }
// old saved rooms (pre-duo shape) keep working
{ const old = { player: "p", phase: "ask", mode: "classic", colour: "pink", seed: 5, used: [L.QUESTIONS[0].id], round: { q: L.QUESTIONS[0].id, startedAt: at0, tries: [], ended: null }, history: [], score: 0, strikes: 0, parts: [] };
  const v = L.viewFor(old, "p"); if (!v.round || !v.round.yourTurn) throw new Error("old room: player should be on turn");
  const ok = L.validateAction(old, "p", { kind: "answer", text: "France", at: at0 + 1 }); if (!ok.ok) throw new Error("old room answer refused: " + ok.error);
  const lobby = { player: "p", phase: "lobby", mode: null, colour: "pink", seed: 1, used: [], round: null, history: [], score: 0, strikes: 0, parts: [] };
  const st = L.validateAction(lobby, "p", { kind: "start", mode: "classic", at: at0 }); if (!st.ok) throw new Error("old lobby start refused: " + st.error);
  const started = L.applyAction(lobby, "p", { kind: "start", mode: "classic", at: at0 }); if (started.phase !== "ask") throw new Error("old lobby start failed"); }
// duo: two seats, alternating turns, live typing, team score
let d = L.setup(["h"]);
const dact = (pid, a) => { const v = L.validateAction(d, pid, a); if (!v.ok) throw new Error(pid + " " + a.kind + ": " + v.error); d = L.applyAction(d, pid, a); };
const dfail = (pid, a, want) => { const v = L.validateAction(d, pid, a); if (v.ok || !v.error.includes(want)) throw new Error(`expected "${want}" for ${pid} ${a.kind}, got ${JSON.stringify(v)}`); };
dact("h", { kind: "sit", colour: "mint", at: at0 });
dfail("h", { kind: "start", mode: "duo", at: at0 }, "waiting for your partner");
dact("g", { kind: "sit", colour: "sand", at: at0 });
dfail("x", { kind: "sit", at: at0 }, "room is full");
dfail("g", { kind: "start", mode: "duo", at: at0 }, "only the host");
dact("h", { kind: "start", mode: "duo", at: at0 });
let dv = L.viewFor(d, "g");
if (dv.phase !== "ask" || dv.totalRounds !== 10 || !dv.duo || dv.duo.players.length !== 2) throw new Error("duo start broke " + JSON.stringify(dv.duo));
if (dv.round.yourTurn) throw new Error("host should go first");
dfail("g", { kind: "answer", text: "France", at: at0 + 1 }, "not your turn");
dfail("g", { kind: "skip", at: at0 + 1 }, "not your turn");
dact("h", { kind: "typing", text: "Liech", at: at0 + 1 });
if (L.viewFor(d, "g").round.typing !== "Liech") throw new Error("partner should see typing");
if (L.viewFor(d, "h").round.typing !== null) throw new Error("typer should not get own typing echoed");
dact("g", { kind: "skip", at: at0 + 60_000 }); // partner may close a round the clock already closed
if (L.viewFor(d, "g").phase !== "reveal") throw new Error("partner skip after timeout should reveal");
dact("g", { kind: "next", at: at0 + 60_001 });
if (!L.viewFor(d, "g").round.yourTurn) throw new Error("turn should alternate to guest");
{ const prompt = L.viewFor(d, "g").round.prompt; const q = L.QUESTIONS.find((x) => x.prompt === prompt); const best = [...q.answers].sort((a, b) => b.tier - a.tier)[0];
  dact("g", { kind: "answer", text: best.name, at: at0 + 60_002 });
  dv = L.viewFor(d, "h"); if (dv.round.ended.by !== "g" || dv.score !== L.TIERS[best.tier].pts) throw new Error("score should be team total");
  const gp = dv.duo.players.find((p) => p.id === "g"); if (gp.pts !== L.TIERS[best.tier].pts) throw new Error("guest pts should be credited");
  if (best.tier >= 3 && gp.parts.length !== 1) throw new Error("part should land on the answerer");
  dact("h", { kind: "next", at: at0 + 60_003 }); }
for (let i = 2; i < 10; i++) { const who = L.viewFor(d, "h").round.yourTurn ? "h" : "g"; dact(who, { kind: "skip", at: at0 + 70_000 + i }); dact("g", { kind: "next", at: at0 + 70_000 + i }); }
if (L.viewFor(d, "g").phase !== "done") throw new Error("duo should end after 10 rounds, got " + L.viewFor(d, "g").phase);
dact("h", { kind: "start", mode: "duo", at: at0 + 99_000 });
if (!L.viewFor(d, "g").round.yourTurn) throw new Error("second game should start with the other player");
if (L.viewFor(d, "g").score !== 0 || L.viewFor(d, "g").duo.players[1].parts.length !== 0) throw new Error("new game should reset score and parts");
// quitting mid-game returns a duo room to its lobby and leaves a notice
dact("g", { kind: "restart", quit: true, at: at0 + 100_001 }); // the second game is mid-round here
{ const q = L.viewFor(d, "h"); if (q.phase !== "duo-lobby" || !q.notice || !/quit/.test(q.notice.text)) throw new Error("quit should return to the duo lobby with a notice: " + JSON.stringify(q.notice)); }
console.log("duo checks OK");
// daily + challenge: fixed, shared prompt sets
{
  const day = L.dayOf(at0);
  const run = (mode, extra) => { let st = L.setup(["px"]); st = L.applyAction(st, "px", { kind: "start", mode, seed: Math.random() * 1e9 | 0, seen: L.QUESTIONS.slice(0, 50).map(q => q.id), ...extra, at: at0 }); const ids = [st.round.q]; for (let i = 0; i < 6; i++) { st = L.applyAction(st, "px", { kind: "skip", at: at0 + 60_000 }); st = L.applyAction(st, "px", { kind: "next", at: at0 + 60_000 }); ids.push(st.round?.q); } st = L.applyAction(st, "px", { kind: "skip", at: at0 + 60_000 }); st = L.applyAction(st, "px", { kind: "next", at: at0 + 60_000 }); return [ids, st]; };
  const [d1, s1] = run("daily", {}); const [d2] = run("daily", {});
  if (d1.join() !== d2.join() || d1.some((x) => !x)) throw new Error("daily sets differ: " + d1 + " vs " + d2);
  if (d1.join() !== L.dailyPrompts(day).join()) throw new Error("daily set is not dailyPrompts(day)");
  if (s1.phase !== "done" || s1.dailyDone !== day) throw new Error("daily did not finish or record the day");
  const v = L.validateAction(s1, "px", { kind: "start", mode: "daily", at: at0 + 1000 });
  if (v.ok) throw new Error("daily replay should be refused");
  if (!L.validateAction(s1, "px", { kind: "start", mode: "daily", at: at0 + 86_400_000 }).ok) throw new Error("the next day daily should be allowed");
  if (!L.validateAction(s1, "px", { kind: "start", mode: "classic", at: at0 + 1000 }).ok) throw new Error("classic after daily should be allowed");
  const [c1] = run("classic", { challenge: "abc123" }); const [c2] = run("classic", { challenge: "abc123" }); const [c3] = run("classic", { challenge: "abc124" });
  if (c1.join() !== c2.join()) throw new Error("challenge sets differ");
  if (c1.join() === c3.join()) throw new Error("different codes gave the same set");
  if (L.validateAction(L.setup(["px"]), "px", { kind: "start", mode: "classic", challenge: "BAD CODE!", at: at0 }).ok) throw new Error("bad challenge code accepted");
  if (new Set(L.dailyPrompts(day).concat(L.dailyPrompts(day + 1))).size !== 14) throw new Error("consecutive dailies overlap");
  console.log("daily/challenge checks OK —", d1.join(","));
}
// grading: spacing, number, saint, and no first-letter typos on short words
{
  const dog = L.QUESTIONS.find((q) => q.id === "dog-breed");
  const bone = L.QUESTIONS.find((q) => q.id === "bone");
  const eu = L.QUESTIONS.find((q) => q.id === "eu-country");
  const want = (q, typed, name) => { const m = L.matchAnswer(q, typed); const got = m ? m.answer.name : null; if (got !== name) throw new Error("grade " + typed + ": got " + got + ", want " + name); };
  want(eu, "newzealand", null); want(eu, "united-kingdom", "United Kingdom"); want(eu, "UnitedKingdom", "United Kingdom");
  want(bone, "femurs", "Femur"); want(bone, "rib", "Ribs"); want(bone, "phalanx", "Phalanges");
  want(dog, "saint bernard", "Saint Bernard"); want(dog, "St. Bernard", "Saint Bernard"); want(dog, "poodles", "Poodle");
  want(eu, "Iran", null); want(eu, "Fraance", "France"); want(eu, "Prance", null);
  console.log("grading checks OK");
}
// blitz: five-second clock, ten rounds; category pick narrows the deal
{
  let st = L.setup(["pb"]);
  st = L.applyAction(st, "pb", { kind: "start", mode: "blitz", seed: 5, at: at0 });
  const v = L.viewFor(st, "pb");
  if (v.roundMs !== 5000 || v.totalRounds !== 10) throw new Error("blitz view " + v.roundMs + "/" + v.totalRounds);
  const late = L.applyAction(st, "pb", { kind: "answer", text: "France", at: at0 + 7500 });
  if (!L.viewFor(late, "pb").round.ended?.timedOut) throw new Error("blitz answer at 7.5s should time out");
  for (let i = 0; i < 10; i++) { st = L.applyAction(st, "pb", { kind: "skip", at: at0 + 100 }); st = L.applyAction(st, "pb", { kind: "next", at: at0 + 200 }); }
  if (st.phase !== "done") throw new Error("blitz should finish after ten rounds");
  if (!L.CATEGORIES.includes("Geography")) throw new Error("categories missing Geography");
  let sc = L.setup(["pc"]);
  if (L.validateAction(sc, "pc", { kind: "start", mode: "classic", category: "Nope", at: at0 }).ok) throw new Error("unknown category accepted");
  sc = L.applyAction(sc, "pc", { kind: "start", mode: "classic", category: "Geography", seed: 9, at: at0 });
  for (let i = 0; i < 7; i++) {
    if (L.viewFor(sc, "pc").round.category !== "Geography") throw new Error("category pick not honoured");
    sc = L.applyAction(sc, "pc", { kind: "skip", at: at0 + 100 }); sc = L.applyAction(sc, "pc", { kind: "next", at: at0 + 200 });
  }
  console.log("blitz/category checks OK");
}
console.log("ALL LOGIC CHECKS PASSED");
'
wc -c logic.js
