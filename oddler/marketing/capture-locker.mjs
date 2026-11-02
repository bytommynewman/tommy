/**
 * Capture a scroll through the locker — every slot and everything in it, locked
 * and unlocked — as a frame sequence that plays back as a real scroll.
 */
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const kit = resolve(here, "..");
const SITE = process.env.ODDLER_SITE || "https://oddler.app";
const OUT = resolve(kit, "frames-locker");
mkdirSync(OUT, { recursive: true });
const FRAMES = 46;          // at 15fps that is a ~3s scroll

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 5 });
const page = await ctx.newPage();
await page.goto(SITE + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.getByRole("button", { name: /got it/i }).click().catch(() => {});
await page.waitForTimeout(900);

await page.getByRole("button", { name: /open locker/i }).first().click();
await page.waitForTimeout(2500);
// let every part sprite decode before the scroll starts, or the first frames
// show empty tiles
await page.evaluate(async () => {
  await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => {}))));
});
await page.waitForTimeout(800);

const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
console.log("locker is", max, "px of scroll");
for (let i = 0; i < FRAMES; i++) {
  // ease in and out so the scroll does not start or stop abruptly
  const t = i / (FRAMES - 1);
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(eased * max));
  await page.waitForTimeout(90);
  await page.screenshot({ path: resolve(OUT, `scroll-${String(i).padStart(3, "0")}.png`) });
}
console.log("captured", FRAMES, "frames into", OUT);
await browser.close();
