# Game Receipts — launch ads

**Positioning:** everyone says "I called it." Game Receipts proves it. Lock a take, get a timestamped receipt, get graded when it happens. **No betting, no money** — bragging rights only. Say that in every ad; it's the line that keeps us out of gambling-ad restrictions and in front of under-21s.

**Tagline:** Call it. Lock it. Prove it.

## Format rules (Shorts / TikTok / Reels)

- 1080×1920, 30 fps, H.264, 12–25 s. Safe zone: keep text out of the top 220 px and bottom 380 px (platform UI).
- **Hook in the first 1.5 s** — on-screen text, big (Impact/Arial Black, white with black stroke), 3–7 words.
- Silent-safe: every beat has a caption. No voiceover baked in; music is added in each app from its trending library at post time (licensed per platform).
- Real app footage only, captured in a phone frame (iPhone 14 viewport, 390×844 scaled up) on the brand background (`public/art/hero-tall.webp`, dimmed).
- End card (2 s): logo/app name, "Call it. Lock it. Prove it.", "Free · No betting".
- **Legal:** capture with ESPN headshots/team logos blocked (monogram avatars). League and team names appear only as text inside the product UI. Before paid spend, decide whether real player names in ads are OK (see "Open questions").

## The six spots

| # | Name | Hook (0–1.5 s) | Beats | Feature shown |
|---|------|----------------|-------|---------------|
| 1 | **"He said he called it"** | "Your buddy 'called it.' Did he though?" | Group-chat style text bubbles → "Now you can prove it" → pick NHL → Maple Leafs → Playoff run → Runner-up → Place take → LOCKED stamp slams in → feed → leaderboards | Take builder, date stamp, feed |
| 2 | **"10-second take"** | "Lock a take in 10 seconds" | On-screen timer counts up while: league tile → search → pick team → dropdown → Place take → feed banner "Take placed" | Speed of the dropdown builder |
| 3 | **"MVP pick"** | "Your MVP pick. Stamped with the date." | Award take → pick MVP (Finish "Wins it"), flick the Award dropdown past Most Improved Player etc. → Place take → LOCKED date stamp → "Graded when the season's done" → leaderboards | Awards builder, date stamp, leaderboards |
| 4 | **"Receipts don't lie"** | "You can't delete a receipt" | LOCKED stamp close-up → receipt page → "Timestamped. Sealed. Can't be edited." → revision history → resolved "Cashed" + Prestige score → leaderboard best calls | Sealed record, grading, Prestige |
| 5 | **"Put it on the line"** | "Think you know ball? Prove it." | Open a take → Battle/challenge → leaderboards → profile reputation | Battles, leaderboards, reputation |
| 6 | **"Every player. Every team."** | "Every team. Every player. Every league." | Fast cuts across NFL, NBA, NHL, MLB, NCAAF, NCAAB tiles → search lists scrolling → different take dropdowns per position (QB stats vs goalie stats) | Coverage + position-aware takes |

Captions per beat live in `marketing/spots.json` (one source of truth for the renderer).

## Per-platform copy

- **TikTok / Reels / Shorts caption:** hook line + "Free, no betting — just receipts. Link in bio." Hashtags (3–5, rotate): #sportstok #nba #nfl #nhl #hottakes #icalledit
- **Reddit (promoted posts, not organic spam):** most sports subs ban self-promo, so use Reddit Ads targeting r/nba, r/nfl, r/hockey, r/baseball, r/CFB, r/CollegeBasketball communities. Formats: the 9:16 videos cropped to 4:5, plus a 4:5 image carousel (take builder → LOCKED stamp → resolved receipt). Organic posts only in r/SideProject / r/IMadeThis with a founder story.
  - Title A: "Built an app so my group chat can't lie about calling it"
  - Title B: "Lock your hot take now. Get graded when it happens. No betting."
  - Title C: "Every 'I told you so' needs a receipt"

## Open questions for Tommy

1. Real player names in paid ads (publicity rights) — keep, or switch spots to team-only takes?
2. App store / web link for the CTA (currently none — end card says "Link in bio").
3. Posting: Buffer and Higgsfield need to be re-authorized in claude.ai connector settings before I can schedule posts or generate extra b-roll.
