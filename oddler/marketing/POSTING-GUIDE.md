# Oddler ad kit

Everything here is **real footage of the live game**, captured from oddler.app
at phone size. No mock-ups, and no AI-generated gameplay: what the ad shows is
what someone gets when they tap the link.

Rebuilt 1 Nov 2026, so it includes the glasses in the locker, the fixed results
row and the roomier round screen.

## The ads

| # | File | Length | What it says |
|---|------|--------|--------------|
| 1 | `01-how-to-play` | 14s | A full round: prompt → typing → RARE +60 → a part unlocked |
| 2 | `02-what-is-oddler` | 14s | The hook: France scores 10, Liechtenstein scores 100 |
| 2b | `02b-hook-with-opener` | 16s | Same, fronted by the animated sting |
| 3 | `03-daily` | 11s | One Daily, same seven for everyone, grid to share |
| 4 | `04-duo` | 12s | Two phones, one room code, one team score |
| 5 | `05-collect` | 11s | Rare answers grow the creature |

Masters are **2160×3840 (4K vertical)**, typeset in Fredoka — the game's own
display font — so the captions match the product. Every other cut is derived
from the master, never from a smaller file. `out/` is split by cut:

| Folder | Size | Where it goes |
|---|---|---|
| `1-vertical-4k-tiktok-reels-shorts` | 2160×3840 | **The default.** TikTok, Reels, Shorts, Stories |
| `2-vertical-1080-smaller` | 1080×1920 | Only where 4K vertical is rejected or too slow to upload |
| `3-square-feeds` | 2160×2160 | Instagram and Facebook feed, X |
| `4-landscape-youtube` | 3840×2160 | YouTube, X, Facebook, Reddit |

Each folder has a `_README.txt` saying the same thing, so the right one is
obvious from Finder without coming back here. Reach for folder 1 unless a
platform makes you do otherwise.

## Where each one goes first

- **TikTok / Reels / Shorts** — lead with **02** (the hook does the work in two
  seconds), then **01**. Post **03** on a day you want the Daily to spike.
- **Instagram feed** — the 6-slide carousel in `posters/`, or **01** from `3-square-feeds`.
- **X** — **02** from `4-landscape-youtube`, with `posters/link-card-4k-16x9.png` as the fallback.
- **Reddit** (r/wordgames, r/WebGames, r/incremental_games) — **01** from `4-landscape-youtube`.
  Lead with the game, not the brand; those subs punish ad-speak.
- **YouTube Shorts** — all five, one a day, same order.

## Captions to paste

**02 / the hook**
> Name a European country. France scores 10. Liechtenstein scores 100.
> Only uncommon answers score. oddler.app

**01 / how to play**
> Seven prompts, twenty seconds each. The obvious answer is worth almost
> nothing — the one nobody else types is worth 100. oddler.app

**03 / the Daily**
> Everyone gets the same seven prompts each day. One go. Then you get a grid
> to post. oddler.app

**04 / Duo**
> Send a friend a room code and you play the same ten prompts together — they
> watch you type, and it's one score. oddler.app

**05 / the locker**
> Land a rare answer and your Oddler grows a part. Horns, wings, glasses —
> they stay in the locker. oddler.app

Hashtags that fit without being spammy: `#wordgame #triviagame #puzzlegame
#browsergame #dailygame`. Add `#wordle` only on the Daily post — it's the
reference point people already have.

## Rebuilding it

```
cd ~/oddler-ads
node src/capture.mjs          # solo run -> frames/
node src/capture.mjs duo      # Daily and Duo -> frames-duo/
./src/build.sh                # -> out/ and posters/
```

Re-run after any UI change and the ads follow the real product. The captions
are written to hold whatever prompt the capture lands on, so a rebuild needs no
editing. `src/answers.json` maps each prompt to a deliberately uncommon answer
taken from the shipped question bank, which is how the capture reliably lands a
good tier on camera; regenerate it from `src/logic.js` if the bank changes.

`src/capture.mjs` needs Playwright, which it picks up from the `node_modules`
symlink pointing at `~/tommy/game-receipts/node_modules`.

## One thing deliberately left out

No AI talking-head "review" clips. Your own finding from the holdr work is that
AI faces read as AI and can't be fixed in post, and a fake person recommending
a real product is the kind of ad that gets a young domain reported. The only
generated asset here is `sting-raw.mp4`, animated from the game's own pixel art
— real asset, real style, no invented UI. It cost 10 Higgsfield credits and is
used as the 2.2s opener on **02b** only, so bin that one cut if you dislike it
and the rest of the kit is untouched.
