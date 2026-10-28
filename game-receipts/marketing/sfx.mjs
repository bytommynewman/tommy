// Sound design for the fast sound-on cuts (fast.mjs). Everything is synthesised with ffmpeg (aevalsrc / anoisesrc), no samples, no licensed audio.
//   synthSfx()   writes thud / whoosh / tick / rewind wavs (48 kHz stereo) into out/fast/.sfx/ (cached)
//   mixAudio()   music bed (marketing/audio/hype-bed.m4a, starts on its first kick = a downbeat) + SFX events -> one wav, music ducked -6 dB under every
//                thud, then 2-pass loudnorm to -14 LUFS integrated / -1.5 dBTP, then a final true-peak safety limiter.
// Events are [{ t, kind: "thud"|"whoosh"|"tick"|"rewind", gain }] with t in output seconds.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
export const BED = path.join(here, "audio/hype-bed.m4a");
const SFX_DIR = path.join(here, "out/fast/.sfx");
fs.mkdirSync(SFX_DIR, { recursive: true });

function ff(args, label) {
  const r = spawnSync(FFMPEG, ["-y", "-hide_banner", "-v", "error", ...args], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`ffmpeg ${label}: ${r.stderr.slice(-1500)}`);
}

const SFX = {
  // stamp hit: pitch-dropping sub sine + body knock + a short filtered noise "slap"
  thud: ["-f", "lavfi", "-i", "aevalsrc='0.95*sin(2*PI*(44*t+90*(1-exp(-17*t))/17))*exp(-5.2*t)+0.45*sin(2*PI*170*t)*exp(-28*t)':s=48000:d=0.7",
    "-f", "lavfi", "-i", "anoisesrc=d=0.7:c=white:a=0.55:r=48000,lowpass=f=2400,afade=t=out:st=0.004:d=0.07:curve=exp",
    "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0,alimiter=limit=0.9:level=disabled,aformat=channel_layouts=stereo[o]", "-map", "[o]"],
  // cut whoosh: low band fading out into a high band fading in (a quick "swish")
  whoosh: ["-f", "lavfi", "-i", "anoisesrc=d=0.42:c=pink:a=0.9:r=48000",
    "-filter_complex", "[0:a]asplit=2[a][b];[a]lowpass=f=1400,afade=t=in:d=0.08,afade=t=out:st=0.1:d=0.2:curve=exp[lo];[b]highpass=f=2800,lowpass=f=9000,afade=t=in:st=0:d=0.2:curve=qsin,afade=t=out:st=0.2:d=0.2:curve=exp[hi];[lo][hi]amix=inputs=2:normalize=0,volume=1.1,aformat=channel_layouts=stereo[o]", "-map", "[o]"],
  // UI tick: 2.3 kHz blip + tiny click
  tick: ["-f", "lavfi", "-i", "aevalsrc='0.8*sin(2*PI*2300*t)*exp(-110*t)+0.25*sin(2*PI*900*t)*exp(-180*t)':s=48000:d=0.08",
    "-af", "aformat=channel_layouts=stereo", "-ac", "2"],
  // rewind: descending tape sweep with flutter
  rewind: ["-f", "lavfi", "-i", "aevalsrc='0.55*sin(2*PI*(2600*t-2300*t*t))*(0.65+0.35*sin(2*PI*38*t))*min(1,t/0.03)*min(1,(0.6-t)/0.12)':s=48000:d=0.6",
    "-f", "lavfi", "-i", "anoisesrc=d=0.6:c=pink:a=0.25:r=48000,highpass=f=1500,afade=t=in:d=0.1,afade=t=out:st=0.4:d=0.2",
    "-filter_complex", "[0:a][1:a]amix=inputs=2:normalize=0,aformat=channel_layouts=stereo[o]", "-map", "[o]"],
};

export function synthSfx() {
  const out = {};
  for (const [name, args] of Object.entries(SFX)) {
    const f = path.join(SFX_DIR, `${name}.wav`);
    if (!fs.existsSync(f)) ff([...args, "-ar", "48000", "-ac", "2", f], `sfx ${name}`);
    out[name] = f;
  }
  return out;
}

const MUSIC_DB = -9;            // bed level before loudnorm (SFX sit on top of it)
const GAIN = { thud: 1, whoosh: 0.55, tick: 0.5, rewind: 0.6 };
const DUCK_DB = -6, DUCK_HOLD = 0.35, DUCK_REL = 0.25;

/** Mixes bed + events into `dest` (wav, 48 kHz stereo, exactly `total` s) and returns the loudnorm measurement of the final file. */
export function mixAudio({ events, total, dest }) {
  const sfx = synthSfx();
  const inputs = ["-i", BED];
  const g = [];
  events.forEach((e, k) => { inputs.push("-i", sfx[e.kind]); const ms = Math.round(Math.max(0, e.t) * 1000); g.push(`[${k + 1}:a]adelay=${ms}|${ms},volume=${((e.gain ?? 1) * GAIN[e.kind]).toFixed(3)}[e${k}]`); });
  const thuds = events.filter((e) => e.kind === "thud").map((e) => e.t);
  const duck = DUCK_DB === 0 ? "1" : (() => {
    const lin = Math.pow(10, DUCK_DB / 20);
    const bumps = thuds.map((a) => `clip(min((t-${(a - 0.01).toFixed(3)})/0.02,(${(a + DUCK_HOLD + DUCK_REL).toFixed(3)}-t)/${DUCK_REL}),0,1)`);
    const m = bumps.length ? bumps.reduce((acc, b) => `max(${acc},${b})`) : "0";
    return `1-${(1 - lin).toFixed(3)}*${m}`;
  })();
  g.push(`[0:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume='${duck}':eval=frame,volume=${MUSIC_DB}dB,afade=t=out:st=${(total - 0.35).toFixed(3)}:d=0.35[mus]`);
  const labels = events.map((_, k) => `[e${k}]`).join("");
  g.push(`${labels}amix=inputs=${events.length}:normalize=0:dropout_transition=0[sfx]`);
  g.push(`[mus][sfx]amix=inputs=2:normalize=0:dropout_transition=0,apad,atrim=0:${total.toFixed(3)},aformat=channel_layouts=stereo[mix]`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gr-mix-"));
  const raw = path.join(tmp, "mix.wav"), script = path.join(tmp, "g.txt");
  fs.writeFileSync(script, g.join(";\n"));
  ff([...inputs, "-filter_complex_script", script, "-map", "[mix]", "-ar", "48000", "-ac", "2", raw], "mix");
  const LN = "I=-14:TP=-1.5:LRA=11";
  const m = spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", raw, "-af", `loudnorm=${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const j = JSON.parse(/\{[^{}]*"input_i"[^{}]*\}/.exec(m.stderr)[0]);
  ff(["-i", raw, "-af", `loudnorm=${LN}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000,aformat=channel_layouts=stereo,alimiter=limit=0.84:level=disabled:attack=1:release=30,atrim=0:${total.toFixed(3)}`, "-ar", "48000", "-ac", "2", dest], "loudnorm");
  fs.rmSync(tmp, { recursive: true, force: true });
  return measure(dest);
}

/** EBU R128 integrated loudness + true peak of a media file's audio. */
export function measure(file) {
  const r = spawnSync(FFMPEG, ["-hide_banner", "-nostats", "-i", file, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" });
  const s = r.stderr.slice(r.stderr.lastIndexOf("Summary:"));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(s), TP = /Peak:\s+(-?[\d.]+) dBFS/.exec(s);
  return { lufs: I ? +I[1] : NaN, tp: TP ? +TP[1] : NaN };
}
