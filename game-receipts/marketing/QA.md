# Game Receipts ad QA (re-render with logo everywhere, real app footage, high-quality encode)

Checked by extracting frames at 0.5 s, 25%, 50%, 75%, last and the end card for every video (contact sheets in `marketing/qa/<name>-sheet.jpg`)
and viewing them. All videos: 30 fps constant, H.264 High yuv420p x264 slow crf 17 (maxrate 20M), AAC 192k 48 kHz, +faststart.
Monogram avatars only (remote ESPN images blocked at capture), no betting/money wording on any frame.

"App s" = seconds of real in-app footage on screen. Logo = emblem bug throughout + full logo on the end card (images: full logo).

| Deliverable | Duration | Size | Logo | App footage (s) | Issues fixed |
|---|---|---|---|---|---|
| out/spot-1-he-said-he-called-it.mp4 | 21.9 s | 3.1 MB | ✓ | ✓ 17.2 | Mock chat cut from 4.2 s to 2.7 s; 780 px capture upscaled to 842 -> 1170 px capture scaled down to 700; caption moved above phone |
| out/spot-2-10-second-take.mp4 | 14.4 s | 2.3 MB | ✓ | ✓ 12.4 | Stopwatch no longer covers page title; sharper capture; caption off the app header |
| out/spot-3-mvp-pick.mp4 | 23.9 s | 2.6 MB | ✓ | ✓ 21.9 | same |
| out/spot-4-receipts-dont-lie.mp4 | 24.0 s | 5.6 MB | ✓ | ✓ 22.0 | same |
| out/spot-5-put-it-on-the-line.mp4 | 19.4 s | 3.8 MB | ✓ | ✓ 17.3 | same |
| out/spot-6-every-player-every-team.mp4 | 23.4 s | 2.0 MB | ✓ | ✓ 21.3 | same |
| out/reddit-4x5-1..6 (6 files) | 14.4-24.0 s | 1.7-4.9 MB | ✓ | ✓ same as spots | Caption moved above the phone (was covering the app header/title); phone sharper |
| out/reddit-carousel-1..3.png | still | 0.2-0.4 MB | ✓ | ✓ (still) | Native 1170 px screenshots, bug in side margin |
| reels/out/A1-mvp-speedrun.mp4 | 20.1 s | 10.9 MB | ✓ | ✓ 17.6 | Top panel now uses the untouched Kling master (was picking the finished 4:5 ad); end card gets full logo; stopwatch out of the right rail; 3x capture |
| reels/out/A2-prove-you-called-it.mp4 | 20.5 s | 12.2 MB | ✓ | ✓ 18.0 | same |
| reels/out/B1-pov-screen.mp4 | 21.7 s | 51.6 MB | ✓ | ✓ 19.9 | End tag is now full logo + tagline; crf 24 -> 17 (grain makes it large); 3x capture |
| ugc/out/ugc-1-kyle.mp4 + 4x5 | 20.1 s | 16.1 / 12.2 MB | ✓ | ✓ 8.1 + PiP over head 5 s | App footage re-captured at 1236x2196 (was 412x732 upscaled 2.6x); max speed-up 2.0x -> 1.5x; footage in phone frame; PiP in lower third |
| ugc/out/ugc-2-mvp.mp4 + 4x5 | 21.1 s | 13.1 / 10.1 MB | ✓ | ✓ 9.0 + PiP over head 5 s | same; speed 2.4x -> 1.6x |
| prelaunch/assets/teaser-coming-soon-1080x1920.mp4 | 13.3 s | 5.8 MB | ✓ full logo | ✓ 5.9 (take builder -> LOCKED feed, phone frame) | Had no app footage; crf 25 -> 17, 48 kHz AAC |
| prelaunch teaser-called-it / teaser-receipts, feed + story PNGs | still | | ✓ full logo | ✓ phone frame (builder / LOCKED) | Phone-frame app screenshots added |
| prelaunch teaser-coming-soon feed + story PNGs | still | | ✓ full logo | none (by design: 2 of 3 teasers carry the app) | |

Full per-file technical table (duration/size/resolution/audio) comes from `node marketing/qa.mjs`.

## Known limits
- Spot 3 (story + Reddit) shows the app's own loading skeleton for about 1 s right after "Place take"; it is the real app, not trimmed.
- Punch-in zooms (spots 1-4) crop the 1170 px source, so at peak zoom the picture is up to ~1.15x magnified vs native.
- B1 is 51.6 MB because of the added film grain at crf 17; raise crf in `render-reels.mjs` (`encode(...)`) if a smaller upload is needed.
- Kling heads are 1076x1924 (not 720p): used 1:1 with a light luma-only unsharp; no upscale.
