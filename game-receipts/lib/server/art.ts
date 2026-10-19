import fs from "node:fs";
import path from "node:path";

export type ArtName =
  | "hero-wide" | "hero-tall" | "league-nfl" | "league-nba" | "league-nhl" | "league-mlb"
  | "empty-receipt" | "empty-trophy" | "empty-battle" | "empty-bell" | "share-bg";

const cache = new Map<string, string | null>();

/**
 * Public URL for a Higgsfield art asset, or null if it hasn't been fetched yet
 * (`npm run art:fetch`). Callers render nothing when null, so the UI never shows a broken image.
 */
export function art(name: ArtName, ext: "webp" | "png" = "webp"): string | null {
  const key = `${name}.${ext}`;
  if (!cache.has(key) || process.env.NODE_ENV !== "production") {
    cache.set(key, fs.existsSync(path.join(process.cwd(), "public/art", key)) ? `/art/${key}` : null);
  }
  return cache.get(key)!;
}
