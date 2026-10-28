// Shared 4K delivery encode for every video ad (spots, Reddit 4:5, reels, UGC, teaser).
//   1. the filter graph is rendered ONCE into a lossless intermediate (x264 -qp 0, PCM audio) in the OS temp dir
//   2. 2-pass x264 from the intermediate: High@5.1, yuv420p, 30 fps CFR, BT.709 tags, ~45 Mbps (max 60M / buf 120M),
//      closed GOP with a keyframe every 2 s, AAC-LC 48 kHz 192k, +faststart.
// The filter graph must end in `...[v]` already converted with `scaleToBt709` (below): graph pixels are BT.601-matrixed yuv420p
// (ffmpeg's untagged default), so the last filter re-matrixes to BT.709 before the BT.709 tags are written.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
export const W4 = 2160;
/** Last filter of every graph: BT.601 -> BT.709 matrix, limited range, yuv420p. */
export const scaleToBt709 = "scale=in_color_matrix=bt601:out_color_matrix=bt709:in_range=tv:out_range=tv:flags=lanczos+accurate_rnd,format=yuv420p";

function run(argv, label) {
  const r = spawnSync(FFMPEG, argv, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (r.status !== 0) { console.error(r.stderr.slice(-3000)); throw new Error(`ffmpeg failed: ${label}`); }
}

/**
 * @param inputs      array of ffmpeg input arg arrays (e.g. [["-i","a.mp4"], ...])
 * @param script      filter_complex_script text (ends in [v]; optionally defines [a] for real audio)
 * @param audio       "silent" (48 kHz stereo silence) or "graph" (graph defines [a])
 * @param total       output duration in seconds
 * @param dest        output .mp4 path
 */
export function encode4k({ inputs, script, audio = "silent", total, dest, bitrate = "45M", maxrate = "60M", bufsize = "120M", preset = "medium" }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gr-enc-"));
  const inter = path.join(tmp, "inter.mkv"), sf = path.join(tmp, "graph.txt"), log = path.join(tmp, "pass");
  fs.writeFileSync(sf, script);
  const t = Number(total).toFixed(3);
  const silent = audio === "silent" ? ["-f", "lavfi", "-t", t, "-i", "anullsrc=r=48000:cl=stereo"] : [];
  const aMap = audio === "silent" ? [String(inputs.length) + ":a"] : ["[a]"];
  run(["-y", "-hide_banner", "-v", "error", ...inputs.flat(), ...silent, "-filter_complex_script", sf, "-map", "[v]", "-map", aMap[0], "-t", t,
    "-r", "30", "-fps_mode", "cfr", "-c:v", "libx264", "-preset", "ultrafast", "-qp", "0", "-pix_fmt", "yuv420p",
    "-c:a", "pcm_s16le", "-ar", "48000", "-ac", "2", inter], dest + " (intermediate)");
  const common = ["-y", "-hide_banner", "-v", "error", "-i", inter, "-map", "0:v", "-r", "30", "-fps_mode", "cfr",
    "-c:v", "libx264", "-profile:v", "high", "-level:v", "5.1", "-preset", preset, "-pix_fmt", "yuv420p",
    "-b:v", bitrate, "-maxrate", maxrate, "-bufsize", bufsize,
    "-g", "60", "-keyint_min", "60", "-sc_threshold", "0", "-x264-params", "keyint=60:min-keyint=60:scenecut=0:open-gop=0",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", "-passlogfile", log];
  run([...common, "-pass", "1", "-an", "-f", "null", "/dev/null"], dest + " pass1");
  run([...common, "-pass", "2", "-map", "0:a", "-c:a", "aac", "-profile:a", "aac_low", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", dest], dest + " pass2");
  if (process.env.GR_KEEP_INTER) console.log("kept intermediate:", inter); else fs.rmSync(tmp, { recursive: true, force: true });
}
