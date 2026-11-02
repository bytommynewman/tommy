/**
 * Capture real Oddler gameplay at phone size, 2160x3840 per frame.
 *
 *   node src/capture.mjs            -> frames/
 *   node src/capture.mjs duo        -> frames-duo/ (Daily and Duo)
 *
 * Nothing here is mocked: it drives the live site and screenshots what a player
 * would actually see, so an ad can never show a UI the game does not have.
 */
import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const kit = resolve(here, "..");
const SITE = process.env.ODDLER_SITE || "https://oddler.app";
const ANSWERS = JSON.parse(readFileSync(resolve(here, "answers.json"), "utf8"));
// 432x768 at 5x is exactly 2160x3840 — a 4K vertical master, no upscaling.
const PHONE = { viewport: { width: 432, height: 768 }, deviceScaleFactor: 5 };

const duoMode = process.argv[2] === "duo";
const OUT = resolve(kit, duoMode ? "frames-duo" : "frames");
mkdirSync(OUT, { recursive: true });

let n = 0;
const shot = async (page, label) => {
  const name = `${String(++n).padStart(3, "0")}-${label}.png`;
  await page.screenshot({ path: resolve(OUT, name) });
  console.log("frame", name);
};
const promptOf = async (page) => {
  await page.waitForSelector("#prompt", { timeout: 20000 }).catch(() => {});
  return (await page.locator("#prompt").first().textContent().catch(() => ""))?.trim();
};
const answerOrSkip = async (page, delay = 15) => {
  const a = ANSWERS[await promptOf(page)];
  if (a) {
    const b = page.getByPlaceholder(/uncommon answer/i);
    await b.click(); await b.type(a, { delay }); await b.press("Enter");
  } else {
    await page.locator("a:has-text('Skip this one')").first().click().catch(() => {});
  }
};

const browser = await chromium.launch({ channel: "chrome" });
const fresh = async () => {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(SITE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /got it/i }).click().catch(() => {});
  await page.waitForTimeout(900);
  return { ctx, page };
};

if (!duoMode) {
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  await page.goto(SITE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // the tutorial card is the clearest "how it works" visual the product has
  await shot(page, "howitworks-top");
  await page.evaluate(() => document.querySelector(".panel")?.scrollIntoView({ block: "end" }));
  await page.waitForTimeout(400);
  await shot(page, "howitworks-ladder");
  await page.getByRole("button", { name: /got it/i }).click();
  await page.waitForTimeout(1200);

  await shot(page, "home-top");
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(500);
  await shot(page, "home-modes");
  await page.evaluate(() => window.scrollTo(0, 0));

  await page.getByRole("button", { name: /^go odd$/i }).click();
  await page.waitForTimeout(1500);
  const prompt = await promptOf(page);
  const answer = ANSWERS[prompt] || "Serbia";
  console.log("round 1:", prompt, "->", answer);
  await shot(page, "round-empty");

  // type it out a few characters at a time so the ad has a real typing beat
  const box = page.getByPlaceholder(/uncommon answer/i);
  await box.click();
  for (let i = 0; i < answer.length; i++) {
    await box.type(answer[i], { delay: 0 });
    if (i % 2 === 1 || i === answer.length - 1) await shot(page, `round-typing-${String(i).padStart(2, "0")}`);
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(300);
  await box.press("Enter");
  await page.waitForTimeout(2200);
  await shot(page, "round-reveal");
  await page.evaluate(() => window.scrollTo(0, 260));
  await page.waitForTimeout(400);
  await shot(page, "round-reveal-part");
  await page.evaluate(() => window.scrollTo(0, 0));

  for (let r = 0; r < 6; r++) {
    await page.getByRole("button", { name: /next prompt/i }).click();
    await page.waitForTimeout(1200);
    await answerOrSkip(page, 20);
    await page.waitForTimeout(1800);
    if (r === 2) await shot(page, "round-mid");
  }
  await page.waitForTimeout(1300);
  await shot(page, "run-done");
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(500);
  await shot(page, "run-done-scroll");
  await ctx.close();
} else {
  {
    const { ctx, page } = await fresh();
    await shot(page, "daily-card");
    await page.getByRole("button", { name: /play today's daily/i }).click();
    await page.waitForTimeout(1700);
    await shot(page, "daily-round");
    for (let r = 0; r < 7; r++) {
      await answerOrSkip(page);
      await page.waitForTimeout(1500);
      const next = page.getByRole("button", { name: /next prompt|see results/i });
      if (await next.count()) { await next.first().click(); await page.waitForTimeout(1300); }
    }
    await page.waitForTimeout(1300);
    await shot(page, "daily-results");
    await page.evaluate(() => window.scrollTo(0, 320));
    await page.waitForTimeout(500);
    await shot(page, "daily-grid");
    await ctx.close();
  }
  {
    const host = await fresh();
    await host.page.evaluate(() => window.scrollTo(0, 320));
    await host.page.waitForTimeout(400);
    await host.page.getByRole("button", { name: /^duo$/i }).click();
    await host.page.waitForTimeout(2200);
    await shot(host.page, "duo-host-code");
    const code = await host.page.evaluate(() => new URL(location.href).searchParams.get("room"));
    console.log("duo room:", code);

    const guest = await browser.newContext(PHONE);
    const gp = await guest.newPage();
    await gp.goto(`${SITE}/?room=${code}`, { waitUntil: "networkidle" });
    await gp.waitForTimeout(2500);
    await gp.getByRole("button", { name: /got it/i }).click().catch(() => {});
    await gp.waitForTimeout(1500);
    await shot(gp, "duo-guest-joined");

    await host.page.getByRole("button", { name: /start duo/i }).click();
    await host.page.waitForTimeout(2500);
    await shot(host.page, "duo-host-onclock");
    await shot(gp, "duo-guest-watching");

    const a = ANSWERS[await promptOf(host.page)] || "Serbia";
    const b = host.page.getByPlaceholder(/uncommon answer/i);
    await b.click();
    const split = Math.max(3, a.length - 3);
    await b.type(a.slice(0, split), { delay: 90 });
    await host.page.waitForTimeout(600);
    await shot(gp, "duo-guest-sees-typing");
    await b.type(a.slice(split), { delay: 60 });
    await b.press("Enter");
    await host.page.waitForTimeout(2200);
    await shot(host.page, "duo-host-scored");
    await shot(gp, "duo-guest-scored");
    await guest.close(); await host.ctx.close();
  }
}

await browser.close();
console.log("captured", n, "frames into", OUT);
