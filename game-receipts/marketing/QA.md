# Game Receipts ad QA (4K re-render, demo-free captures, faster pacing, new dropdown chevrons)

Everything is delivered in 4K (2160x3840 9:16, 2160x2700 4:5), 30 fps CFR, H.264 High@5.1 yuv420p, BT.709 tags, 2-pass encode (target 45 Mbps, max 60M / buf 120M), closed 2 s GOP, AAC-LC 48 kHz 192k, +faststart.
Bitrate is content-limited: x264 hits near-lossless on plain screens (6-18 Mbps) and reaches 35-45 Mbps on the grainy / photographic reels.

QA done for every video: full-resolution frames at 0.5 s, 25/50/75 %, last frame and end card (`node marketing/qa.mjs`, frames kept outside the repo), contact sheets in `marketing/qa/<name>-sheet.jpg` (all < 1 MB),
100 % crops (1080x1080) of app UI text, hook/caption text and the UGC head inspected. App UI and text are crisp (native 5x capture scaled down); only the UGC/Kling faces are soft (upscaled from ~1080p, see below).

**Demo-free:** captures run on a scratch server with `GR_MARKETING_CAPTURE=1` (no "Demo" chips, no "You (Demo)"/@demo; account is Jordan / @jordan_calls). `capture-lib.mjs` scans the live DOM (text, attributes, handles) during every
capture and fails the run if "demo" ever shows. No on-screen text, overlay or caption source contains the word. Monogram avatars only (ESPN blocked), full logo on every end card / emblem bug throughout, no betting or money wording.
Colour check: the end-card green box decodes to RGB (32,228,137) vs brand #23E58A, so the 601 -> 709 re-matrix is right.

| Deliverable | Resolution | Duration | Size | Bitrate | Demo-free | Logo | App footage | Notes |
|---|---|---|---|---|---|---|---|---|
| out/reddit-4x5-1-he-said-he-called-it.mp4 | 2160x2700 | 16.6 s | 18.4 MB | 8.9 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/reddit-4x5-2-10-second-take.mp4 | 2160x2700 | 11.6 s | 13.8 MB | 9.5 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/reddit-4x5-3-mvp-pick.mp4 | 2160x2700 | 16.4 s | 18.6 MB | 9.1 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/reddit-4x5-4-receipts-dont-lie.mp4 | 2160x2700 | 17.8 s | 34.3 MB | 15.4 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/reddit-4x5-5-put-it-on-the-line.mp4 | 2160x2700 | 14.9 s | 19.6 MB | 10.5 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/reddit-4x5-6-every-player-every-team.mp4 | 2160x2700 | 17.4 s | 18.1 MB | 8.3 Mbps | yes | yes | yes | 4:5 reframe, phone 1200 px wide from 1950 px capture |
| out/spot-1-he-said-he-called-it.mp4 | 2160x3840 | 16.6 s | 26.5 MB | 12.8 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| out/spot-2-10-second-take.mp4 | 2160x3840 | 11.6 s | 19.8 MB | 13.7 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| out/spot-3-mvp-pick.mp4 | 2160x3840 | 16.4 s | 26.6 MB | 13.0 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| out/spot-4-receipts-dont-lie.mp4 | 2160x3840 | 17.8 s | 49.5 MB | 22.3 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| out/spot-5-put-it-on-the-line.mp4 | 2160x3840 | 14.9 s | 28.5 MB | 15.3 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| out/spot-6-every-player-every-team.mp4 | 2160x3840 | 17.4 s | 25.7 MB | 11.8 Mbps | yes | yes | yes | demo-free capture (Jordan/@jordan_calls), 1950x4220 capture scaled down, native 4K overlays |
| prelaunch/assets/teaser-coming-soon-2160x3840.mp4 | 2160x3840 | 10.6 s | 57.9 MB | 43.8 Mbps | yes | yes | yes | Git-ignored (58 MB); real take-builder footage in phone frame |
| reels/out/A1-mvp-speedrun.mp4 | 2160x3840 | 14.6 s | 79.4 MB | 43.6 Mbps | yes | yes | yes | Top panel = Kling head upscaled x2 from ~1076 px; app panel 2184x4726 capture scaled down; overlays native |
| reels/out/A2-prove-you-called-it.mp4 | 2160x3840 | 14.9 s | 81.8 MB | 43.9 Mbps | yes | yes | yes | Top panel = Kling head upscaled x2 from ~1076 px; app panel 2184x4726 capture scaled down; overlays native |
| reels/out/B1-pov-screen-ig.mp4 | 2160x3840 | 14.9 s | 83.2 MB | 44.6 Mbps | yes | yes | yes | Filmed-screen POV, 1950x4220 screen scaled down; IG safe zones, covers B1-cover-2160x3840.jpg / B1-cover-grid-2160x2880.jpg |
| reels/out/B1-pov-screen.mp4 | 2160x3840 | 14.9 s | 85.0 MB | 45.6 Mbps | yes | yes | yes | Filmed-screen POV, 1950x4220 screen scaled down; grain on |
| ugc/out/ugc-1-kyle-4x5.mp4 | 2160x2700 | 17.6 s | 90.8 MB | 41.2 Mbps | yes | yes | yes | Talking head upscaled from ~1076x1924 (lanczos x2 + hqdn3d + unsharp); app footage/overlays/end card native 4K |
| ugc/out/ugc-1-kyle.mp4 | 2160x3840 | 17.6 s | 92.1 MB | 41.8 Mbps | yes | yes | yes | Talking head upscaled from ~1076x1924 (lanczos x2 + hqdn3d + unsharp); app footage/overlays/end card native 4K |
| ugc/out/ugc-2-mvp-4x5.mp4 | 2160x2700 | 17.9 s | 90.5 MB | 40.5 Mbps | yes | yes | yes | Talking head upscaled from ~1076x1924 (lanczos x2 + hqdn3d + unsharp); app footage/overlays/end card native 4K |
| ugc/out/ugc-2-mvp.mp4 | 2160x3840 | 17.9 s | 91.4 MB | 40.9 Mbps | yes | yes | yes | Talking head upscaled from ~1076x1924 (lanczos x2 + hqdn3d + unsharp); app footage/overlays/end card native 4K |

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
