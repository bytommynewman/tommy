#!/usr/bin/env bash
# Concatenate the rule pieces into one import-free logic.js and sanity-check it.
set -euo pipefail
cd "$(dirname "$0")"
cat 00-header.js 10-bank-a.js 11-bank-b.js 12-bank-c.js 13-bank-d.js 20-rules.js > logic.js
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
console.log("duo checks OK");
console.log("ALL LOGIC CHECKS PASSED");
'
wc -c logic.js
