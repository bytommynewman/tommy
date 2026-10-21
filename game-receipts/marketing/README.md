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
