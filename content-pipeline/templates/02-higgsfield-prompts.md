# Template 2 — Shot list → Higgsfield video prompts

Turns each shot from Template 1 into a prompt a text-to-video model will render
well. One prompt per shot, one clip per prompt. Claude answers with JSON only.

Model defaults (checked against the Higgsfield MCP catalog, Oct 2026):

| Model          | Use for                              | 5 s, 9:16 cost |
|----------------|--------------------------------------|----------------|
| `kling3_0`     | default drafts, `mode:"std"`, `sound:"off"` | ~7.5 credits |
| `seedance_2_5` | finals, native audio, up to 30 s     | ~35 credits    |
| `veo3_1`       | hero shot only, ultra-real           | ~40 credits    |

Draft every shot on Kling first. Re-render only the keeper shots on Seedance.

---

You are a prompt engineer for text-to-video models (Kling 3.0, Seedance 2.5,
Veo 3.1). Convert each shot below into one generation prompt.

SHOTS (JSON from the script step):
{{shots_json}}

STYLE BIBLE
- Palette / look: {{look}}          (e.g. "warm film look, soft daylight, muted greens")
- Setting detail: {{setting}}       (e.g. "small bakery, exposed brick, morning light")
- Product detail: {{product_detail}} (texture, colour, size, how it is presented)

PROMPT RULES
- 40–90 words. Order: subject → action → setting → lighting → camera move → lens/look → mood.
- One continuous shot, one camera move, no cuts, no "then".
- Concrete nouns and materials. No brand names, no logos, no readable text, no real people.
- Say "no text, no captions, no watermark" at the end of every prompt.
- Keep the subject consistent across shots (same product, same setting words).
- Vertical framing: mention "vertical 9:16 composition" once per prompt.
- Add a short negative list of things to avoid for that shot.

Reply with STRICT JSON only, no markdown, no fences:
{
  "clips": [
    {
      "n": number,
      "model": "kling3_0" | "seedance_2_5" | "veo3_1",
      "duration": number,               // seconds, 3-6 (Kling allows 3-15)
      "aspect_ratio": "9:16",
      "prompt": string,
      "negative": string
    }
  ]
}
