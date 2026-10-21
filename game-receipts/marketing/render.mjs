// Turns raw phone captures (marketing/out/raw, from capture.mjs) into finished ad creative with ffmpeg:
//   out/spot-<n>-<slug>.mp4          1080x1920, 30fps H.264, silent AAC track, +faststart
//   out/reddit-4x5-<n>-<slug>.mp4    1080x1350 reframe of each spot
//   out/reddit-carousel-1..3.png     1080x1350 stills
// Usage: node marketing/render.mjs [spotId ... | carousel]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const OUT = path.join(here, "out");
const RAW = path.join(OUT, "raw");
const CACHE = path.join(OUT, ".cache");
fs.mkdirSync(CACHE, { recursive: true });
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf";
const BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf";
const HERO = path.join(root, "public/art/hero-tall.webp");
const LOGO = path.join(root, "public/brand/logo-360.png");
const VOLT = "0x23E58A";
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

// ---- text helpers -------------------------------------------------------------------------------------------
const wrap = (text, max) => {
  // balance: use as few lines as `max` allows, then even them out (no one-word orphans)
  const n = Math.ceil(text.length / max);
  if (n > 1) max = Math.max(Math.ceil(text.length / n) + 3, ...text.split(/\s+/).map((w) => w.length));
  const lines = []; let cur = "";
  for (const w of text.split(/\s+/)) { if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + " " + w : w; }
  if (cur) lines.push(cur);
  return lines;
};
const smart = (s) => s.replace(/"([^"]*)"/g, "“$1”").replace(/'/g, "’");
let tfCount = 0;
const tf = (text) => { const f = path.join(CACHE, `t${process.pid}-${tfCount++}.txt`); fs.writeFileSync(f, text); return f; };
const q = (s) => `'${s.replace(/'/g, "'\\''")}'`;
/** One drawtext per line (each centred), so multi-line blocks stay centred in every ffmpeg version. */
function lines(text, { font, size, max, y, pitch, color = "white", border = 0, box = null, boxBorder = 0, enable, x = "(w-text_w)/2", upper = false, shadow = 0 }) {
  return wrap(smart(upper ? text.toUpperCase() : text), max).map((ln, i) => {
    const parts = [`fontfile=${q(font)}`, `textfile=${q(tf(ln))}`, `fontsize=${size}`, `fontcolor=${color}`, `x=${x}`, `y=${y}+${i * pitch}`];
    if (border) parts.push(`borderw=${border}`, "bordercolor=black");
    if (shadow) parts.push(`shadowx=${shadow}`, `shadowy=${shadow}`, "shadowcolor=black@0.7");
    if (box) parts.push("box=1", `boxcolor=${box}`, `boxborderw=${boxBorder}`);
    if (enable) parts.push(`enable=${q(enable)}`);
    return "drawtext=" + parts.join(":");
  });
}

// ---- layouts ------------------------------------------------------------------------------------------------
const LAYOUTS = {
  story: { W: 1080, H: 1920, pw: 842, bezel: 14, phoneY: null, capY: 262, capSize: 54, capMax: 24, capPitch: 100, hookY: 640, hookSize: 104, hookMax: 15, hookPitch: 128, endLogo: 330, endLogoY: 520, endTitleY: 900, endTagY: 1080, endFootY: 1270 },
  reddit: { W: 1080, H: 1350, pw: 600, bezel: 12, phoneY: null, capY: 52, capSize: 50, capMax: 26, capPitch: 92, hookY: 400, hookSize: 104, hookMax: 15, hookPitch: 128, endLogo: 260, endLogoY: 250, endTitleY: 600, endTagY: 760, endFootY: 930 },
};
const ph = (pw) => Math.round((pw * 844) / 390 / 2) * 2;

function background(L, name) {
  const f = path.join(CACHE, `bg-${name}.png`);
  if (!fs.existsSync(f)) ff(["-i", HERO, "-vf", `scale=${L.W}:${L.H}:force_original_aspect_ratio=increase,crop=${L.W}:${L.H},gblur=sigma=26,eq=brightness=-0.30:saturation=0.85`, "-frames:v", "1", f]);
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

function renderVideo(spot, layoutName, dest) {
  const L = LAYOUTS[layoutName];
  const meta = JSON.parse(fs.readFileSync(path.join(RAW, `spot-${spot.id}.json`), "utf8"));
  const S = meta.beats[0].start, D = meta.beats.at(-1).end - S, END = cfg.endCard.seconds, T = D + END;
  const pw = L.pw, h = ph(pw), b = L.bezel;
  const px = (L.W - pw) / 2, py = L.phoneY ?? Math.round((L.H - h) / 2);
  const bezel = roundRect(path.join(CACHE, `bezel-${layoutName}.png`), pw + 2 * b, h + 2 * b, Math.round(pw * 0.11) + b, [14, 14, 17], [70, 70, 80], 2.5);
  const mask = roundRect(path.join(CACHE, `mask-${layoutName}.png`), pw, h, Math.round(pw * 0.11), [255, 255, 255]);
  const logoMask = roundRect(path.join(CACHE, "logo-mask.png"), 360, 360, 80, [255, 255, 255]);
  const bg = background(L, layoutName);
  const punches = meta.punches.map((p) => ({ ...p, at: p.t - S })).filter((p) => p.at >= 0 && p.at < D);

  const g = [];
  // footage: trim to the beats, hold the last frame, scale, optional punch-in
  g.push(`[0:v]trim=start=${S.toFixed(3)}:end=${(S + D + 0.2).toFixed(3)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=${END + 1},trim=duration=${T.toFixed(3)},setpts=PTS-STARTPTS[raw]`);
  if (punches.length) {
    const e = zoomExprs(punches);
    g.push(`[raw]scale=${pw * 2}:${h * 2}:flags=lanczos,zoompan=z=${q(e.z)}:x=${q(e.x)}:y=${q(e.y)}:d=1:s=${pw}x${h}:fps=30[sc]`);
  } else g.push(`[raw]scale=${pw}:${h}:flags=lanczos[sc]`);
  g.push(`[sc]format=rgba[scr]`, `[3:v]format=rgba,alphaextract[ma]`, `[scr][ma]alphamerge[screen]`);
  g.push(`[2:v]format=rgba[bz]`, `[bz][screen]overlay=x=${b}:y=${b}:format=auto[phone0]`);
  g.push(`[phone0]fade=t=out:st=${(D - 0.15).toFixed(3)}:d=0.35:alpha=1[phone]`);
  g.push(`[1:v]format=rgba[bgv]`, `[bgv][phone]overlay=x=${px - b}:y=${py - b}:format=auto[comp]`);

  const f = [];
  const hookEnd = 1.5;
  // hook (first 1.5s) over a dimmed frame
  f.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.38:t=fill:enable=${q(`between(t,0,${hookEnd})`)}`);
  f.push(...lines(spot.hook, { font: IMPACT, size: L.hookSize, max: L.hookMax, y: L.hookY, pitch: L.hookPitch, border: 9, shadow: 4, enable: `between(t,0,${hookEnd})`, upper: true }));
  // flash on punch-in
  for (const p of punches) f.push(`drawbox=x=0:y=0:w=iw:h=ih:color=white@0.28:t=fill:enable=${q(`between(t,${p.at.toFixed(2)},${(p.at + 0.07).toFixed(2)})`)}`);
  // beat captions
  for (const bt of meta.beats) {
    const a = Math.max(bt.start - S, hookEnd + 0.05), z = bt.end - S;
    if (z <= a) continue;
    f.push(...lines(bt.caption, { font: BLACK, size: L.capSize, max: L.capMax, y: L.capY, pitch: L.capPitch, box: "black@0.84", boxBorder: 20, enable: `between(t,${a.toFixed(3)},${z.toFixed(3)})` }));
  }
  // end card
  const E = D, ec = cfg.endCard;
  f.push(`drawbox=x=0:y=0:w=iw:h=ih:color=black@0.45:t=fill:enable=${q(`gte(t,${E.toFixed(3)})`)}`);
  f.push(...lines(ec.title, { font: IMPACT, size: 128, max: 14, y: L.endTitleY, pitch: 140, color: VOLT, border: 8, shadow: 3, enable: `gte(t,${E})` }));
  f.push(...lines(ec.tagline, { font: BLACK, size: 50, max: 40, y: L.endTagY, pitch: 70, border: 4, enable: `gte(t,${E})` }));
  f.push(...lines(ec.footer, { font: BLACK, size: 58, max: 40, y: L.endFootY, pitch: 80, color: "black", box: `${VOLT}@1.0`, boxBorder: 22, enable: `gte(t,${E})` }));
  g.push(`[comp]${f.join(",")}[txt]`);
  // logo on the end card
  g.push(`[4:v]scale=${L.endLogo}:${L.endLogo},format=rgba[lg0]`, `[5:v]scale=${L.endLogo}:${L.endLogo},format=rgba,alphaextract[lgm]`, `[lg0][lgm]alphamerge,fade=t=in:st=${E.toFixed(3)}:d=0.3:alpha=1[lg]`);
  g.push(`[txt][lg]overlay=x=(W-w)/2:y=${L.endLogoY}:format=auto:enable=${q(`gte(t,${E})`)},format=yuv420p[v]`);

  const script = path.join(CACHE, `graph-${spot.id}-${layoutName}.txt`);
  fs.writeFileSync(script, g.join(";\n"));
  ff([
    "-i", path.join(RAW, `spot-${spot.id}.mp4`),
    "-loop", "1", "-framerate", "30", "-i", bg,
    "-loop", "1", "-framerate", "30", "-i", bezel,
    "-loop", "1", "-framerate", "30", "-i", mask,
    "-loop", "1", "-framerate", "30", "-i", LOGO,
    "-loop", "1", "-framerate", "30", "-i", logoMask,
    "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo",
    "-filter_complex_script", script,
    "-map", "[v]", "-map", "6:a", "-t", T.toFixed(3),
    "-r", "30", "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dest,
  ]);
  console.log(`rendered ${path.relative(root, dest)} (${T.toFixed(1)}s)`);
}

// ---- carousel -----------------------------------------------------------------------------------------------
function renderCarousel() {
  const W = 1080, H = 1350, pw = 700, b = 12, h = ph(pw), py = 300;
  const bezel = roundRect(path.join(CACHE, "bezel-carousel.png"), pw + 2 * b, h + 2 * b, Math.round(pw * 0.11) + b, [14, 14, 17], [70, 70, 80], 2.5);
  const mask = roundRect(path.join(CACHE, "mask-carousel.png"), pw, h, Math.round(pw * 0.11), [255, 255, 255]);
  const bg = background({ W, H }, "reddit");
  for (const c of cfg.carousel) {
    const shot = path.join(RAW, `carousel-${c.n}.png`);
    const g = [
      `[1:v]scale=${pw}:${h}:flags=lanczos,format=rgba[s]`, `[3:v]format=rgba,alphaextract[m]`, `[s][m]alphamerge[scr]`,
      `[2:v]format=rgba[bz]`, `[bz][scr]overlay=x=${b}:y=${b}:format=auto[ph]`,
      `[0:v]format=rgba[bgv]`, `[bgv][ph]overlay=x=${(W - pw) / 2 - b}:y=${py - b}:format=auto[c]`,
    ];
    const f = [
      ...lines(c.headline, { font: IMPACT, size: 100, max: 20, y: 60, pitch: 112, border: 8, shadow: 3, upper: true }),
      "drawbox=x=0:y=1180:w=iw:h=170:color=black@0.94:t=fill",
      ...lines(`GAME RECEIPTS  \u00B7  ${c.n}/3`, { font: BLACK, size: 30, max: 60, y: 1196, pitch: 40 }),
      ...lines(cfg.endCard.footer, { font: BLACK, size: 40, max: 40, y: 1250, pitch: 60, color: "black", box: `${VOLT}@1.0`, boxBorder: 14 }),
    ];
    g.push(`[c]${f.join(",")},format=rgb24[v]`);
    const script = path.join(CACHE, `graph-carousel-${c.n}.txt`);
    fs.writeFileSync(script, g.join(";\n"));
    const dest = path.join(OUT, `reddit-carousel-${c.n}.png`);
    ff(["-i", bg, "-i", shot, "-i", bezel, "-i", mask, "-filter_complex_script", script, "-map", "[v]", "-frames:v", "1", dest]);
    console.log(`rendered ${path.relative(root, dest)}`);
  }
}

for (const spot of cfg.spots) {
  if (onlyCarousel || (only.length && !only.includes(spot.id))) continue;
  if (!fs.existsSync(path.join(RAW, `spot-${spot.id}.mp4`))) { console.warn(`skip spot ${spot.id}: no capture (run capture.mjs)`); continue; }
  renderVideo(spot, "story", path.join(OUT, `spot-${spot.id}-${spot.slug}.mp4`));
  renderVideo(spot, "reddit", path.join(OUT, `reddit-4x5-${spot.id}-${spot.slug}.mp4`));
}
if ((onlyCarousel || !only.length) && fs.existsSync(path.join(RAW, "carousel-1.png"))) renderCarousel();
for (const f of fs.readdirSync(CACHE)) if (/^t\d+-\d+\.txt$/.test(f)) fs.rmSync(path.join(CACHE, f));
