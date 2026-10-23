// Turns raw phone captures (marketing/out/raw, from capture.mjs) into finished ad creative with ffmpeg:
//   out/spot-<n>-<slug>.mp4          2160x3840 (4K 9:16), 30fps H.264 High@5.1 2-pass ~45 Mbps, BT.709, silent 48 kHz AAC track, +faststart (encode4k.mjs)
// Raw captures are 1950x4220 (390x844 CSS @ deviceScaleFactor 5) and are only ever scaled DOWN (lanczos; punch-in zoom is capped so the
// crop never drops below the on-screen phone width). Every video carries the emblem bug (marketing/brand.mjs) and ends on the full logo.
//   out/reddit-4x5-<n>-<slug>.mp4    2160x2700 reframe of each spot
//   out/reddit-carousel-1..3.png     2160x2700 stills
// Usage: node marketing/render.mjs [spotId ... | carousel]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { bug, endLogo } from "./brand.mjs";
import { encode4k, scaleToBt709 } from "./encode4k.mjs";
import * as TY from "./type.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const OUT = path.join(here, "out");
const RAW = path.join(OUT, "raw");
const CACHE = path.join(OUT, ".cache");
fs.mkdirSync(CACHE, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const HERO = path.join(root, "public/art/hero-tall.webp");
const cfg = JSON.parse(fs.readFileSync(path.join(here, "spots.json"), "utf8"));
const only = process.argv.slice(2).map(Number).filter(Boolean);
const onlyCarousel = process.argv.includes("carousel");
const ff = (args) => execFileSync(FFMPEG, ["-y", "-hide_banner", "-v", "error", ...args], { stdio: ["ignore", "inherit", "inherit"] });

// ---- tiny PNG writer (rounded-rect masks / bezels) ----------------------------------------------------------
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/** Anti-aliased rounded rectangle: fill colour inside, optional ring on the edge, transparent outside. */
function roundRect(file, w, h, r, fill, ring = null, ringW = 0) {
  if (fs.existsSync(file)) return file;
  const buf = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = Math.abs(x + 0.5 - w / 2) - (w / 2 - r), dy = Math.abs(y + 0.5 - h / 2) - (h / 2 - r);
    const sd = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - r; // <0 inside
    const a = Math.min(1, Math.max(0, 0.5 - sd));
    let [R, G, B] = fill;
    if (ring && -sd < ringW) { const k = Math.min(1, Math.max(0, ringW + sd - 0.5)); const m = 1 - k; R = ring[0] * m + R * k; G = ring[1] * m + G * k; B = ring[2] * m + B * k; }
    const i = (y * w + x) * 4; buf[i] = R; buf[i + 1] = G; buf[i + 2] = B; buf[i + 3] = Math.round(a * 255);
  }
  fs.writeFileSync(file, png(w, h, buf));
  return file;
}

const q = (s) => `'${s.replace(/'/g, "'\\''")}'`;
// all visible text comes from type.mjs (Chrome-rendered PNG layers: Saira hooks, Inter caption pills)
const KEYS = { 1: "called", 2: "10", 3: "MVP", 4: "receipt", 5: "Prove", 6: null };
const CKEY = { 1: "seconds", 2: "Locked.", 3: "Graded" };

// ---- layouts ------------------------------------------------------------------------------------------------
// Phone is sized so the caption sits ABOVE it (story) and the emblem bug sits in the free side margin next to the phone:
// out of the top 220 px, bottom 380 px and right-hand 140 px rail, and never over a caption/hook.
const LAYOUTS = {
  story: { W: 2160, H: 3840, pw: 1400, bezel: 28, phoneY: 832, capY: 420, capSize: 88, capW: 1760, hookCY: 1680, hookSize: 208, endLogo: 960, endLogoY: 800, endTagY: 1860, endFootY: 2090, bug: { size: 216, x: 72, y: 880 } },
  reddit: { W: 2160, H: 2700, pw: 1200, bezel: 24, phoneY: 428, capY: 36, capSize: 76, capW: 1900, hookCY: 1190, hookSize: 208, endLogo: 720, endLogoY: 300, endTagY: 1180, endFootY: 1400, bug: { size: 224, x: 112, y: 460 } },
};
const SRC_W = 1950, SRC_H = 4220; // raw capture size (5x native)
const ph = (pw) => Math.round((pw * 844) / 390 / 2) * 2;

function background(L, name) {
  const f = path.join(CACHE, `bg4k-${name}.png`);
  if (!fs.existsSync(f)) ff(["-i", HERO, "-vf", `scale=${L.W}:${L.H}:force_original_aspect_ratio=increase,crop=${L.W}:${L.H},gblur=sigma=52,eq=brightness=-0.30:saturation=0.85`, "-frames:v", "1", f]);
  return f;
}

/** Zoompan expressions for the punch-in moments (times are output-clock seconds). */
function zoomExprs(punches) {
  const UP = 0.14, DOWN = 0.35;
  const bump = (a, hold) => `clip(min((it-${a.toFixed(3)})/${UP},(${(a + hold + DOWN).toFixed(3)}-it)/${DOWN}),0,1)`;
  const z = "1+" + punches.map((p) => `(${(p.z - 1).toFixed(3)})*${bump(p.at, p.hold ?? 1.0)}`).join("+");
  const pick = (key) => punches.reduce((acc, p) => `if(gte(it,${(p.at - 0.2).toFixed(3)}),${p[key].toFixed(4)},${acc})`, "0.5");
  return {
    z,
    x: `max(0,min(iw-iw/zoom,${pick("px")}*iw-iw/zoom/2))`,
    y: `max(0,min(ih-ih/zoom,${pick("py")}*ih-ih/zoom/2))`,
  };
}

async function renderVideo(spot, layoutName, dest) {
  const L = LAYOUTS[layoutName];
  const meta = JSON.parse(fs.readFileSync(path.join(RAW, `spot-${spot.id}.json`), "utf8"));
  const S = meta.beats[0].start, D = meta.beats.at(-1).end - S, END = cfg.endCard.seconds, T = D + END;
  const pw = L.pw, h = ph(pw), b = L.bezel;
  const px = (L.W - pw) / 2, py = L.phoneY ?? Math.round((L.H - h) / 2);
  const bezel = roundRect(path.join(CACHE, `bezel-${layoutName}-${pw}.png`), pw + 2 * b, h + 2 * b, Math.round(pw * 0.11) + b, [14, 14, 17], [70, 70, 80], 5);
  const mask = roundRect(path.join(CACHE, `mask-${layoutName}-${pw}.png`), pw, h, Math.round(pw * 0.11), [255, 255, 255]);
  const bg_ = await bug(L.bug.size), lg_ = await endLogo(L.endLogo);
  const bg = background(L, layoutName);
  // zoom is capped so the cropped source never gets upscaled into the phone (crop width SRC_W/z must stay >= pw)
  const punches = meta.punches.map((p) => ({ ...p, z: Math.min(p.z, SRC_W / pw), at: p.t - S })).filter((p) => p.at >= 0 && p.at < D);

  const g = [];
  // footage: trim to the beats, hold the last frame, scale, optional punch-in
  g.push(`[0:v]trim=start=${S.toFixed(3)}:end=${(S + D + 0.2).toFixed(3)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${END + 1},trim=duration=${T.toFixed(3)},setpts=PTS-STARTPTS[raw]`);
  if (punches.length) {
    const e = zoomExprs(punches);
    g.push(`[raw]zoompan=z=${q(e.z)}:x=${q(e.x)}:y=${q(e.y)}:d=1:s=${pw}x${h}:fps=30,setsar=1[sc]`);
  } else g.push(`[raw]scale=${pw}:${h}:flags=lanczos[sc]`);
  g.push(`[sc]format=rgba[scr]`, `[3:v]format=rgba,alphaextract[ma]`, `[scr][ma]alphamerge[screen]`);
  g.push(`[2:v]format=rgba[bz]`, `[bz][screen]overlay=x=${b}:y=${b}:format=auto[phone0]`);
  g.push(`[phone0]fade=t=out:st=${(D - 0.15).toFixed(3)}:d=0.35:alpha=1[phone]`);
  g.push(`[1:v]format=rgba[bgv]`, `[bgv][phone]overlay=x=${px - b}:y=${py - b}:format=auto[comp]`);

  const hookEnd = 1.3; // hook stays >= 1.2 s
  const E = D, ec = cfg.endCard;
  const hk = await TY.hook(spot.hook, { key: KEYS[spot.id], size: L.hookSize, maxW: 1760 });
  const caps = [];
  for (const bt of meta.beats) {
    const a = Math.max(bt.start - S, hookEnd + 0.05), z = bt.end - S;
    if (z <= a) continue;
    caps.push({ a, z, ...(await TY.pill(bt.caption, { size: L.capSize, maxW: L.capW })) });
  }
  const endL = await TY.endText({ W: L.W, H: L.H, tagY: L.endTagY, footY: L.endFootY, glowY: L.endLogoY + L.endLogo / 2, tagline: ec.tagline, footer: ec.footer });
  const f = [];
  // hook (first 1.3s) over a dimmed frame
  f.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.38:t=fill:enable=${q(`between(t,0,${hookEnd})`)}`);
  // flash on punch-in
  for (const p of punches) f.push(`drawbox=x=0:y=0:w=iw:h=ih:color=white@0.28:t=fill:enable=${q(`between(t,${p.at.toFixed(2)},${(p.at + 0.07).toFixed(2)})`)}`);
  g.push(`[comp]${f.join(",")}[fx0]`);
  let cur = "fx0", ni = 6;
  const ov = (png, x, y, en) => { const o = `[${ni}:v]format=rgba[o${ni}]`; g.push(o, `[${cur}][o${ni}]overlay=x=${x}:y=${y}:format=auto:enable=${q(en)}[fx${ni}]`); cur = `fx${ni}`; ni++; };
  const extraIn = [["-loop", "1", "-framerate", "30", "-i", hk.file]];
  ov(hk, `(W-w)/2`, Math.round(L.hookCY - hk.h / 2), `between(t,0,${hookEnd})`);
  for (const c of caps) { extraIn.push(["-loop", "1", "-framerate", "30", "-i", c.file]); ov(c, `(W-w)/2`, L.capY - c.pad, `between(t,${c.a.toFixed(3)},${c.z.toFixed(3)})`); }
  extraIn.push(["-loop", "1", "-framerate", "30", "-i", endL]);
  ov(null, 0, 0, `gte(t,${E.toFixed(3)})`);
  g.push(`[${cur}]null[txt]`);
  // full logo on the end card, emblem bug on every other frame
  g.push(`[5:v]format=rgba,fade=t=in:st=${E.toFixed(3)}:d=0.3:alpha=1[lg]`);
  g.push(`[txt][lg]overlay=x=(W-w)/2:y=${L.endLogoY}:format=auto:enable=${q(`gte(t,${E})`)}[t2]`);
  g.push(`[4:v]format=rgba[bugv]`, `[t2][bugv]overlay=x=${L.bug.x - bg_.pad}:y=${L.bug.y - bg_.pad}:format=auto:enable=${q(`lt(t,${E})`)},${scaleToBt709}[v]`);

  encode4k({
    inputs: [
      ["-i", path.join(RAW, `spot-${spot.id}.mp4`)],
      ["-loop", "1", "-framerate", "30", "-i", bg],
      ["-loop", "1", "-framerate", "30", "-i", bezel],
      ["-loop", "1", "-framerate", "30", "-i", mask],
      ["-loop", "1", "-framerate", "30", "-i", bg_.file],
      ["-loop", "1", "-framerate", "30", "-i", lg_.file],
      ...extraIn,
    ],
    script: g.join(";\n"), audio: "silent", total: T, dest,
  });
  console.log(`rendered ${path.relative(root, dest)} (${T.toFixed(1)}s)`);
}

// ---- carousel -----------------------------------------------------------------------------------------------
async function renderCarousel() {
  const cb = await bug(240);
  const W = 2160, H = 2700, pw = 1400, b = 24, h = ph(pw), py = 600;
  const bezel = roundRect(path.join(CACHE, `bezel4k-carousel-${pw}.png`), pw + 2 * b, h + 2 * b, Math.round(pw * 0.11) + b, [14, 14, 17], [70, 70, 80], 5);
  const mask = roundRect(path.join(CACHE, `mask4k-carousel-${pw}.png`), pw, h, Math.round(pw * 0.11), [255, 255, 255]);
  const bg = background({ W, H }, "reddit");
  for (const c of cfg.carousel) {
    const shot = path.join(RAW, `carousel-${c.n}.png`);
    const g = [
      `[1:v]scale=${pw}:${h}:flags=lanczos,format=rgba[s]`, `[3:v]format=rgba,alphaextract[m]`, `[s][m]alphamerge[scr]`,
      `[2:v]format=rgba[bz]`, `[bz][scr]overlay=x=${b}:y=${b}:format=auto[ph]`,
      `[0:v]format=rgba[bgv]`, `[bgv][ph]overlay=x=${(W - pw) / 2 - b}:y=${py - b}:format=auto[c0]`,
      `[4:v]format=rgba[bugv]`, `[c0][bugv]overlay=x=${68 - cb.pad}:y=${680 - cb.pad}:format=auto[c]`,
    ];
    const hk = await TY.hook(c.headline, { key: CKEY[c.n], size: 200, maxW: 1800, maxLines: 2 });
    const band = await TY.frame(`<div style="position:absolute;left:0;right:0;top:2360px;height:340px;background:rgba(8,10,12,.985);box-shadow:inset 0 2px 0 rgba(255,255,255,.08)"></div>
<div class=inter style="position:absolute;left:0;right:0;top:2410px;text-align:center;font-weight:700;font-size:54px;letter-spacing:.14em;color:rgba(255,255,255,.88)">GAME RECEIPTS &nbsp;\u00B7&nbsp; ${c.n}/3</div>
<div class=inter style="position:absolute;left:0;right:0;top:2510px;text-align:center;font-weight:600;font-size:76px;letter-spacing:.08em;text-transform:uppercase;color:${TY.VOLT}">${cfg.endCard.footer}</div>`, W, H, "carband");
    g.push(`[c]null[c1]`, `[5:v]format=rgba[hk]`, `[c1][hk]overlay=x=(W-w)/2:y=${Math.round(345 - hk.h / 2)}:format=auto[c2]`, `[6:v]format=rgba[bd]`, `[c2][bd]overlay=0:0:format=auto,format=rgb24[v]`);
    const script = path.join(CACHE, `graph-carousel-${c.n}.txt`);
    fs.writeFileSync(script, g.join(";\n"));
    const dest = path.join(OUT, `reddit-carousel-${c.n}.png`);
    ff(["-i", bg, "-i", shot, "-i", bezel, "-i", mask, "-i", cb.file, "-i", hk.file, "-i", band, "-filter_complex_script", script, "-map", "[v]", "-frames:v", "1", dest]);
    console.log(`rendered ${path.relative(root, dest)}`);
  }
}

for (const spot of cfg.spots) {
  if (onlyCarousel || (only.length && !only.includes(spot.id))) continue;
  if (!fs.existsSync(path.join(RAW, `spot-${spot.id}.mp4`))) { console.warn(`skip spot ${spot.id}: no capture (run capture.mjs)`); continue; }
  await renderVideo(spot, "story", path.join(OUT, `spot-${spot.id}-${spot.slug}.mp4`));
  await renderVideo(spot, "reddit", path.join(OUT, `reddit-4x5-${spot.id}-${spot.slug}.mp4`));
}
if ((onlyCarousel || !only.length) && fs.existsSync(path.join(RAW, "carousel-1.png"))) await renderCarousel();
await TY.closeType();
