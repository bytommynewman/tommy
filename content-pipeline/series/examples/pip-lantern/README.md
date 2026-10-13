# Pip the Little Lantern — worked example (kids bedtime shorts)

`bible.json` is the series bible and `week-01/` is a full first week: seven
shorts, 28 Higgsfield prompts, captions and a run sheet. `concepts/pip-lantern.json`
points at this bible, so `pipeline.mjs concepts/pip-lantern.json --week 2`
writes the next week from it.

## Before rendering

1. Make the character once: render one image of Pip with `generate_image`
   from the anchor description in `bible.json`, pick the best, save its job id
   as `anchor_image_id` in the concept file, and attach it to every clip marked
   `uses_anchor` (25 of 28 in week 1). Without it Pip will drift from day to day.
2. Draft on Kling 3.0 std, sound off. Week 1 is 28 clips at about 7.5 credits
   each, so roughly 210 credits before regenerations. On the Plus plan start
   with days 1, 2 and 3 and post those while the rest render over the week.
3. Voiceover: one calm voice, cloned once with Higgsfield `create_voice` or
   recorded on a phone. Music: a soft music-box or felt-piano loop, same track
   every day so it becomes the channel's sound.

## Platform realities for a kids channel (checked Oct 2026)

- **YouTube Made for Kids.** Set every upload to Made for Kids (COPPA). That
  turns off personalised ads, comments, notifications and end screens, so
  Shorts revenue per view is lower than a general channel's. Shorts revenue
  is a pooled share of ads shown between Shorts (reported at roughly $0.03 to
  $0.08 per 1,000 views) and you need the Partner Program first: 1,000
  subscribers plus 10 million public Shorts views in 90 days (or 4,000 watch
  hours). For a kids channel the money is in long-form compilations of the
  shorts, so post a Sunday compilation from week 1.
- **YouTube inauthentic content rule.** Since July 2025 mass-produced or
  repetitive videos are not monetisable; AI is allowed when there is real
  creative input. Keep every short a different story with its own script and
  voiceover, never near-duplicate renders with swapped nouns.
- **Instagram Reels.** No kids designation and no general creator payout, so
  Reels are for reaching parents and growing the handle, not direct income.
- **TikTok.** Accounts are 13+, so a toddler channel reaches parents only.
  Creator Rewards excludes content with minimal original input and needs
  videos over one minute, so treat TikTok as reach, not revenue, and post the
  Sunday compilation there rather than the shorts.
- **Higgsfield Earn.** Campaigns are brand briefs matched to your account;
  nothing published says kids content is excluded or included. Check the
  campaign guidelines in the Earn dashboard before submitting day 1, and
  expect that most campaigns will not fit a bedtime channel. Income from Earn
  is a bonus here, not the plan.
- **Where the money actually is for kids channels.** Watch time on YouTube
  compilations, then licensing or selling the character (books, a bedtime
  app, plush) once it has an audience. Everything in this folder is original
  IP you own; keep it that way (no borrowed characters, songs or names).

Sources: [YouTube Shorts monetisation guide](https://buffer.com/resources/youtube-shorts-monetization/),
[vidIQ on Shorts RPM](https://vidiq.com/pt/blog/post/youtube-shorts-monetization),
[eWeek on the inauthentic content rule](https://www.eweek.com/de/news/youtube-responds-to-ai-concerns/),
[Storrito on TikTok's AI restrictions](https://storrito.com/resources/what-tiktoks-ai-monetization-restrictions-signal-for-creator-income/),
[Higgsfield Earn help center](https://higgsfield.ai/creator-hub/help-center/business/how-do-i-join-a-partnership-or-creator-program).
Third-party figures, not official pages; confirm thresholds on YouTube's own
Partner Program page before counting on them.
