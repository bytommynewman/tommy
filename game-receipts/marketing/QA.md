# Game Receipts ad QA (re-render with logo everywhere, real app footage, high-quality encode)

Checked by extracting frames at 0.5 s, 25%, 50%, 75%, last and the end card for every video (contact sheets in `marketing/qa/<name>-sheet.jpg`)
and viewing them. All videos: 30 fps constant, H.264 High yuv420p x264 slow crf 17 (maxrate 20M), AAC 192k 48 kHz, +faststart.
Monogram avatars only (remote ESPN images blocked at capture), no betting/money wording on any frame.

"App s" = seconds of real in-app footage on screen. Logo = emblem bug throughout + full logo on the end card (images: full logo).

| Deliverable | Duration | Size | Logo | App footage (s) | Issues fixed |
|---|---|---|---|---|---|
| out/spot-1-he-said-he-called-it.mp4 | 21.9 s | 3.1 MB | ✓ | ✓ 17.2 | Mock chat cut from 4.2 s to 2.7 s; 780 px capture upscaled to 842 -> 1170 px capture scaled down to 700; caption moved above phone |
| out/spot-2-10-second-take.mp4 | 14.4 s | 2.3 MB | ✓ | ✓ 12.4 | Stopwatch no longer covers page title; sharper capture; caption off the app header |
| out/spot-3-mvp-pick.mp4 | 23.9 s | 2.6 MB | ✓ | ✓ 21.9 | Re-checked frame by frame (30 fps): after "Place take" the skeleton is on screen ~0.3 s (9 frames, 'Placing...' ~0.1 s before it), under the 0.5 s limit, so no cut was needed (the old ~1 s note was wrong). Same pipeline as the others |
| out/spot-4-receipts-dont-lie.mp4 | 24.0 s | 5.6 MB | ✓ | ✓ 22.0 | same |
| out/spot-5-put-it-on-the-line.mp4 | 19.4 s | 3.8 MB | ✓ | ✓ 17.3 | same |
| out/spot-6-every-player-every-team.mp4 | 23.4 s | 2.0 MB | ✓ | ✓ 21.3 | same |
| out/reddit-4x5-3-mvp-pick.mp4 | 23.9 s | | ✓ | ✓ 21.9 | Same raw capture as spot 3: skeleton ~0.3 s, no trim needed |
| out/reddit-4x5-1..6 (6 files) | 14.4-24.0 s | 1.7-4.9 MB | ✓ | ✓ same as spots | Caption moved above the phone (was covering the app header/title); phone sharper |
| out/reddit-carousel-1..3.png | still | 0.2-0.4 MB | ✓ | ✓ (still) | Native 1170 px screenshots, bug in side margin |
| reels/out/A1-mvp-speedrun.mp4 | 20.1 s | 10.9 MB | ✓ | ✓ 17.6 | Top panel now uses the untouched Kling master (was picking the finished 4:5 ad); end card gets full logo; stopwatch out of the right rail; 3x capture |
| reels/out/A2-prove-you-called-it.mp4 | 20.5 s | 12.2 MB | ✓ | ✓ 18.0 | same |
| reels/out/B1-pov-screen-ig.mp4 | 21.7 s | 24.4 MB (9.0 Mbps) | ✓ | ✓ 19.9 | `render-reels.mjs B1 --target ig`: 2-pass H.264 High 9M (max 10M/buf 20M), 1080x1920 30 fps CFR, BT.709 tagged, closed GOP keyframe every 2 s, AAC-LC 48 kHz 128k; grain removed, glare halved; captions shifted into x 60-930 and y < 1500; logo at y 280. Cover: B1-cover-1080x1920.jpg + B1-cover-grid-1080x1440.jpg (LOCKED stamp, t 12.7 s). Sheet: qa/B1-ig-sheet.jpg. Safe-zone overlay checked: captions/logo/stamp clear of IG UI. Known: the app's Place button sits at y~1640 (inside bottom UI) in the capture itself |
| reels/out/B1-pov-screen.mp4 | 21.7 s | 51.6 MB | ✓ | ✓ 19.9 | End tag is now full logo + tagline; crf 24 -> 17 (grain makes it large); 3x capture |
| ugc/out/ugc-1-kyle.mp4 + 4x5 | 20.1 s | 16.1 / 12.2 MB | ✓ | ✓ 8.1 + PiP over head 5 s | App footage re-captured at 1236x2196 (was 412x732 upscaled 2.6x); max speed-up 2.0x -> 1.5x; footage in phone frame; PiP in lower third |
| ugc/out/ugc-2-mvp.mp4 + 4x5 | 21.1 s | 13.1 / 10.1 MB | ✓ | ✓ 9.0 + PiP over head 5 s | same; speed 2.4x -> 1.6x |
| prelaunch/assets/teaser-coming-soon-1080x1920.mp4 | 13.3 s | 5.8 MB | ✓ full logo | ✓ 5.9 (take builder -> LOCKED feed, phone frame) | Had no app footage; crf 25 -> 17, 48 kHz AAC |
| prelaunch teaser-called-it / teaser-receipts, feed + story PNGs | still | | ✓ full logo | ✓ phone frame (builder / LOCKED) | Phone-frame app screenshots added |
| prelaunch teaser-coming-soon feed + story PNGs | still | | ✓ full logo | none (by design: 2 of 3 teasers carry the app) | |

Full per-file technical table (duration/size/resolution/audio) comes from `node marketing/qa.mjs`.

## Known limits
- Spot 3 (story + Reddit) shows the app's own loading skeleton for ~0.3 s right after "Place take" (measured at 30 fps); real app footage, untrimmed.
- Punch-in zooms (spots 1-4) crop the 1170 px source, so at peak zoom the picture is up to ~1.15x magnified vs native.
- B1 original is 51.6 MB because of film grain at crf 17; upload `B1-pov-screen-ig.mp4` (use `--target ig` for A1/A2 too) to Instagram.
- Kling heads are 1076x1924 (not 720p): used 1:1 with a light luma-only unsharp; no upscale.
