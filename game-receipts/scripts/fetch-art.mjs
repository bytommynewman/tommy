// Downloads the Higgsfield-generated art listed in scripts/art-manifest.json into public/art/,
// resized and converted for the web (WebP; share-bg also as PNG for the receipt image renderer).
// Usage: npm run art:fetch   (needs normal internet access)
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "scripts/art-manifest.json"), "utf8"));
const out = path.join(root, "public/art");
fs.mkdirSync(out, { recursive: true });

const WIDTH = { "hero-wide": 2000, "hero-tall": 1170, "share-bg": 1080 };

for (const [name, url] of Object.entries(manifest)) {
  if (name.startsWith("_")) continue;
  const res = await fetch(url);
  if (!res.ok) { console.error(`✗ ${name}: HTTP ${res.status}`); process.exitCode = 1; continue; }
  const buf = Buffer.from(await res.arrayBuffer());
  const img = sharp(buf).resize({ width: WIDTH[name] ?? 512, withoutEnlargement: true });
  await img.clone().webp({ quality: name.startsWith("hero") ? 80 : 88 }).toFile(path.join(out, `${name}.webp`));
  if (name === "share-bg") await img.clone().png({ compressionLevel: 9 }).toFile(path.join(out, `${name}.png`));
  console.log(`✓ ${name}`);
}
console.log("Done. Restart `npm run dev` to pick up the new art.");
