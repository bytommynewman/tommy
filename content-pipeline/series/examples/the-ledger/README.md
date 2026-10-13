# The Ledger — worked example (money and tech shorts)

`bible.json` is the series bible; `week-01/` is a full first week: seven
shorts, 30 Higgsfield prompts, sources per short, captions and a run sheet.
`concepts/the-ledger.json` points at this bible, so
`pipeline.mjs concepts/the-ledger.json --week 2` writes the next week.

## Accuracy rules (these keep the channel safe and monetisable)

- Every number in a voiceover has a source in `shorts.json` → `sources`, and
  the source is named on screen in the last shot. Check the link before you
  post; if the page has changed, change the number.
- Explain mechanisms. Never say what to buy, sell, or invest in, never predict
  prices, never name a ticker as a recommendation. "Not advice" goes in the
  pinned comment.
- Country matters for credit, tax and accounts. Say which country a figure is
  for (day 3 does this). Tommy is in Canada, so follow US-model shorts with a
  Canadian version when the comments ask.
- One real build-log short a week (day 4). It is original material nobody can
  copy and the clearest signal to YouTube that the channel is not
  mass-produced AI content.

## Before rendering

1. The anchor is the desk, not a character, so no reference image is needed:
   the same desk paragraph is baked into every desk prompt. If renders drift,
   generate one desk image and attach it as `start_image` on the desk shots.
2. Draft on Kling 3.0 std, sound off: 30 clips at about 7.5 credits each is
   roughly 225 credits before regenerations. Render days 1, 4 and 5 first (the
   strongest hooks) and post those while the rest render.
3. Voiceover: your own voice, recorded on a phone in a quiet room, or cloned
   once with Higgsfield `create_voice`. Keep it unhurried.

## Platforms

- **YouTube Shorts** is the main stage: no Made-for-Kids restriction, full ad
  monetisation once in the Partner Program (1,000 subscribers and 10M Shorts
  views in 90 days, or 4,000 long-form hours). Mark videos as containing
  altered or synthetic content. Keep each short a different story with its own
  voiceover; YouTube's inauthentic-content rule (July 2025) demonetises
  mass-produced or repetitive AI uploads.
- **Instagram Reels**: reach and follows; no payout program to count on.
- **TikTok**: Creator Rewards wants original, over-one-minute videos and
  excludes minimal-original-input AI content, so post the Sunday compilation
  there and treat the daily shorts as reach.
- **Higgsfield Earn**: submit day 1 if a finance-literacy or education
  campaign is open; read the campaign guidelines first.

Sources for the platform notes are in `../pip-lantern/README.md`.
