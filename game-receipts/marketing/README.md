# Game Receipts ad pipeline

Creative brief: [AD-PLAN.md](AD-PLAN.md). Spot definitions (hooks, beats, captions): [spots.json](spots.json).

Prereqs: Google Chrome at `/Applications/Google Chrome.app`, ffmpeg 6 at `~/.local/node/bin/ffmpeg` (override with `CHROME=` / `FFMPEG=`).
Output goes to `marketing/out/` (git-ignored). Everything is delivered in **4K**.

## Demo-free captures (`GR_MARKETING_CAPTURE=1`)

The app has one env flag for footage: `GR_MARKETING_CAPTURE=1` (read server-side via `lib/marketing.ts`; real users never see a difference).
It hides the "Demo" chips (take cards, take page, profile), the "mock/demo data" landing footer and the dev login prefill, and the seed account
becomes **Jordan / @jordan_calls** (email `jordan_calls@gamereceipts.test`) instead of "You (Demo)" / @demo. Other seeded users (Dana, Larry Locks...) have no "demo" in names or handles.
Run captures against a scratch copy built with the flag (never your dev server on :3000):

```sh
rsync -a --exclude .next --exclude marketing --exclude .data --exclude '.env*' ./ /tmp/gr-app/ && (cd /tmp/gr-app && GR_MARKETING_CAPTURE=1 npm run build)
export GR_APP_ROOT=/tmp/gr-app
node marketing/capture.mjs                       # spots + carousel stills (own server :3200)
node marketing/reels/capture-reels.mjs           # A1/A2/B1 (:3400)
node marketing/ugc/capture.mjs marketing/ugc/raw/footage   # UGC footage (:3300)
```

`capture-lib.mjs` installs an in-page guard in every capture: if the rendered DOM (visible text, attributes, handles) ever contains the word "demo", the capture fails.

Render everything:

```sh
node marketing/render.mjs                        # spot-1..6 (2160x3840), reddit-4x5-1..6 (2160x2700), reddit-carousel-1..3.png (2160x2700)
node marketing/reels/render-reels.mjs            # A1, A2, B1 (+ `B1 --target ig` writes the IG file and the 4K covers)
node marketing/ugc/finish.mjs                    # ugc-1-kyle / ugc-2-mvp, story + 4x5
node marketing/prelaunch/build-assets.mjs        # prelaunch stills + teaser video
node marketing/qa.mjs                            # full-res QA frames + contact sheets in marketing/qa/, prints the facts table
```

Arguments still work to redo part of the set, e.g. `node marketing/capture.mjs 4` / `node marketing/render.mjs 4`, or `carousel`.

## Typography

All text is Saira + Inter rendered by headless Chrome (`type.mjs`, fonts in `fonts/`), see [TYPE.md](TYPE.md). No ffmpeg drawtext.

## 4K quality + branding rules (all renderers)

- Captures: iPhone 14 viewport 390x844 at **deviceScaleFactor 5 = 1950x4220** (UGC 412x732 -> 2060x3660; reel A1/A2 DSF 5.6 -> 2184x4726 because the app is full-bleed there).
  Frames come from a `Page.captureScreenshot` loop (3-6 shots in flight, ~25-35 unique fps at this size; the loop follows the visual viewport so scrolled pages are right), encoded as a
  30 fps CFR near-lossless clip. Note: a raw CDP screenshot only returns device pixels if the session repeats Playwright's device-metrics override (see `capture-lib.mjs`); the
  older pipeline silently grabbed 390x844 frames and upscaled them.
- Renders only ever scale the phone screen DOWN into the 2160-wide frame (punch-in zoom is capped so the crop never gets smaller than the phone on screen).
- Overlays/text are native 2160 px: every old 1080 pixel constant is x2. Safe zones at 4K: top 440, bottom 760 (840 IG), right rail 300.
- `brand.mjs`: emblem bug cut from the 1254 px logo master (crop 300,70,560x560, so bugs up to 560 px are native), end-card logo rendered from the 1254 px master (never upscaled).
- Encode (`encode4k.mjs`): lossless intermediate, then 2-pass x264 High@5.1, yuv420p, 30 fps CFR, BT.709 tags (graph is re-matrixed 601 -> 709), target 45 Mbps (max 60M / buf 120M),
  closed GOP every 2 s, AAC-LC 48 kHz 192k, +faststart. Simple screens cannot use all 45 Mbps (x264 is already near-lossless), so plain spots land at 6-14 Mbps and the grainy/UGC reels at 35-45 Mbps.
- UGC talking heads (Kling, ~1076x1924) are denoised (hqdn3d), lanczos-upscaled 2x and lightly sharpened: the only non-native pixels in the ads.
- App-footage speed-ups never exceed 1.5x (`ugc/finish.mjs` cuts).
