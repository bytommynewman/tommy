# Game Receipts ad QA (4K re-render, demo-free captures, faster pacing, new dropdown chevrons)

Everything is delivered in 4K (2160x3840 9:16, 2160x2700 4:5), 30 fps CFR, H.264 High@5.1 yuv420p, BT.709 tags, 2-pass encode (target 45 Mbps, max 60M / buf 120M), closed 2 s GOP, AAC-LC 48 kHz 192k, +faststart.
Bitrate is content-limited: x264 hits near-lossless on plain screens (6-18 Mbps) and reaches 35-45 Mbps on the grainy / photographic reels.

QA done for every video: full-resolution frames at 0.5 s, 25/50/75 %, last frame and end card (`node marketing/qa.mjs`, frames kept outside the repo), contact sheets in `marketing/qa/<name>-sheet.jpg` (all < 1 MB),
100 % crops (1080x1080) of app UI text, hook/caption text and the UGC head inspected. App UI and text are crisp (native 5x capture scaled down); only the UGC/Kling faces are soft (upscaled from ~1080p, see below).

**Demo-free:** captures run on a scratch server with `GR_MARKETING_CAPTURE=1` (no "Demo" chips, no "You (Demo)"/@demo; account is Jordan / @jordan_calls). `capture-lib.mjs` scans the live DOM (text, attributes, handles) during every
capture and fails the run if "demo" ever shows. No on-screen text, overlay or caption source contains the word. Monogram avatars only (ESPN blocked), full logo on every end card / emblem bug throughout, no betting or money wording.
Colour check: the end-card green box decodes to RGB (32,228,137) vs brand #23E58A, so the 601 -> 709 re-matrix is right.

| file | resolution | duration | size | bitrate | H.264 / pix_fmt / tags | audio |
|---|---|---|---|---|---|---|
| marketing/out/reddit-4x5-1-he-said-he-called-it.mp4 | 2160x2700 @ 30 fps | 16.6 s | 20.6 MB | 9.9 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/reddit-4x5-2-10-second-take.mp4 | 2160x2700 @ 30 fps | 11.6 s | 15.9 MB | 11.0 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/reddit-4x5-3-mvp-pick.mp4 | 2160x2700 @ 30 fps | 16.4 s | 20.7 MB | 10.1 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/reddit-4x5-4-receipts-dont-lie.mp4 | 2160x2700 @ 30 fps | 17.8 s | 36.5 MB | 16.5 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/reddit-4x5-5-put-it-on-the-line.mp4 | 2160x2700 @ 30 fps | 14.9 s | 22.0 MB | 11.8 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/reddit-4x5-6-every-player-every-team.mp4 | 2160x2700 @ 30 fps | 17.4 s | 20.4 MB | 9.4 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-1-he-said-he-called-it.mp4 | 2160x3840 @ 30 fps | 16.6 s | 28.4 MB | 13.7 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-2-10-second-take.mp4 | 2160x3840 @ 30 fps | 11.6 s | 21.4 MB | 14.7 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-3-mvp-pick.mp4 | 2160x3840 @ 30 fps | 16.4 s | 28.7 MB | 14.0 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-4-receipts-dont-lie.mp4 | 2160x3840 @ 30 fps | 17.8 s | 51.4 MB | 23.2 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-5-put-it-on-the-line.mp4 | 2160x3840 @ 30 fps | 14.9 s | 30.4 MB | 16.3 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/out/spot-6-every-player-every-team.mp4 | 2160x3840 @ 30 fps | 17.4 s | 27.5 MB | 12.7 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/reels/out/A1-mvp-speedrun.mp4 | 2160x3840 @ 30 fps | 14.6 s | 79.4 MB | 43.6 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/reels/out/A2-prove-you-called-it.mp4 | 2160x3840 @ 30 fps | 14.9 s | 81.0 MB | 43.5 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/reels/out/B1-pov-screen-ig.mp4 | 2160x3840 @ 30 fps | 14.9 s | 82.9 MB | 44.5 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/reels/out/B1-pov-screen.mp4 | 2160x3840 @ 30 fps | 14.9 s | 84.8 MB | 45.5 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/ugc/out/ugc-1-kyle-4x5.mp4 | 2160x2700 @ 30 fps | 17.6 s | 92.1 MB | 41.8 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/ugc/out/ugc-1-kyle.mp4 | 2160x3840 @ 30 fps | 17.6 s | 92.4 MB | 41.9 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/ugc/out/ugc-2-mvp-4x5.mp4 | 2160x2700 @ 30 fps | 17.9 s | 91.0 MB | 40.7 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/ugc/out/ugc-2-mvp.mp4 | 2160x3840 @ 30 fps | 17.9 s | 91.4 MB | 40.9 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |
| marketing/prelaunch/assets/teaser-coming-soon-2160x3840.mp4 | 2160x3840 @ 30 fps | 10.6 s | 57.4 MB | 43.5 Mbps | High yuv420p tv, bt709, progressive | AAC 48000 Hz |

| image | resolution | size |
|---|---|---|
| marketing/out/reddit-carousel-1.png | 2160x2700 | 0.6 MB |
| marketing/out/reddit-carousel-2.png | 2160x2700 | 1.1 MB |
| marketing/out/reddit-carousel-3.png | 2160x2700 | 0.9 MB |
| marketing/reels/out/B1-cover-2160x3840.jpg | 2160x3840 | 0.4 MB |
| marketing/reels/out/B1-cover-grid-2160x2880.jpg | 2160x2880 | 0.4 MB |
| marketing/prelaunch/assets/avatar-2048.png | 2048x2048 | 2.1 MB |
| marketing/prelaunch/assets/highlight-creators-2160x3840.png | 2160x3840 | 4.3 MB |
| marketing/prelaunch/assets/highlight-leaderboard-2160x3840.png | 2160x3840 | 4.2 MB |
| marketing/prelaunch/assets/highlight-receipts-2160x3840.png | 2160x3840 | 4.2 MB |
| marketing/prelaunch/assets/highlight-takes-2160x3840.png | 2160x3840 | 4.3 MB |
| marketing/prelaunch/assets/og-2400x1260.png | 2400x1260 | 2.5 MB |
| marketing/prelaunch/assets/teaser-called-it-feed-2160x2700.png | 2160x2700 | 3.4 MB |
| marketing/prelaunch/assets/teaser-called-it-story-2160x3840.png | 2160x3840 | 4.1 MB |
| marketing/prelaunch/assets/teaser-coming-soon-feed-2160x2700.png | 2160x2700 | 4.4 MB |
| marketing/prelaunch/assets/teaser-coming-soon-story-2160x3840.png | 2160x3840 | 5.9 MB |
| marketing/prelaunch/assets/teaser-receipts-feed-2160x2700.png | 2160x2700 | 4.1 MB |
| marketing/prelaunch/assets/teaser-receipts-story-2160x3840.png | 2160x3840 | 6.2 MB |
| marketing/prelaunch/assets/youtube-banner-2560x1440.png | 2560x1440 | 0.8 MB |


## Typography re-render (Saira + Inter, Chrome-rendered overlays)

All ad text was replaced with the brand type system ([TYPE.md](TYPE.md)): Saira 900/800 italic hooks and end cards, Inter 700-800 caption pills / POV captions / stopwatch,
rendered as native-4K PNG layers by headless Chrome (`type.mjs`) and overlaid with ffmpeg (no drawtext, no Impact/Arial Black, no outline strokes). Footage, layouts, timings and wording are unchanged
(only the "Step N:" prefix of the Format A bands became a volt number badge). Every video was re-rendered; all stills too (carousel, B1 covers, prelaunch avatar/banner/highlights/teasers/og + teaser video).

QA done: for every video the hook, a caption and the end card were checked in full-res frames and 1200x800 100% crops (spots 4/6, Reddit 3/5, A1, A2, B1, B1-IG, UGC 1/2 + 4:5, teaser), contact sheets re-generated in `marketing/qa/*-sheet.jpg` (all < 1 MB).
Findings: kerning/ligatures clean, Saira italic reads clearly different from Impact, no outlines, no clipping at the safe-zone widths, captions legible over footage; the A-format hook was moved down (centre y 930) so it no longer touches the stopwatch pill.
Before/after (old Impact/Arial Black frame vs new): `marketing/qa/type-before-after.png` (spot hook, Format A step band, Format B caption).

Stills (all demo-free, logo present): `out/reddit-carousel-1..3.png` 2160x2700; `reels/out/B1-cover-2160x3840.jpg`, `B1-cover-grid-2160x2880.jpg`; prelaunch: `avatar-2048.png`, `highlight-*-2160x3840.png`, `teaser-*-feed-2160x2700.png`,
`teaser-*-story-2160x3840.png`, `og-2400x1260.png`, `youtube-banner-2560x1440.png` (platform max). Prelaunch teaser-called-it / receipts carry phone-frame app stills; teaser-coming-soon stills carry none by design.

## Faster-paced re-render (commit after 7dc5a5e)
Everything was re-captured from a scratch build of HEAD (custom select chevrons) and re-rendered. Pacing: capture idle gap 600 -> 320 ms, search typing 70-110 -> 45-60 ms/char (shorter search strings), dropdown cycles 800-850 -> 400-450 ms, scrolls ~30% shorter,
Place-take dwell 300 -> 150 ms, hook 1.5 -> 1.3 s (Format A hook 2.0 -> 1.6 s), end cards 1.8 s everywhere, reels' scripted clocks compressed ~30%, UGC app footage cut to ~5.8-6.0 s (<= 1.5x), teaser hooks 2.4 -> 1.8 s and glimpse 1.2x.
Payoff beats (LOCKED stamp / Cashed / leaderboard) stay on screen >= 1.0 s. Shortest captions: spot 1 beat 1 ~1.05 s, spot 2 beat 1 ~0.95 s, B1 "it stamps the date" 1.0 s; all others >= 1.0 s. A2 hook now says "takes 6 seconds" to match the new stopwatch (~5.4 s).
Dropdown 100% crops checked: new chevrons (grey, green when focused) sit inside the padding and are not clipped.

## Known limits
- **UGC faces are not true 4K.** Kling clips (~1076x1924) cannot be made real 4K without AI upscaling (credits). They get lanczos x2 + mild hqdn3d denoise + unsharp. Everything else in those ads is native 4K.
- Capture frame rate: the 8 MP screenshot loop delivers ~21-38 unique fps depending on the page (spot 2 ~20, spot 4 ~27); output is CFR 30 (duplicated frames where the grab was slower).
- Punch-in zooms (spots 1-4) are capped to the phone's native resolution (story 1.39x, 4:5 1.6x) so the app is never upscaled; the old 2.0x punch is now 1.4-1.6x.
- Reel A1/A2 top panel and UGC heads come from the existing Kling masters; hero backgrounds (1170 px art) are only used heavily blurred/dimmed. The avatar logo sits at its native 1254 px inside 2048 px (no upscale), so it fills less of the circle than the old 1080 version.
- Earlier QA claimed 3x captures: the old capture script actually grabbed 390x844 frames and upscaled them; that is fixed (see README).
- B1 / A1 / A2 / UGC / teaser files are 70-125 MB each: use `B1-pov-screen-ig.mp4` for Instagram.

## 23 Oct 2026 - UGC-2 replaced (new creator, real Wemby headshot, clearer pitch)

New Kling 15 s head (clear skin, new line), real ESPN headshots for this spot only (unlicensed: swap before paid ads), hook "Everyone laughed at my Wemby MVP pick", 4 caption pills, finish.mjs footage-cut fix. ugc-2-mvp.mp4 / -4x5.mp4: 2160x3840 / 2160x2700, 24.97 s, AAC 48 kHz; speech ends 14.68 s (head 15.04 s), no cutoff. A1 reel re-rendered with the new head (14.6 s). QA frames: `qa/ugc-2-mvp-v2-*.png`, `qa/ugc-2-mvp-v2-contact.png`, `qa/ugc-2-mvp-v2-wemby-photo-crop.png`. Audio pronunciation not verified by ear. Old files in `ugc/out/old/`, `reels/out/old/`.
