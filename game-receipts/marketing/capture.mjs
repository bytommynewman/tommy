// Records phone-footage clips for every spot in marketing/spots.json (iPhone 14 emulation, 390x844 @5x = 1950x4220, 4K-grade).
// Prereq: `npm run build`. Usage: node marketing/capture.mjs [spotId ... | carousel]
// Starts its OWN production server on port 3200 with a fresh scratch data dir (so demo data is clean and
// duplicate-take guards never trip), then stops only that server's process.
import { chromium, devices } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as lib from "./capture-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const appRoot = process.env.GR_APP_ROOT ?? root; // run the production server from another checkout (e.g. a scratch copy) without touching this one
const OUT = path.join(here, "out");
const RAW = path.join(OUT, "raw");
fs.mkdirSync(RAW, { recursive: true });
const cfg = JSON.parse(fs.readFileSync(path.join(here, "spots.json"), "utf8"));
const args = process.argv.slice(2);
const only = args.map(Number).filter(Boolean);
const onlyCarousel = args.includes("carousel");

const PORT = Number(process.env.CAPTURE_PORT ?? 3200);
const BASE = `http://localhost:${PORT}`;
const { CHROME, DSF, sleep } = lib;
const VIEW = { width: 390, height: 844 };
const CTX = { ...devices["iPhone 14"], viewport: VIEW, deviceScaleFactor: DSF }; // 1950x4220 native: renders only ever scale DOWN
const PAUSE = 320; // idle gap after each action (was 600): faster pacing

// ---- own server ---------------------------------------------------------------------------------------------
let server;
const startServer = async () => { server = await lib.startServer(appRoot, PORT, "capture"); };
const stopServer = () => server?.stop();

// ---- in-page helpers ----------------------------------------------------------------------------------------
// Legal: every remote request (ESPN headshots/logos, any image CDN) is aborted so avatars render as monograms.
const isLocal = (u) => { try { const h = new URL(u).hostname; return h === "localhost" || h === "127.0.0.1"; } catch { return true; } };

const initScript = () => {
  try { localStorage.setItem("gr-install-dismissed", "1"); } catch {}
  // Blocked <img>s can fail before React hydrates (so onError is lost). Re-trigger the load after hydration
  // so the app's own monogram fallback renders.
  setInterval(() => {
    document.querySelectorAll("img").forEach((i) => {
      const n = Number(i.dataset.grr || 0);
      if (n >= 3 || !i.src || i.src.startsWith(location.origin) || i.src.startsWith("data:")) return;
      if (i.complete && i.naturalWidth === 0 && Date.now() - Number(i.dataset.grt || 0) > 1000) {
        i.dataset.grr = String(n + 1); i.dataset.grt = String(Date.now());
        const s = i.src.replace(/[?&]_r=\d+$/, "");
        i.src = s + (s.includes("?") ? "&" : "?") + "_r=" + (n + 1);
      }
    });
  }, 600);
  // On-screen stopwatch for the "10-second take" spot (persisted across navigations via sessionStorage).
  const mount = () => {
    const t0 = Number(sessionStorage.getItem("grT0") || 0);
    if (!t0) return;
    if (location.search.includes("placed=") && !sessionStorage.getItem("grT1")) sessionStorage.setItem("grT1", String(Date.now()));
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:14px;right:92px;z-index:99999;padding:2px 10px;border-radius:999px;background:#000d;border:2px solid #23e58a;color:#23e58a;font:900 17px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.04em";
    document.body.appendChild(el);
    const tick = () => {
      const end = Number(sessionStorage.getItem("grT1") || 0) || Date.now();
      el.textContent = ((end - t0) / 1000).toFixed(1) + "s";
      if (!sessionStorage.getItem("grT1")) requestAnimationFrame(tick);
    };
    tick();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
};

const chatHtml = (msgs) => `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><style>
*{box-sizing:border-box}body{margin:0;background:#0b0b0d;color:#fff;font:17px/1.3 -apple-system,Helvetica,Arial,sans-serif;height:100vh;display:flex;flex-direction:column}
header{padding:44px 16px 12px;text-align:center;border-bottom:1px solid #222;background:#141417}
header b{display:block;font-size:17px}header span{font-size:12px;color:#8a8a93}
main{flex:1;padding:18px 14px;display:flex;flex-direction:column;gap:10px;justify-content:flex-end;padding-bottom:120px}
.m{max-width:78%;padding:10px 14px;border-radius:20px;opacity:0;transform:translateY(14px) scale(.96);transition:all .35s cubic-bezier(.2,.9,.3,1.2)}
.m.on{opacity:1;transform:none}.them{align-self:flex-start;background:#26262b}.me{align-self:flex-end;background:#2f7bf6}
.t{align-self:flex-start;color:#8a8a93;font-size:12px;margin-left:6px}
</style><header><b>The Group Chat</b><span>6 people</span></header><main>
${msgs.map(([s, t]) => `<div class="m ${s}">${t.replace(/</g, "&lt;")}</div>`).join("")}</main>`;

async function smoothScroll(page, { to, by, ms = 1200 }) {
  await page.evaluate(({ to, by, ms }) => new Promise((res) => {
    const y0 = window.scrollY, y1 = to ?? y0 + by, t0 = performance.now();
    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    const f = (t) => { const p = Math.min(1, (t - t0) / ms); window.scrollTo(0, y0 + (y1 - y0) * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), { to, by, ms });
}

// Playwright's own video recorder needs a browser-bundled ffmpeg that isn't installed here, so frames are grabbed with a
// Page.captureScreenshot loop (capture-lib.mjs, >= 30 fps at 1950x4220) and encoded to a 30 fps near-lossless clip.
async function startScreencast(page) {
  const grab = await lib.startGrab(page, { view: VIEW, dir: path.join(os.tmpdir(), `gr-frames-${process.pid}`) });
  return async (vt0, endMs, dest) => {
    const frames = await grab.stop();
    const r = lib.encodeFrames(frames, { t0: vt0, endMs, dest, dir: path.join(os.tmpdir(), `gr-frames-${process.pid}`) });
    console.log(`  grab ${r.grabFps.toFixed(1)} fps (p95 gap ${(r.p95gap * 1000).toFixed(0)} ms, ${(r.slowShare * 100).toFixed(0)}% of gaps >50 ms)`);
    return r.frames;
  };
}

const login = (browser) => lib.login(browser, BASE, CTX);

// A <select>'s accessible name includes its selected option text, so find it via its caption span instead.
const selectFor = (page, label) => page.locator("label").filter({ has: page.locator("span", { hasText: nameRe(label) }) }).locator("select").first();
// Receipt ids are random per seeded database, so look up the top resolved ("Cashed") receipt: the best call on the board.
const ids = {};
async function findIds(browser, state) {
  const ctx = await browser.newContext({ storageState: state });
  const html = await (await ctx.request.get(BASE + "/leaderboards?board=calls")).text();
  ids.CASHED = html.match(/\/r\/([0-9a-f-]{36})/)?.[1];
  await ctx.close();
  if (!ids.CASHED) throw new Error("no resolved receipt found in demo data");
}
const sub = (u) => u.replace("{CASHED}", ids.CASHED);
const nameRe = (s) => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

async function runStep(page, st, ctx) {
  switch (st.do) {
    case "goto": await page.goto(BASE + sub(st.url)); await page.waitForLoadState("networkidle"); break;
    case "chat": {
      await page.setContent(chatHtml(st.messages));
      await sleep(150);
      const n = await page.locator(".m").count();
      for (let i = 0; i < n; i++) { await page.locator(".m").nth(i).evaluate((e) => e.classList.add("on")); await sleep(330); }
      break;
    }
    case "tab": await page.getByRole("tab", { name: new RegExp(st.name) }).click(); await sleep(150); break;
    case "search": {
      const box = page.getByLabel(st.label);
      await box.click();
      await box.pressSequentially(st.text, { delay: 45 });
      await page.waitForLoadState("networkidle"); await sleep(200);
      break;
    }
    case "pick": await page.locator("ul button", { hasText: nameRe(st.name) }).first().click(); await page.getByText("Pick a take on").waitFor(); await sleep(150); break;
    case "select": {
      const sel = selectFor(page, st.label);
      const val = await sel.evaluate((s, opt) => [...s.options].find((o) => o.text.toLowerCase().includes(opt.toLowerCase()))?.value, st.option);
      if (val === undefined) throw new Error(`no option ${st.option} in ${st.label}`);
      await sel.focus(); await sel.selectOption(val); await sleep(150);
      break;
    }
    case "cycle": {
      const sel = selectFor(page, st.label);
      await sel.scrollIntoViewIfNeeded();
      for (const opt of st.options) {
        const val = await sel.evaluate((s, o) => [...s.options].find((x) => x.text.toLowerCase().includes(o.toLowerCase()))?.value, opt);
        if (val === undefined) throw new Error(`no option ${opt} in ${st.label}`);
        await sel.selectOption(val);
        await sleep(st.pause ?? 450);
      }
      break;
    }
    case "place": {
      const btn = page.getByRole("button", { name: "Place take" });
      await btn.scrollIntoViewIfNeeded(); await sleep(150);
      await btn.click();
      await page.waitForURL(/\/feed\?placed=/); await page.waitForLoadState("networkidle");
      break;
    }
    case "clickLink": await page.getByRole("link", { name: nameRe(st.name) }).first().click(); await page.waitForLoadState("networkidle"); break;
    case "button": {
      const b = page.getByRole("button", { name: nameRe(st.name) }).first();
      await b.scrollIntoViewIfNeeded(); await sleep(100); await b.click();
      if (st.navigates) await page.waitForURL(/\/battles\//);
      await page.waitForLoadState("networkidle"); break;
    }
    case "radio": await page.getByRole("radio", { name: st.name }).click(); await sleep(150); break;
    case "scroll": await smoothScroll(page, st); break;
    case "scrollList": await page.locator("ul.overflow-y-auto").first().evaluate((el, by) => el.scrollBy({ top: by, behavior: "smooth" }), st.by); await sleep(st.ms ?? 1200); break;
    case "scrollToText": {
      const el = page.getByText(st.text).first();
      const y = await el.evaluate((e) => e.getBoundingClientRect().top + window.scrollY);
      await smoothScroll(page, { to: Math.max(0, y - (st.offset ?? 300)), ms: st.ms ?? 1200 });
      break;
    }
    case "wait": await sleep(st.ms); break;
    case "timerStart": await page.evaluate(() => { sessionStorage.setItem("grT0", String(Date.now())); sessionStorage.removeItem("grT1"); location.reload(); }); await page.waitForLoadState("networkidle"); break;
    case "punch": {
      // Record where the thing to emphasise sits (normalised to the viewport) and when; the renderer zooms there.
      const loc = page.locator(st.selector).first();
      await loc.waitFor({ timeout: 8000 });
      const bb = await loc.boundingBox();
      ctx.punches.push({ t: (Date.now() - ctx.vt0) / 1000, px: (bb.x + bb.width / 2) / VIEW.width, py: (bb.y + bb.height / 2) / VIEW.height, z: st.z ?? 1.6, hold: st.hold ?? 1.0, label: st.label ?? "" });
      break;
    }
    default: throw new Error("unknown step " + st.do);
  }
}

async function recordSpot(browser, state, spot) {
  const ctx = await browser.newContext({ ...CTX, storageState: state });
  await ctx.addInitScript(initScript); await ctx.addInitScript(lib.demoGuardScript);
  await ctx.route("**/*", (r) => (isLocal(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const finish = await startScreencast(page);
  const vt0 = Date.now(); // video clock starts here
  await page.goto(BASE + cfg.startUrl); await page.waitForLoadState("networkidle"); await sleep(400);
  const c = { vt0, punches: [] };
  const beats = [];
  for (const [i, b] of spot.beats.entries()) {
    const start = Date.now();
    for (const st of b.steps) { await runStep(page, st, c); await sleep(st.pause ?? PAUSE); }
    const left = b.duration * 1000 - (Date.now() - start);
    if (left > 0) await sleep(left);
    beats.push({ i, start: (start - vt0) / 1000, end: (Date.now() - vt0) / 1000, caption: b.caption });
  }
  await sleep(300);
  await lib.assertNoDemo(page, `spot ${spot.id}`);
  const nFrames = await finish(vt0, Date.now() - vt0, path.join(RAW, `spot-${spot.id}.mp4`));
  await ctx.close();
  fs.writeFileSync(path.join(RAW, `spot-${spot.id}.json`), JSON.stringify({ id: spot.id, beats, punches: c.punches, errors }, null, 1));
  console.log(`spot ${spot.id} ${spot.slug}: ${beats.at(-1).end.toFixed(1)}s of footage (${nFrames} frames), ${c.punches.length} punch(es)${errors.length ? ", page errors: " + errors.join("; ") : ""}`);
}

// ---- carousel stills ----------------------------------------------------------------------------------------
async function carousel(browser, state) {
  const ctx = await browser.newContext({ ...CTX, storageState: state });
  await ctx.addInitScript(initScript); await ctx.addInitScript(lib.demoGuardScript);
  await ctx.route("**/*", (r) => (isLocal(r.request().url()) ? r.continue() : r.abort()));
  const page = await ctx.newPage();
  const shot = async (n) => { await page.waitForLoadState("networkidle"); await sleep(1500); await page.screenshot({ path: path.join(RAW, `carousel-${n}.png`) }); };
  await page.goto(BASE + "/create"); await page.getByRole("tab", { name: /MLB/ }).click();
  await page.getByLabel("Search MLB").fill("judge"); await page.waitForLoadState("networkidle");
  await page.locator("ul button", { hasText: /Aaron Judge/ }).first().click();
  await page.getByText("Pick a take on").waitFor();
  await page.getByLabel(/Pick a take on/).selectOption({ label: await page.getByLabel(/Pick a take on/).evaluate((s) => [...s.options].find((o) => /Season stat/i.test(o.text)).text) });
  await page.getByText("Your take", { exact: true }).scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollTo(0, 250)); await shot(1);
  await page.getByRole("button", { name: "Place take" }).click();
  await page.waitForURL(/\/feed\?placed=/); await page.evaluate(() => window.scrollTo(0, 0)); await shot(2);
  await page.goto(BASE + "/p/" + ids.CASHED); await page.evaluate(() => window.scrollTo(0, 120)); await sleep(1800); await shot(3);
  await lib.assertNoDemo(page, "carousel");
  await ctx.close();
  console.log("carousel stills captured");
}

const browser = await chromium.launch({ executablePath: CHROME });
try {
  await startServer();
  const state = await login(browser);
  await findIds(browser, state);
  for (const spot of cfg.spots) if (!onlyCarousel && (!only.length || only.includes(spot.id))) await recordSpot(browser, state, spot);
  if (onlyCarousel || !only.length) await carousel(browser, state);
} finally {
  await browser.close();
  stopServer();
}
