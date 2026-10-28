# Ad 02 — gameplay screen recording (32s, 9:16)

**Master:** https://d2ol7oe51mr4n9.cloudfront.net/user_3Geu4VxnSRFagYiyayCtfVAIQSR/08ee1b06-4c90-461f-819d-5c38a82e3645.mp4
(1080×1920, 32.2s, H.264, no audio track — add trending sound in-app when posting.)

## What it is

A real Classic game on the live site, recorded with Playwright at phone size and
cut with three text cards. No presenter, no AI-generated footage, so it needs no
AI disclosure.

| Time | On screen |
|---|---|
| 0–3s | Lobby. Card: **"don't say the obvious one"** |
| 3–26s | Rounds: *Name a capital city* → London **+10 Plain**; *Name a horror film* → "Blood: The Last Vampire" **+100**; *Country ending in A* → Abkhazia; *Name a documentary* → "14 Peaks". Card: **"only uncommon answers score"** |
| 26–32s | Results + creature. Card: **"oddler.higgsfield.app · free"** |

## Posting

- **TikTok / Reels / Shorts caption:** `apple is 10 points. cloudberry is 100. name a fruit 👇`
- **Hashtags:** #trivia #wordle #dailygame #braingames #oddler
- **Pinned comment:** "same 7 prompts for everyone today — post your grid"
- Reply to every comment with a prompt (list in MARKETING.md §6).
- Best posting window for the Toronto audience: 7–9pm ET.

## Re-rendering

Source frames come from `scripts` in the session scratchpad; to redo it, record
`https://oddler.higgsfield.app/?mode=classic` with Playwright at a 1080×1920
viewport, `document.documentElement.style.zoom = "2.77"`, then overlay the three
cards with ffmpeg `drawtext` (Fredoka Bold, white on a 60% plum band).
