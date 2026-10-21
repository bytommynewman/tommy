// QA helper: for every video deliverable extracts frames (0.5 s, 25%, 50%, 75%, last, end card) and writes a contact
// sheet to marketing/qa/<name>-sheet.jpg (tile 6x1). Prints duration/size/codec facts as a markdown table.
// Usage: node marketing/qa.mjs     (view the sheets, then fill in marketing/QA.md)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const QA = path.join(here, "qa"); fs.mkdirSync(QA, { recursive: true });
const dirs = ["out", "reels/out", "ugc/out", "prelaunch/assets"].map((d) => path.join(here, d));
const vids = dirs.flatMap((d) => fs.readdirSync(d).filter((f) => f.endsWith(".mp4")).map((f) => path.join(d, f)));
const info = (f) => spawnSync(FFMPEG, ["-i", f], { encoding: "utf8" }).stderr;
const rows = [];
for (const f of vids) {
  const err = info(f);
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(err); const dur = +m[1] * 3600 + +m[2] * 60 + +m[3];
  const res = /Video: .*?, (\d{3,4}x\d{3,4})/.exec(err)?.[1], fps = /(\d+(?:\.\d+)?) fps/.exec(err)?.[1];
  const aud = /Audio: aac.*?, (\d+) Hz/.exec(err)?.[1];
  const name = path.basename(f, ".mp4");
  const ts = [0.5, dur * 0.25, dur * 0.5, dur * 0.75, dur - 0.15, dur - 1.0];
  const sel = ts.map((t) => `${t.toFixed(2)}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qa-"));
  sel.forEach((t, i) => spawnSync(FFMPEG, ["-y", "-v", "error", "-ss", t, "-i", f, "-frames:v", "1", "-vf", "scale=300:-2:flags=lanczos", path.join(tmp, `f${i}.png`)]));
  spawnSync(FFMPEG, ["-y", "-v", "error", "-i", path.join(tmp, "f%d.png").replace("%d", "%d"), "-start_number", "0", "-vf", "tile=6x1", "-frames:v", "1", "-q:v", "4", path.join(QA, `${name}-sheet.jpg`)]);
  fs.rmSync(tmp, { recursive: true, force: true });
  rows.push(`| ${path.relative(path.join(here, ".."), f)} | ${dur.toFixed(1)} s | ${(fs.statSync(f).size / 1e6).toFixed(1)} MB | ${res} @ ${fps} fps | AAC ${aud} Hz |`);
}
console.log("| file | duration | size | video | audio |\n|---|---|---|---|---|\n" + rows.join("\n"));
