// Pull the game's own files from oddler/app into this deploy tree, and the art from the live site.
import { cp, mkdir, writeFile, access } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const here = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const game = resolve(here, "../app");
await mkdir(resolve(here, "public/art"), { recursive: true });
for (const f of ["logic.js", "profile.ts", "worker.ts"]) await cp(resolve(game, f), resolve(here, "src", f));
for (const f of ["client.js", "index.html", "anchors.js"]) await cp(resolve(game, f), resolve(here, "public", f));
const LIVE = process.env.ODDLER_ART_ORIGIN || "https://oddler.higgsfield.app";
const names = ["axo-base", "axo-max", "col-char", "col-lav", "col-mint", "col-sand", "col-slate", "bg-grotto", "cover", "favicon", "logo", "og",
  ...Array.from({ length: 16 }, (_, i) => `acc-${String(i).padStart(2, "0")}`),
  ...Array.from({ length: 16 }, (_, i) => `horn-${String(i).padStart(2, "0")}`),
  ...Array.from({ length: 16 }, (_, i) => `wing-${String(i).padStart(2, "0")}`)];
for (const n of names) {
  const out = resolve(here, "public/art", `${n}.png`);
  try { await access(out); continue; } catch { /* fetch it */ }
  const r = await fetch(`${LIVE}/art/${n}.png`);
  if (!r.ok) { console.warn("missing art", n); continue; }
  await writeFile(out, Buffer.from(await r.arrayBuffer()));
}
console.log("assembled");
