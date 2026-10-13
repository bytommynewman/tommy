# Content pipeline: Claude writes, Higgsfield renders

A repeatable production line for short vertical ads. Claude turns a client
brief into a script, shot list and one Higgsfield prompt per shot; Higgsfield
renders each shot as a clip; you cut, caption and post (or deliver to the
client). The same clips feed all three income routes in the "Income Routes
Compared" doc: client ad work first, Higgsfield Earn and prompt packs ride along.

## Layout

```
content-pipeline/
  briefs/            one JSON per client or idea (input)
  templates/         the three Claude prompts, in order
  scripts/pipeline.mjs   fills the templates and calls Claude
  out/<slug>/        generated script.json, clips.json, post.json, README.md
  examples/sample-01/    a full worked run plus the rendered sample clip
```

## Run it

1. Copy `briefs/example-brief.json`, fill it in for the client, save as
   `briefs/<client>.json`. Only `business`, `product`, `audience`,
   `differentiator`, `goal` and `tone` are required.
2. Export your Anthropic key once per shell (never commit it):
   `export ANTHROPIC_API_KEY=sk-ant-...`
3. Run:
   ```
   npm install
   node content-pipeline/scripts/pipeline.mjs content-pipeline/briefs/<client>.json
   ```
   Add `--dry-run` to print the filled prompts instead of calling Claude, which is
   also how you paste them into claude.ai by hand.
4. Open `out/<client>/README.md`. It lists one prompt per shot with the model,
   duration and aspect ratio to use.

## Render the clips in Higgsfield

Two ways, same prompts:

- **From Claude Code with the Higgsfield MCP connected.** Ask Claude to render
  `out/<client>/clips.json`. It calls `generate_video` once per clip with the
  listed model, `aspect_ratio: "9:16"` and duration, then `jobs_wait`. Say
  "drafts only" and it keeps everything on Kling std with sound off.
- **On higgsfield.ai.** Paste each prompt into the model named in the run
  sheet, set 9:16 and the duration, generate.

Cost guide (Oct 2026, from the MCP catalog): Kling 3.0 std 5 s silent is about
7.5 credits, Seedance 2.5 5 s about 35, Veo 3.1 about 40. Draft every shot on
Kling, re-render only the keepers on Seedance or Veo. A finished three-variant
ad lands at roughly 40 to 120 credits including regenerations. Check `balance`
after every batch.

## Cut and post

- Stack the clips in order in CapCut or the Reels editor, add the on-screen
  text and CTA from `script.json`, drop in a track matching `music`.
- `post.json` has the caption, hashtags and posting notes. For a Higgsfield
  Earn campaign set `poster` to your creator account and `earn_tag` to the
  campaign hashtag in the brief, keep the watermark, and post to Instagram or
  YouTube (TikTok's rewards program excludes mostly synthetic content).
- Deliver client work as three variants: swap the hook using `variants` in
  `script.json` and re-render shot 1 only.

## Model and prompt rules the templates enforce

- One continuous camera move per shot, 3 to 6 seconds, no cuts inside a clip.
- No brand names, logos, real people or readable text in generated video; text
  is added in the edit.
- Every prompt ends with "no text, no captions, no watermark" and carries a
  short negative list.
- Vertical 9:16 always.

## Changing the templates

Each template is a Markdown file; everything below the `---` rule is the prompt
and `{{field}}` placeholders are filled from the brief. Keep the JSON shape at
the bottom of each template in sync with `scripts/pipeline.mjs`, which reads
`shots`, `clips`, `title`, `cta`, `variants`, `caption`, `hashtags`, `notes`.
