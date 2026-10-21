// Shared bits for every app-footage capture script (capture.mjs, reels/capture-reels.mjs, ugc/capture.mjs).
//   * 4K-grade captures: iPhone viewport at deviceScaleFactor 5 (390x844 -> 1950x4220), so renders only ever scale DOWN into the 2160-wide frame.
//   * Own scratch server with GR_MARKETING_CAPTURE=1 (hides the seed "Demo" chips/wording; the account is "Jordan" / @jordan_calls).
//   * A frame-grab loop (Page.captureScreenshot at the emulated device-pixel size, several shots in flight so it still reaches >= 30 fps at DSF 5)
//     and an in-page "demo" detector: every capture FAILS if the rendered DOM ever contains the word demo (visible text, attributes, handles).
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DSF = 5;
export const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const FFMPEG = process.env.FFMPEG ?? path.join(os.homedir(), ".local/node/bin/ffmpeg");
export const ACCOUNT = { email: "jordan_calls@gamereceipts.test", password: "receipts-demo", name: "Jordan", username: "jordan_calls" };
/** Width/height from a JPEG's SOF marker. */
function jpegDims(b) {
  for (let i = 2; i + 9 < b.length;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  return [0, 0];
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Starts `next start` from `appRoot` on `port` with a scratch data dir. Returns { stop }. Only ever kills its own child. */
export async function startServer(appRoot, port, tag) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `gr-${tag}-`));
  const server = spawn(process.execPath, [path.join(appRoot, "node_modules/next/dist/bin/next"), "start", "-p", String(port)], {
    cwd: appRoot, stdio: "ignore",
    env: { ...process.env, GR_SEED_DEMO: "1", GR_MARKETING_CAPTURE: "1", GR_DATA_DIR: dataDir, SESSION_SECRET: crypto.randomBytes(24).toString("hex"), NODE_ENV: "production" },
  });
  const stop = () => { try { server.kill("SIGTERM"); } catch {} };
  process.on("exit", stop);
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`http://localhost:${port}/login`)).ok) return { stop }; } catch {}
    await sleep(250);
  }
  stop();
  throw new Error("capture server did not start (build the scratch copy with GR_MARKETING_CAPTURE=1 npm run build)");
}

/** Injected into every page: records any appearance of "demo" (text, attributes, handles) in sessionStorage.grDemoHits. */
export const demoGuardScript = () => {
  const RE = /\bdemo\b|demo[_@.\-]|[_@.\-]demo/i;
  const scan = () => {
    try {
      const html = document.documentElement.outerHTML.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
      const text = document.body ? document.body.innerText : "";
      const m = RE.exec(text) || RE.exec(html);
      if (m) {
        const hits = JSON.parse(sessionStorage.getItem("grDemoHits") || "[]");
        hits.push(`${location.pathname}: ...${(RE.test(text) ? text : html).slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, " ")}...`);
        sessionStorage.setItem("grDemoHits", JSON.stringify(hits.slice(-10)));
      }
    } catch {}
  };
  setInterval(scan, 1000);
  addEventListener("DOMContentLoaded", scan);
};
export async function demoHits(page) {
  try { return JSON.parse((await page.evaluate(() => sessionStorage.getItem("grDemoHits"))) || "[]"); } catch { return []; }
}
export async function assertNoDemo(page, label) {
  const hits = await demoHits(page);
  if (hits.length) throw new Error(`"demo" appeared on screen during ${label}: ${hits.join(" | ")}`);
}

export async function login(browser, base, ctxOpts) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(base + "/login");
  await page.fill('input[name="email"]', ACCOUNT.email);
  await page.fill('input[name="password"]', ACCOUNT.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/feed");
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

/**
 * Frame grab loop. `conc` screenshots stay in flight so a 1950x4220 viewport still delivers >= 30 fps.
 * Frames are written to `dir` as they arrive (stamped with the midpoint of request/response time).
 * Returns { stop(): Promise<frames[]>, t0 } where t0 is the wall-clock start in ms.
 */
export async function startGrab(page, { view, dsf = DSF, dir, conc = Number(process.env.GRAB_CONC ?? 6), quality = Number(process.env.GRAB_Q ?? 90) }) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  // Emulation overrides are per CDP session: without repeating the device metrics here a raw Page.captureScreenshot comes back at
  // 1x CSS size (390x844). With them it returns the real device-pixel frame (1950x4220 at DSF 5). (clip.scale is NOT a substitute:
  // it multiplies on top of the page's own scale and zooms the picture.)
  // (same parameters Playwright itself sends for this context, so layout/hit-testing do not change)
  await cdp.send("Emulation.setDeviceMetricsOverride", { mobile: true, width: view.width, height: view.height, screenWidth: view.width, screenHeight: view.height,
    deviceScaleFactor: dsf, screenOrientation: { angle: 0, type: "portraitPrimary" }, dontSetVisibleSize: true });
  // (the session's DSF override makes the output device-pixel sized, as Playwright's own screenshots)
  const frames = []; let live = true, n = 0, want = null, dropped = 0;
  const worker = async () => {
    while (live) {
      const a = Date.now();
      try {
        // clip is in DOCUMENT css px: follow the visual viewport so scrolled pages are captured where they are on screen
        const { cssVisualViewport: vv } = await cdp.send("Page.getLayoutMetrics");
        const clip = { x: vv.pageX, y: vv.pageY, width: view.width, height: view.height, scale: 1 };
        const r = await Promise.race([cdp.send("Page.captureScreenshot", { format: "jpeg", quality, optimizeForSpeed: true, clip }), sleep(3000).then(() => { throw new Error("shot timeout"); })]);
        const b = Date.now(); const buf = Buffer.from(r.data, "base64");
        // frames grabbed mid-navigation can come back at a different size: drop them (the previous frame holds) so every frame is full-size
        const [fw, fh] = jpegDims(buf);
        if (want && (fw !== want[0] || Math.abs(fh - want[1]) > 1)) { dropped++; continue; }
        if (!want) want = [fw, fh];
        const file = path.join(dir, `f${String(n++).padStart(6, "0")}.jpg`);
        fs.writeFileSync(file, buf); frames.push({ file, ts: (a + b) / 2000 });
      } catch {}
    }
  };
  const ws = Array.from({ length: conc }, () => worker());
  return { t0: Date.now(), async stop() { live = false; await Promise.race([Promise.all(ws), sleep(4000)]); if (dropped) console.log(`  dropped ${dropped} odd-size frames`); return frames.sort((x, y) => x.ts - y.ts); } };
}

/** Turns grabbed frames into a constant 30 fps near-lossless H.264 clip (native pixels, no scaling). `t0` ms = clock zero, `endMs` = clip length. */
export function encodeFrames(frames, { t0, endMs, dest, dir, crf = 10 }) {
  let list = "ffconcat version 1.0\n";
  const end = endMs / 1000;
  frames.forEach((f, i) => {
    const a = Math.max(0, f.ts - t0 / 1000);
    const b = i + 1 < frames.length ? Math.max(0, frames[i + 1].ts - t0 / 1000) : Math.max(a + 0.04, end);
    list += `file '${f.file}'\nduration ${Math.max(0.001, b - a + (i === 0 ? a : 0)).toFixed(4)}\n`;
  });
  const lf = path.join(dir, "list.ffconcat");
  fs.writeFileSync(lf, list);
  execFileSync(FFMPEG, ["-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", lf, "-t", end.toFixed(3), "-vf", "fps=30,format=yuv420p",
    "-c:v", "libx264", "-preset", "fast", "-crf", String(crf), "-profile:v", "high", "-level", "5.1", "-movflags", "+faststart", dest]);
  const effFps = frames.length / Math.max(0.1, frames.at(-1).ts - frames[0].ts);
  const gaps = frames.slice(1).map((f, i) => f.ts - frames[i].ts).sort((a, b) => a - b);
  const p95 = gaps[Math.floor(gaps.length * 0.95)] ?? 0, slow = gaps.filter((g) => g > 0.05).length / Math.max(1, gaps.length);
  fs.rmSync(dir, { recursive: true, force: true });
  return { frames: frames.length, grabFps: effFps, p95gap: p95, slowShare: slow };
}
