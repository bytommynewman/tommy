// Records REAL in-app footage for the two UGC spots (logged in as the demo user) against your OWN server.
// Usage: BASE_URL=http://localhost:3300 node marketing/ugc/capture.mjs <outDir>
// Output is 1236x2196 (3x the 412x732 CSS viewport, native) so finish.mjs only ever scales DOWN to 1080x1920.
// Server: GR_SEED_DEMO=1 SESSION_SECRET=<random> GR_DATA_DIR=<scratch> NODE_ENV=production npx next start -p 3300
import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3300";
const OUT = path.resolve(process.argv[2] ?? "marketing/ugc/raw/footage");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const base = { ...devices["iPhone 14"], viewport: { width: 412, height: 732 } }; // 9:16 so the footage fills the frame
const mk = async (extra = {}) => {
  const ctx = await browser.newContext({ ...base, ...extra });
  await ctx.route(/espncdn\.com/, (r) => r.abort()); // monogram avatars only
  await ctx.addInitScript(() => { try { localStorage.setItem("gr-install-dismissed", "1"); } catch {} });
  return ctx;
};

// login once, reuse the session
const lctx = await mk();
const lp = await lctx.newPage();
await lp.goto(BASE + "/login");
await lp.fill('input[name="email"]', "demo@demo.gamereceipts.dev");
await lp.fill('input[name="password"]', "receipts-demo");
await lp.click('button[type="submit"]');
await lp.waitForURL("**/feed");
const state = await lctx.storageState();
await lctx.close();

const pause = (p, ms) => p.waitForTimeout(ms);
const slowScroll = async (p, y, steps = 12) => { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, y / steps); await pause(p, 60); } };

// Playwright's own video recorder needs its bundled ffmpeg (not installed here), so we grab CDP screencast
// frames with timestamps and stitch them with the system ffmpeg (concat demuxer, real frame durations).
const FFMPEG = process.env.FFMPEG ?? path.join(process.env.HOME, ".local/node/bin/ffmpeg");
async function record(name, fn) {
  const ctx = await mk({ storageState: state });
  const page = await ctx.newPage();
  const dir = `${OUT}/_${name}`;
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  // CDP screencast only delivers ~7 fps here, so grab frames with a tight Page.captureScreenshot loop (~30 fps, 3x native).
  let live = false, grab;
  await page.goto(BASE + "/feed");
  await page.waitForLoadState("networkidle");
  live = true;
  grab = (async () => {
    while (live) {
      const t = Date.now() / 1000;
      try { const r = await Promise.race([cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 92, optimizeForSpeed: true }), new Promise((_, rej) => setTimeout(() => rej(new Error("shot timeout")), 2000))]);
        const file = `${dir}/f${String(frames.length).padStart(5, "0")}.jpg`; fs.writeFileSync(file, Buffer.from(r.data, "base64")); frames.push({ file, t }); } catch {}
    }
  })();
  await pause(page, 500);
  await fn(page);
  await pause(page, 300);
  live = false; await Promise.race([grab, pause(page, 3000)]);
  await ctx.close();
  const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.02, (frames[i + 1]?.t ?? f.t + 0.5) - f.t).toFixed(3)}`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
  fs.writeFileSync(`${dir}/list.txt`, list);
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync(FFMPEG, ["-y", "-f", "concat", "-safe", "0", "-i", `${dir}/list.txt`, "-vf", "scale=1236:2196:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", `${OUT}/${name}.mp4`], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr.slice(-800));
  fs.rmSync(dir, { recursive: true, force: true });
  console.log("recorded", name, frames.length, "frames");
}

async function pickPlayer(page, tab, q, re) {
  await page.goto(BASE + "/create");
  await page.waitForLoadState("networkidle");
  await pause(page, 600);
  await page.getByRole("tab", { name: tab }).click();
  await page.getByLabel(`Search ${tab.source.replace(/\W/g, "")}`).fill(q);
  await pause(page, 700);
  await page.getByRole("button", { name: re }).first().click();
  await page.getByText("Pick a take on").waitFor();
  await pause(page, 900);
}

async function placeAndShow(page, { stampAfter = true } = {}) {
  await page.getByRole("button", { name: "Place take" }).scrollIntoViewIfNeeded();
  await pause(page, 900);
  const title = (await page.getByText("Your take", { exact: true }).locator("xpath=following-sibling::div[1]").innerText()).trim();
  await page.getByRole("button", { name: "Place take" }).click();
  await page.waitForURL(/\/feed\?placed=/);
  await page.getByText("Take placed.").waitFor();
  await pause(page, 1300);
  // open the freshly locked take -> LOCKED stamp / date stamp close-up
  const link = page.locator('a[href^="/p/"]').filter({ hasText: title.slice(0, 20) }).first();
  await link.click();
  await page.waitForURL(/\/p\//);
  await page.waitForLoadState("networkidle");
  await pause(page, 1800);
  await slowScroll(page, 260);
  await pause(page, 1200);
}

const only = process.argv[3];
if (!only || only === "kyle") await record("kyle", async (page) => {
  await pickPlayer(page, /NBA/, "cade", /Cade Cunningham/);
  await slowScroll(page, 220); await pause(page, 900); await slowScroll(page, 220); await pause(page, 600);
  await placeAndShow(page);
  await page.goto(BASE + "/feed?tab=trending"); await page.waitForLoadState("networkidle"); await pause(page, 1500);
  await slowScroll(page, 300); await pause(page, 900);
  await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); await pause(page, 2200);
  await slowScroll(page, 200); await pause(page, 900);
});

if (!only || only === "mvp") await record("mvp", async (page) => {
  await pickPlayer(page, /NBA/, "wemb", /Wembanyama/);
  await page.locator("select").first().selectOption({ label: "Wins an award — Hardware at the end of the year." });
  await pause(page, 1000);
  await slowScroll(page, 200); await pause(page, 700);
  // award = MVP, finish = "Wins it" (explicit so the dropdowns are seen being set)
  const award = page.locator("select").nth(1);
  await award.scrollIntoViewIfNeeded(); await pause(page, 600);
  await award.selectOption({ label: "NBA MVP" }); await pause(page, 900);
  await page.locator("select").nth(2).selectOption({ label: "Runner-up (2nd)" }); await pause(page, 900);
  await page.locator("select").nth(2).selectOption({ label: "Wins it" }); await pause(page, 1000);
  await placeAndShow(page);
  await page.goto(BASE + "/feed?tab=trending"); await page.waitForLoadState("networkidle"); await pause(page, 1500);
  await slowScroll(page, 300); await pause(page, 700);
  await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); await pause(page, 2200);
  await slowScroll(page, 200); await pause(page, 900);
});
await browser.close();
