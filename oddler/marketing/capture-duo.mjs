/**
 * Capture a Duo game actually being played, both phones, every beat.
 *
 * Frames are clipped to the game panel rather than the whole phone: stacked
 * two-up in a vertical ad, panels fill the frame where whole phones leave half
 * of it empty. Each beat writes <nn>-<label>-host.png and -guest.png.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = resolve(here, "..");
const SITE = process.env.ODDLER_SITE || "https://oddler.app";
const ANSWERS = JSON.parse(readFileSync(resolve(here, "answers.json"), "utf8"));
const PHONE = { viewport: { width: 432, height: 820 }, deviceScaleFactor: 5 };
const OUT = resolve(kit, "frames-duo2");
mkdirSync(OUT, { recursive: true });

let n = 0;
/** Screenshot both phones, clipped to the panel each is showing. */
async function beat(label, host, guest) {
  n += 1;
  for (const [who, page] of [["host", host], ["guest", guest]]) {
    const box = await page.evaluate(() => {
      const p = document.querySelector(".panel");
      if (!p) return null;
      const r = p.getBoundingClientRect();
      return { x: Math.max(0, r.x - 10), y: Math.max(0, r.y - 10), width: r.width + 20, height: r.height + 20 };
    });
    const name = `${String(n).padStart(2, "0")}-${label}-${who}.png`;
    await page.screenshot({ path: resolve(OUT, name), clip: box ?? undefined });
  }
  console.log("beat", String(n).padStart(2, "0"), label);
}

const promptOf = async (page) => {
  await page.waitForSelector("#prompt", { timeout: 20000 }).catch(() => {});
  return (await page.locator("#prompt").first().textContent().catch(() => ""))?.trim();
};
/** Whichever phone has the answer box is the one on the clock. */
const onClock = async (host, guest) =>
  (await host.getByPlaceholder(/uncommon answer/i).count()) ? [host, guest] : [guest, host];

const browser = await chromium.launch({ channel: "chrome" });
const open = async (url) => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(1400);
  await page.getByRole("button", { name: /got it/i }).click().catch(() => {});
  await page.waitForTimeout(800);
  return { ctx, page };
};

const h = await open(SITE + "/");
await h.page.evaluate(() => window.scrollTo(0, 320));
await h.page.waitForTimeout(400);
await h.page.getByRole("button", { name: /^duo$/i }).click();
await h.page.waitForTimeout(2200);
const code = await h.page.evaluate(() => new URL(location.href).searchParams.get("room"));
console.log("room:", code);

const g = await open(`${SITE}/?room=${code}`);
await h.page.waitForTimeout(1500);
await beat("lobby", h.page, g.page);

await h.page.getByRole("button", { name: /start duo/i }).click();
await h.page.waitForTimeout(2600);

// Play it out. Each round: whoever is on the clock types, the other watches it
// land, then both move on — so every frame has both players in it.
for (let round = 1; round <= 5; round++) {
  const [acting, watching] = await onClock(h.page, g.page);
  const who = acting === h.page ? "host" : "guest";
  const answer = ANSWERS[await promptOf(acting)];
  if (round <= 3) await beat(`r${round}-onclock-${who}`, h.page, g.page);

  if (answer) {
    const box = acting.getByPlaceholder(/uncommon answer/i);
    await box.click();
    const split = Math.max(3, answer.length - 4);
    await box.type(answer.slice(0, split), { delay: 85 });
    await acting.waitForTimeout(500);
    if (round <= 2) await beat(`r${round}-typing-${who}`, h.page, g.page);  // partner sees it live
    await box.type(answer.slice(split), { delay: 60 });
    await box.press("Enter");
  } else {
    await acting.locator("a:has-text('Skip this one')").first().click().catch(() => {});
  }
  await h.page.waitForTimeout(2200);
  await beat(`r${round}-scored-${who}`, h.page, g.page);

  const next = watching.getByRole("button", { name: /next prompt/i });
  if (await next.count()) await next.first().click();
  else await acting.getByRole("button", { name: /next prompt/i }).first().click().catch(() => {});
  await h.page.waitForTimeout(1900);
}

await beat("mid-game", h.page, g.page);
await browser.close();
console.log("captured", n, "beats into", OUT);
