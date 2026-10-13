# Template 3 — Week of shorts → captions, hashtags, Earn notes

Claude answers with JSON only.

---

Write posting copy for each short below. Channel: {{name}} — {{tagline}}.
Platforms: Instagram Reels and YouTube Shorts (same file both places).
Higgsfield Earn: day 1 is submitted to a campaign; campaign tag: {{earn_tag}}.

SHORTS
{{shorts_json}}

RULES
- Caption 1–2 lines, first person, ends with a question or a nudge to follow.
- 10–15 hashtags: 3 broad, 5 niche, 3 micro, plus the channel's own tag {{channel_tag}}.
- For the Earn short: include the campaign tag exactly, keep the Higgsfield watermark,
  note the campaign length cap, and remind to post on the verified account.
- "pin" is a one-line pinned comment that invites a reply.

Reply with STRICT JSON only, no markdown, no fences:
{
  "posts": [
    { "day": number, "caption": string, "hashtags": string, "pin": string,
      "earn": boolean, "notes": string }
  ]
}
