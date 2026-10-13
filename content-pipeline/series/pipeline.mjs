#!/usr/bin/env node
// Series pipeline: a faceless brand channel, written by Claude, rendered on Higgsfield.
//
//   node content-pipeline/series/pipeline.mjs concepts/scratch-caddie.json --init      # build the series bible (once)
//   node content-pipeline/series/pipeline.mjs concepts/scratch-caddie.json --week 1    # write a week of shorts
//   add --count 3 for a smaller batch, --theme "..." to steer, --dry-run to print prompts only
//
// Writes:
//   series/out/<slug>/bible.json
//   series/out/<slug>/week-NN/{shorts,clips,posts}.json + README.md (run sheet)
//   series/out/<slug>/made.json      titles already used, so weeks never repeat
//
// Needs ANTHROPIC_API_KEY (or an `ant auth login` profile). Never commit the key.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'claude-opus-5-5';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);
const dryRun = has('dry-run');
const conceptPath = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
if (!conceptPath) {
  console.error('usage: pipeline.mjs <concept.json> (--init | --week N) [--count N] [--theme "..."] [--dry-run]');
  process.exit(1);
}
const concept = JSON.parse(fs.readFileSync(conceptPath, 'utf8'));
for (const k of ['name', 'premise', 'audience', 'promise', 'anchor']) {
  if (!concept[k]) {
    console.error(`concept is missing "${k}"`);
    process.exit(1);
  }
}
const slug = concept.slug || concept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const outDir = path.join(here, 'out', slug);
// A concept can point at a hand-written bible (e.g. one of the examples/) instead of a generated one.
const biblePath = concept.bible ? path.resolve(path.dirname(conceptPath), concept.bible) : path.join(outDir, 'bible.json');
const madePath = path.join(outDir, 'made.json');

function template(name) {
  const raw = fs.readFileSync(path.join(here, 'templates', name), 'utf8');
  const idx = raw.indexOf('\n---\n');
  return idx === -1 ? raw : raw.slice(idx + 5).trim();
}
function fill(text, values) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k) => (values[k] === undefined ? `{{${k}}}` : String(values[k])));
}
const stripFences = (s) => s.replace(/```(?:json)?/gi, '').trim();
const readJson = (p, fallback) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fallback);
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));

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
    max_tokens: 16000,
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

const vars = { tone: 'plain and honest', material: 'none given', earn_tag: '', channel_tag: '', ...concept };

if (has('init')) {
  const bible = await ask(fill(template('00-series-bible.md'), vars), 'bible');
  if (dryRun) process.exit(0);
  fs.mkdirSync(outDir, { recursive: true });
  writeJson(biblePath, bible);
  console.log(`wrote ${path.relative(process.cwd(), biblePath)} — read it, tweak it, then run --week 1`);
  process.exit(0);
}

const week = Number(flag('week'));
if (!week) {
  console.error('pass --init first, then --week N');
  process.exit(1);
}
const bible = readJson(biblePath, null);
if (!bible) {
  console.error(`no bible yet at ${biblePath}; run with --init first`);
  process.exit(1);
}
const made = readJson(madePath, []);
const count = Number(flag('count') ?? 7);

const shorts = await ask(
  fill(template('01-weekly-batch.md'), {
    count,
    week,
    bible_json: JSON.stringify(bible, null, 2),
    made_list: made.length ? made.map((t) => `- ${t}`).join('\n') : '(nothing yet)',
    theme: flag('theme') ?? 'none',
    avoid: flag('avoid') ?? 'nothing in particular',
  }),
  'shorts',
);

const allShots = (shorts?.shorts ?? []).flatMap((s) => s.shots.map((sh) => ({ day: s.day, ...sh })));
const clips = await ask(
  fill(template('02-higgsfield-prompts.md'), {
    anchor_description: bible.anchor?.description ?? concept.anchor,
    anchor_never: bible.anchor?.never ?? '',
    look_json: JSON.stringify(bible.look ?? {}, null, 2),
    shots_json: JSON.stringify(allShots, null, 2),
  }),
  'clips',
);

const posts = await ask(
  fill(template('03-captions.md'), {
    name: bible.name ?? concept.name,
    tagline: bible.tagline ?? '',
    earn_tag: vars.earn_tag || '(none this week)',
    channel_tag: vars.channel_tag,
    shorts_json: JSON.stringify(
      (shorts?.shorts ?? []).map(({ day, title, hook_text, cta, pillar }) => ({ day, title, hook_text, cta, pillar })),
      null,
      2,
    ),
  }),
  'posts',
);

if (dryRun) process.exit(0);

const weekDir = path.join(outDir, `week-${String(week).padStart(2, '0')}`);
fs.mkdirSync(weekDir, { recursive: true });
writeJson(path.join(weekDir, 'shorts.json'), shorts);
writeJson(path.join(weekDir, 'clips.json'), clips);
writeJson(path.join(weekDir, 'posts.json'), posts);
writeJson(madePath, [...made, ...shorts.shorts.map((s) => s.title)]);

const postFor = (day) => posts.posts.find((p) => p.day === day) ?? {};
const lines = [`# ${bible.name} — week ${week}`, '', `Render on Kling std first; re-render day 1 on Seedance for the Earn submission.`, ''];
for (const s of shorts.shorts) {
  const p = postFor(s.day);
  lines.push(`## Day ${s.day} — ${s.title}  (${s.format})`, '', `Hook text: **${s.hook_text}**`, '');
  for (const c of clips.clips.filter((c) => c.day === s.day)) {
    const sh = s.shots.find((x) => x.n === c.n) ?? {};
    lines.push(
      `### Shot ${c.n} — ${c.model}, ${c.duration}s${c.uses_anchor ? ', with anchor reference' : ''}`,
      '',
      c.prompt,
      '',
      `Avoid: ${c.negative}`,
      '',
      `Edit: text "${sh.on_screen_text ?? ''}"${sh.voiceover ? ` · VO: "${sh.voiceover}"` : ''}`,
      '',
    );
  }
  lines.push(`End card: ${s.cta}`, '', `Caption: ${p.caption ?? ''}`, '', `${p.hashtags ?? ''}`, '', `Pin: ${p.pin ?? ''}`, '');
  if (p.earn) lines.push(`Earn: ${p.notes}`, '');
}
fs.writeFileSync(path.join(weekDir, 'README.md'), lines.join('\n'));
console.log(`wrote ${path.relative(process.cwd(), weekDir)}/ (shorts.json, clips.json, posts.json, README.md)`);
