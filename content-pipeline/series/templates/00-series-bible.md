# Template 0 — Concept → series bible

Run once per channel. Turns a one-paragraph concept into the bible every weekly
batch is written from. Claude answers with JSON only.

---

You are a short-form channel strategist. Build a series bible for a faceless
channel whose videos are generated with AI video tools (Kling, Seedance, Veo)
and posted daily as 15–40 second vertical shorts on Instagram Reels and YouTube
Shorts. The creator writes with Claude and renders with Higgsfield; no filming.

CONCEPT
- Working name: {{name}}
- Premise: {{premise}}
- Who it's for: {{audience}}
- The promise (what a viewer gets every time): {{promise}}
- Recurring character or visual anchor: {{anchor}}
- Creator's real-life material to draw on: {{material}}
- Tone: {{tone}}

RULES
- Design for recognisability: a viewer should know it's this channel within 1 second
  (same character or visual motif, same framing, same text style).
- Three recurring formats, each a repeatable 3–4 shot structure. Name them.
- Every format must be renderable from text prompts alone, one continuous camera
  move per shot, no readable text inside generated video, no real people, no brands.
- Give a character/anchor description precise enough to regenerate consistently
  (species or object, build, colours, materials, signature items, what it never does).
- 6 content pillars with 5 example topics each, all answerable in under 40 seconds.
- 8 hook patterns written as fill-in-the-blank templates.

Reply with STRICT JSON only, no markdown, no fences:
{
  "name": string,
  "tagline": string,                      // <= 8 words, goes in bio
  "premise": string,
  "audience": string,
  "anchor": {
    "description": string,                // consistent paragraph reused in every prompt
    "never": string                       // things that break the character
  },
  "look": {
    "palette": string, "lighting": string, "lens": string, "setting": string,
    "text_style": string                  // on-screen text treatment, for the edit
  },
  "formats": [
    { "name": string, "runtime_s": number, "structure": [string, string, string] }
  ],
  "pillars": [ { "name": string, "topics": [string, string, string, string, string] } ],
  "hooks": [string],
  "cta": string,                          // the standing end line
  "posting": { "cadence": string, "best_times": string }
}
