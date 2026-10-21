// Records the app flows for the Format A (speedrun) and Format B (POV) reel spots.
// Prereq: `npm run build` already done. Usage: node marketing/reels/capture-reels.mjs [A1 A2 B1]
// Starts its OWN production server on port 3400 (scratch data dir, random SESSION_SECRET) and kills only that PID.
// Output: marketing/reels/out/raw/<id>.mp4 (A1/A2 2184x4726 = 5.6x, B1 1950x4220 = 5x native, 30fps CFR) + <id>.json (marks, focus keyframes, duration).
// Playwright's recordVideo needs a bundled ffmpeg we don't have, so we use the CDP screencast like marketing/capture.mjs.
import { chromium, devices } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as lib from "../capture-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const appRoot = process.env.GR_APP_ROOT ?? root;
const RAW = path.join(here, "out/raw");
fs.mkdirSync(RAW, { recursive: true });
const only = process.argv.slice(2);
const PORT = Number(process.env.REELS_PORT ?? 3400);
const BASE = `http://localhost:${PORT}`;
const { CHROME, DSF, sleep } = lib;
const VIEW = { width: 390, height: 844 };
// Format A shows the app full-bleed across the 2160 px frame, so A1/A2 are captured at DSF 5.6 (2184x4726) and only ever scaled down;
// Format B (phone in a desk scene) uses DSF 5 (1950x4220).
const DSF_BY = { A1: 5.6, A2: 5.6, B1: DSF };
const CTX = { ...devices["iPhone 14"], viewport: VIEW, deviceScaleFactor: DSF };

let server;
const startServer = async () => { server = await lib.startServer(appRoot, PORT, "reels"); };
const stopServer = () => server?.stop();

// Legal: all remote requests (ESPN headshots/logos) are aborted so avatars render as monograms.
const isLocal = (u) => { try { const h = new URL(u).hostname; return h === "localhost" || h === "127.0.0.1"; } catch { return true; } };
const initScript = () => {
  try { localStorage.setItem("gr-install-dismissed", "1"); } catch {}
  // re-trigger blocked <img>s after hydration so the app's own monogram fallback renders
  setInterval(() => {
    document.querySelectorAll("img").forEach((i) => {
      if (i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")) {
        const n = Number(i.dataset.grr || 0);
        if (n >= 3 || Date.now() - Number(i.dataset.grt || 0) < 400) return;
        i.dataset.grr = String(n + 1); i.dataset.grt = String(Date.now());
        const s = i.src.replace(/[?&]_r=\d+$/, "");
        i.src = s + (s.includes("?") ? "&" : "?") + "_r=" + (n + 1);
      }
    });
  }, 600);
};

async function startScreencast(page, dsf) {
  const dir = path.join(os.tmpdir(), `gr-reel-frames-${process.pid}`);
  const grab = await lib.startGrab(page, { view: VIEW, dir, dsf });
  const finish = async (endMs, dest) => {
    const frames = await grab.stop();
    const r = lib.encodeFrames(frames, { t0: grab.t0, endMs, dest, dir });
    console.log(`  grab ${r.grabFps.toFixed(1)} fps (p95 gap ${(r.p95gap * 1000).toFixed(0)} ms, ${(r.slowShare * 100).toFixed(0)}% of gaps >50 ms)`);
    return r.frames;
  };
  return { vt0: grab.t0, finish };
}

const login = (browser) => lib.login(browser, BASE, CTX);

const nameRe = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
const selectFor = (page, label) => page.locator("label").filter({ has: page.locator("span", { hasText: nameRe(label) }) }).locator("select").first();
async function smoothScroll(page, { to, by, ms = 1200 }) {
  await page.evaluate(({ to, by, ms }) => new Promise((res) => {
    const y0 = window.scrollY, y1 = to ?? y0 + by, t0 = performance.now();
    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    const f = (t) => { const p = Math.min(1, (t - t0) / ms); window.scrollTo(0, y0 + (y1 - y0) * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), { to, by, ms });
}

// ---- one recorded spot ---------------------------------------------------------------------------------------
// Each flow runs on a deliberate clock: at(t) waits until t seconds into the clip, mark(name) stores a timestamp
// the renderer uses for captions/stopwatch, focus() stores where the action is (viewport y, 0..1) so Format A can pan.
const FLOWS = {
  // A1: NBA → search player → Wins an award → MVP → Wins it → Place take (stopwatch ≈ 9 s) → feed stamp → leaderboards
  async A1({ page, at, mark, focus, act }) {
    mark("s1", 0);
    await at(0.5); await focus(page.getByRole("tab", { name: /NBA/ })); await page.getByRole("tab", { name: /NBA/ }).click();
    mark("s2", await at(1.2)); await focus(page.getByLabel("Search NBA"));
    await page.getByLabel("Search NBA").click(); await page.getByLabel("Search NBA").pressSequentially("wemban", { delay: 50 });
    await page.waitForLoadState("networkidle");
    await at(2.3); await focus(page.locator("ul button", { hasText: /Victor Wembanyama/ }).first());
    await page.locator("ul button", { hasText: /Victor Wembanyama/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    mark("s3", await at(3.1)); await act.select("Pick a take on", "Wins an award");
    await at(4.0); await act.select("Award", "NBA MVP");
    await at(4.9); await act.select("Finish", "Wins it");
    const btn = page.getByRole("button", { name: "Place take" });
    await at(5.6); await btn.scrollIntoViewIfNeeded(); await focus(btn);
    mark("s4", await at(6.1)); mark("place"); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    await focus(page.locator("time").first(), 0.35);
    const tp = await at(clockOf() + 2.0); mark("board", tp);
    await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); await focus(null, 0.3);
    await sleep(300); await smoothScroll(page, { by: 300, ms: 1000 }); await sleep(900);
    await at(clockOf() + 0.2);
  },
  // A2: NHL → team → Playoff run → stage → Place take (≈ 8 s) → feed → resolved "Cashed" receipt + Prestige
  async A2({ page, at, mark, focus, act, receiptUrl }) {
    mark("s1", 0);
    await at(0.5); await focus(page.getByRole("tab", { name: /NHL/ })); await page.getByRole("tab", { name: /NHL/ }).click();
    await at(1.1); await focus(page.getByLabel("Search NHL"));
    await page.getByLabel("Search NHL").click(); await page.getByLabel("Search NHL").pressSequentially("bruins", { delay: 50 });
    await page.waitForLoadState("networkidle");
    await at(2.0); await focus(page.locator("ul button", { hasText: /Boston Bruins/ }).first());
    await page.locator("ul button", { hasText: /Boston Bruins/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    await at(2.8); await act.select("Pick a take on", "Playoff run");
    mark("s2", await at(3.8)); await act.select("How far", "Win the Stanley Cup");
    const btn = page.getByRole("button", { name: "Place take" });
    await at(4.8); await btn.scrollIntoViewIfNeeded(); await focus(btn);
    mark("s3", await at(5.4)); mark("place"); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    await focus(page.locator("time").first(), 0.35);
    mark("s4", await at(clockOf() + 1.8));
    await page.goto(receiptUrl); await page.waitForLoadState("networkidle"); await focus(null, 0.1);
    await sleep(1300);
    const pres = page.getByText("Prestige", { exact: true }).first();
    const y = await pres.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await focus(null, 0.27);
    await smoothScroll(page, { to: Math.max(0, y - 260), ms: 1000 }); await sleep(1500);
    await at(clockOf() + 0.2);
  },
  // B1: slower, take-builder flow with room for one caption at a time
  async B1({ page, at, mark, focus, act }) {
    mark("hook", 0);
    await at(1.8); mark("player"); await page.getByRole("tab", { name: /NBA/ }).click();
    await at(2.4); await page.getByLabel("Search NBA").click(); await page.getByLabel("Search NBA").pressSequentially("jokic", { delay: 60 });
    await page.waitForLoadState("networkidle");
    await at(3.4); await page.locator("ul button", { hasText: /Jokić|Jokic/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    mark("take", await at(3.8)); await act.select("Pick a take on", "Wins an award", false);
    await at(4.7); await act.select("Award", "NBA MVP", false);
    await at(5.5); await act.select("Finish", "Wins it", false);
    const btn = page.getByRole("button", { name: "Place take" });
    await at(6.1); await btn.scrollIntoViewIfNeeded();
    mark("place", await at(6.6)); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    mark("stamp"); const tg = clockOf() + 1.8; mark("graded", await at(tg));
    mark("board", await at(tg + 1.7));
    await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle");
    await sleep(400); await smoothScroll(page, { by: 280, ms: 1200 }); await sleep(1200);
    await at(clockOf() + 0.2);
  },
};
let clockOf; // set per recording: current clip time

async function recordSpot(browser, state, id, receiptUrl) {
  const ctx = await browser.newContext({ ...CTX, deviceScaleFactor: DSF_BY[id], storageState: state });
  await ctx.addInitScript(initScript); await ctx.addInitScript(lib.demoGuardScript);
  await ctx.route("**/*", (r) => (isLocal(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/create"); await page.waitForLoadState("networkidle"); await sleep(500);
  const sc = await startScreencast(page, DSF_BY[id]);
  const now = () => (Date.now() - sc.vt0) / 1000;
  clockOf = now;
  const marks = {}, focusKeys = [];
  const mark = (n, t) => { marks[n] = t ?? now(); return marks[n]; };
  const at = async (t) => { const d = t - now(); if (d > 0) await sleep(d * 1000); return now(); };
  const focus = async (loc, y) => {
    let fy = y;
    if (loc) { const bb = await loc.boundingBox(); if (bb) fy = (bb.y + bb.height / 2) / VIEW.height; }
    focusKeys.push({ t: now(), y: fy ?? 0.3 });
  };
  const act = { select: async (label, option, doFocus = true) => {
    const sel = selectFor(page, label);
    await sel.scrollIntoViewIfNeeded();
    if (doFocus) await focus(sel);
    const val = await sel.evaluate((s, opt) => [...s.options].find((o) => o.text.toLowerCase().includes(opt.toLowerCase()))?.value, option);
    if (val === undefined) throw new Error(`no option "${option}" in ${label}`);
    await sel.focus(); await sel.selectOption(val); await sleep(150);
  } };
  await FLOWS[id]({ page, at, mark, focus, act, receiptUrl });
  await sleep(200);
  await lib.assertNoDemo(page, `reel ${id}`);
  const dur = now();
  const n = await sc.finish(dur * 1000, path.join(RAW, `${id}.mp4`));
  await ctx.close();
  fs.writeFileSync(path.join(RAW, `${id}.json`), JSON.stringify({ id, duration: dur, marks, focus: focusKeys, errors }, null, 1));
  console.log(`${id}: ${dur.toFixed(1)}s (${n} frames) place@${marks.place?.toFixed(1)}s marks=${JSON.stringify(Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, +v.toFixed(1)])))}${errors.length ? " ERRORS " + errors.join("; ") : ""}`);
}

const browser = await chromium.launch({ executablePath: CHROME });
try {
  await startServer();
  const state = await login(browser);
  // a resolved "Cashed" receipt with Prestige: top of the calls leaderboard
  const lctx = await browser.newContext({ ...CTX, storageState: state });
  const lp = await lctx.newPage();
  await lp.goto(BASE + "/leaderboards?board=calls"); await lp.waitForLoadState("networkidle");
  const href = await lp.locator('a[href^="/r/"]').first().getAttribute("href");
  await lctx.close();
  const receiptUrl = BASE + href.replace("/r/", "/p/");
  console.log("cashed receipt:", receiptUrl);
  for (const id of Object.keys(FLOWS)) if (!only.length || only.includes(id)) await recordSpot(browser, state, id, receiptUrl);
} finally {
  await browser.close();
  stopServer();
}
