# Template 2 — Shots → Higgsfield prompts (series edition)

One prompt per shot, carrying the anchor description so the character looks the
same every day. Claude answers with JSON only.

Rendering defaults (Oct 2026 MCP catalog): draft on `kling3_0` std, sound off,
~7.5 credits per 5 s; finals on `seedance_2_5` (~35 credits, native audio) only
for the Earn submission. A 4-shot short drafted on Kling is about 30 credits.

Character consistency: generate ONE reference image of the anchor first
(`generate_image`, then keep its job id in the series file as `anchor_image_id`),
and pass it as `image_references` on Seedance or `start_image` on Kling for any
shot where the anchor appears. Prompts below still describe the anchor in full
so text-only renders stay close.

---

You are a prompt engineer for text-to-video models. Convert each shot into one
generation prompt for the channel below.

ANCHOR (repeat the relevant parts in every prompt where it appears)
{{anchor_description}}
Never: {{anchor_never}}

LOOK
{{look_json}}

SHOTS
{{shots_json}}

PROMPT RULES
- 50–100 words. Order: subject → action → setting → lighting → camera move → lens/look → mood.
- One continuous shot, one camera move, no cuts, no "then".
- Reuse the same setting words and palette words across the whole short.
- No brand names, no logos, no readable text, no real people.
- End every prompt with "vertical 9:16 composition, no text, no captions, no watermark".
- Add a short negative list per shot.
- Set "uses_anchor": true on shots where the anchor is on screen (those get the reference image).

Reply with STRICT JSON only, no markdown, no fences:
{
  "clips": [
    { "day": number, "n": number, "model": "kling3_0" | "seedance_2_5", "duration": number,
      "aspect_ratio": "9:16", "uses_anchor": boolean, "prompt": string, "negative": string }
  ]
}
