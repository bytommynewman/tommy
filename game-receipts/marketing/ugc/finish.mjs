// Finishes the AI UGC spots: Kling talking head (native audio, untouched) + hook text -> real app footage -> end card.
// Node 20+, system ffmpeg (no ffprobe needed). Usage: node marketing/ugc/finish.mjs [spotId ...]
// Inputs:  marketing/ugc/raw/<head>.mp4 (Kling), marketing/ugc/raw/footage/<footage>.mp4 (capture.mjs)
// Outputs: marketing/ugc/out/ugc-<n>-<slug>.mp4 (1080x1920) and ...-4x5.mp4 (1080x1350, Reddit)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { bug, endLogo } from "../brand.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const RAW = path.join(here, "raw");
const OUT = path.join(here, "out");
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf";
const BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf";
const BG = path.join(ROOT, "public/art/hero-tall.webp");
const BAR = "0x06090b"; // app background, pads the 4:5 footage

// footage cuts: [start s, end s, speed] from the raw screen capture (1236x2196, 3x native; only ever scaled down).
// Speed-ups are capped at 1.6x: trim dead time instead of racing through it.
// The head is the untouched Kling clip (light unsharp on luma only); app footage sits in a phone frame on the blurred hero
// background, and a small picture-in-picture of the same app flow rides the head's lower third during its second half.
const SPOTS = [  // pipStart: raw-footage second where the PiP clip (1x) starts
  { id: 1, slug: "kyle", head: "kyle.mp4", footage: "kyle.mp4", hook: "my buddy \u201Ccalled it\u201D", pipStart: 4.0,
    cuts: [[3.0, 6.0, 1.5], [6.0, 7.9, 1.2], [8.8, 12.0, 1.2], [21.0, 22.8, 1]] },
  { id: 2, slug: "mvp", head: "mvp.mp4", footage: "mvp.mp4", hook: "my MVP pick has a DATE on it", pipStart: 6.0,
    cuts: [[3.0, 6.6, 1.5], [6.6, 10.6, 1.5], [10.8, 13.4, 1.2], [21.2, 23.0, 1]] },
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
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="1.25" y="1.25" width="${W - 2.5}" height="${H - 2.5}" rx="${r + b}" fill="#0e0e11" stroke="#46464f" stroke-width="2.5"/></svg>`)).png().toFile(bezel);
  await sharp(roundedMask(pw, sh, r)).png().toFile(mask);
  return { bezel, mask, W, H };
}

async function build(spot, W, H, outFile) {
  const story = H === 1920;
  const sc = H / 1920;
  const px = (n) => Math.round(n * sc);
  const hookY = story ? 260 : 190;
  const words = spot.hook.toUpperCase().split(" ");
  let hookText = words.join(" ");
  if (hookText.length > 17) {
    let best = 1, diff = 1e9;
    for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length); if (d < diff) { diff = d; best = i; } }
    hookText = words.slice(0, best).join(" ") + "\n" + words.slice(best).join(" ");
  }
  const hookDt = hookText.split("\n").map((ln, i) => `drawtext=fontfile='${q(IMPACT)}':textfile='${q(txt(`hook-${spot.id}-${H}-${i}.txt`, ln))}':fontsize=${px(100)}:fontcolor=white:borderw=${px(8)}:bordercolor=black:x=(w-text_w)/2:y=${hookY + i * px(115)}:enable='lt(t,1.5)'`).join(",");
  const cropY = story ? "0" : "(ih-oh)*0.22";
  const headMs = path.join(RAW, spot.head);
  const footage = path.join(RAW, "footage", spot.footage);
  const hd = dur(headMs);
  const n = spot.cuts.length;
  // phone frame (side margins are free: the emblem bug lives there) + small PiP
  const pw = story ? 720 : 600, sh = Math.round((pw * 732) / 412 / 2) * 2, bz = story ? 14 : 12;
  const ph = await frameAssets(pw, sh, bz, `${story ? "s" : "r"}`);
  const phX = (W - ph.W) / 2, phY = Math.round((H - ph.H) / 2);
  const pipW = story ? 250 : 200, pipH = Math.round((pipW * 732) / 412 / 2) * 2, pipB = 5;
  const pip = await frameAssets(pipW, pipH, pipB, `${story ? "s" : "r"}pip`);
  const pipX = story ? 40 : 30, pipY = story ? 1090 : 960;
  const bugSize = story ? 108 : 92, bg_ = await bug(bugSize);
  const headBug = story ? { x: 36, y: 520 } : { x: 28, y: 400 };
  const phoneBug = story ? { x: 36, y: phY + 24 } : { x: 56, y: phY + 16 };
  const lg_ = await endLogo(story ? 440 : 330);
  const SPLIT = 5.0; // PiP appears for the head's second half
  const f = [];
  f.push(`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H}:(iw-${W})/2:${cropY},fps=30,setsar=1,unsharp=5:5:0.3:5:5:0,${hookDt},format=yuv420p[head0]`);
  // pip: first seconds of the app flow, 1x
  f.push(`[1:v]fps=30,split=${n + 1}${["[pipsrc]", ...spot.cuts.map((_, i) => `[s${i}]`)].join("")}`);
  f.push(`[pipsrc]trim=${spot.pipStart ?? spot.cuts[0][0]}:${(spot.pipStart ?? spot.cuts[0][0]) + hd - SPLIT},setpts=PTS-STARTPTS,scale=${pipW}:${pipH}:flags=lanczos,format=rgba[pa]`);
  f.push(`[8:v]format=rgba,alphaextract[pm]`, `[pa][pm]alphamerge[pb]`, `[7:v]format=rgba[pz]`, `[pz][pb]overlay=${pipB}:${pipB}:format=auto,fade=t=in:st=0:d=0.3:alpha=1,setpts=PTS+${SPLIT}/TB[pipv]`);
  f.push(`[head0][pipv]overlay=${pipX - pipB}:${pipY - pipB}:format=auto:eof_action=pass:enable='gte(t,${SPLIT})'[head1]`);
  f.push(`[4:v]format=rgba[bugv]`, `[head1][bugv]overlay=${headBug.x - bg_.pad}:${headBug.y - bg_.pad}:format=auto,trim=duration=${hd.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[head]`);
  f.push(`[0:a]aresample=48000,aformat=channel_layouts=stereo[ha]`);
  spot.cuts.forEach(([a, b, sp], i) => f.push(`[s${i}]trim=${a}:${b},setpts=(PTS-STARTPTS)/${sp},fps=30,scale=${pw}:${sh}:flags=lanczos[c${i}]`));
  const footSecs = spot.cuts.reduce((t, [a, b, sp]) => t + (b - a) / sp, 0);
  f.push(`${spot.cuts.map((_, i) => `[c${i}]`).join("")}concat=n=${n}:v=1:a=0,format=rgba[fv]`);
  f.push(`[9:v]format=rgba,alphaextract[fm]`, `[fv][fm]alphamerge[fa]`);
  f.push(`[2:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},gblur=sigma=26,eq=brightness=-0.30:saturation=0.85,fps=30,format=rgba[bgf]`);
  f.push(`[10:v]format=rgba[bz]`, `[bgf][bz]overlay=${phX}:${phY}:format=auto[pb0]`, `[pb0][fa]overlay=${phX + bz}:${phY + bz}:format=auto[pb1]`);
  f.push(`[5:v]format=rgba[bugv2]`, `[pb1][bugv2]overlay=${phoneBug.x - bg_.pad}:${phoneBug.y - bg_.pad}:format=auto,trim=duration=${footSecs.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p,setsar=1[app]`);
  // end card: full logo above the tagline + "Free to play"
  const cardF = (t, y, size, font, col = "white", extra = "") =>
    `drawtext=fontfile='${q(font)}':textfile='${q(txt(`c${spot.id}-${H}-${y}.txt`, t))}':fontsize=${px(size)}:fontcolor=${col}:x=(w-text_w)/2:y=${y}${extra}`;
  const logoY = story ? 380 : 120;
  const cy = story ? 380 + 440 + 70 : 120 + 330 + 50;
  f.push(`[3:v]scale=${W}:${H}:force_original_aspect_ratio=increase:flags=lanczos,crop=${W}:${H},fps=30,eq=brightness=-0.42:saturation=0.9,setsar=1,format=rgba[cbg]`);
  f.push(`[6:v]format=rgba,fade=t=in:st=0.1:d=0.3:alpha=1[clg]`, `[cbg][clg]overlay=(W-w)/2:${logoY}:format=auto,` +
    [cardF("Call it. Lock it. Prove it.", cy, 70, IMPACT, "0x22e58b", `:borderw=${px(5)}:bordercolor=black`),
     cardF("Free to play", cy + (story ? 130 : 100), 50, BLACK, "0xd8dde0", `:borderw=${px(3)}:bordercolor=black`)].join(",") + `,format=yuv420p[card]`);
  const total = hd + footSecs + 2;
  f.push(`anullsrc=r=48000:cl=stereo,atrim=0:${(footSecs + 2).toFixed(3)}[sil]`);
  f.push(`[head][app][card]concat=n=3:v=1:a=0[v]`);
  f.push(`[ha][sil]concat=n=2:v=0:a=1[a]`);
  const loopImg = (file, t) => ["-loop", "1", "-framerate", "30", "-t", String(t), "-i", file];
  run([
    "-i", headMs, "-i", footage,
    ...loopImg(BG, footSecs + 1), ...loopImg(BG, 3),
    ...loopImg(bg_.file, total), ...loopImg(bg_.file, total), ...loopImg(lg_.file, 3),
    ...loopImg(pip.bezel, total), ...loopImg(pip.mask, total), ...loopImg(ph.mask, total), ...loopImg(ph.bezel, total),
    "-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]",
    "-t", total.toFixed(2), "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "17", "-maxrate", "20M", "-bufsize", "40M", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", outFile]);
}
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const want = process.argv.slice(2).map(Number);
for (const s of SPOTS.filter((x) => !want.length || want.includes(x.id))) {
  for (const [W, H, suf] of [[1080, 1920, ""], [1080, 1350, "-4x5"]]) {
    const o = path.join(OUT, `ugc-${s.id}-${s.slug}${suf}.mp4`);
    await build(s, W, H, o);
    const d = dur(o);
    console.log(path.basename(o), d.toFixed(2) + "s", (fs.statSync(o).size / 1e6).toFixed(1) + "MB");
    if (!suf) for (const t of [0.8, 5, 12, d - 0.4]) run(["-ss", t.toFixed(2), "-i", o, "-frames:v", "1", path.join(OUT, "frames", `ugc-${s.id}-${s.slug}-${t.toFixed(1)}s.png`)]);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
