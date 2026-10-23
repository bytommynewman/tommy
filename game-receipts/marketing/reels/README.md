# Reel ads: speedrun split-screen (Format A) + filmed-screen POV (Format B)

Spec: `marketing/REEL-FORMATS.md`. Outputs land in `marketing/reels/out/` (git-ignored): `A1-mvp-speedrun.mp4`, `A2-prove-you-called-it.mp4`, `B1-pov-screen.mp4` (2160x3840 4K, 30fps, H.264 High@5.1 2-pass, BT.709, silent AAC).

## Re-render

```bash
npm run build                                  # once, so `next start` has a build (do not run while another agent serves .next)
node marketing/reels/capture-reels.mjs         # records the app flows -> out/raw/<id>.mp4 + <id>.json (marks, pan keyframes)
node marketing/reels/render-reels.mjs          # renders all three spots
node marketing/reels/render-reels.mjs A1 B1    # or just some
```

- Capture starts its own server on port 3400 (`REELS_PORT` to change) with `GR_SEED_DEMO=1 GR_MARKETING_CAPTURE=1` (demo-free, account Jordan), a random `SESSION_SECRET` and a scratch `GR_DATA_DIR`, then stops only that process. A1/A2 are captured at DSF 5.6 (2184x4726), B1 at DSF 5 (1950x4220). Remote images (ESPN) are blocked, so avatars are monograms. Needs Google Chrome at `/Applications/Google Chrome.app` (`CHROME` env to override) and ffmpeg at `~/.local/node/bin/ffmpeg` (`FFMPEG`).
- Flow pacing is a scripted clock in `capture-reels.mjs` (`at(t)`); the stopwatch freezes on the `place` mark (A1 ~00:08.9, A2 00:08.0).

## Swapping the top clip (Format A creator panel)

By default the renderer picks the UGC clips: A1 uses `marketing/ugc/{out,raw}/mvp*.mp4`, A2 uses `kyle*.mp4` (cropped to the face, looped to fit). Override per spot, e.g. once final UGC clips exist:

```bash
node marketing/reels/render-reels.mjs A1 --top A1=marketing/ugc/out/mvp-final.mp4
node marketing/reels/render-reels.mjs A2 --top A2=/path/to/kyle-final.mp4 --keep-audio
```

Clips are expected to be portrait ~1076x1924; the face crop offset is `faceY` in `SPECS` (render-reels.mjs). With no clip found it falls back to a dimmed `public/art/hero-tall.webp` panel with a large stopwatch. `--keep-audio` uses the top clip's audio instead of the silent track.

Format B can later be fed a real screen recording from `marketing/real/` by pointing `RAW/B1.mp4` + `B1.json` marks at it.

## Instagram target

`node marketing/reels/render-reels.mjs B1 --target ig` writes `<name>-ig.mp4` plus the 4K covers `B1-cover-2160x3840.jpg` and `B1-cover-grid-2160x2880.jpg`: same 4K encode (Instagram accepts 4K uploads);
B1 also loses the grain, halves the glare and keeps captions/logo in the Reels safe zones (top 500, bottom 840, right 300 px at 4K). Works for A1/A2 too (encode settings are identical).
