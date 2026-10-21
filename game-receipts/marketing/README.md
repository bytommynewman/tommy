# Game Receipts ad pipeline

Creative brief: [AD-PLAN.md](AD-PLAN.md). Spot definitions (hooks, beats, captions): [spots.json](spots.json).

Prereqs: `npm run build`, Google Chrome at `/Applications/Google Chrome.app`, ffmpeg 6 at `~/.local/node/bin/ffmpeg`
(override with `CHROME=` / `FFMPEG=`). Output goes to `marketing/out/` (git-ignored).

Regenerate everything:

```sh
node marketing/capture.mjs   # records phone footage (starts its own server on :3200 with a fresh demo DB, remote images blocked)
node marketing/render.mjs    # renders spot-*.mp4, reddit-4x5-*.mp4, reddit-carousel-*.png
```

Both accept arguments to redo part of the set, e.g. `node marketing/capture.mjs 4` / `node marketing/render.mjs 4`,
or `carousel` for the Reddit stills.

## Quality + branding rules (all renderers)

- Captures are 3x native (`capture.mjs` / `reels/capture-reels.mjs`: 1170x2532; `ugc/capture.mjs`: 1236x2196) grabbed with a
  `Page.captureScreenshot` loop (~30 fps; the CDP screencast only gave ~7 fps), so renders only ever scale DOWN (lanczos).
- Run them against a scratch copy of the app with `GR_APP_ROOT=/path/to/checkout node marketing/capture.mjs` (default: this repo).
- `brand.mjs` generates the emblem bug (corner, ~85% opacity, shadow) and the full end-card logo at exact pixel size from
  `public/brand/`. Bug sits in the free side margin beside the phone (never over hooks/captions/bands; outside top 220 /
  bottom 380 / right 140 px on 1080x1920). End cards use the full logo.
- Encode: x264 `-preset slow -crf 17 -profile:v high -maxrate 20M -bufsize 40M`, 30 fps, yuv420p, +faststart, AAC 192k 48 kHz.
- App-footage speed-ups never exceed 1.6x (`ugc/finish.mjs` cuts).
- `node marketing/qa.mjs` writes contact sheets to `marketing/qa/`; results are in `QA.md`.
