# Content pipeline: Claude writes, Higgsfield renders

Two production lines share one idea: Claude turns a concept into scripts and
one Higgsfield prompt per shot, Higgsfield renders each shot, you cut, caption
and post. Neither needs a camera.

| Folder        | What it makes                                   | First income                         |
|---------------|-------------------------------------------------|--------------------------------------|
| `series/`     | A faceless brand channel: daily shorts in a recurring format with a consistent character or visual anchor | Higgsfield Earn on the best short each week, then sponsorships and your own products as the channel grows |
| `client-ads/` | 15–30 s ads for a small business from a brief   | The client pays per ad               |

`series/` is the default. `client-ads/` is kept for when a business asks.

## Series: build a channel

```
npm install
export ANTHROPIC_API_KEY=sk-ant-...          # once per shell, never committed
node content-pipeline/series/pipeline.mjs content-pipeline/series/concepts/<name>.json --init
node content-pipeline/series/pipeline.mjs content-pipeline/series/concepts/<name>.json --week 1
```

1. **Concept** (`series/concepts/*.json`): one paragraph each for premise,
   audience, promise, anchor (the recurring character or visual), your real-life
   material, and tone. Two drafts are in there to pick from.
2. **`--init`** writes `series/out/<slug>/bible.json`: tagline, the anchor
   described precisely enough to regenerate, the look (palette, lens, setting,
   text style), three recurring formats, six pillars with topics, hook
   patterns, the standing CTA and posting cadence. Edit it by hand; every week
   is written from it.
3. **`--week N`** writes seven shorts (`--count 3` for fewer), one Higgsfield
   prompt per shot with the anchor description baked in, captions, hashtags and
   Earn notes, plus a run sheet `week-NN/README.md`. Titles go into `made.json`
   so later weeks never repeat. `--theme "..."` steers a week. `--dry-run`
   prints the prompts for pasting into claude.ai instead of calling the API.

### Render

- **From Claude Code with the Higgsfield MCP:** ask Claude to render
  `week-NN/clips.json`. It calls `generate_video` per clip with the listed
  model, `9:16` and duration, waits with `jobs_wait`, and reports the balance.
- **On higgsfield.ai:** paste each prompt into the named model at 9:16.

Make the anchor look the same every day: render one reference image of it
(`generate_image`), save its job id in the concept file as `anchor_image_id`,
and attach it as `image_references` (Seedance) or `start_image` (Kling) on
every clip marked `uses_anchor`.

Credits (MCP catalog, Oct 2026): Kling 3.0 std, 5 s, silent is about 7.5;
Seedance 2.5 5 s about 35; Veo 3.1 about 40. Drafting a 4-shot short on Kling
is roughly 30 credits, so a week of seven is 200–250 on Kling alone, more if you
regenerate. On the Plus plan that means rendering 3–4 shorts a week at first and
re-rendering only the Earn pick on Seedance. Check `balance` after every batch.

### Cut and post

- Stack the clips in CapCut, add on-screen text in the bible's text style, record
  the voiceover (or clone a voice once with Higgsfield `create_voice` and use
  `generate_audio`), drop in music.
- Post the same file to Instagram Reels and YouTube Shorts daily. Day 1 of each
  week is the Earn submission: verified account, campaign tag from `earn_tag`
  in the concept, watermark kept, within the campaign's length cap. TikTok's
  rewards program excludes mostly synthetic content, so it is for reach only.
- Expect nothing from Earn until it is paid out; the terms let Higgsfield reject
  or claw back. The channel is the asset.

## Client ads

See `client-ads/`: `briefs/example-brief.json` is the input,
`pipeline.mjs <brief.json>` writes script, clips and post copy, and
`examples/sample-01/` is a full run with one rendered clip.

## Prompt rules both lines enforce

- One continuous camera move per shot, 3–8 s, no cuts inside a clip.
- No brand names, logos, real people or readable text in generated video; text
  is added in the edit.
- Every prompt ends with "vertical 9:16 composition, no text, no captions, no
  watermark" and carries a short negative list.

## Changing templates

Each template is Markdown; everything below the `---` rule is the prompt and
`{{field}}` placeholders are filled from the concept, bible or brief. Keep the
JSON shape at the bottom of each template in sync with the runner that reads it.
