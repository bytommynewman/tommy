// Finishes the AI UGC spots: Kling talking head (native audio, untouched) + hook text -> real app footage -> end card.
// Node 20+, system ffmpeg (no ffprobe needed). Usage: node marketing/ugc/finish.mjs [spotId ...]
// Inputs:  marketing/ugc/raw/<head>.mp4 (Kling), marketing/ugc/raw/footage/<footage>.mp4 (capture.mjs)
// Outputs: marketing/ugc/out/ugc-<n>-<slug>.mp4 (2160x3840, 4K) and ...-4x5.mp4 (2160x2700, Reddit), encoded by ../encode4k.mjs (2-pass H.264 High@5.1, BT.709).
// The Kling talking head is ~1076x1924: it is denoised (mild hqdn3d), upscaled 2x with lanczos and lightly sharpened. It cannot be true 4K
// (that needs AI upscaling = credits); everything else (app footage, overlays, end card) is native 4K.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { bug, endLogo } from "../brand.mjs";
import { encode4k, scaleToBt709 } from "../encode4k.mjs";
import * as TY from "../type.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const RAW = path.join(here, "raw");
const OUT = path.join(here, "out");
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const BG = path.join(ROOT, "public/art/hero-tall.webp");

// footage cuts: [start s, end s, speed] from the raw screen capture (2060x3660, 5x native; only ever scaled down).
// Speed-ups are capped at 1.5x: trim dead time instead of racing through it.
// The head is the untouched Kling clip (light unsharp on luma only); app footage sits in a phone frame on the blurred hero
// background, and a small picture-in-picture of the same app flow rides the head's lower third during its second half.
const SPOTS = [  // pipStart: raw-footage second where the PiP clip (1x) starts
  { id: 1, slug: "kyle", head: "kyle.mp4", footage: "kyle.mp4", key: "called", hook: "my buddy \u201Ccalled it\u201D", pipStart: 3.2,
    cuts: [[1.5, 2.9, 1.5], [3.2, 6.0, 1.5], [7.0, 7.9, 1.3], [8.0, 9.5, 1], [15.3, 16.3, 1.25]] },
  { id: 2, slug: "mvp", head: "mvp.mp4", footage: "mvp.mp4", key: "Wemby", hook: "Everyone laughed at my Wemby MVP pick", pipStart: 3.0, split: 7.5,
    // captions ride the app footage: [text, start s, end s] on the app-segment clock (real Wemby headshot capture, allowHeadshots in capture.mjs)
    caps: [["Lock your take", 0.1, 3.7], ["Timestamped. Can\u2019t edit it.", 3.8, 5.5], ["Graded when the season ends", 5.55, 6.9], ["Climb the leaderboard", 6.95, 99]],
    cuts: [[1.5, 2.9, 1.5], [3.0, 4.8, 1.5], [5.3, 7.8, 1.5], [8.1, 9.3, 1.2], [9.5, 11.3, 1], [16.7, 18.5, 1.2]] },
];

const run = (args) => {
  const r = spawnSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.slice(-1500));
};
const dur = (f) => { // ffmpeg -i prints "Duration: hh:mm:ss.xx" on stderr
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(spawnSync(FFMPEG, ["-i", f], { encoding: "utf8" }).stderr);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ugc-"));
const txt = (name, s) => { const f = path.join(tmp, name); fs.writeFileSync(f, s); return f; };
const q = (p) => p.replace(/\\/g, "/").replace(/:/g, "\\:").replace(/'/g, "\\'");

const roundedMask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
async function frameAssets(pw, sh, b, tag) {
  const r = Math.round(pw * 0.11), W = pw + 2 * b, H = sh + 2 * b;
  const bezel = path.join(tmp, `bezel-${tag}.png`), mask = path.join(tmp, `mask-${tag}.png`);
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="2.5" y="2.5" width="${W - 5}" height="${H - 5}" rx="${r + b}" fill="#0e0e11" stroke="#46464f" stroke-width="5"/></svg>`)).png().toFile(bezel);
  await sharp(roundedMask(pw, sh, r)).png().toFile(mask);
  return { bezel, mask, W, H };
}

async function build(spot, W, H, outFile) {
  const story = H === 3840;
  const sc = H / 1920; // px(n): n is the old 1080-wide design number; the scale doubles it for 2160 wide
  const px = (n) => Math.round(n * sc);
  const hk = await TY.hook(spot.hook.replace(/\s+/g, " "), { key: spot.key, size: 150, maxW: 1700, maxLines: 2, card: true });
  const hookCY = story ? 740 : 600;
  const cropY = story ? "0" : "(ih-oh)*0.22";
  const headMs = path.join(RAW, spot.head);
  const footage = path.join(RAW, "footage", spot.footage);
  const hd = dur(headMs);
  const n = spot.cuts.length;
  // phone frame (side margins are free: the emblem bug lives there) + small PiP
  const pw = story ? 1440 : 1200, sh = Math.round((pw * 732) / 412 / 2) * 2, bz = story ? 28 : 24;
  const ph = await frameAssets(pw, sh, bz, `${story ? "s" : "r"}`);
  const phX = (W - ph.W) / 2, phY = Math.round((H - ph.H) / 2);
  const pipW = story ? 500 : 400, pipH = Math.round((pipW * 732) / 412 / 2) * 2, pipB = 10;
  const pip = await frameAssets(pipW, pipH, pipB, `${story ? "s" : "r"}pip`);
  const pipX = story ? 80 : 60, pipY = story ? 2180 : 1920;
  const bugSize = story ? 216 : 184, bg_ = await bug(bugSize);
  const headBug = story ? { x: 72, y: 1040 } : { x: 56, y: 800 };
  const phoneBug = story ? { x: 72, y: phY + 48 } : { x: 112, y: phY + 32 };
  const lg_ = await endLogo(story ? 880 : 660);
  const capL = [];
  for (const [text, a, b] of spot.caps ?? []) capL.push({ a, b, ...(await TY.pill(text, { size: story ? 92 : 80, maxW: story ? 1800 : 1700, maxLines: 1 })) });
  const SPLIT = spot.split ?? 5.0; // PiP appears for the head's second half
  const f = [];
  f.push(`[0:v]hqdn3d=1.2:1.2:2:2,scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}:(iw-${W})/2:${cropY},fps=30,setsar=1,unsharp=5:5:0.45:5:5:0,format=yuv420p[head00]`, `[head00][11:v]overlay=x=(W-w)/2:y=${hookCY - Math.round(hk.h / 2)}:format=auto:enable='lt(t,1.3)',format=yuv420p[head0]`);
  // pip: first seconds of the app flow, 1x
  f.push(`[1:v]fps=30[pipsrc]`);
  f.push(`[pipsrc]trim=${spot.pipStart ?? spot.cuts[0][0]}:${(spot.pipStart ?? spot.cuts[0][0]) + hd - SPLIT},setpts=PTS-STARTPTS,scale=${pipW}:${pipH}:flags=lanczos,format=rgba[pa]`);
  f.push(`[8:v]format=rgba,alphaextract[pm]`, `[pa][pm]alphamerge[pb]`, `[7:v]format=rgba[pz]`, `[pz][pb]overlay=${pipB}:${pipB}:format=auto,fade=t=in:st=0:d=0.3:alpha=1,setpts=PTS+${SPLIT}/TB[pipv]`);
  f.push(`[head0][pipv]overlay=${pipX - pipB}:${pipY - pipB}:format=auto:eof_action=pass:enable='gte(t,${SPLIT})'[head1]`);
  f.push(`[4:v]format=rgba[bugv]`, `[head1][bugv]overlay=${headBug.x - bg_.pad}:${headBug.y - bg_.pad}:format=auto,trim=duration=${hd.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[head]`);
  f.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo[ha]`);
  const footSecs = spot.cuts.reduce((t, [a, b, sp]) => t + (b - a) / sp, 0);
  f.push(`[13:v]fps=30,scale=${pw}:${sh}:flags=lanczos,format=rgba[fv]`);
  f.push(`[9:v]format=rgba,alphaextract[fm]`, `[fv][fm]alphamerge[fa]`);
  f.push(`[2:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},gblur=sigma=52,eq=brightness=-0.30:saturation=0.85,fps=30,format=rgba[bgf]`);
  f.push(`[10:v]format=rgba[bz]`, `[bgf][bz]overlay=${phX}:${phY}:format=auto[pb0]`, `[pb0][fa]overlay=${phX + bz}:${phY + bz}:format=auto[pb1]`);
  f.push(`[5:v]format=rgba[bugv2]`, `[pb1][bugv2]overlay=${phoneBug.x - bg_.pad}:${phoneBug.y - bg_.pad}:format=auto,trim=duration=${footSecs.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[app0]`);
  let appL = "app0";
  capL.forEach((c, i) => {
    const capY = story ? 430 : phY + ph.H - 330;
    f.push(`[${14 + i}:v]format=rgba[cp${i}]`, `[${appL}][cp${i}]overlay=x=(W-w)/2:y=${capY - c.pad}:format=auto:enable='between(t,${c.a},${Math.min(c.b, footSecs).toFixed(2)})'[ap${i}]`);
    appL = `ap${i}`;
  });
  f.push(`[${appL}]null[app]`);
  // end card: full logo above the tagline + "Free to play"
  const logoY = story ? 760 : 240;
  const cy = story ? 760 + 880 + 140 : 240 + 660 + 100;
  f.push(`[3:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=30,eq=brightness=-0.42:saturation=0.9,setsar=1,format=rgba[cbg]`);
  const endL = await TY.endText({ W, H, tagY: cy, footY: cy + (story ? 200 : 150), glowY: logoY + (story ? 440 : 330), tagSize: story ? 124 : 108, footSize: story ? 54 : 46, dim: 0.0 });
  f.push(`[6:v]format=rgba,fade=t=in:st=0.1:d=0.3:alpha=1[clg]`, `[cbg][clg]overlay=(W-w)/2:${logoY}:format=auto[cl]`, `[cl][12:v]overlay=0:0:format=auto,format=yuv420p[card]`);
  const END = 1.8, total = hd + footSecs + END;
  f.push(`anullsrc=r=48000:cl=stereo,atrim=0:${(footSecs + END).toFixed(3)}[sil]`);
  f.push(`[head][app][card]concat=n=3:v=1:a=0,${scaleToBt709}[v]`);
  f.push(`[ha][sil]concat=n=2:v=0:a=1[a]`);
  // footage cuts are pre-rendered into one clip (a single multi-trim split graph froze the app footage after the 3rd cut)
  const cutFile = path.join(tmp, `cuts-${story ? "s" : "r"}.mp4`);
  const cutF = spot.cuts.map(([a, b, sp], i) => `[0:v]trim=${a}:${b},setpts=(PTS-STARTPTS)/${sp},fps=30[c${i}]`);
  run(["-i", footage, "-filter_complex", `${cutF.join(";")};${spot.cuts.map((_, i) => `[c${i}]`).join("")}concat=n=${n}:v=1:a=0[v]`, "-map", "[v]", "-c:v", "libx264", "-crf", "8", "-preset", "veryfast", "-pix_fmt", "yuv420p", cutFile]);
  const loopImg = (file, t) => ["-loop", "1", "-framerate", "30", "-t", String(t), "-i", file];
  encode4k({
    inputs: [["-i", headMs], ["-i", footage], loopImg(BG, footSecs + 1), loopImg(BG, 3), loopImg(bg_.file, total), loopImg(bg_.file, total), loopImg(lg_.file, 3),
      loopImg(pip.bezel, total), loopImg(pip.mask, total), loopImg(ph.mask, total), loopImg(ph.bezel, total), loopImg(hk.file, total), loopImg(endL, 3), ["-i", cutFile], ...capL.map((c) => loopImg(c.file, footSecs + 1))],
    script: f.join(";\n"), audio: "graph", total, dest: outFile,
  });
}
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const want = process.argv.slice(2).map(Number);
for (const s of SPOTS.filter((x) => !want.length || want.includes(x.id))) {
  for (const [W, H, suf] of [[2160, 3840, ""], [2160, 2700, "-4x5"]]) {
    const o = path.join(OUT, `ugc-${s.id}-${s.slug}${suf}.mp4`);
    await build(s, W, H, o);
    const d = dur(o);
    console.log(path.basename(o), d.toFixed(2) + "s", (fs.statSync(o).size / 1e6).toFixed(1) + "MB");
    if (!suf) for (const t of [0.8, 5, 12, d - 0.4]) run(["-ss", t.toFixed(2), "-i", o, "-frames:v", "1", path.join(OUT, "frames", `ugc-${s.id}-${s.slug}-${t.toFixed(1)}s.png`)]);
  }
}
await TY.closeType();
fs.rmSync(tmp, { recursive: true, force: true });
