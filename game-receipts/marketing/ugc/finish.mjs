// Finishes the AI UGC spots: Kling talking head (native audio, untouched) + hook text -> real app footage -> end card.
// Node 20+, system ffmpeg (no ffprobe needed). Usage: node marketing/ugc/finish.mjs [spotId ...]
// Inputs:  marketing/ugc/raw/<head>.mp4 (Kling), marketing/ugc/raw/footage/<footage>.mp4 (capture.mjs)
// Outputs: marketing/ugc/out/ugc-<n>-<slug>.mp4 (1080x1920) and ...-4x5.mp4 (1080x1350, Reddit)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, "../..");
const RAW = path.join(here, "raw");
const OUT = path.join(here, "out");
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const IMPACT = "/System/Library/Fonts/Supplemental/Impact.ttf";
const BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf";
const BG = path.join(ROOT, "public/art/hero-tall.webp");
const BAR = "0x06090b"; // app background, pads the 4:5 footage

// footage cuts: [start s, end s, speed] from the raw screen capture, ~7.5 s total after speed-up.
const SPOTS = [
  { id: 1, slug: "kyle", head: "kyle.mp4", footage: "kyle.mp4", hook: "my buddy \u201Ccalled it\u201D",
    cuts: [[1.5, 7.9, 2], [8.5, 9.7, 1.2], [10.5, 11.9, 1], [18.0, 19.8, 1]] },
  { id: 2, slug: "mvp", head: "mvp.mp4", footage: "mvp.mp4", hook: "my MVP pick has a DATE on it",
    cuts: [[3.5, 10.9, 2.4], [11.5, 12.5, 1], [13.5, 14.6, 1], [22.0, 24.3, 1]] },
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

function build(spot, W, H, outFile) {
  const sc = H / 1920;
  const px = (n) => Math.round(n * sc);
  const hookY = W === 1080 && H === 1920 ? 260 : 190;
  // wrap long hooks onto two balanced lines so Impact 100px never leaves the 1080 frame
  const words = spot.hook.toUpperCase().split(" ");
  let hookText = words.join(" ");
  if (hookText.length > 17) {
    let best = 1, diff = 1e9;
    for (let i = 1; i < words.length; i++) { const d = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length); if (d < diff) { diff = d; best = i; } }
    hookText = words.slice(0, best).join(" ") + "\n" + words.slice(best).join(" "); // two separate centred drawtexts (this ffmpeg has no text_align)
  }
  const hookLines = hookText.split("\n");
  const hookDt = hookLines.map((ln, i) => `drawtext=fontfile='${q(IMPACT)}':textfile='${q(txt(`hook-${spot.id}-${H}-${i}.txt`, ln))}':fontsize=${px(100)}:fontcolor=white:borderw=${px(8)}:bordercolor=black:x=(w-text_w)/2:y=${hookY + i * px(115)}:enable='lt(t,1.5)'`).join(",");
  const cropY = H === 1920 ? "0" : "(ih-oh)*0.22";
  const headMs = `${path.join(RAW, spot.head)}`;
  const footage = path.join(RAW, "footage", spot.footage);
  const hd = dur(headMs);
  const n = spot.cuts.length;
  const f = [];
  // talking head
  f.push(`[0:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}:(iw-${W})/2:${cropY},fps=30,setsar=1,` +
    `${hookDt},`+
    `format=yuv420p[head]`);
  f.push(`[0:a]aresample=44100,aformat=channel_layouts=stereo[ha]`);
  // app footage (fit whole 9:16 UI; pad sides for 4:5)
  const fit = W === 1080 && H === 1920
    ? `scale=1080:1920:flags=lanczos`
    : `scale=-2:${H}:flags=lanczos,pad=${W}:${H}:(ow-iw)/2:0:color=${BAR}`;
  f.push(`[1:v]fps=30,${fit},setsar=1,format=yuv420p,split=${n}${spot.cuts.map((_, i) => `[s${i}]`).join("")}`);
  spot.cuts.forEach(([a, b, sp], i) => f.push(`[s${i}]trim=${a}:${b},setpts=(PTS-STARTPTS)/${sp},fps=30[c${i}]`));
  const footSecs = spot.cuts.reduce((t, [a, b, sp]) => t + (b - a) / sp, 0);
  // end card on the dimmed brand background
  const cardF = (t, y, size, font, col = "white", extra = "") =>
    `drawtext=fontfile='${q(font)}':textfile='${q(txt(`c${spot.id}-${H}-${y}.txt`, t))}':fontsize=${px(size)}:fontcolor=${col}:x=(w-text_w)/2:y=${px(y)}${extra}`;
  const cy = H === 1920 ? 0 : -285;
  f.push(`[2:v]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},fps=30,eq=brightness=-0.42:saturation=0.9,setsar=1,` +
    [cardF("GAME RECEIPTS", 780 + cy, 118, IMPACT, "0x22e58b", `:borderw=${px(6)}:bordercolor=black`),
     cardF("Call it. Lock it. Prove it.", 960 + cy, 58, BLACK, "white", `:borderw=${px(4)}:bordercolor=black`),
     cardF("Free to play", 1085 + cy, 46, BLACK, "0xd8dde0", `:borderw=${px(3)}:bordercolor=black`)].join(",") + `,format=yuv420p[card]`);
  const total = hd + footSecs + 2;
  f.push(`anullsrc=r=44100:cl=stereo,atrim=0:${(footSecs + 2).toFixed(3)}[sil]`);
  f.push(`[head]${spot.cuts.map((_, i) => `[c${i}]`).join("")}[card]concat=n=${n + 2}:v=1:a=0[v]`);
  f.push(`[ha][sil]concat=n=2:v=0:a=1[a]`);
  run(["-i", headMs, "-i", footage, "-loop", "1", "-t", "2", "-i", BG, "-filter_complex", f.join(";"), "-map", "[v]", "-map", "[a]",
    "-t", total.toFixed(2), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", outFile]);
}

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, "frames"), { recursive: true });
const want = process.argv.slice(2).map(Number);
for (const s of SPOTS.filter((x) => !want.length || want.includes(x.id))) {
  for (const [W, H, suf] of [[1080, 1920, ""], [1080, 1350, "-4x5"]]) {
    const o = path.join(OUT, `ugc-${s.id}-${s.slug}${suf}.mp4`);
    build(s, W, H, o);
    const d = dur(o);
    console.log(path.basename(o), d.toFixed(2) + "s", (fs.statSync(o).size / 1e6).toFixed(1) + "MB");
    if (!suf) for (const t of [0.8, 5, 12, d - 0.4]) run(["-ss", t.toFixed(2), "-i", o, "-frames:v", "1", path.join(OUT, "frames", `ugc-${s.id}-${s.slug}-${t.toFixed(1)}s.png`)]);
  }
}
fs.rmSync(tmp, { recursive: true, force: true });
