// Records the app flows for the Format A (speedrun) and Format B (POV) reel spots.
// Prereq: `npm run build` already done. Usage: node marketing/reels/capture-reels.mjs [A1 A2 B1]
// Starts its OWN production server on port 3400 (scratch data dir, random SESSION_SECRET) and kills only that PID.
// Output: marketing/reels/out/raw/<id>.mp4 (780x1688, 30fps) + <id>.json (marks, focus keyframes, duration).
// Playwright's recordVideo needs a bundled ffmpeg we don't have, so we use the CDP screencast like marketing/capture.mjs.
import { chromium, devices } from "playwright";
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const RAW = path.join(here, "out/raw");
fs.mkdirSync(RAW, { recursive: true });
const only = process.argv.slice(2);
const PORT = Number(process.env.REELS_PORT ?? 3400);
const BASE = `http://localhost:${PORT}`;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
const VIEW = { width: 390, height: 844 };
const VIDEO = { width: 780, height: 1688 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let server;
async function startServer() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "gr-reels-"));
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "-p", String(PORT)], {
    cwd: root, stdio: "ignore",
    env: { ...process.env, GR_SEED_DEMO: "1", GR_DATA_DIR: dataDir, SESSION_SECRET: crypto.randomBytes(24).toString("hex"), NODE_ENV: "production" },
  });
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(BASE + "/login")).ok) return; } catch {}
    await sleep(250);
  }
  throw new Error("server did not start (run `npm run build` first)");
}
const stopServer = () => { try { server?.kill("SIGTERM"); } catch {} };
process.on("exit", stopServer);

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

async function startScreencast(page) {
  const cdp = await page.context().newCDPSession(page);
  const frames = [];
  cdp.on("Page.screencastFrame", (f) => {
    frames.push({ ts: f.metadata.timestamp, data: f.data });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  const vt0 = Date.now();
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 95, maxWidth: VIDEO.width, maxHeight: VIDEO.height, everyNthFrame: 1 });
  const finish = async (endMs, dest) => {
    await cdp.send("Page.stopScreencast").catch(() => {});
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gr-frames-"));
    let list = "ffconcat version 1.0\n";
    const end = endMs / 1000;
    frames.forEach((f, i) => {
      const file = path.join(dir, `f${String(i).padStart(6, "0")}.jpg`);
      fs.writeFileSync(file, Buffer.from(f.data, "base64"));
      const t0 = Math.max(0, f.ts - vt0 / 1000);
      const t1 = i + 1 < frames.length ? Math.max(0, frames[i + 1].ts - vt0 / 1000) : Math.max(t0 + 0.04, end);
      list += `file '${file}'\nduration ${Math.max(0.001, t1 - t0 + (i === 0 ? t0 : 0)).toFixed(4)}\n`;
    });
    fs.writeFileSync(path.join(dir, "list.ffconcat"), list);
    execFileSync(FFMPEG, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.ffconcat"), "-t", end.toFixed(3), "-vf", `scale=${VIDEO.width}:${VIDEO.height}:flags=lanczos,fps=30,format=yuv420p`, "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-movflags", "+faststart", dest]);
    fs.rmSync(dir, { recursive: true, force: true });
    return frames.length;
  };
  return { vt0, finish };
}

async function login(browser) {
  const ctx = await browser.newContext({ ...devices["iPhone 14"], viewport: VIEW });
  const page = await ctx.newPage();
  await page.goto(BASE + "/login");
  await page.fill('input[name="email"]', "demo@demo.gamereceipts.dev");
  await page.fill('input[name="password"]', "receipts-demo");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/feed");
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

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
    await at(0.7); await focus(page.getByRole("tab", { name: /NBA/ })); await page.getByRole("tab", { name: /NBA/ }).click();
    mark("s2", await at(1.7)); await focus(page.getByLabel("Search NBA"));
    await page.getByLabel("Search NBA").click(); await page.getByLabel("Search NBA").pressSequentially("wemban", { delay: 90 });
    await page.waitForLoadState("networkidle");
    await at(3.4); await focus(page.locator("ul button", { hasText: /Victor Wembanyama/ }).first());
    await page.locator("ul button", { hasText: /Victor Wembanyama/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    mark("s3", await at(4.5)); await act.select("Pick a take on", "Wins an award");
    await at(5.9); await act.select("Award", "NBA MVP");
    await at(7.3); await act.select("Finish", "Wins it");
    const btn = page.getByRole("button", { name: "Place take" });
    await at(8.2); await btn.scrollIntoViewIfNeeded(); await focus(btn);
    mark("s4", await at(8.9)); mark("place"); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    await focus(page.locator("time").first(), 0.35);
    const tp = await at(clockOf() + 3.2); mark("board", tp);
    await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle"); await focus(null, 0.3);
    await sleep(500); await smoothScroll(page, { by: 300, ms: 1500 }); await sleep(1500);
    await at(clockOf() + 0.3);
  },
  // A2: NHL → team → Playoff run → stage → Place take (≈ 8 s) → feed → resolved "Cashed" receipt + Prestige
  async A2({ page, at, mark, focus, act, receiptUrl }) {
    mark("s1", 0);
    await at(0.7); await focus(page.getByRole("tab", { name: /NHL/ })); await page.getByRole("tab", { name: /NHL/ }).click();
    await at(1.5); await focus(page.getByLabel("Search NHL"));
    await page.getByLabel("Search NHL").click(); await page.getByLabel("Search NHL").pressSequentially("bruins", { delay: 90 });
    await page.waitForLoadState("networkidle");
    await at(3.0); await focus(page.locator("ul button", { hasText: /Boston Bruins/ }).first());
    await page.locator("ul button", { hasText: /Boston Bruins/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    await at(4.0); await act.select("Pick a take on", "Playoff run");
    mark("s2", await at(5.6)); await act.select("How far", "Win the Stanley Cup");
    const btn = page.getByRole("button", { name: "Place take" });
    await at(7.3); await btn.scrollIntoViewIfNeeded(); await focus(btn);
    mark("s3", await at(8.0)); mark("place"); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    await focus(page.locator("time").first(), 0.35);
    mark("s4", await at(clockOf() + 2.6));
    await page.goto(receiptUrl); await page.waitForLoadState("networkidle"); await focus(null, 0.1);
    await sleep(2200);
    const pres = page.getByText("Prestige", { exact: true }).first();
    const y = await pres.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
    await focus(null, 0.27);
    await smoothScroll(page, { to: Math.max(0, y - 260), ms: 1400 }); await sleep(2300);
    await at(clockOf() + 0.2);
  },
  // B1: slower, take-builder flow with room for one caption at a time
  async B1({ page, at, mark, focus, act }) {
    mark("hook", 0);
    await at(2.4); mark("player"); await page.getByRole("tab", { name: /NBA/ }).click();
    await at(3.4); await page.getByLabel("Search NBA").click(); await page.getByLabel("Search NBA").pressSequentially("jokic", { delay: 110 });
    await page.waitForLoadState("networkidle");
    await at(5.2); await page.locator("ul button", { hasText: /Jokić|Jokic/ }).first().click(); await page.getByText("Pick a take on").waitFor();
    mark("take", await at(6.4)); await act.select("Pick a take on", "Wins an award", false);
    await at(7.8); await act.select("Award", "NBA MVP", false);
    await at(9.0); await act.select("Finish", "Wins it", false);
    const btn = page.getByRole("button", { name: "Place take" });
    await at(10.0); await btn.scrollIntoViewIfNeeded();
    mark("place", await at(10.8)); await btn.click();
    await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
    mark("stamp"); const tg = clockOf() + 2.8; mark("graded", await at(tg));
    mark("board", await at(tg + 2.4));
    await page.goto(BASE + "/leaderboards"); await page.waitForLoadState("networkidle");
    await sleep(600); await smoothScroll(page, { by: 280, ms: 1800 }); await sleep(1800);
    await at(clockOf() + 0.3);
  },
};
let clockOf; // set per recording: current clip time

async function recordSpot(browser, state, id, receiptUrl) {
  const ctx = await browser.newContext({ ...devices["iPhone 14"], viewport: VIEW, storageState: state });
  await ctx.addInitScript(initScript);
  await ctx.route("**/*", (r) => (isLocal(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(BASE + "/create"); await page.waitForLoadState("networkidle"); await sleep(900);
  const sc = await startScreencast(page);
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
    await sel.focus(); await sel.selectOption(val); await sleep(300);
  } };
  await FLOWS[id]({ page, at, mark, focus, act, receiptUrl });
  await sleep(200);
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
  const lctx = await browser.newContext({ ...devices["iPhone 14"], viewport: VIEW, storageState: state });
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
