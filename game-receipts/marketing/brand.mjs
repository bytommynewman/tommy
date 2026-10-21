// Shared brand overlays for every ad renderer. Generated at the exact pixel size they are composited at
// (never rescaled inside ffmpeg), from the official art in public/brand/.
//   bug(size)      corner emblem bug: rounded, soft drop shadow, ~85% opacity. Returns { file, w, h, pad } (pad = shadow margin).
//   endLogo(size)  full logo (receipt + balls + GAME RECEIPTS wordmark) for end cards, rounded + feathered.
// Placement rules (1080x1920 story/reel): keep out of the top 220 px, bottom 380 px and the right-hand 140 px action rail.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
export const EMBLEM = path.join(root, "public/brand/emblem-192.png");
export const FULL_LOGO = path.join(root, "public/brand/game-receipts-logo.webp");
const DIR = path.join(here, "out/.cache/brand");
fs.mkdirSync(DIR, { recursive: true });

const roundedMask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

/** Emblem bug at `size` px (art only; the PNG is size + 2*pad because of the shadow). */
export async function bug(size = 108, opacity = 0.85) {
  const pad = Math.round(size * 0.16);
  const file = path.join(DIR, `bug-${size}-${Math.round(opacity * 100)}.png`);
  const W = size + 2 * pad;
  if (!fs.existsSync(file)) {
    const art = await sharp(EMBLEM).resize(size, size, { kernel: "lanczos3" }).ensureAlpha()
      .composite([{ input: roundedMask(size, size, Math.round(size * 0.22)), blend: "dest-in" }]).png().toBuffer();
    // 1.5px light rim so the dark emblem separates from dark footage
    const rim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="0.75" y="0.75" width="${size - 1.5}" height="${size - 1.5}" rx="${size * 0.22}" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="1.5"/></svg>`);
    const shadow = await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.55 } } })
      .composite([{ input: roundedMask(size, size, Math.round(size * 0.22)), blend: "dest-in" }]).png().toBuffer();
    const blurred = await sharp({ create: { width: W, height: W, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: shadow, left: pad, top: pad + Math.round(size * 0.05) }]).blur(Math.max(1, size * 0.045)).png().toBuffer();
    const buf = await sharp(blurred).composite([{ input: art, left: pad, top: pad }, { input: rim, left: pad, top: pad }]).png().toBuffer();
    // global opacity
    const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i] * opacity);
    await sharp(data, { raw: info }).png().toFile(file);
  }
  return { file, w: W, h: W, pad };
}

/** Full logo for end cards at `size` px square, rounded corners with a feathered edge (its art sits on near-black). */
export async function endLogo(size = 400) {
  const file = path.join(DIR, `endlogo-${size}.png`);
  if (!fs.existsSync(file)) {
    const r = Math.round(size * 0.14), f = Math.max(2, size * 0.012);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><filter id="b"><feGaussianBlur stdDeviation="${f}"/></filter></defs><rect x="${f * 2}" y="${f * 2}" width="${size - f * 4}" height="${size - f * 4}" rx="${r}" fill="#fff" filter="url(#b)"/></svg>`);
    await sharp(FULL_LOGO).resize(size, size, { kernel: "lanczos3" }).ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }]).png().toFile(file);
  }
  return { file, w: size, h: size };
}
