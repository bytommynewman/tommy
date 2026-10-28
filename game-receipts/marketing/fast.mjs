// "Fast" sound-on cuts of the screen ads (spot-1..6, A1, A2, B1) built from the EXISTING raw captures (out/raw, reels/out/raw).
//   node marketing/fast.mjs [spot-1 .. spot-6 A1 A2 B1] [--check] [--no-ig]     (or: render.mjs --fast [1 2 ..] / reels/render-reels.mjs --fast [A1 ..])
// Outputs: marketing/out/fast/<name>-fast.mp4 (2160x3840 4K) and <name>-fast-ig.mp4 (1080x1920 H.264 High, BT.709, 2-pass ~10 Mbps, AAC 48k, +faststart).
//
// Edit rules (checked by plan(): it throws when one is broken)
//   * 8-12 s total (spot 2 <= 9 s), 1.2 s end card, hard cuts, beats 0.6-1.2 s, app footage <= 1.5x, captions >= 0.7 s and <= 5 words
//   * frame 0 = the payoff (LOCKED date stamp on a take card, or Cashed + Prestige for receipt spots) with the hook already on screen,
//     then a short "rewind" (the same footage played backwards at 1x), then how it was made, ending on the stamp / leaderboard
//   * audio on every video: marketing/audio/hype-bed.m4a (Higgsfield sonilo_music, starts on a kick) + synthesised SFX (sfx.mjs):
//     thud on each stamp, whoosh on cuts, rewind sweep on the rewind cut, tick on dropdown changes; music ducked -6 dB under thuds, -14 LUFS / <= -1.5 dBTP
// A segment = a time range of a raw capture. Fields: src a b (raw seconds) sp (speed) rev z{z,px,py} cap capTo step ticks[] thud[] fy
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bug, endLogo } from "./brand.mjs";
import { encode4k, scaleToBt709 } from "./encode4k.mjs";
import { mixAudio, measure } from "./sfx.mjs";
import * as TY from "./type.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const OUT = path.join(here, "out/fast");
const TMP = path.join(OUT, ".tmp");
const CACHE = path.join(here, "out/.cache");
fs.mkdirSync(TMP, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const END = 1.2;
const cfg = JSON.parse(fs.readFileSync(path.join(here, "spots.json"), "utf8"));

const RAW = {};
for (let i = 1; i <= 6; i++) RAW[`spot-${i}`] = path.join(here, "out/raw", `spot-${i}.mp4`);
for (const id of ["A1", "A2", "B1"]) RAW[id] = path.join(here, "reels/out/raw", `${id}.mp4`);
const SRC_SIZE = { spot: [1950, 4220], A: [2184, 4726], B: [1950, 4220] };

// ---- timelines (raw-capture seconds; see the contact-sheet notes in QA.md) -------------------------------------------
const S = (src, a, b, o = {}) => ({ src, a, b, sp: 1, ...o });
const STAMP = { z: 1.2, px: 0.5, py: 0.47 };            // push-in onto the date stamp (capped so the phone is never upscaled)
const hookOf = (id) => cfg.spots.find((s) => s.id === id).hook;
export const FAST = {
  "spot-1": { kind: "spot", id: 1, name: "spot-1", hook: hookOf(1), key: "called", segs: [
    S("spot-1", 12.55, 13.75, { z: STAMP, thud: [0] }),
    S("spot-1", 11.75, 12.35, { rev: true }),
    S("spot-1", 2.7, 3.9, { sp: 1.5, cap: "Bro swears he called it" }),
    S("spot-1", 5.7, 6.9, { sp: 1.5, cap: "Pick your league", ticks: [0.35] }),
    S("spot-1", 7.2, 8.9, { sp: 1.5, cap: "Find your team" }),
    S("spot-1", 9.0, 10.3, { sp: 1.5, cap: "Pick how far", ticks: [0.3] }),
    S("spot-1", 10.8, 11.9, { sp: 1.5, cap: "Place take" }),
    S("spot-1", 12.45, 13.5, { z: STAMP, thud: [0], cap: "Stamped. LOCKED." }),
    S("spot-1", 14.5, 15.55, { cap: "Prove who's right" }),
  ] },
  "spot-2": { kind: "spot", id: 2, name: "spot-2", hook: hookOf(2), key: "10", max: 9, segs: [
    S("spot-2", 10.4, 11.6, { z: STAMP, thud: [0] }),
    S("spot-2", 9.8, 10.4, { rev: true }),
    S("spot-2", 3.0, 4.5, { sp: 1.5, cap: "Pick your league", ticks: [0.65] }),
    S("spot-2", 5.3, 7.0, { sp: 1.5, cap: "Search. Pick team." }),
    S("spot-2", 7.1, 8.6, { sp: 1.5, cap: "Pick a take", ticks: [0.3, 0.7] }),
    S("spot-2", 8.6, 10.0, { sp: 1.5, cap: "Place take" }),
    S("spot-2", 10.4, 11.6, { z: STAMP, thud: [0], cap: "LOCKED. Clock stopped." }),
  ] },
  "spot-3": { kind: "spot", id: 3, name: "spot-3", hook: hookOf(3), key: "MVP", segs: [
    S("spot-3", 11.8, 13.0, { z: STAMP, thud: [0] }),
    S("spot-3", 11.1, 11.7, { rev: true }),
    S("spot-3", 5.2, 6.7, { sp: 1.5, cap: "Call your MVP" }),
    S("spot-3", 6.7, 8.4, { sp: 1.5, cap: "Pick the award", ticks: [0.25, 0.6, 0.95] }),
    S("spot-3", 8.8, 10.5, { sp: 1.5, cap: "Wins it. Place take.", ticks: [0.2] }),
    S("spot-3", 11.9, 13.1, { z: STAMP, thud: [0], cap: "Stamped with the date" }),
    S("spot-3", 13.9, 15.0, { cap: "Graded when it's done" }),
  ] },
  "spot-4": { kind: "spot", id: 4, name: "spot-4", hook: hookOf(4), key: "receipt", segs: [
    S("spot-4", 0.3, 1.5, { thud: [0] }),
    S("spot-4", 12.2, 12.8, { rev: true }),
    S("spot-4", 4.0, 5.2, { cap: "Every take is a receipt" }),
    S("spot-4", 5.2, 6.4, { cap: "Dated. Sealed." }),
    S("spot-4", 9.8, 10.8, { cap: "Can't be edited" }),
    S("spot-4", 11.9, 13.1, { cap: "Graded: CASHED", thud: [0.75] }),
    S("spot-4", 15.0, 16.2, { cap: "Best calls climb" }),
  ] },
  "spot-5": { kind: "spot", id: 5, name: "spot-5", hook: hookOf(5), key: "Prove", segs: [
    S("spot-3", 11.8, 13.0, { z: STAMP, thud: [0] }),
    S("spot-3", 11.1, 11.7, { rev: true }),
    S("spot-5", 4.4, 5.6, { sp: 1.2, cap: "See a take you'd fade?" }),
    S("spot-5", 5.8, 7.3, { sp: 1.5, cap: "Challenge it", ticks: [0.5] }),
    S("spot-5", 7.0, 8.4, { sp: 1.5, cap: "Send the battle" }),
    S("spot-5", 12.0, 13.2, { cap: "Build a reputation" }),
    S("spot-5", 9.0, 10.2, { cap: "Climb the leaderboards" }),
  ] },
  "spot-6": { kind: "spot", id: 6, name: "spot-6", hook: hookOf(6), key: null, segs: [
    S("spot-1", 12.55, 13.75, { z: STAMP, thud: [0] }),
    S("spot-1", 11.75, 12.35, { rev: true }),
    S("spot-6", 3.3, 4.8, { sp: 1.5, cap: "NFL. NBA. NHL. MLB. NCAA.", ticks: [0.2, 0.45, 0.7] }),
    S("spot-6", 7.0, 8.7, { sp: 1.5, cap: "Search any player" }),
    S("spot-6", 9.6, 11.4, { sp: 1.5, cap: "QB? Passing yards & TDs", ticks: [0.4, 0.8] }),
    S("spot-6", 13.0, 14.5, { sp: 1.5, cap: "Goalie? Saves & shutouts" }),
    S("spot-6", 15.0, 16.5, { sp: 1.5, ticks: [0.3, 0.65] }),
    S("spot-1", 12.45, 13.5, { z: STAMP, thud: [0], cap: "Lock it. Any league." }),
  ] },
  A1: { kind: "A", name: "A1", hook: "Watch me lock my MVP pick in under 10 seconds", key: "MVP", topMatch: /mvp/i, faceY: 230, segs: [
    S("A1", 7.4, 8.6, { thud: [0], fy: 0.33 }),
    S("A1", 6.9, 7.5, { rev: true, fy: 0.33 }),
    S("A1", 0.7, 1.9, { sp: 1.5, step: 1, cap: "Pick your league", fy: 0.3, ticks: [0.3] }),
    S("A1", 1.9, 3.4, { sp: 1.5, step: 2, cap: "Search your guy", fy: 0.45 }),
    S("A1", 4.0, 5.8, { sp: 1.5, step: 3, cap: "Pick a take", fy: 0.5, ticks: [0.3, 0.7] }),
    S("A1", 5.9, 6.8, { step: 4, cap: "Place it. Stamped.", fy: 0.9 }),
    S("A1", 7.6, 8.6, { thud: [0], fy: 0.33 }),
    S("A1", 9.7, 10.9, { cap: "Graded when it's done", fy: 0.3 }),
  ] },
  A2: { kind: "A", name: "A2", hook: "How to prove you called it (takes 6 seconds)", key: "called", topMatch: /kyle/i, faceY: 190, segs: [
    S("A2", 6.8, 8.0, { thud: [0], fy: 0.4 }),
    S("A2", 6.3, 6.9, { rev: true, fy: 0.4 }),
    S("A2", 1.2, 2.9, { sp: 1.5, step: 1, cap: "Pick your team", fy: 0.4 }),
    S("A2", 3.8, 5.2, { sp: 1.5, step: 2, cap: "Pick how far they go", fy: 0.5, ticks: [0.35, 0.7] }),
    S("A2", 5.3, 6.3, { step: 3, cap: "Place take", fy: 0.9 }),
    S("A2", 6.6, 7.8, { thud: [0.1], fy: 0.4 }),
    S("A2", 9.55, 10.6, { step: 4, cap: "Screenshot the receipt", fy: 0.4 }),
  ] },
  B1: { kind: "B", name: "B1", hook: "easiest way to win every sports argument fr \u{1F62D}", segs: [
    S("B1", 8.0, 9.2, { thud: [0] }),
    S("B1", 7.0, 7.6, { rev: true }),
    S("B1", 2.2, 4.0, { sp: 1.5, cap: "pick your player" }),
    S("B1", 4.4, 6.2, { sp: 1.5, cap: "pick your take", ticks: [0.3, 0.7] }),
    S("B1", 6.0, 7.1, { cap: "hit place" }),
    S("B1", 8.0, 9.2, { thud: [0], cap: "it stamps the date" }),
    S("B1", 11.0, 12.2, { cap: "now you're on the leaderboard" }),
  ] },
};
export const FAST_NAMES = Object.keys(FAST);

// ---- plan: segment times, captions, SFX events + rule checks ---------------------------------------------------------
const r3 = (x) => Math.round(x * 1000) / 1000;
export function plan(spec) {
  let t = 0;
  const segs = spec.segs.map((s, i) => {
    if (s.sp > 1.5) throw new Error(`${spec.name} seg ${i}: speed ${s.sp} > 1.5`);
    const d = r3((s.b - s.a) / s.sp);
    if (d < 0.6 - 1e-6 || d > 1.2 + 1e-6) throw new Error(`${spec.name} seg ${i}: beat ${d}s outside 0.6-1.2`);
    const o = { ...s, i, t0: t, d };
    t = r3(t + d);
    return o;
  });
  const D = t, T = r3(D + END);
  const max = spec.max ?? 12;
  if (T < 8 || T > max) throw new Error(`${spec.name}: total ${T}s outside 8-${max}`);
  const hookEnd = segs[0].d + segs[1].d; // hook stays over the payoff + the rewind
  const caps = [];
  segs.forEach((s) => {
    if (!s.cap) return;
    const last = segs[Math.min(segs.length - 1, s.capTo ?? s.i)];
    const c = { text: s.cap, step: s.step, a: s.t0, z: r3(last.t0 + last.d) };
    if (c.z - c.a < 0.7 - 1e-6) throw new Error(`${spec.name}: caption "${c.text}" ${c.z - c.a}s < 0.7`);
    if (c.text.split(/\s+/).length > 5) throw new Error(`${spec.name}: caption "${c.text}" > 5 words`);
    caps.push(c);
  });
  const events = [];
  segs.forEach((s) => {
    if (s.i > 0) events.push({ t: Math.max(0, s.t0 - 0.06), kind: s.rev ? "rewind" : "whoosh", gain: 1 });
    (s.thud ?? []).forEach((o) => events.push({ t: s.t0 + o, kind: "thud", gain: 1 }));
    (s.ticks ?? []).forEach((o) => events.push({ t: s.t0 + o, kind: "tick", gain: 1 }));
  });
  events.push({ t: D - 0.06, kind: "whoosh", gain: 0.9 }, { t: D, kind: "thud", gain: 0.75 });
  events.sort((a, b) => a.t - b.t);
  return { segs, D, T, hookEnd, caps, events };
}

// ---- helpers ---------------------------------------------------------------------------------------------------------
const q = (s) => `'${String(s).replace(/'/g, "'\\''")}'`;
const f3 = (n) => Number(n).toFixed(3);
const loop = (file) => ["-loop", "1", "-framerate", "30", "-i", file];
const dataUri = (file) => "data:image/png;base64," + fs.readFileSync(file).toString("base64");
const srcSize = (spec, s) => SRC_SIZE[s.src.startsWith("spot") ? "spot" : spec.kind === "A" ? "A" : "B"];

/** Per-segment filter chain: trim -> (reverse) -> speed -> 30 fps, then `tail` (scale/zoom/crop). Input i is `-ss a -t .. -i raw`. */
function segChain(i, s, tail) {
  const sec = (s.b - s.a).toFixed(3);
  return `[${i}:v]trim=duration=${sec},setpts=PTS-STARTPTS${s.rev ? ",reverse,setpts=PTS-STARTPTS" : ""},setpts=PTS/${s.sp},fps=30,trim=duration=${f3(s.d)},setpts=PTS-STARTPTS,${tail}${s.rev ? ",eq=saturation=0.45:contrast=1.08,noise=alls=10:allf=t" : ""}`;
}
const segInputs = (segs) => segs.map((s) => ["-ss", s.a.toFixed(3), "-t", (s.b - s.a + 0.2).toFixed(3), "-i", RAW[s.src]]);
/** Smooth push-in used on stamp shots: starts at zoom 1 (payoff visible at frame 0), eases to z in 0.22 s. */
function pushIn(z, outW, outH) {
  const e = `1+${(z.z - 1).toFixed(3)}*(1-pow(1-clip(it/0.22,0,1),3))`;
  return `zoompan=z=${q(e)}:x=${q(`max(0,min(iw-iw/zoom,${z.px}*iw-iw/zoom/2))`)}:y=${q(`max(0,min(ih-ih/zoom,${z.py}*ih-ih/zoom/2))`)}:d=1:s=${outW}x${outH}:fps=30,setsar=1`;
}

function audioFor(P, name) {
  const wav = path.join(TMP, `${name}.wav`);
  const m = mixAudio({ events: P.events, total: P.T, dest: wav });
  return { wav, ...m };
}

// ---- layouts ---------------------------------------------------------------------------------------------------------
async function composeSpot(spec, P, dest, ctx) {
  const L = ctx.LAYOUTS.story;
  const pw = L.pw, h = ctx.ph(pw), b = L.bezel;
  const px = (L.W - pw) / 2, py = L.phoneY;
  const bezel = ctx.roundRect(path.join(CACHE, `bezel-story-${pw}.png`), pw + 2 * b, h + 2 * b, Math.round(pw * 0.11) + b, [14, 14, 17], [70, 70, 80], 5);
  const mask = ctx.roundRect(path.join(CACHE, `mask-story-${pw}.png`), pw, h, Math.round(pw * 0.11), [255, 255, 255]);
  const bg_ = await bug(L.bug.size), lg_ = await endLogo(L.endLogo);
  const bgFile = ctx.background(L, "story");
  const N = P.segs.length, D = P.D, T = P.T;
  const hk = await TY.hook(spec.hook, { key: spec.key, size: 150, maxW: 1760, maxLines: 3 });
  const caps = [];
  for (const c of P.caps) caps.push({ ...c, ...(await TY.pill(c.text, { size: L.capSize, maxW: L.capW })) });
  const endL = await TY.endText({ W: L.W, H: L.H, tagY: L.endTagY, footY: L.endFootY, glowY: L.endLogoY + L.endLogo / 2, tagline: cfg.endCard.tagline, footer: cfg.endCard.footer });
  const audio = audioFor(P, spec.name);

  const g = [];
  P.segs.forEach((s, i) => {
    const [sw] = srcSize(spec, s);
    const z = s.z && { ...s.z, z: Math.min(s.z.z, sw / pw) };
    g.push(segChain(i, s, z ? pushIn(z, pw, h) : `scale=${pw}:${h}:flags=lanczos,setsar=1`) + `[sg${i}]`);
  });
  g.push(`${P.segs.map((_, i) => `[sg${i}]`).join("")}concat=n=${N}:v=1:a=0,tpad=stop_mode=clone:stop_duration=3,trim=duration=${f3(T)},setpts=PTS-STARTPTS,format=rgba[scr]`);
  const m = N; // fixed inputs after the segment inputs
  g.push(`[${m + 2}:v]format=rgba,alphaextract[ma]`, `[scr][ma]alphamerge[screen]`);
  g.push(`[${m + 1}:v]format=rgba[bz]`, `[bz][screen]overlay=x=${b}:y=${b}:format=auto[phone0]`);
  g.push(`[phone0]fade=t=out:st=${f3(D - 0.1)}:d=0.25:alpha=1[phone]`);
  g.push(`[${m}:v]format=rgba[bgv]`, `[bgv][phone]overlay=x=${px - b}:y=${py - b}:format=auto[comp]`);
  // white flash on each stamp push-in (not on frame 0)
  const fl = P.segs.filter((s) => s.thud && s.i > 0).flatMap((s) => s.thud.map((o) => `drawbox=x=0:y=0:w=iw:h=ih:color=white@0.25:t=fill:enable=${q(`between(t,${f3(s.t0 + o)},${f3(s.t0 + o + 0.07)})`)}`));
  g.push(`[comp]${["null", ...fl].join(",")}[fx0]`);
  let cur = "fx0", ni = m + 5;
  const extra = [];
  const ov = (file, x, y, en) => { g.push(`[${ni}:v]format=rgba[o${ni}]`, `[${cur}][o${ni}]overlay=x=${x}:y=${y}:format=auto:enable=${q(en)}[fx${ni}]`); cur = `fx${ni}`; ni++; };
  extra.push(loop(hk.file));
  ov(hk.file, `(W-w)/2`, Math.round(690 - hk.h / 2), `between(t,0,${f3(P.hookEnd)})`);
  for (const c of caps) { extra.push(loop(c.file)); ov(c.file, `(W-w)/2`, L.capY - c.pad, `between(t,${f3(c.a)},${f3(c.z)})`); }
  extra.push(loop(endL)); ov(null, 0, 0, `gte(t,${f3(D)})`);
  g.push(`[${cur}]null[txt]`);
  g.push(`[${m + 4}:v]format=rgba,fade=t=in:st=${f3(D)}:d=0.15:alpha=1[lg]`);
  g.push(`[txt][lg]overlay=x=(W-w)/2:y=${L.endLogoY}:format=auto:enable=${q(`gte(t,${f3(D)})`)}[t2]`);
  g.push(`[${m + 3}:v]format=rgba[bugv]`, `[t2][bugv]overlay=x=${L.bug.x - bg_.pad}:y=${L.bug.y - bg_.pad}:format=auto:enable=${q(`lt(t,${f3(D)})`)},${scaleToBt709}[v]`);
  const wavIdx = m + 5 + extra.length;
  g.push(`[${wavIdx}:a]aresample=48000,aformat=channel_layouts=stereo[a]`);
  encode4k({
    inputs: [...segInputs(P.segs), loop(bgFile), loop(bezel), loop(mask), loop(bg_.file), loop(lg_.file), ...extra, ["-i", audio.wav]],
    script: g.join(";\n"), audio: "graph", total: T, dest,
  });
  return audio;
}

function findTop(spec) {
  const dir = path.join(here, "ugc/raw");
  if (!fs.existsSync(dir)) return null;
  const m = fs.readdirSync(dir).filter((x) => x.endsWith(".mp4") && spec.topMatch.test(x) && !/oldline/.test(x)).sort();
  return m.length ? path.join(dir, m[0]) : null;
}

async function composeA(spec, P, dest) {
  const SA = SRC_SIZE.A, scaledH = Math.round((2160 * SA[1]) / SA[0] / 2) * 2, CH = 2120;
  const N = P.segs.length, D = P.D, T = P.T;
  const top = findTop(spec), fallback = !top;
  const hero = "file://" + path.join(root, "public/art/hero-tall.webp");
  const hk = await TY.hook(spec.hook, { key: spec.key, size: 140, maxW: 1700, card: true });
  const bands = [];
  for (const c of P.caps) bands.push({ ...c, ...(await TY.pill(c.text, { step: c.step, size: 84, maxW: 2000, maxLines: 1 })) });
  const el = await endLogo(880);
  const end = await TY.frame(`<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 32% at 50% 38%,rgba(34,229,138,.2),transparent 72%),linear-gradient(rgba(5,8,6,.94),rgba(5,8,6,.94)),url('${hero}') center/cover;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:96px;text-align:center;padding:0 160px">
<img src="${dataUri(el.file)}" width="880" height="880" style="display:block;margin-bottom:-24px">
<div class=saira style="text-transform:none;font-weight:800;color:#fff;font-size:116px;line-height:1.02;text-wrap:balance;text-shadow:0 8px 40px rgba(0,0,0,.5)">Comment <span class=k>RECEIPT</span> and I’ll send you the link</div>
<div class=saira style="text-transform:none;font-weight:700;color:rgba(255,255,255,.88);font-size:76px">Call it. Lock it. Prove it.</div>
<div class=inter style="font-weight:600;font-size:54px;letter-spacing:.08em;text-transform:uppercase;color:#fff;margin-top:-30px">Game Receipts <span class=k>· Free to play</span></div></div>`, 2160, 3840, "endA");
  const bg_ = await bug(200);
  const audio = audioFor(P, spec.name);

  const g = [];
  g.push(fallback
    ? `color=c=0x0b0d0e:s=2160x1720:r=30:d=${f3(T)},format=yuv420p[top]`
    : `[0:v]crop=1076:757:0:${spec.faceY},hqdn3d=1.2:1.2:2.5:2.5,scale=2160:1520:flags=lanczos,unsharp=5:5:0.5:5:5:0,fps=30,setsar=1,trim=duration=${f3(T)},setpts=PTS-STARTPTS[top]`);
  const base = 1; // input 0 = top clip (or a dummy when falling back)
  P.segs.forEach((s, i) => {
    const cy = Math.max(0, Math.min(scaledH - CH, Math.round((s.fy ?? 0.4) * scaledH - CH * 0.45)));
    g.push(segChain(base + i, s, `scale=2160:${scaledH}:flags=lanczos,crop=2160:${CH}:0:${cy},setsar=1`) + `[sg${i}]`);
  });
  g.push(`${P.segs.map((_, i) => `[sg${i}]`).join("")}concat=n=${N}:v=1:a=0,tpad=stop_mode=clone:stop_duration=3,trim=duration=${f3(T)},setpts=PTS-STARTPTS[app]`);
  const m = base + N; // m: bg(black color via lavfi), then pngs
  g.push(`color=c=black:s=2160x3840:r=30:d=${f3(T)}[bg]`, `[bg][top]overlay=0:0[v1]`, `[v1][app]overlay=0:1720[v2]`);
  let cur = "v2", ni = m;
  const ins = [];
  const ov = (x, y, en, fmt = "") => { g.push(`[${cur}][${ni}:v]overlay=x=${x}:y=${y}${fmt}:enable=${q(en)}[o${ni}]`); cur = `o${ni}`; ni++; };
  for (const c of bands) { ins.push(loop(c.file)); ov(`(W-w)/2`, 1620 - Math.round(c.h / 2), `between(t,${f3(c.a)},${f3(c.z)})`); }
  ins.push(loop(hk.file)); ov(`(W-w)/2`, 930 - Math.round(hk.h / 2), `between(t,0,${f3(P.hookEnd)})`);
  ins.push(loop(end)); ov(0, 0, `gte(t,${f3(D)})`);
  ins.push(loop(bg_.file)); ov(68 - bg_.pad, 452 - bg_.pad, `lt(t,${f3(D)})`, ":format=auto");
  g.push(`[${cur}]${scaleToBt709}[v]`);
  const wavIdx = m + ins.length;
  g.push(`[${wavIdx}:a]aresample=48000,aformat=channel_layouts=stereo[a]`);
  encode4k({ inputs: [fallback ? ["-f", "lavfi", "-i", "color=c=black:s=64x64:r=30"] : ["-stream_loop", "-1", "-i", top], ...segInputs(P.segs), ...ins, ["-i", audio.wav]], script: g.join(";\n"), audio: "graph", total: T, dest });
  return audio;
}

async function composeB(spec, P, dest) {
  const N = P.segs.length, D = P.D, T = P.T;
  const CW = 2440, CH = 4120, M = 140;
  const SB = SRC_SIZE.B;
  const PW = 1568, PH = Math.round((1568 * SB[1]) / SB[0] / 2) * 2;
  const bezel = 20, SW = PW - 2 * bezel, SH = PH - 2 * bezel;
  const css = (w, h, html) => TY.frame(html, w, h, "fastB");
  const desk = await css(CW, CH, `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 45% at 30% 20%,rgba(255,214,160,.16),transparent 70%),radial-gradient(ellipse 80% 60% at 50% 55%,#1b1a1f,#0c0b0e 80%),#0c0b0e"></div>`);
  const glare = await css(SW, SH, `<div style="position:absolute;inset:0;background:linear-gradient(115deg,transparent 25%,rgba(255,255,255,.045) 38%,rgba(255,255,255,.015) 52%,transparent 62%),radial-gradient(ellipse 60% 25% at 80% 8%,rgba(255,255,255,.05),transparent 70%)"></div>`);
  const el = await endLogo(1040), bgb = await bug(192);
  const tag = await TY.frame(`<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 30% at 50% 42%,rgba(34,229,138,.18),transparent 72%),rgba(0,0,0,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:88px"><img src="${dataUri(el.file)}" width="1040" height="1040" style="display:block;margin-bottom:-20px"><div class=saira style="text-transform:none;font-weight:800;color:#fff;font-size:104px;text-shadow:0 8px 40px rgba(0,0,0,.5)">Call it. Lock it. Prove it.</div><div class=inter style="font-weight:600;font-size:56px;letter-spacing:.08em;text-transform:uppercase;color:#22e58a">Free to play</div></div>`, 2160, 3840, "tagB");
  const hookImg = await TY.pov(spec.hook, { size: 96, maxW: 1640, maxLines: 2 });
  const capImgs = [];
  for (const c of P.caps) capImgs.push({ ...c, ...(await TY.pov(c.text, { size: 96, maxW: 1640, maxLines: 2 })) });
  const audio = audioFor(P, spec.name);

  const g = [];
  P.segs.forEach((s, i) => g.push(segChain(i, s, `scale=${SW}:${SH}:flags=lanczos,setsar=1`) + `[sg${i}]`));
  g.push(`${P.segs.map((_, i) => `[sg${i}]`).join("")}concat=n=${N}:v=1:a=0,tpad=stop_mode=clone:stop_duration=3,trim=duration=${f3(T)},setpts=PTS-STARTPTS[scr]`);
  const m = N; // desk, glare, tag, bug, hook, caps...
  g.push(`[scr][${m + 1}:v]overlay=0:0:format=auto[scrg]`, `[scrg]pad=${PW}:${PH}:${bezel}:${bezel}:color=0x050506[ph]`);
  g.push(`[${m}:v][ph]overlay=${(CW - PW) / 2}:${(CH - PH) / 2},format=yuv420p[flat]`);
  g.push(`[flat]perspective=x0=28:y0=0:x1=${CW - 20}:y1=124:x2=28:y2=${CH}:x3=${CW - 20}:y3=${CH - 124}:sense=destination:interpolation=linear[persp]`);
  g.push(`[persp]rotate=a='0.011*sin(2*PI*t/5.6)+0.006*sin(2*PI*t/2.3+1)':ow=iw:oh=ih:c=0x0c0b0e,crop=2160:3840:'${M}+14*sin(2*PI*t/4.3)+6*sin(2*PI*t/1.7)':'${M}+18*sin(2*PI*t/3.7+1)+6*sin(2*PI*t/1.3)'[cam]`);
  g.push(`[cam]eq=contrast=1.04:saturation=0.94,setsar=1[g]`);
  let cur = "g", ni = m + 4;
  const ins = [];
  const ov = (x, y, en) => { g.push(`[${cur}][${ni}:v]overlay=x=${x}:y=${y}:enable=${q(en)}[c${ni}]`); cur = `c${ni}`; ni++; };
  ins.push(loop(hookImg.file)); ov(`990-w/2`, `2700-h/2`, `between(t,0,${f3(P.hookEnd)})`);
  for (const c of capImgs) { ins.push(loop(c.file)); ov(`990-w/2`, `2700-h/2`, `between(t,${f3(c.a)},${f3(c.z)})`); }
  g.push(`[${cur}][${m + 3}:v]overlay=${52 - bgb.pad}:${560 - bgb.pad}:format=auto:enable=${q(`lt(t,${f3(D)})`)}[cb]`);
  g.push(`[cb][${m + 2}:v]overlay=0:0:enable=${q(`gte(t,${f3(D)})`)},${scaleToBt709}[v]`);
  const wavIdx = m + 4 + ins.length;
  g.push(`[${wavIdx}:a]aresample=48000,aformat=channel_layouts=stereo[a]`);
  encode4k({ inputs: [...segInputs(P.segs), loop(desk), loop(glare), loop(tag), loop(bgb.file), ...ins, ["-i", audio.wav]], script: g.join(";\n"), audio: "graph", total: T, dest });
  return audio;
}

// ---- Instagram 1080x1920: 2-pass ~10 Mbps High, BT.709, AAC 48k (stream-copied from the 4K master), +faststart ------------
export function encodeIG(src, dest) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gr-ig-"));
  const log = path.join(tmp, "pass");
  const common = ["-y", "-hide_banner", "-v", "error", "-i", src, "-map", "0:v", "-vf", "scale=1080:1920:flags=lanczos+accurate_rnd,format=yuv420p", "-r", "30", "-fps_mode", "cfr",
    "-c:v", "libx264", "-profile:v", "high", "-level:v", "4.1", "-preset", "slow", "-b:v", "10M", "-maxrate", "12M", "-bufsize", "20M",
    "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-passlogfile", log];
  const run = (a) => { const r = spawnSync(FFMPEG, a, { encoding: "utf8" }); if (r.status !== 0) throw new Error(r.stderr.slice(-1500)); };
  run([...common, "-pass", "1", "-an", "-f", "null", "/dev/null"]);
  run([...common, "-pass", "2", "-map", "0:a", "-c:a", "copy", "-movflags", "+faststart", dest]);
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ---- --check: first/last frame of every segment on one sheet, to verify a timeline before the 4K render --------------
function checkSheet(spec) {
  const P = plan(spec);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gr-chk-"));
  const files = [];
  P.segs.forEach((s) => [s.a + 0.03, s.b - 0.05].forEach((t, k) => {
    const f = path.join(dir, `f${String(files.length).padStart(3, "0")}.png`);
    spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", t.toFixed(3), "-i", RAW[s.src], "-frames:v", "1", "-vf", "scale=190:-1", f]);
    files.push(f);
  }));
  const out = path.join(TMP, `${spec.name}-check.jpg`);
  spawnSync(FFMPEG, ["-y", "-v", "error", "-framerate", "1", "-i", path.join(dir, "f%03d.png"), "-vf", `tile=6x${Math.ceil(files.length / 6)}:padding=4`, "-frames:v", "1", out]);
  fs.rmSync(dir, { recursive: true, force: true });
  return out;
}

// ---- --qa: frames at 0.0 s / 0.5 s / 25 / 50 / 75 % / end card -> contact sheet in marketing/qa/fast/ (+ facts table) ---------------
function probe(file) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-i", file], { encoding: "utf8" }).stderr;
  const dur = /Duration: (\d+):(\d+):([\d.]+)/.exec(r);
  return { dur: +dur[1] * 3600 + +dur[2] * 60 + +dur[3], video: (/Video: ([^\n]+)/.exec(r)?.[1] ?? "").replace(/\([^)]*\)/g, "").split(",").map((x) => x.trim()).filter((x) => /h264|yuv|\d+x\d+|fps|kb\/s/.test(x)).join(" "), audio: /Audio: ([^\n]+)/.exec(r)?.[1].split(",").slice(0, 3).join(",") };
}
export function qaFast(names) {
  const qaDir = path.join(here, "qa/fast"); fs.mkdirSync(qaDir, { recursive: true });
  const rows = [];
  for (const name of names) {
    for (const [suffix, size] of [["", "270:480"], ["-ig", "270:480"]]) {
      const file = path.join(OUT, `${name}-fast${suffix}.mp4`);
      if (!fs.existsSync(file)) continue;
      const pr = probe(file), T = pr.dur, m = measure(file);
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gr-qa-"));
      const ts = [0, 0.5, T * 0.25, T * 0.5, T * 0.75, T - 0.6];
      ts.forEach((t, k) => spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", t.toFixed(3), "-i", file, "-frames:v", "1", "-vf", `scale=${size}:flags=lanczos`, path.join(dir, `q${k}.png`)]));
      const sheet = path.join(qaDir, `${name}-fast-sheet.jpg`);
      if (!suffix) spawnSync(FFMPEG, ["-y", "-v", "error", "-framerate", "1", "-i", path.join(dir, "q%d.png"), "-vf", "tile=6x1:padding=6:color=0x101214", "-frames:v", "1", "-q:v", "4", sheet]);
      if (!suffix) { // full-res frame 0 for the payoff/hook check (kept outside the repo)
        spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", "0", "-i", file, "-frames:v", "1", path.join(TMP, `${name}-f0.png`)]);
      }
      fs.rmSync(dir, { recursive: true, force: true });
      rows.push({ file: path.relative(root, file), dur: T, ...m, size: fs.statSync(file).size / 1e6, video: pr.video, audio: pr.audio, sheet: path.relative(root, sheet), sheetKB: Math.round(fs.statSync(sheet).size / 1024) });
    }
  }
  return rows;
}

// ---- main ------------------------------------------------------------------------------------------------------------
/** @param names timeline names; @param ctx render.mjs helpers (LAYOUTS, ph, roundRect, background) - needed for spot-* only */
export async function renderFast(names, ctx, { ig = true } = {}) {
  fs.mkdirSync(OUT, { recursive: true });
  const rows = [];
  for (const name of names) {
    const spec = FAST[name]; if (!spec) throw new Error(`no fast timeline for ${name}`);
    const P = plan(spec);
    const dest = path.join(OUT, `${name}-fast.mp4`);
    console.log(`fast ${name}: ${P.segs.length} segments, ${P.T.toFixed(2)} s`);
    const audio = spec.kind === "spot" ? await composeSpot(spec, P, dest, ctx) : spec.kind === "A" ? await composeA(spec, P, dest) : await composeB(spec, P, dest);
    if (ig) encodeIG(dest, path.join(OUT, `${name}-fast-ig.mp4`));
    const a = measure(dest);
    rows.push({ name, dur: P.T, ...a });
    console.log(`  ${path.relative(root, dest)} ${(fs.statSync(dest).size / 1e6).toFixed(1)} MB  ${a.lufs} LUFS  ${a.tp} dBTP`);
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const names = args.filter((a) => !a.startsWith("--"));
  const list = names.length ? names : FAST_NAMES;
  if (args.includes("--qa")) { for (const r of qaFast(list)) console.log(`${r.file}  ${r.dur.toFixed(2)}s  ${r.size.toFixed(1)}MB  ${r.lufs} LUFS  ${r.tp} dBTP  [${r.video} | ${r.audio}]  ${r.sheet} ${r.sheetKB}KB`); process.exit(0); }
  if (args.includes("--check")) { for (const n of list) console.log(checkSheet(FAST[n])); process.exit(0); }
  if (list.some((n) => FAST[n].kind === "spot")) {
    // spots need render.mjs' layout helpers: delegate (render.mjs --fast runs renderFast with them)
    const ids = list.filter((n) => n.startsWith("spot-")).map((n) => n.slice(5));
    const r = spawnSync(process.execPath, [path.join(here, "render.mjs"), "--fast", ...ids, ...(args.includes("--no-ig") ? ["--no-ig"] : [])], { stdio: "inherit" });
    if (r.status !== 0) process.exit(r.status);
  }
  const rest = list.filter((n) => !n.startsWith("spot-"));
  if (rest.length) { await renderFast(rest, null, { ig: !args.includes("--no-ig") }); await TY.closeType(); }
}
