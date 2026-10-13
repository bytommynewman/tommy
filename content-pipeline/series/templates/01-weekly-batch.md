# Template 1 — Series bible → a week of shorts

Run once a week. Produces 7 scripts in one go so you can render and schedule in
a single sitting. Claude answers with JSON only.

---

You are the head writer for the channel described in the bible below. Write
{{count}} shorts for week {{week}}. Rotate the formats and pillars so no two
consecutive days share a format, and never repeat a title from the "already
made" list.

SERIES BIBLE
{{bible_json}}

ALREADY MADE (do not repeat these angles)
{{made_list}}

THIS WEEK
- Theme or news to lean on (optional): {{theme}}
- Anything to avoid: {{avoid}}

RULES
- Each short follows one of the bible's formats exactly, 3–4 shots, 15–40 s total.
- Shot 1 is the hook: a visual that stops the thumb plus on-screen text from one of
  the bible's hook patterns, <= 8 words.
- Each shot is ONE continuous camera move in ONE location, 3–8 seconds, renderable
  from text alone. Keep the anchor on screen in at least 2 shots.
- Voiceover is first person, plain, <= 15 words per shot, written to be read by the
  creator or a cloned voice. It carries the idea; visuals carry the mood.
- End every short on the bible's CTA (word it the same every time).
- Make day 1 the strongest; it is the one that gets submitted to Higgsfield Earn.

Reply with STRICT JSON only, no markdown, no fences:
{
  "week": number,
  "shorts": [
    {
      "day": number,                       // 1-7
      "format": string,                    // one of the bible's format names
      "pillar": string,
      "title": string,
      "hook_text": string,
      "shots": [
        { "n": number, "seconds": number, "visual": string, "camera": string,
          "on_screen_text": string, "voiceover": string }
      ],
      "cta": string
    }
  ]
}
