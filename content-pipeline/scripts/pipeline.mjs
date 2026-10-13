#!/usr/bin/env node
// Claude → Higgsfield content pipeline runner.
//
//   node content-pipeline/scripts/pipeline.mjs content-pipeline/briefs/example-brief.json
//   node content-pipeline/scripts/pipeline.mjs <brief.json> --dry-run   # print filled prompts, no API call
//
// Reads a brief, fills templates/01-script.md → 02-higgsfield-prompts.md →
// 03-caption-and-post.md in order, calls Claude for each, and writes:
//   content-pipeline/out/<slug>/script.json
//   content-pipeline/out/<slug>/clips.json        ← paste each clip into Higgsfield (MCP or web)
//   content-pipeline/out/<slug>/post.json
//   content-pipeline/out/<slug>/README.md         ← human-readable run sheet
//
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Never commit the key.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const MODEL = 'claude-opus-5-5';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const briefPath = args.find((a) => !a.startsWith('--'));
if (!briefPath) {
  console.error('usage: pipeline.mjs <brief.json> [--dry-run]');
  process.exit(1);
}

const brief = JSON.parse(fs.readFileSync(briefPath, 'utf8'));
const required = ['business', 'product', 'audience', 'differentiator', 'goal', 'tone'];
for (const k of required) {
  if (!brief[k]) {
    console.error(`brief is missing "${k}"`);
    process.exit(1);
  }
}
const defaults = {
  constraints: 'none',
  look: 'clean, natural light, true-to-life colour',
  setting: 'where the product is normally used',
  product_detail: brief.product,
  platform: 'Instagram Reels',
  poster: 'the business',
  earn_tag: '',
};
const vars = { ...defaults, ...brief };

const slug =
  brief.slug ||
  String(brief.business)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const outDir = path.join(root, 'out', slug);

// Everything under the "---" rule in a template is the prompt body.
function template(name) {
  const raw = fs.readFileSync(path.join(root, 'templates', name), 'utf8');
  const idx = raw.indexOf('\n---\n');
  return idx === -1 ? raw : raw.slice(idx + 5).trim();
}
function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (values[k] === undefined ? `{{${k}}}` : String(values[k])));
}
function stripFences(s) {
  return s.replace(/```(?:json)?/gi, '').trim();
}

let client = null;
async function ask(prompt, label) {
  if (dryRun) {
    console.log(`\n===== ${label} (dry run) =====\n${prompt}\n`);
    return null;
  }
  if (!client) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    client = new Anthropic();
  }
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: { effort: 'medium' },
    messages: [{ role: 'user', content: prompt }],
  });
  if (res.stop_reason === 'refusal') {
    throw new Error(`${label}: model refused (${res.stop_details?.category ?? 'unknown'})`);
  }
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  try {
    return JSON.parse(stripFences(text));
  } catch {
    throw new Error(`${label}: response was not valid JSON:\n${text}`);
  }
}

// 1. script + shot list
const script = await ask(fill(template('01-script.md'), vars), 'script');

// 2. per-shot Higgsfield prompts
const promptsIn = { ...vars, shots_json: JSON.stringify(script?.shots ?? [], null, 2) };
const clips = await ask(fill(template('02-higgsfield-prompts.md'), promptsIn), 'clips');

// 3. caption + posting notes
const postIn = { ...vars, title: script?.title ?? '', cta: script?.cta ?? '' };
const post = await ask(fill(template('03-caption-and-post.md'), postIn), 'post');

if (dryRun) process.exit(0);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'script.json'), JSON.stringify(script, null, 2));
fs.writeFileSync(path.join(outDir, 'clips.json'), JSON.stringify(clips, null, 2));
fs.writeFileSync(path.join(outDir, 'post.json'), JSON.stringify(post, null, 2));

const sheet = [
  `# ${script.title}`,
  '',
  `Business: ${vars.business}  ·  Platform: ${vars.platform}`,
  `Hook text: **${script.hook_text}**`,
  '',
  '## Clips to render (one Higgsfield generation each)',
  '',
  ...clips.clips.flatMap((c) => [
    `### Shot ${c.n} — ${c.model}, ${c.duration}s, ${c.aspect_ratio}`,
    '',
    c.prompt,
    '',
    `Avoid: ${c.negative}`,
    '',
  ]),
  '## Edit',
  '',
  ...script.shots.map(
    (s) => `- Shot ${s.n} (${s.seconds}s, ${s.purpose}): text "${s.on_screen_text}"${s.voiceover ? ` · VO: "${s.voiceover}"` : ''}`,
  ),
  `- End card: ${script.cta}`,
  `- Music: ${script.music}`,
  '',
  '## Post',
  '',
  post.caption,
  '',
  post.hashtags,
  '',
  post.notes,
  '',
  '## A/B hooks',
  '',
  ...script.variants.map((v) => `- ${v}`),
  '',
].join('\n');
fs.writeFileSync(path.join(outDir, 'README.md'), sheet);
console.log(`wrote ${path.relative(process.cwd(), outDir)}/ (script.json, clips.json, post.json, README.md)`);
