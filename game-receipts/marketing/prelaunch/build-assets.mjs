// Regenerates every file in prelaunch/assets from public/ brand art.
// Run: node marketing/prelaunch/build-assets.mjs   (from the game-receipts root)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { bug, endLogo } from '../brand.mjs';
// needs marketing/out/raw (run marketing/capture.mjs first): carousel-*.png stills + spot-2.mp4 footage, captured at 3x native
const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const sharp = require('sharp');
const here = path.dirname(fileURLToPath(import.meta.url));
const pub = path.resolve(here, '../../public');
const out = path.join(here, 'assets');
const RAW = path.resolve(here, '../out/raw');
fs.mkdirSync('/tmp/gr', { recursive: true });
fs.mkdirSync(out, { recursive: true });

const VOLT = '#22e58a', VOLT_B = '#5cffb0', INK = '#050607', INK2 = '#0f1215';
const IMP = "Impact, 'Arial Black', sans-serif", BLK = "'Arial Black', Impact, sans-serif";
const LOGO = path.join(pub, 'brand/game-receipts-logo.webp');
const HERO_T = path.join(pub, 'art/hero-tall.webp');
const HERO_W = path.join(pub, 'art/hero-wide.webp');
const SHARE = path.join(pub, 'art/share-bg.png');

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const shadow = `<filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".85"/></filter>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

// background: cover-fit image, darkened, with a vertical scrim for text legibility
async function bg(src, w, h, { dim = 0.55, pos = 'centre' } = {}) {
  const base = await sharp(src).resize(w, h, { fit: 'cover', position: pos }).modulate({ brightness: dim }).png().toBuffer();
  const scrim = svg(w, h, `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${INK}" stop-opacity=".55"/><stop offset=".45" stop-color="${INK}" stop-opacity=".15"/><stop offset="1" stop-color="${INK}" stop-opacity=".7"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>`);
  return sharp(base).composite([{ input: scrim }]).png().toBuffer();
}
// logo on transparent-ish: lighten blend so its near-black square vanishes into bg
async function logo(size) {
  // feather the edges so the logo's near-black square never shows as a box
  const mask = svg(size, size, `<defs><radialGradient id="m" cx=".5" cy=".5" r=".5"><stop offset=".80" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#m)"/>`);
  return sharp(LOGO).resize(size, size).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
}
const text = (lines, { x, y, size, lh, fill = '#fff', font = IMP, anchor = 'middle', ls = 0, stroke = true }) =>
  lines.map((l, i) => {
    const col = typeof l === 'object' ? l.fill : fill;
    const t = typeof l === 'object' ? l.t : l;
    return `<text x="${x}" y="${y + i * lh}" font-family="${font}" font-size="${size}" fill="${col}" text-anchor="${anchor}" letter-spacing="${ls}" filter="url(#sh)">${t}</text>`;
  }).join('');
const pill = (cx, cy, w, h, label, size) => `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${VOLT}"/><text x="${cx}" y="${cy + size * 0.36}" font-family="${BLK}" font-size="${size}" fill="${INK}" text-anchor="middle" letter-spacing="${size * 0.08}">${label}</text>`;
const fitSize = (lines, max, width = 940) => Math.round(Math.min(max, width / (0.47 * Math.max(...lines.map(l => (typeof l === 'object' ? l.t : l).length)))));
const roundedMask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
const phoneH = (pw) => Math.round((pw * 844) / 390 / 2) * 2;
/** Phone-framed app screenshot (3x native capture, only ever scaled down), cropped to `visibleH` from the top. */
async function phone(srcPng, pw, visibleH) {
  const h = phoneH(pw), b = 12, r = Math.round(pw * 0.11);
  const screen = await sharp(srcPng).resize(pw, h, { kernel: 'lanczos3' }).ensureAlpha().composite([{ input: roundedMask(pw, h, r), blend: 'dest-in' }]).png().toBuffer();
  const W = pw + 2 * b, H = h + 2 * b;
  const bezel = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="1.25" y="1.25" width="${W - 2.5}" height="${H - 2.5}" rx="${r + b}" fill="#0e0e11" stroke="#46464f" stroke-width="2.5"/></svg>`);
  const full = await sharp(bezel).composite([{ input: screen, left: b, top: b }]).png().toBuffer();
  return { buf: await sharp(full).extract({ left: 0, top: 0, width: W, height: Math.min(H, visibleH) }).png().toBuffer(), W };
}
const save = (buf, name) => sharp(buf).png({ compressionLevel: 9 }).toFile(path.join(out, name));

// ---------- 1. avatar ----------
{
  const W = 1080;
  const base = await sharp({ create: { width: W, height: W, channels: 3, background: INK } }).png().toBuffer();
  const glow = svg(W, W, `<defs><radialGradient id="r" cx=".5" cy=".5" r=".55"><stop offset="0" stop-color="${VOLT}" stop-opacity=".28"/><stop offset="1" stop-color="${VOLT}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${W}" fill="url(#r)"/>`);
  const l = await logo(900);
  const buf = await sharp(base).composite([{ input: glow }, { input: l, left: 90, top: 90, }]).png().toBuffer();
  await save(buf, 'avatar-1080.png');
  await sharp(buf).resize(110, 110).toFile('/tmp/gr/avatar-110.png');
}

// ---------- 2. youtube banner 2560x1440, safe area 1546x423 centred ----------
{
  const W = 2560, H = 1440, sx = (W - 1546) / 2, sy = (H - 423) / 2; // 507, 508.5
  const base = await bg(HERO_W, W, H, { dim: 0.7 });
  const l = await logo(400);
  const tx = sx + 400 + 40 + (1546 - 440) / 2; // centre of text column
  const overlay = svg(W, H, `<defs>${shadow}</defs>` +
    text(['CALL IT. LOCK IT.', { t: 'PROVE IT.', fill: VOLT }], { x: tx, y: sy + 118, size: 130, lh: 122, ls: 3 }) +
    pill(tx - 130, sy + 335, 440, 72, 'COMING SOON', 38) +
    `<text x="${tx + 110}" y="${sy + 348}" font-family="${BLK}" font-size="30" fill="#fff" opacity=".9" filter="url(#sh)">FREE TO PLAY</text>`);
  const buf = await sharp(base).composite([
    { input: l, left: Math.round(sx), top: Math.round(sy + 11), },
    { input: overlay }]).png().toBuffer();
  await sharp(buf).png({ palette: true, quality: 92, effort: 10 }).toFile(path.join(out, 'youtube-banner-2560x1440.png'));
}

// ---------- 3. highlight covers 1080x1920 (centre 1080x1080 is what IG shows in the circle) ----------
const icons = {
  Takes: `<path d="M-190 -150h380a40 40 0 0 1 40 40v200a40 40 0 0 1 -40 40h-210l-110 90v-90h-60a40 40 0 0 1 -40 -40v-200a40 40 0 0 1 40 -40z" fill="none" stroke="${VOLT}" stroke-width="26" stroke-linejoin="round"/><path d="M-110 -50h220M-110 30h140" stroke="${VOLT}" stroke-width="26" stroke-linecap="round"/>`,
  Receipts: `<path d="M-140 -210h280v400l-47 -34 -47 34 -46 -34 -47 34 -46 -34 -47 34z" fill="none" stroke="${VOLT}" stroke-width="26" stroke-linejoin="round"/><path d="M-80 -120h160M-80 -50h160M-80 20h90" stroke="${VOLT}" stroke-width="26" stroke-linecap="round"/>`,
  Leaderboard: `<path d="M-210 200v-170h130v170zM-65 200v-310h130v310zM80 200v-110h130v110z" fill="none" stroke="${VOLT}" stroke-width="26" stroke-linejoin="round"/><path d="M0 -190l15 31 34 5 -25 24 6 34 -30 -16 -30 16 6 -34 -25 -24 34 -5z" fill="${VOLT}"/>`,
  Creators: `<path d="M0 -215l55 112 124 18 -90 87 22 123 -111 -58 -111 58 22 -123 -90 -87 124 -18z" fill="none" stroke="${VOLT}" stroke-width="26" stroke-linejoin="round"/>`,
};
for (const [name, g] of Object.entries(icons)) {
  const W = 1080, H = 1920;
  const base = await bg(HERO_T, W, H, { dim: 0.6 });
  const o = svg(W, H, `<defs>${shadow}</defs>
    <circle cx="540" cy="880" r="330" fill="${INK}" fill-opacity=".72" stroke="${VOLT}" stroke-width="8"/>
    <g transform="translate(540 860)" filter="url(#glow)">${g}</g>
    ${text([name.toUpperCase()], { x: 540, y: 1450, size: fitSize([name.toUpperCase()], 170, 880), lh: 0, ls: 4 })}`);
  await save(await sharp(base).composite([{ input: o }]).png().toBuffer(), `highlight-${name.toLowerCase()}-1080x1920.png`);
}

// ---------- 4. teaser posts ----------
const posts = [
  { slug: 'called-it', lines: ['EVERYONE SAYS', 'THEY', { t: 'CALLED IT.', fill: VOLT }], sub: 'Game Receipts proves it.', src: HERO_T, phone: 'carousel-1.png' },
  { slug: 'receipts', lines: ["SOON YOU'LL", 'HAVE THE', { t: 'RECEIPTS.', fill: VOLT }], sub: 'Lock it. Date-stamped. Graded.', src: SHARE, phone: 'carousel-2.png' },
  { slug: 'coming-soon', lines: ['COMING', { t: 'SOON', fill: VOLT }], sub: 'FREE TO PLAY', tag: 'Call it. Lock it. Prove it.', src: HERO_W },
];
for (const p of posts) {
  for (const fmt of [{ n: 'feed-1080x1350', W: 1080, H: 1350, top: 0 }, { n: 'story-1080x1920', W: 1080, H: 1920, top: 1 }]) {
    const { W, H } = fmt;
    const base = await bg(p.src, W, H, { dim: p.src === SHARE ? 0.8 : 0.65, pos: p.src === HERO_W ? 'right' : 'centre' });
    const n = p.lines.length;
    if (p.phone) {
      // phone-frame layout: full logo on top, headline, then the real app (take builder / LOCKED stamp) rising from the bottom
      const story = !!fmt.top;
      const lgS = story ? 260 : 190, lgY = story ? 290 : 36;
      const size = fitSize(p.lines, story ? 150 : 118), lh = size * 1.0;
      const y0 = (story ? 640 : 300) + size * 0.82;
      const subY = y0 + (n - 1) * lh + (story ? 90 : 76);
      const pw = story ? 620 : 500, pTop = story ? 1240 : 760;
      const ph = await phone(path.join(RAW, p.phone), pw, H - pTop);
      const o = svg(W, H, `<defs>${shadow}</defs>` + text(p.lines, { x: W / 2, y: y0, size, lh, ls: 2 }) +
        `<text x="${W / 2}" y="${subY}" font-family="${BLK}" font-size="${story ? 50 : 42}" fill="#fff" text-anchor="middle" filter="url(#sh)">${p.sub}</text>`);
      const lg = await logo(lgS);
      const glow = svg(W, H, `<defs><radialGradient id="g" cx=".5" cy="${(pTop + 400) / H}" r=".5"><stop offset="0" stop-color="${VOLT}" stop-opacity=".30"/><stop offset="1" stop-color="${VOLT}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`);
      const buf = await sharp(base).composite([{ input: glow }, { input: lg, left: Math.round((W - lgS) / 2), top: lgY }, { input: o }, { input: ph.buf, left: Math.round((W - ph.W) / 2), top: pTop }]).png().toBuffer();
      await save(buf, `teaser-${p.slug}-${fmt.n}.png`);
      continue;
    }
    const size = fitSize(p.lines, n === 2 ? 300 : 210), lh = size * 1.0;
    // vertical layout: story keeps top 250 / bottom 380 clear
    const areaTop = fmt.top ? 520 : 330, areaBot = fmt.top ? H - 520 : H - 330;
    const blockH = n * lh + 130 + (p.tag ? 70 : 0);
    const y0 = areaTop + ((areaBot - areaTop) - blockH) / 2 + size * 0.82;
    const subY = y0 + (n - 1) * lh + 110;
    const o = svg(W, H, `<defs>${shadow}</defs>` +
      text(p.lines, { x: W / 2, y: y0, size, lh, ls: 2 }) +
      `<text x="${W / 2}" y="${subY}" font-family="${BLK}" font-size="${p.sub.length > 22 ? 46 : 58}" fill="#fff" text-anchor="middle" filter="url(#sh)">${p.sub}</text>` +
      (p.tag ? `<text x="${W / 2}" y="${subY + 80}" font-family="${IMP}" font-size="52" fill="${VOLT}" text-anchor="middle" letter-spacing="3" filter="url(#sh)">${p.tag.toUpperCase()}</text>` : ''));
    const lg = await logo(fmt.top ? 260 : 220);
    const lTop = fmt.top ? 290 : 60;
    const buf = await sharp(base).composite([{ input: lg, left: Math.round((W - (fmt.top ? 260 : 220)) / 2), top: lTop, }, { input: o }]).png().toBuffer();
    await save(buf, `teaser-${p.slug}-${fmt.n}.png`);
  }
}

// ---------- 5. OG image for waitlist ----------
{
  const W = 1200, H = 630;
  const base = await bg(HERO_W, W, H, { dim: 0.7, pos: 'right' });
  const l = await logo(330);
  const o = svg(W, H, `<defs>${shadow}</defs>` +
    text(['EVERYONE SAYS', 'THEY', { t: 'CALLED IT.', fill: VOLT }], { x: 400, y: 200, size: 100, lh: 96, anchor: 'start', ls: 2 }) +
    `<text x="400" y="450" font-family="${BLK}" font-size="36" fill="#fff" filter="url(#sh)">Game Receipts proves it.</text>` +
    pill(555, 525, 330, 64, 'COMING SOON', 30) +
    `<text x="745" y="535" font-family="${BLK}" font-size="26" fill="#fff" filter="url(#sh)">FREE TO PLAY</text>`);
  const buf = await sharp(base).composite([{ input: l, left: 40, top: 150, }, { input: o }]).png().toBuffer();
  await save(buf, 'og-1200x630.png');
  fs.copyFileSync(path.join(out, 'og-1200x630.png'), path.join(here, 'waitlist/og.png'));
}

// ---------- 6. teaser video (text PNG layers + real app glimpse in a phone frame + ffmpeg) ----------
// 0-2.4 hook 1, 2.4-4.8 hook 2, 4.8-~10.8 real take-builder -> LOCKED footage (spot 2 capture, 1x), then COMING SOON end card.
{
  const W = 1080, H = 1920, tmp = '/tmp/gr/vid';
  fs.mkdirSync(tmp, { recursive: true });
  const layer = async (name, body) => { await sharp(svg(W, H, `<defs>${shadow}</defs>` + body)).png().toFile(`${tmp}/${name}.png`); };
  // app glimpse window from the raw capture: from "Pick a take" to the end of "Place take"
  const meta = JSON.parse(fs.readFileSync(path.join(RAW, 'spot-2.json'), 'utf8'));
  const pickBeat = meta.beats.find((b) => /pick a take/i.test(b.caption)) ?? meta.beats.at(-2);
  const g0 = pickBeat.start, g1 = meta.beats.at(-1).end - 0.3, SPEED = 1.0;
  const GS = 4.8, GD = (g1 - g0) / SPEED, GE = GS + GD, TOTAL = GE + 2.6;
  const r2 = (x) => x.toFixed(2);
  await layer('t1', text(['EVERYONE SAYS', 'THEY', { t: 'CALLED IT.', fill: VOLT }], { x: 540, y: 860, size: fitSize(['EVERYONE SAYS'], 210), lh: 150, ls: 2 }));
  await layer('t2', text(['SOON YOU’LL', 'HAVE THE', { t: 'RECEIPTS.', fill: VOLT }], { x: 540, y: 820, size: 190, lh: 185, ls: 2 }));
  await layer('t3', text(['COMING', { t: 'SOON', fill: VOLT }], { x: 540, y: 1000, size: 250, lh: 235, ls: 2 }) +
    `<text x="540" y="1330" font-family="${BLK}" font-size="58" fill="#fff" text-anchor="middle" filter="url(#sh)">FREE TO PLAY</text>` +
    `<text x="540" y="1420" font-family="${IMP}" font-size="56" fill="${VOLT}" text-anchor="middle" letter-spacing="3" filter="url(#sh)">CALL IT. LOCK IT. PROVE IT.</text>`);
  await layer('cap', text(['Pick a take. Lock it.'], { x: 540, y: 300, size: 76, lh: 0, ls: 1 }));
  const pw = 700, ph = phoneH(pw), pb = 14, py = 416, px = (W - pw) / 2;
  await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw + 2 * pb}" height="${ph + 2 * pb}"><rect x="1.25" y="1.25" width="${pw + 2 * pb - 2.5}" height="${ph + 2 * pb - 2.5}" rx="${Math.round(pw * 0.11) + pb}" fill="#0e0e11" stroke="#46464f" stroke-width="2.5"/></svg>`)).png().toFile(`${tmp}/bezel.png`);
  await sharp(roundedMask(pw, ph, Math.round(pw * 0.11))).png().toFile(`${tmp}/mask.png`);
  const full = await endLogo(300), emb = await bug(108);
  await sharp(await sharp(HERO_T).resize(1296, 2304, { fit: 'cover' }).modulate({ brightness: 0.6 }).png().toBuffer()).png().toFile(`${tmp}/bg.png`);
  const fade = (i, a, b) => `[${i}:v]format=rgba,fade=t=in:st=${r2(a)}:d=0.35:alpha=1,fade=t=out:st=${r2(b - 0.35)}:d=0.35:alpha=1[l${i}]`;
  const fc = [
    `[0:v]zoompan=z='1.0+0.12*on/${Math.round(TOTAL * 30)}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(TOTAL * 30)}:s=1080x1920:fps=30,format=yuv420p[bg]`,
    fade(1, 0.4, 2.4), fade(2, 2.4, GS),
    `[3:v]format=rgba,fade=t=in:st=${r2(GE)}:d=0.35:alpha=1[l3]`,
    `[4:v]format=rgba,fade=t=in:st=${r2(GS + 0.2)}:d=0.35:alpha=1[lcap]`,
    // full logo on the text beats (0-GS) and the end card (GE-); emblem bug beside the phone during the glimpse
    `[5:v]format=rgba,fade=t=in:st=0.1:d=0.5:alpha=1[lg]`,
    `[6:v]format=rgba[bugv]`,
    // footage in a phone frame
    `[7:v]trim=start=${r2(g0)}:end=${r2(g1)},setpts=(PTS-STARTPTS)/${SPEED},fps=30,scale=${pw}:${ph}:flags=lanczos,format=rgba[sc]`,
    `[8:v]format=rgba,alphaextract[ma]`, `[sc][ma]alphamerge[screen]`,
    `[9:v]format=rgba[bz]`, `[bz][screen]overlay=x=${pb}:y=${pb}:format=auto,fade=t=in:st=0:d=0.35:alpha=1,fade=t=out:st=${r2(GD - 0.35)}:d=0.35:alpha=1,setpts=PTS+${r2(GS)}/TB[phone]`,
    `[bg][phone]overlay=x=${px - pb}:y=${py - pb}:format=auto:enable='between(t,${r2(GS)},${r2(GE)})':eof_action=pass[a0]`,
    `[a0][lg]overlay=x=390:y=300:format=auto:enable='lt(t,${r2(GS)})+gte(t,${r2(GE)})'[a1]`,
    `[a1][bugv]overlay=x=${36 - emb.pad}:y=${440 - emb.pad}:format=auto:enable='between(t,${r2(GS)},${r2(GE)})'[a2]`,
    `[a2][lcap]overlay=format=auto[a3]`, `[a3][l1]overlay[b]`, `[b][l2]overlay[c]`, `[c][l3]overlay,format=yuv420p[v]`,
  ].join(';');
  const L = (f) => ['-loop', '1', '-framerate', '30', '-t', r2(TOTAL), '-i', f];
  // the logo layer (input 5) is 300 px: centre it (x=390) on the text beats and the end card
  execFileSync(process.env.HOME + '/.local/node/bin/ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error',
    ...L(`${tmp}/bg.png`), ...L(`${tmp}/t1.png`), ...L(`${tmp}/t2.png`), ...L(`${tmp}/t3.png`), ...L(`${tmp}/cap.png`),
    ...L(full.file), ...L(emb.file),
    '-i', path.join(RAW, 'spot-2.mp4'),
    ...L(`${tmp}/mask.png`), ...L(`${tmp}/bezel.png`),
    '-f', 'lavfi', '-t', r2(TOTAL), '-i', 'anullsrc=r=48000:cl=stereo',
    '-filter_complex', fc.replace('[8:v]', '[8:v]').replace('[9:v]', '[9:v]'), '-map', '[v]', '-map', '10:a', '-t', r2(TOTAL),
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', '17', '-maxrate', '20M', '-bufsize', '40M', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart',
    path.join(out, 'teaser-coming-soon-1080x1920.mp4')]);
  console.log(`teaser video ${TOTAL.toFixed(1)}s, app glimpse ${GD.toFixed(1)}s`);
}
console.log('done');
