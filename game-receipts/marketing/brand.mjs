// Shared brand overlays for every ad renderer. Generated at the exact pixel size they are composited at
// (never rescaled inside ffmpeg), from the official art in public/brand/.
//   bug(size)      corner emblem bug: rounded, soft drop shadow, ~85% opacity. Returns { file, w, h, pad } (pad = shadow margin).
//   endLogo(size)  full logo (receipt + balls + GAME RECEIPTS wordmark) for end cards, rounded + feathered.
// Placement rules (2160x3840 story/reel, i.e. 2x the old 1080x1920 numbers): keep out of the top 440 px, bottom 760 px (840 for IG)
// and the right-hand 300 px action rail. Everything is generated at native 4K size (never rescaled inside ffmpeg).
// The emblem is cut from the 1254 px full logo (crop 300,70,560x560 = the receipt+balls art of public/brand/emblem-192.png), so a
// bug up to 560 px is native; the end-card logo is rendered from the 1254 px master (keep end logos <= 1254 px: never upscaled).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
export const FULL_LOGO = path.join(root, "public/brand/game-receipts-logo.webp"); // 1254x1254 master
export const EMBLEM_CROP = { left: 300, top: 70, width: 560, height: 560 };
const DIR = path.join(here, "out/.cache/brand");
fs.mkdirSync(DIR, { recursive: true });

const roundedMask = (w, h, r) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);

/** Emblem bug at `size` px (art only; the PNG is size + 2*pad because of the shadow). */
export async function bug(size = 216, opacity = 0.85) {
  if (size > EMBLEM_CROP.width) throw new Error(`bug(${size}) would upscale the 560 px emblem`);
  const pad = Math.round(size * 0.16);
  const file = path.join(DIR, `bug4k-${size}-${Math.round(opacity * 100)}.png`);
  const W = size + 2 * pad;
  if (!fs.existsSync(file)) {
    const art = await sharp(FULL_LOGO).extract(EMBLEM_CROP).resize(size, size, { kernel: "lanczos3" }).ensureAlpha()
      .composite([{ input: roundedMask(size, size, Math.round(size * 0.22)), blend: "dest-in" }]).png().toBuffer();
    // light rim (0.7% of the size) so the dark emblem separates from dark footage
    const rw = Math.max(1.5, size * 0.014);
    const rim = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect x="${rw / 2}" y="${rw / 2}" width="${size - rw}" height="${size - rw}" rx="${size * 0.22}" fill="none" stroke="#ffffff" stroke-opacity=".45" stroke-width="${rw}"/></svg>`);
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
export async function endLogo(size = 800) {
  if (size > 1254) throw new Error(`endLogo(${size}) would upscale the 1254 px logo`);
  const file = path.join(DIR, `endlogo4k-${size}.png`);
  if (!fs.existsSync(file)) {
    const r = Math.round(size * 0.14), f = Math.max(2, size * 0.012);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><defs><filter id="b"><feGaussianBlur stdDeviation="${f}"/></filter></defs><rect x="${f * 2}" y="${f * 2}" width="${size - f * 4}" height="${size - f * 4}" rx="${r}" fill="#fff" filter="url(#b)"/></svg>`);
    await sharp(FULL_LOGO).resize(size, size, { kernel: "lanczos3" }).ensureAlpha()
      .composite([{ input: mask, blend: "dest-in" }]).png().toFile(file);
  }
  return { file, w: size, h: size };
}
