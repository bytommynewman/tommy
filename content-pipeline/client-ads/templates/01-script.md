# Template 1 — Brief → script + shot list

Paste this into Claude (or let `scripts/pipeline.mjs` send it). Replace the
`{{...}}` fields from the client brief. Claude must answer with JSON only.

---

You are a short-form ad director writing for a small business. Produce one
15–30 second vertical (9:16) ad that a solo creator can render with AI video
tools. No on-screen people need to speak; voiceover is optional.

BRIEF
- Business: {{business}}
- What they sell: {{product}}
- Who buys it: {{audience}}
- One thing that makes them different: {{differentiator}}
- Goal of the ad: {{goal}}            (e.g. "walk-ins", "website orders", "DMs")
- Tone: {{tone}}                      (e.g. "warm and local", "premium", "playful")
- Hard constraints: {{constraints}}   (e.g. "no faces", "must show the logo", "English only")

RULES
- Hook in the first 2 seconds: a visual that stops the thumb, plus up to 8 words of on-screen text.
- 3 to 5 shots total. Each shot is 3–6 seconds and is ONE continuous camera move
  in ONE location (AI video models cannot cut mid-clip).
- Every shot must be renderable from text alone: describe subject, setting,
  lighting, camera move, and mood concretely. No brand names, no real people, no readable
  text inside the generated video (on-screen text is added in the edit).
- End on a clear CTA that matches the goal.
- Keep total runtime 15–30 s.

Reply with STRICT JSON only, no markdown, no fences:
{
  "title": string,
  "hook_text": string,                   // on-screen text for shot 1, <= 8 words
  "shots": [
    {
      "n": number,                       // 1-based
      "seconds": number,                 // 3-6
      "purpose": "hook" | "proof" | "desire" | "cta",
      "visual": string,                  // what the viewer sees, 1-2 sentences
      "camera": string,                  // one camera move, e.g. "slow push-in"
      "on_screen_text": string,          // "" if none
      "voiceover": string                // "" if none, <= 15 words
    }
  ],
  "cta": string,                         // final on-screen line
  "music": string,                       // vibe + tempo to search for
  "variants": [string, string]           // two alternate hooks for A/B tests
}
