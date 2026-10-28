// QA helper: for every video deliverable extracts FULL-RESOLUTION frames (0.5 s, 25%, 50%, 75%, last, end card) into $QA_FRAMES
// (default: OS temp dir, not the repo) and writes a downscaled contact sheet to marketing/qa/<name>-sheet.jpg (6 tiles, < 1 MB).
// Prints a markdown table (resolution, fps, duration, size, bitrate, codec profile/level, colour tags, audio) for videos and images.
// Usage: node marketing/qa.mjs     (then view the full-res frames / 100% crops, and fill in marketing/QA.md)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const QA = path.join(here, "qa"); fs.mkdirSync(QA, { recursive: true });
const FR = process.env.QA_FRAMES ?? path.join(os.tmpdir(), "gr-qa-frames"); fs.mkdirSync(FR, { recursive: true });
const dirs = ["out", "reels/out", "ugc/out", "prelaunch/assets"].map((d) => path.join(here, d));
const files = dirs.flatMap((d) => fs.readdirSync(d).map((f) => path.join(d, f)));
const vids = files.filter((f) => f.endsWith(".mp4"));
const imgs = files.filter((f) => /\.(png|jpg)$/.test(f));
const info = (f) => spawnSync(FFMPEG, ["-i", f], { encoding: "utf8" }).stderr;
const rows = [];
for (const f of vids) {
  const err = info(f);
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(err); const dur = +m[1] * 3600 + +m[2] * 60 + +m[3];
  const v = /Video: (\w+) \((\w+)\)[^\n]*?(yuv\w+)\(([^)]*)\)[^\n]*?(\d{3,4}x\d{3,4})/.exec(err);
  const fps = /(\d+(?:\.\d+)?) fps/.exec(err)?.[1];
  const aud = /Audio: aac.*?, (\d+) Hz/.exec(err)?.[1];
  const size = fs.statSync(f).size, mbps = (size * 8) / dur / 1e6;
  const name = path.basename(f, ".mp4");
  const ts = [0.5, dur * 0.25, dur * 0.5, dur * 0.75, dur - 0.15, dur - 1.0];
  const dir = path.join(FR, name); fs.mkdirSync(dir, { recursive: true });
  ts.forEach((t, i) => spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", t.toFixed(2), "-i", f, "-frames:v", "1", path.join(dir, `f${i}.png`)]));
  spawnSync(FFMPEG, ["-y", "-v", "error", "-start_number", "0", "-i", path.join(dir, "f%d.png"), "-vf", "scale=360:-2:flags=lanczos,tile=6x1", "-frames:v", "1", "-q:v", "5", path.join(QA, `${name}-sheet.jpg`)]);
  const prof = /Video: h264 \((\w+)\)/.exec(err)?.[1], lvl = /level (\d)/i.exec(spawnSync(FFMPEG, ["-hide_banner", "-i", f, "-c", "copy", "-bsf:v", "trace_headers", "-f", "null", "-t", "0.1", "-"], { encoding: "utf8" }).stderr)?.[0];
  rows.push(`| ${path.relative(path.join(here, ".."), f)} | ${v?.[5]} @ ${fps} fps | ${dur.toFixed(1)} s | ${(size / 1e6).toFixed(1)} MB | ${mbps.toFixed(1)} Mbps | ${prof} ${v?.[3]} ${v?.[4]} | AAC ${aud} Hz |`);
}
console.log("| file | resolution | duration | size | bitrate | H.264 / pix_fmt / tags | audio |\n|---|---|---|---|---|---|---|\n" + rows.join("\n"));
const irows = [];
for (const f of imgs) { const md = await sharp(f).metadata(); irows.push(`| ${path.relative(path.join(here, ".."), f)} | ${md.width}x${md.height} | ${(fs.statSync(f).size / 1e6).toFixed(1)} MB |`); }
console.log("\n| image | resolution | size |\n|---|---|---|\n" + irows.join("\n"));
console.log("\nfull-res QA frames in", FR);
