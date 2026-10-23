// Records REAL in-app footage for the two UGC spots (logged in as "Jordan" / @jordan_calls, no demo wording) against your OWN server.
// Usage: GR_APP_ROOT=<scratch checkout built with GR_MARKETING_CAPTURE=1> node marketing/ugc/capture.mjs <outDir> [kyle|mvp]
// Starts its own production server on :3300 (scratch data dir) and stops only that process.
// Output is 2060x3660 (5x the 412x732 CSS viewport, native) so finish.mjs only ever scales DOWN into the 2160x3840 frame.
import { chromium, devices } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as lib from "../capture-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = process.env.GR_APP_ROOT ?? path.resolve(here, "../..");
const PORT = Number(process.env.UGC_PORT ?? 3300);
const BASE = `http://localhost:${PORT}`;
const OUT = path.resolve(process.argv[2] ?? "marketing/ugc/raw/footage");
const { CHROME, DSF } = lib;
const server = await lib.startServer(appRoot, PORT, "ugc");
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
const VIEW = { width: 412, height: 732 }; // 9:16 so the footage fills the frame
const base = { ...devices["iPhone 14"], viewport: VIEW, deviceScaleFactor: DSF };
// ESPN headshots are blocked by default (monogram avatars). A spot opts in with allowHeadshots (ESPN images are unlicensed: swap before paid ads).
const SPOT_OPTS = { kyle: { allowHeadshots: false }, mvp: { allowHeadshots: true } };
let allowHeadshots = false;
const mk = async (extra = {}) => {
  const ctx = await browser.newContext({ ...base, ...extra });
  if (!allowHeadshots) await ctx.route(/espncdn\.com/, (r) => r.abort()); // monogram avatars only
  await ctx.addInitScript(() => { try { localStorage.setItem("gr-install-dismissed", "1"); } catch {} });
  await ctx.addInitScript(lib.demoGuardScript);
  return ctx;
};

// login once, reuse the session
const state = await lib.login(browser, BASE, base);

let T0 = 0; const marks = {};
const mk_ = (n) => { marks[n] = +((Date.now() - T0) / 1000).toFixed(2); };
const pause = (p, ms) => p.waitForTimeout(ms);
void os;
const slowScroll = async (p, y, steps = 12) => { for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, y / steps); await pause(p, 45); } };

// Frames come from the shared Page.captureScreenshot loop (capture-lib.mjs, device-metrics override, DSF 5) and are stitched to a 30 fps clip.
async function record(name, fn) {
  allowHeadshots = !!SPOT_OPTS[name]?.allowHeadshots;
  const ctx = await mk({ storageState: state });
  const page = await ctx.newPage();
  const dir = `${OUT}/_${name}`;
  await page.goto(BASE + "/feed");
  await page.waitForLoadState("networkidle");
  const grab = await lib.startGrab(page, { view: VIEW, dir });
  T0 = grab.t0; for (const k of Object.keys(marks)) delete marks[k];
  await pause(page, 300);
  await fn(page);
  await pause(page, 200);
  const endMs = Date.now() - grab.t0;
  const frames = await grab.stop();
  await lib.assertNoDemo(page, `ugc ${name}`);
  await ctx.close();
  const r = lib.encodeFrames(frames, { t0: grab.t0, endMs, dest: `${OUT}/${name}.mp4`, dir });
  console.log(`  marks ${name}: ${JSON.stringify(marks)}`);
  console.log(`recorded ${name}: ${r.frames} frames, ${r.grabFps.toFixed(1)} fps grabbed (p95 gap ${(r.p95gap * 1000).toFixed(0)} ms)`);
}

async function pickPlayer(page, tab, q, re) {
  await page.goto(BASE + "/create");
  await page.waitForLoadState("networkidle");
  await pause(page, 350);
  mk_("create");
  await page.getByRole("tab", { name: tab }).click();
  await page.getByLabel(`Search ${tab.source.replace(/\W/g, "")}`).fill(q);
  await pause(page, 400);
  await page.getByRole("button", { name: re }).first().click();
  await page.getByText("Pick a take on").waitFor();
  mk_("picked");
  await pause(page, 500);
}

async function placeAndShow(page, { stampAfter = true } = {}) {
  await page.getByRole("button", { name: "Place take" }).scrollIntoViewIfNeeded();
  await pause(page, 450); mk_("preplace");
  const title = (await page.getByText("Your take", { exact: true }).locator("xpath=following-sibling::div[1]").innerText()).trim();
  await page.getByRole("button", { name: "Place take" }).click();
  await page.waitForURL(/\/feed\?placed=/);
  await page.getByText("Take placed.").waitFor(); mk_("placed");
  await pause(page, 700);
  // open the freshly locked take -> LOCKED stamp / date stamp close-up
  const link = page.locator('a[href^="/p/"]').filter({ hasText: title.slice(0, 20) }).first();
  await link.click();
  await page.waitForURL(/\/p\//);
  await page.waitForLoadState("networkidle");
  mk_("stamp"); await pause(page, 1100);
  await slowScroll(page, 260, 8);
  await pause(page, 600);
}

const only = process.argv[3];
if (!only || only === "kyle") await record("kyle", async (page) => {
  await pickPlayer(page, /NBA/, "cade", /Cade Cunningham/);
  await slowScroll(page, 220, 8); await pause(page, 450); await slowScroll(page, 220, 8); await pause(page, 300);
  await placeAndShow(page);
  await page.goto(BASE + "/feed?tab=trending"); await page.waitForLoadState("networkidle"); mk_("trending"); await pause(page, 800);
  await slowScroll(page, 300, 8); await pause(page, 450);
  await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); mk_("board"); await pause(page, 1200);
  await slowScroll(page, 200, 8); await pause(page, 500);
});

if (!only || only === "mvp") await record("mvp", async (page) => {
  await pickPlayer(page, /NBA/, "wemb", /Wembanyama/);
  await page.locator("select").first().selectOption({ label: "Wins an award — Hardware at the end of the year." });
  mk_("award0"); await pause(page, 500);
  await slowScroll(page, 200, 8); await pause(page, 350);
  // award = MVP, finish = "Wins it" (explicit so the dropdowns are seen being set)
  const award = page.locator("select").nth(1);
  await award.scrollIntoViewIfNeeded(); await pause(page, 350);
  await award.selectOption({ label: "NBA MVP" }); mk_("mvp"); await pause(page, 550);
  await page.locator("select").nth(2).selectOption({ label: "Runner-up (2nd)" }); await pause(page, 550);
  await page.locator("select").nth(2).selectOption({ label: "Wins it" }); mk_("winsit"); await pause(page, 600);
  await placeAndShow(page);
  await page.goto(BASE + "/feed?tab=trending"); await page.waitForLoadState("networkidle"); mk_("trending"); await pause(page, 800);
  await slowScroll(page, 300, 8); await pause(page, 400);
  await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); mk_("board"); await pause(page, 1200);
  await slowScroll(page, 200, 8); await pause(page, 500);
});
await browser.close();
server.stop();
