# Oddler — marketing playbook

Live game: https://oddler.higgsfield.app
Source: `oddler/` in this repo (branch `claude/great-meitner-cdyydz`).

## 1. What we are selling

**One line:** *Only uncommon answers score.*

**The pitch (two sentences):** Oddler gives you a prompt like "Name a Premier
League club" and twenty seconds. Everyone can say Arsenal; the points are for the
answer nobody else would say, and rare answers grow a pixel axolotl you keep.

**Why it spreads:** the fun is in *comparing* answers. "What did you put for
cheese?" is the whole game. Every feature below exists to turn that
conversation into a link.

**Audience to start with:** 16–30, phone-first, already plays Wordle /
Connections / Krillion / Heardle-style dailies, sends them to a group chat.
Friends, uni group chats, Discord servers, office Slacks.

## 2. Growth loops built into the game (ship status: live)

| Loop | How it works | Share surface |
|---|---|---|
| **Daily** | Same 7 prompts for everyone, one go, resets 00:00 UTC (8pm Toronto). | Emoji grid + score, Wordle-style. "Daily #12 · 345 odd 🟩🟨⬛🟧🟩🟪🟩" |
| **Challenge link** | Play 7, send the link; the friend gets the exact same 7 and your score to beat. | "I scored 345. Same 7 prompts, beat me: oddler.higgsfield.app/?challenge=…" |
| **Duo** | Two people, one room code, alternating prompts, team score, live typing. | Room link. |
| **Locker / levels** | 50 levels, a banner every 5, accessories up to level 34, mutations from rare answers. | Shows on nameplates in Duo, in results, in shares. |

Rule of thumb for every post: **show a grid or a creature, end with a question
people can answer in the comments** ("what's your rarest cheese?"). The
comments *are* the game.

## 3. Launch sequence (first 14 days)

**Day 0 — seed the Daily.** Play Daily #1 yourself, post the grid to your own
story / group chats with "beat me". The daily number in the share text does
the rest: people hate seeing #4 and not knowing what #1–3 were.

**Days 1–3 — group chats and Discords.** Target: 10 group chats, 5 Discord
servers you are already in. Message template:

> ok this is a dumb game but I can't stop. "Name a cheese" — only rare answers
> score. I got 345 on today's, same 7 for everyone: oddler.higgsfield.app

Do not post a link with no score. Post a grid with a link.

**Days 2–7 — short video.** Three TikToks / Reels / Shorts, one every two days
(scripts in §4). Reply to every comment with a prompt ("ok but name a bone").

**Days 4–10 — communities.** One post each, written for the room, not a copy
paste (drafts in §5): r/WebGames, r/puzzles (daily thread), r/casualgames,
r/trivia, the Krillion / Wordle-adjacent Discords, Hacker News "Show HN"
(the tech story: a pure-logic trivia engine on Cloudflare Durable Objects with
a pixel axolotl is a fine Show HN), Product Hunt (Tuesday launch).

**Day 7 and 14 — a leaderboard moment.** Post "Daily #7: hardest prompt was
'Name a Norse god' — 60% put Thor" (you can read this off the KV profiles /
room states later; for now, say what your friends put). Content from the
game's own data is the cheapest content there is.

## 4. Short-video scripts (15–25s, phone screen recording + face)

1. **"Only rare answers count."** Open on the clock running. "Name a fruit." You
   type *apple* → +10, Plain. Cut. "Name a fruit." You type *cloudberry* → +100,
   One in an Oddlion, the axolotl grows a wing. Text on screen: *Only uncommon
   answers score.* End card: your daily grid. Caption: "what would you put?"
2. **Duet bait: the typing reveal.** Record a Duo game with a friend on
   FaceTime: you see their answer appear letter by letter. The reaction to
   "p-a-r-m…" is the clip. Caption: "name a cheese that ISN'T cheddar".
3. **Countdown panic.** The heart beating faster as the bar drains, red vignette, you fumble
   "liechtenstien" (typo, still accepted). Caption: "20 seconds is NOT enough".
4. **Streak / locker flex.** Timelapse of a creature going from plain pink to
   horns, wings, holo banner over a week of dailies. Caption: "day 9 of growing
   my oddler".
5. **The Rumble format.** You vs a friend, same challenge link, split screen,
   scores revealed at the end. Caption: "settle it: oddler.higgsfield.app".

Hooks that work in the first second: a prompt on screen with the clock
already running, or a creature that is clearly a bit wrong.

## 5. Community post drafts

**Reddit (r/WebGames):**
> **Oddler — trivia where only the uncommon answer scores (browser, free, no
> signup)**
> "Name a pasta shape" — spaghetti is 10 points, strozzapreti is 85. Seven
> prompts, twenty seconds each, rare answers grow a pixel axolotl you keep. There's
> a Daily (same 7 for everyone) and a challenge link that deals a friend your
> exact 7. Made it with a mate in Toronto; the question bank is ~130 hand-written
> prompts plus a batch that auto-refreshes twice a day. Would love hard-prompt
> ideas. oddler.higgsfield.app

**Show HN:**
> Show HN: Oddler – trivia where only uncommon answers score (pure-logic rules
> on Cloudflare Durable Objects)
> Game rules are a single pure module (no Date.now, seeded RNG) so the same
> seed deals the same prompts to anyone — that's how the Daily and challenge
> links work. Typo tolerance is Damerau–Levenshtein with length-scaled limits.
> Lockers are KV with PBKDF2 accounts. Happy to answer questions on the
> tier/scoring design.

**Discord / Slack one-liner:**
> daily oddler is up, same 7 for all of us. I got 345 and I'm not telling you
> what I put for "a word that rhymes with cat" → oddler.higgsfield.app

## 6. Copy bank

Taglines: *Only uncommon answers score.* · *Be odd. Score odd.* · *Everyone
says Arsenal.* · *Twenty seconds. Don't say the obvious one.*

App-store-style description (for the Higgsfield listing, Product Hunt, bios):
> Trivia for people who hate the obvious answer. Seven prompts, twenty seconds
> each; every prompt has dozens of right answers, but only the uncommon ones
> score. Rare answers grow your pixel axolotl, levels unlock banners and
> accessories, and the Daily deals everyone the same seven so you can argue
> about them.

Comment-reply prompts (keep a list, reply to every comment with one): name a
bone · name a cheese that isn't cheddar · name a word with no vowels · name a
Shakespeare play that isn't Hamlet · name a country that borders Germany ·
name a palindrome · name a US president from the 1800s.

## 7. What to measure (weekly)

- Daily players (rooms that finish a `daily` game per UTC day).
- Share rate: results screens → share taps (add a counter when needed).
- Challenge acceptance: `?challenge=` loads that start a game.
- D1 / D7 return (profiles with games on more than one day).
- Account conversion (guest locker → signup).

Until there is analytics, ask the game: the KV profiles hold `games`, `xp`,
`best`; room states hold `dailyDone`. A small worker route can aggregate them
later.

## 8. Things worth doing next (not built yet)

1. **Share card image** — a PNG of the creature + grid for stories (canvas
   render; the emoji grid works for chats, images work for TikTok/IG).
2. **Daily stats on the results screen** — "62% of players put Thor". Needs an
   answer tally per daily prompt (one KV counter per prompt per day).
3. **Promo clip** — a 10–15s animated spot from the existing axolotl art
   (Higgsfield can generate this; costs credits).
4. **Push to TikTok from Higgsfield** — the account connector exists; a posting
   calendar is in §3.
5. **A proper domain** (oddler.app / playoddler.com) pointing at the Higgsfield
   site, for the share links to look like a product.
