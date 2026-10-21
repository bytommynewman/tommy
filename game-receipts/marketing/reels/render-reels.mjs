// Renders the Format A (speedrun split-screen) and Format B (filmed-screen POV) reel ads from the raw captures.
// Usage: node marketing/reels/render-reels.mjs [A1 A2 B1 ...] [--top A1=/path/clip.mp4] [--top A2=/path/clip.mp4] [--keep-audio] [--target ig]
//   Everything renders at 2160x3840 (4K 9:16): overlays are rasterised at 2x (device scale factor 2), ffmpeg coordinates are 2x the old 1080 numbers.
//   Encode (encode4k.mjs): lossless intermediate -> 2-pass x264 High@5.1 ~45 Mbps (max 60M / buf 120M), 30 fps CFR, BT.709 tags, closed 2 s GOP, AAC 48 kHz 192k, +faststart.
//   --target ig  writes <name>-ig.mp4: same 4K encode, and Format B also drops the film grain, halves the glare and keeps captions/logo
//                inside the Reels safe zones (top 500, bottom 840, right 300 px at 4K).
//   Top clip (Format A creator panel) defaults to the UGC talking-head masters in marketing/ugc/raw
//   (A1 <- raw/mvp.mp4, A2 <- raw/kyle.mp4: the untouched Kling masters). If none is found, falls back to a dimmed hero-tall.webp panel.
// Prereq: node marketing/reels/capture-reels.mjs   (writes out/raw/<id>.mp4 + <id>.json)
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bug, endLogo } from "../brand.mjs";
import { encode4k, scaleToBt709 } from "../encode4k.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RAW = path.join(here, "out/raw");
const OUT = path.join(here, "out");
const TMP = path.join(OUT, "tmp");
fs.mkdirSync(TMP, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MONO = "/System/Library/Fonts/Menlo.ttc";

// ---- CLI ---------------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const topArg = {}; const ids = []; let keepAudio = false; let target = "default";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--target") { target = args[++i]; if (!["ig", "default"].includes(target)) throw new Error("--target must be ig|default"); }
  else if (args[i] === "--top") { const [k, v] = args[++i].split("="); topArg[k] = path.resolve(v); }
  else if (args[i] === "--keep-audio") keepAudio = true;
  else ids.push(args[i]);
}

// ---- spot definitions --------------------------------------------------------------------------------------
const SPECS = {
  A1: {
    format: "A", file: "A1-mvp-speedrun.mp4", topMatch: /mvp/i, faceY: 230,
    hook: "Watch me lock my MVP pick in under 10 seconds",
    steps: [["s1", "Step 1: Pick your league"], ["s2", "Step 2: Search your guy"], ["s3", "Step 3: Pick a take (Wins an award · MVP)"], ["s4", "Step 4: Place it. Stamped."], ["board", "Graded when it's done"]],
  },
  A2: {
    format: "A", file: "A2-prove-you-called-it.mp4", topMatch: /kyle/i, faceY: 190,
    hook: "How to prove you called it (takes 8 seconds)",
    steps: [["s1", "Step 1: Pick your team"], ["s2", "Step 2: Pick how far they go"], ["s3", "Step 3: Place take"], ["s4", "Step 4: Screenshot the receipt when it hits"]],
  },
  B1: {
    format: "B", file: "B1-pov-screen.mp4", trimAfterBoard: 3.7,
    captions: [["hook", "easiest way to win every sports argument fr 😭"], ["player", "pick your player"], ["take", "pick your take"], ["place", "hit place"], ["+place:1.5", "it stamps the date"], ["graded", "graded when it's done"], ["board", "now you're on the leaderboard"]],
  },
};
const IG = target === "ig";
const END_A = 2.5, TAG_B = 1.8;
const outName = (spec) => (IG ? spec.file.replace(/\.mp4$/, "-ig.mp4") : spec.file);
// raw captures: A1/A2 at DSF 5.6 (2184x4726: the app fills the full 2160 width), B1 at DSF 5 (1950x4220); renders only scale DOWN
const SRC = { A: { w: 2184, h: 4726 }, B: { w: 1950, h: 4220 } };

// ---- overlay PNGs via headless Chrome (fonts + emoji render properly there) ---------------------------------
const FONT = `'Arial Black', Arial, sans-serif`;
let browser, shotPage;
async function png(name, w, h, html, scale = 1) {
  const file = path.join(TMP, name);
  await shotPage.setViewportSize({ width: w, height: h });
  await shotPage.setContent(`<!doctype html><meta charset=utf-8><style>*{box-sizing:border-box}html,body{margin:0;background:transparent;width:${w}px;height:${h}px;overflow:hidden;font-family:${FONT}}</style>${html}`);
  await shotPage.evaluate(() => document.fonts.ready);
  await shotPage.screenshot({ path: file, omitBackground: true });
  return file;
}
const dataUri = (f) => "data:image/png;base64," + fs.readFileSync(f).toString("base64");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
// text that shrinks until it fits one line within maxW
const fit = (id, maxW, start) => `<script>(()=>{const e=document.getElementById('${id}');let s=${start};e.style.fontSize=s+'px';while(e.scrollWidth>${maxW}&&s>20){s-=2;e.style.fontSize=s+'px'}})()</script>`;

// ---- filter helpers ----------------------------------------------------------------------------------------
const f = (n) => Number(n).toFixed(3);
function findTop(spec) {
  for (const d of ["ugc/raw"]) { // the untouched talking-head masters (ugc/out holds finished ads with hooks/footage baked in)
    const dir = path.join(root, "marketing", d);
    if (!fs.existsSync(dir)) continue;
    const m = fs.readdirSync(dir).filter((x) => x.endsWith(".mp4") && spec.topMatch.test(x) && !/oldline/.test(x)).sort();
    if (m.length) return path.join(dir, m[0]);
  }
  return null;
}
// piecewise smoothstep pan expression from focus keyframes (viewport fraction → crop y in the scaled capture)
function panExpr(focus, scaledH, cropH) {
  const max = scaledH - cropH;
  const ys = []; for (const k of focus) { const y = Math.max(0, Math.min(max, k.y * scaledH - cropH * 0.45)); if (ys.length && k.t - ys.at(-1).t < 0.3) ys.pop(); ys.push({ t: k.t, y: Math.round(y) }); }
  let e = String(ys[0]?.y ?? 0); let prev = ys[0]?.y ?? 0;
  for (const k of ys) {
    const d = k.y - prev; if (d === 0) continue;
    e += `+${d}*st(0\\,clip((t-${f(k.t)})/0.7\\,0\\,1))*ld(0)*ld(0)*(3-2*ld(0))`; prev = k.y;
  }
  return e;
}
const probeDur = (file) => { const r = spawnSync(FFMPEG, ["-i", file], { encoding: "utf8" }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr); return +m[1] * 3600 + +m[2] * 60 + +m[3]; };
const loopPng = (file, total) => ["-loop", "1", "-framerate", "30", "-t", f(total), "-i", file];

// ---- Format A ----------------------------------------------------------------------------------------------
async function renderA(id, spec) {
  const cap = JSON.parse(fs.readFileSync(path.join(RAW, `${id}.json`), "utf8"));
  const D = cap.duration, total = D + END_A, TP = cap.marks.place;
  const topClip = topArg[id] ?? findTop(spec);
  const fallback = !topClip;
  console.log(`${id}: top panel = ${fallback ? "FALLBACK (hero-tall + big stopwatch)" : topClip}`);

  // overlays
  const hero = "file://" + path.join(root, "public/art/hero-tall.webp");
  const pillW = fallback ? 560 : 250, pillH = fallback ? 170 : 84; // CSS px (png() rasterises at 2x)
  const pill = await png(`${id}-pill.png`, pillW, pillH, `<div style="width:100%;height:100%;background:rgba(0,0,0,.82);border:3px solid rgba(255,255,255,.85);border-radius:${pillH / 2}px"></div>`);
  const hook = await png(`${id}-hook.png`, 1080, 760, `<div style="position:absolute;left:60px;right:60px;top:330px;display:flex;justify-content:center"><div id=t style="display:inline-block;background:#000;color:#fff;padding:22px 30px;border-radius:12px;font-size:56px;line-height:1.18;text-align:center;max-width:960px;font-weight:900">${esc(spec.hook)}</div></div>`);
  const fbPanel = fallback ? await png(`${id}-fbtop.png`, 1080, 760, `<div style="width:100%;height:100%;background:linear-gradient(rgba(0,0,0,.62),rgba(0,0,0,.62)),url('${hero}') center 30%/cover"></div>`) : null;
  const bands = [];
  for (const [i, [, text]] of spec.steps.entries())
    bands.push(await png(`${id}-band${i}.png`, 1080, 100, `<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center"><div id=t style="color:#fff;font-size:46px;white-space:nowrap;font-weight:900">${esc(text)}</div></div>${fit("t", 1000, 46)}`));
  const el = await endLogo(880); // shown at 440 CSS px = 880 px, native to the 1254 px master
  const end = await png(`${id}-end.png`, 1080, 1920, `<div style="width:100%;height:100%;background:linear-gradient(rgba(5,8,6,.94),rgba(5,8,6,.94)),url('${hero}') center/cover;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:48px;text-align:center;padding:0 80px"><img src="${dataUri(el.file)}" width="440" height="440" style="display:block"><div style="color:#fff;font-size:70px;line-height:1.2">Comment <span style="color:#23e58a">RECEIPT</span> and I'll send you the link</div><div style="color:#23e58a;font-size:46px;letter-spacing:.04em">Call it. Lock it. Prove it.</div><div style="color:#fff;font-size:38px;letter-spacing:.08em;opacity:.92;margin-top:-24px">GAME RECEIPTS · Free to play</div></div>`);
  const bg_ = await bug(200);

  // step windows
  const times = spec.steps.map(([m]) => cap.marks[m]);
  const wins = times.map((t, i) => [t, i + 1 < times.length ? times[i + 1] : D]);
  wins[0][0] = 0;

  const inputs = [];
  inputs.push(fallback ? loopPng(fbPanel, total) : ["-stream_loop", "-1", "-i", topClip]);   // 0
  inputs.push(["-i", path.join(RAW, `${id}.mp4`)]);                                          // 1
  inputs.push(loopPng(pill, total), loopPng(hook, total), loopPng(end, total), loopPng(bg_.file, total)); // 2,3,4,5
  for (const b of bands) inputs.push(loopPng(b, total));                                     // 6..
  const G = [];
  G.push(fallback ? `[0:v]fps=30,format=yuv420p[top]` : `[0:v]crop=1076:757:0:${spec.faceY},hqdn3d=1.2:1.2:2.5:2.5,scale=2160:1520:flags=lanczos,unsharp=5:5:0.5:5:5:0,fps=30,setsar=1[top]`);
  const SA = SRC.A, scaledH = Math.round((2160 * SA.h) / SA.w / 2) * 2; // 4674 (app width = full frame width, scaled down from 2184)
  G.push(`[1:v]fps=30,scale=2160:${scaledH}:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,crop=2160:2120:0:'${panExpr(cap.focus, scaledH, 2120)}',setsar=1[app]`);
  G.push(`color=c=black:s=2160x3840:r=30:d=${f(total)}[bg]`);
  G.push(`[bg][top]overlay=0:0[v1]`);
  G.push(`[v1][app]overlay=0:1720[v2]`);
  let cur = "v2";
  wins.forEach(([a, b], i) => { G.push(`[${cur}][${6 + i}:v]overlay=0:1520:enable='between(t,${f(a)},${f(b)})'[b${i}]`); cur = `b${i}`; });
  const px = (fallback ? 260 : 690) * 2, py = (fallback ? 300 : 230) * 2; // pill stays out of the right-hand 300 px rail (4K)
  G.push(`[${cur}][2:v]overlay=${px}:${py}:enable='lt(t,${f(D)})'[p1]`);
  const sz = fallback ? 208 : 104;
  const sw = `%{eif\\:floor(min(t\\,${f(TP)})/60)\\:d\\:2}\\:%{eif\\:mod(floor(min(t\\,${f(TP)}))\\,60)\\:d\\:2}.%{eif\\:mod(floor(min(t\\,${f(TP)})*10)\\,10)\\:d\\:1}`;
  G.push(`[p1]drawtext=fontfile=${MONO}:text='${sw}':fontcolor=white:fontsize=${sz}:x=${px}+(${pillW * 2}-text_w)/2:y=${py}+(${pillH * 2}-text_h)/2-4:enable='lt(t,${f(D)})'[p2]`);
  G.push(`[p2][3:v]overlay=0:0:enable='between(t,0,2)'[h1]`);
  G.push(`[h1][4:v]overlay=0:0:enable='gte(t,${f(D)})'[h2]`);
  G.push(`[h2][5:v]overlay=${68 - bg_.pad}:${452 - bg_.pad}:format=auto:enable='lt(t,${f(D)})',${scaleToBt709}[v]`);
  const out = path.join(OUT, outName(spec));
  encode(inputs, G, out, total, keepAudio && !fallback);
  return out;
}

function encode(inputs, G, out, total, withAudio) {
  const script = G.join(";\n") + (withAudio ? ";\n[0:a]aresample=48000,aformat=channel_layouts=stereo[a]" : "");
  encode4k({ inputs, script, audio: withAudio ? "graph" : "silent", total, dest: out });
}

// ---- Format B ----------------------------------------------------------------------------------------------
async function renderB(id, spec) {
  const cap = JSON.parse(fs.readFileSync(path.join(RAW, `${id}.json`), "utf8"));
  const D = Math.min(cap.duration, cap.marks.board + spec.trimAfterBoard), total = D + TAG_B;
  const CW = 2440, CH = 4120, M = 140; // 4K camera canvas (crop 2160x3840 moves inside it)
  const SB = SRC.B;
  const PW = 1568, PH = Math.round((1568 * SB.h) / SB.w / 2) * 2; // 3394 (incl. bezel)
  const bezel = 20, SW = PW - 2 * bezel, SH = PH - 2 * bezel;
  const desk = await png(`${id}-desk.png`, CW / 2, CH / 2, `<div style="width:100%;height:100%;background:radial-gradient(ellipse 70% 45% at 30% 20%,rgba(255,214,160,.16),transparent 70%),radial-gradient(ellipse 80% 60% at 50% 55%,#1b1a1f,#0c0b0e 80%),#0c0b0e"></div>`);
  const glare = await png(`${id}-glare.png`, SW / 2, SH / 2, `<div style="width:100%;height:100%;background:linear-gradient(115deg,transparent 25%,rgba(255,255,255,${IG ? ".045" : ".10"}) 38%,rgba(255,255,255,${IG ? ".015" : ".03"}) 52%,transparent 62%),radial-gradient(ellipse 60% 25% at 80% 8%,rgba(255,255,255,${IG ? ".05" : ".12"}),transparent 70%)"></div>`);
  const stroke = `-webkit-text-stroke:14px #000;paint-order:stroke fill;text-shadow:0 4px 0 #000`;
  const capImgs = [];
  const times = spec.captions.map(([k]) => {
    const m = /^\+(\w+):([\d.]+)$/.exec(k);
    return m ? cap.marks[m[1]] + Number(m[2]) : cap.marks[k];
  });
  times[0] = 0;
  for (const [i, [, text]] of spec.captions.entries())
    capImgs.push(await png(`${id}-cap${i}.png`, 1080, 360, `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 ${IG ? "150px 0 60px" : "70px"}"><div style="color:#fff;font-size:${IG ? 60 : 64}px;line-height:1.16;text-align:center;font-weight:900;${stroke}">${esc(text)}</div></div>`));
  const el = await endLogo(1040), bgb = await bug(192);
  const tag = await png(`${id}-tag.png`, 1080, 1920, `<div style="width:100%;height:100%;background:rgba(0,0,0,.72);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px"><img src="${dataUri(el.file)}" width="520" height="520" style="display:block"><div style="color:#23e58a;font-size:${IG ? 52 : 60}px;font-weight:900">Call it. Lock it. Prove it.</div><div style="color:#fff;font-size:40px;font-weight:900;letter-spacing:.06em">Free to play</div></div>`);

  const inputs = [loopPng(desk, total), ["-i", path.join(RAW, `${id}.mp4`)], loopPng(glare, total), loopPng(tag, total), loopPng(bgb.file, total)];
  for (const c of capImgs) inputs.push(loopPng(c, total));
  const G = [];
  G.push(`[1:v]fps=30,scale=${SW}:${SH}:flags=lanczos,tpad=stop_mode=clone:stop_duration=4,setsar=1[scr]`);
  G.push(`[scr][2:v]overlay=0:0:format=auto[scrg]`);
  G.push(`[scrg]pad=${PW}:${PH}:${bezel}:${bezel}:color=0x050506[ph]`);
  G.push(`[0:v][ph]overlay=${(CW - PW) / 2}:${(CH - PH) / 2},format=yuv420p[flat]`);
  // ~5 degree yaw: right edge recedes (destination corners TL TR BL BR)
  G.push(`[flat]perspective=x0=28:y0=0:x1=${CW - 20}:y1=124:x2=28:y2=${CH}:x3=${CW - 20}:y3=${CH - 124}:sense=destination:interpolation=linear[persp]`);
  G.push(`[persp]rotate=a='0.011*sin(2*PI*t/5.6)+0.006*sin(2*PI*t/2.3+1)':ow=iw:oh=ih:c=0x0c0b0e,crop=2160:3840:'${M}+14*sin(2*PI*t/4.3)+6*sin(2*PI*t/1.7)':'${M}+18*sin(2*PI*t/3.7+1)+6*sin(2*PI*t/1.3)'[cam]`);
  G.push(`[cam]${IG ? "" : "noise=alls=5:allf=t,"}eq=contrast=1.04:saturation=0.94,setsar=1[g]`);
  let cur = "g";
  times.forEach((a, i) => {
    const b = i + 1 < times.length ? times[i + 1] : D;
    G.push(`[${cur}][${5 + i}:v]overlay=0:${(1350 - 180) * 2}:enable='between(t,${f(a)},${f(b)})'[c${i}]`); cur = `c${i}`;
  });
  G.push(`[${cur}][4:v]overlay=${52 - bgb.pad}:${(IG ? 560 : 500) - bgb.pad}:format=auto:enable='lt(t,${f(D)})'[cb]`);
  G.push(`[cb][3:v]overlay=0:0:enable='gte(t,${f(D)})',${scaleToBt709}[v]`);
  const out = path.join(OUT, outName(spec));
  encode(inputs, G, out, total, false);
  if (IG) { // cover frame (LOCKED stamp, 1.4 s after the stamp mark) + 3:4 profile-grid crop, both 4K
    const t = (cap.marks.stamp + 1.4).toFixed(2);
    const cover = path.join(OUT, "B1-cover-2160x3840.jpg"), grid = path.join(OUT, "B1-cover-grid-2160x2880.jpg");
    spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", t, "-i", out, "-frames:v", "1", "-q:v", "2", cover]);
    spawnSync(FFMPEG, ["-y", "-v", "error", "-i", cover, "-vf", "crop=2160:2880:0:480", "-q:v", "2", grid]);
  }
  return out;
}

// ---- main --------------------------------------------------------------------------------------------------
browser = await chromium.launch({ executablePath: CHROME });
shotPage = await browser.newPage({ deviceScaleFactor: 2 }); // overlays are authored in 1080-wide CSS px and rasterised at 2x
try {
  for (const id of ids.length ? ids : Object.keys(SPECS)) {
    const spec = SPECS[id]; if (!spec) throw new Error("unknown spot " + id);
    const out = spec.format === "A" ? await renderA(id, spec) : await renderB(id, spec);
    console.log(`${id}: ${path.relative(root, out)}  ${probeDur(out).toFixed(1)}s  ${(fs.statSync(out).size / 1e6).toFixed(1)}MB`);
  }
} finally { await browser.close(); }
