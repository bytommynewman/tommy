// Shared typography for every Game Receipts ad. See marketing/TYPE.md for the rules.
// ALL visible text is rasterised here, from HTML/CSS in headless Chrome, at native 4K pixel size (device scale factor 1, so
// 1 CSS px = 1 output px), transparent background, with the brand fonts (Saira + Inter from marketing/fonts) loaded through
// @font-face. ffmpeg only ever overlays the resulting PNGs (never drawtext).
//   hook(text, opts)        Saira 900 italic uppercase hook, optional volt key word, soft shadow or dark card
//   pill(text, opts)        Inter 800 caption pill (optional volt step badge)
//   pov(text, opts)         Format B lowercase caption (Inter 800, thin translucent pill)
//   stopwatch(sec, opts)    Inter 700 tabular numbers in a dark pill with a volt dot (one PNG per tenth-second)
//   endText(opts)           full-frame end-card layer: volt glow + tagline (Saira 800 italic) + "Free to play" (Inter 600, volt)
//   frame(html, W, H)       any full-frame HTML layer;  box(html)  tight element layer;  svgLayer(svg, W, H, k)  SVG text via Chrome
// Call closeType() when the script is done.
import { chromium } from "playwright";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const FONTS = path.join(here, "fonts");
export const VOLT = "#22e58a";
export const INK = "rgba(10,12,14,.72)";
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CACHE = path.join(here, "out/.cache/type");
fs.mkdirSync(CACHE, { recursive: true });

export const SAIRA = `'GR Saira', Saira, sans-serif`;
export const INTER = `'GR Inter', Inter, 'Apple Color Emoji', sans-serif`;
const furl = (f) => "file://" + path.join(FONTS, f).split("/").map(encodeURIComponent).join("/");
const FONT_CSS = `
@font-face{font-family:'GR Saira';src:url('${furl("Saira-VF.ttf")}');font-weight:100 900;font-stretch:50% 125%;font-style:normal}
@font-face{font-family:'GR Saira';src:url('${furl("Saira-Italic-VF.ttf")}');font-weight:100 900;font-stretch:50% 125%;font-style:italic}
@font-face{font-family:'GR Inter';src:url('${furl("Inter-VF.ttf")}');font-weight:100 900;font-style:normal}`;
export const BASE_CSS = `${FONT_CSS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:transparent}
body{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-kerning:normal;font-feature-settings:"kern","liga";font-family:${INTER}}
.num{font-feature-settings:"kern","liga","tnum";font-variant-numeric:tabular-nums}
.saira{font-family:${SAIRA};font-style:italic;text-transform:uppercase;letter-spacing:-.01em;line-height:.95}
.inter{font-family:${INTER}}
.k{color:${VOLT}}
.x{display:block;width:max-content;text-wrap:balance;text-align:center}
.shadow{text-shadow:0 3px 12px rgba(0,0,0,.5),0 12px 48px rgba(0,0,0,.6)}
.card{background:${INK};box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),0 20px 70px rgba(0,0,0,.4);border-radius:.3em;padding:.3em .5em .34em}
.pill{display:inline-flex;align-items:center;gap:.5em;background:rgba(10,12,14,.74);box-shadow:inset 0 0 0 2px rgba(255,255,255,.13),0 14px 48px rgba(0,0,0,.4);border-radius:999px;padding:.46em .95em;color:#fff;font-family:${INTER};font-weight:800;line-height:1.14;letter-spacing:-.005em}
.badge{flex:none;width:1.45em;height:1.45em;border-radius:50%;background:${VOLT};color:#04110a;display:inline-flex;align-items:center;justify-content:center;font-weight:800;font-size:.86em;font-feature-settings:"tnum"}`;

let browser, page;
async function getPage() {
  if (!page) {
    browser = await chromium.launch({ executablePath: CHROME });
    page = await browser.newPage({ viewport: { width: 2400, height: 4200 }, deviceScaleFactor: 1 });
  }
  return page;
}
export async function closeType() { if (browser) await browser.close(); browser = page = null; }

export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const smart = (s) => s.replace(/"([^"]*)"/g, "“$1”").replace(/'/g, "’");
/** Escape + wrap the first whole-word match of `key` in <span class=k>. */
export function mark(text, key) {
  const t = esc(smart(text));
  if (!key) return t;
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?![\\p{L}\\p{N}])`, "iu");
  return t.replace(re, (m, a, b) => `${a}<span class=k>${b}</span>`);
}

async function load(html, W, H) {
  const p = await getPage();
  const f = path.join(CACHE, crypto.createHash("sha1").update(html + W + "x" + H).digest("hex").slice(0, 16) + ".html");
  fs.writeFileSync(f, html);
  await p.setViewportSize({ width: W, height: H });
  await p.goto("file://" + f);
  await p.evaluate(async () => {
    await Promise.all(["900 100px 'GR Saira'", "italic 900 100px 'GR Saira'", "italic 800 100px 'GR Saira'", "italic 700 100px 'GR Saira'", "500 100px 'GR Inter'", "600 100px 'GR Inter'", "700 100px 'GR Inter'", "800 100px 'GR Inter'"].map((s) => document.fonts.load(s)));
    await document.fonts.ready;
  });
  return p;
}
const hashName = (prefix, html) => path.join(CACHE, `${prefix}-${crypto.createHash("sha1").update(html).digest("hex").slice(0, 14)}.png`);

// in-page fitting: largest font size <= size whose balanced text fits maxInner(s) wide in <= maxLines lines, then shrink-wrap to the widest line
const FIT = `window.__fit=(o)=>{const t=document.getElementById('t'),x=document.getElementById('x');let s=o.size;
const rows=()=>{const r=document.createRange();r.selectNodeContents(x);const out=[];for(const q of r.getClientRects()){if(q.width<.5)continue;const w=out.find(a=>Math.abs(a.top-q.top)<s*.3);if(w){w.l=Math.min(w.l,q.left);w.r=Math.max(w.r,q.right)}else out.push({top:q.top,l:q.left,r:q.right})}return out};
for(;s>=o.min;s-=2){t.style.fontSize=s+'px';x.style.width='max-content';x.style.maxWidth=(o.maxW-o.extra*s)+'px';const R=rows();if(R.length<=o.maxLines&&x.scrollWidth<=x.clientWidth+1)break}
const R=rows();x.style.width=Math.ceil(Math.max(...R.map(a=>a.r-a.l)))+2+'px';return {size:s,lines:R.length}}`;

async function runBox(prefix, body, fitOpts) {
  const html = `<!doctype html><meta charset=utf-8><style>${BASE_CSS}</style><body>${body}<script>${FIT}</script>`;
  const key = JSON.stringify(fitOpts ?? null);
  const dest = hashName(prefix, html + key);
  if (fs.existsSync(dest) && fs.existsSync(dest + ".json")) return { file: dest, ...JSON.parse(fs.readFileSync(dest + ".json", "utf8")) };
  const p = await load(html, 2400, 4200);
  let info = null;
  if (fitOpts) info = await p.evaluate((o) => window.__fit(o), fitOpts);
  const el = await p.$("#box");
  await el.screenshot({ path: dest, omitBackground: true });
  const bb = await el.boundingBox();
  const meta = { w: Math.round(bb.width), h: Math.round(bb.height), ...(info ?? {}) };
  fs.writeFileSync(dest + ".json", JSON.stringify(meta));
  return { file: dest, ...meta };
}

export const PAD = 160; // transparent margin around every box layer (room for the shadows); overlay at (x - pad, y - pad)

/** Hook: Saira 900 italic uppercase, tight tracking, line-height .95, <=3 balanced lines, one volt key word. Returns {file,w,h,pad}. */
export async function hook(text, { key, size = 200, maxW = 1760, maxLines = 3, card = false, minSize = 60 } = {}) {
  const body = `<div id=box style="display:inline-block;padding:${PAD}px"><div id=t class="saira ${card ? "card" : "shadow"}" style="font-weight:900;color:#fff;font-size:${size}px"><div id=x class=x>${mark(text, key)}</div></div></div>`;
  const r = await runBox("hook", body, { size, min: minSize, maxW, maxLines, extra: card ? 1.0 : 0 });
  return { ...r, pad: PAD };
}

/** Caption pill: Inter 800 sentence case on a dark translucent pill, optional step badge. */
export async function pill(text, { step, size = 84, maxW = 1800, maxLines = 2, minSize = 40, key } = {}) {
  const badge = step ? `<span class=badge>${step}</span>` : "";
  const body = `<div id=box style="display:inline-block;padding:${PAD}px"><div id=t class="pill" style="font-size:${size}px;${maxLines > 1 ? "border-radius:min(999px,1.05em)" : ""}">${badge}<div id=x class=x>${mark(text, key)}</div></div></div>`;
  const r = await runBox("pill", body, { size, min: minSize, maxW, maxLines, extra: 1.9 + (step ? 1.95 : 0) });
  return { ...r, pad: PAD };
}

/** Format B caption: Inter 800 lowercase, white, soft shadow, thin translucent pill. */
export async function pov(text, { size = 80, maxW = 1800, maxLines = 2, minSize = 40 } = {}) {
  const body = `<div id=box style="display:inline-block;padding:${PAD}px"><div id=t style="display:inline-block;font-family:${INTER};font-weight:800;color:#fff;line-height:1.16;letter-spacing:-.005em;font-size:${size}px;background:rgba(10,12,14,.5);box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),0 10px 40px rgba(0,0,0,.3);border-radius:1em;padding:.34em .8em .38em;text-shadow:0 2px 10px rgba(0,0,0,.5),0 8px 30px rgba(0,0,0,.4)"><div id=x class=x style="text-transform:none">${esc(smart(text.toLowerCase()))}</div></div></div>`;
  const r = await runBox("pov", body, { size, min: minSize, maxW, maxLines, extra: 1.6 });
  return { ...r, pad: PAD };
}

/** Stopwatch pill at `sec` seconds: Inter 700 tabular numbers + a small volt dot. */
export async function stopwatch(sec, { size = 84, label = null } = {}) {
  const tenths = Math.floor(sec * 10 + 1e-6);
  const mm = String(Math.floor(tenths / 600)).padStart(2, "0"), ss = String(Math.floor(tenths / 10) % 60).padStart(2, "0");
  const txt = `${mm}:${ss}.${tenths % 10}`;
  const body = `<div id=box style="display:inline-block;padding:${PAD}px"><div id=t style="display:inline-flex;align-items:center;gap:.5em;font-family:${INTER};font-weight:700;font-size:${size}px;line-height:1.1;color:#fff;background:rgba(10,12,14,.78);box-shadow:inset 0 0 0 2px rgba(255,255,255,.14),0 14px 48px rgba(0,0,0,.4);border-radius:999px;padding:.4em .85em .4em .7em"><i style="width:.34em;height:.34em;border-radius:50%;background:${VOLT};box-shadow:0 0 .5em ${VOLT};display:block"></i><span class=num style="font-feature-settings:'kern','liga','tnum'">${txt}</span></div></div>`;
  return { ...(await runBox("sw", body, null)), pad: PAD };
}

/** Full-frame transparent layer from HTML body content. */
export async function frame(body, W, H, prefix = "frame") {
  const html = `<!doctype html><meta charset=utf-8><style>${BASE_CSS}html,body{width:${W}px;height:${H}px;overflow:hidden}</style><body>${body}`;
  const dest = hashName(`${prefix}-${W}x${H}`, html);
  if (fs.existsSync(dest)) return dest;
  const p = await load(html, W, H);
  await p.screenshot({ path: dest, omitBackground: true });
  return dest;
}

/** SVG markup rendered by Chrome (so Saira/Inter, kerning and filters match the HTML layers). Returns a PNG Buffer, W*k x H*k. */
export async function svgLayer(svg, W, H, k = 1) {
  const html = `<!doctype html><meta charset=utf-8><style>${BASE_CSS}html,body{width:${W * k}px;height:${H * k}px;overflow:hidden}svg{display:block}text{font-kerning:normal;text-rendering:optimizeLegibility}</style><body>${svg}`;
  const dest = hashName(`svg-${W * k}x${H * k}`, html);
  if (!fs.existsSync(dest)) {
    const p = await load(html, W * k, H * k);
    await p.screenshot({ path: dest, omitBackground: true });
  }
  return fs.readFileSync(dest);
}

/** End-card text layer (full frame): volt glow, tagline (Saira 800 italic), "Free to play" (Inter 600, uppercase, volt, .08em). tagY/footY are tops. */
export async function endText({ W, H, tagY, footY, glowY, tagSize = 124, footSize = 54, dim = 0.45, extra = "", tagline = "Call it. Lock it. Prove it.", footer = "Free to play" }) {
  const body = `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 30% at 50% ${glowY ?? tagY}px,rgba(34,229,138,.2),transparent 72%),linear-gradient(180deg,rgba(5,8,6,${dim + 0.1}),rgba(5,8,6,${dim - 0.05}) 55%,rgba(5,8,6,${dim + 0.12}))"></div>
<div class=saira style="position:absolute;left:0;right:0;top:${tagY}px;text-align:center;font-weight:800;text-transform:none;font-size:${tagSize}px;color:#fff;text-shadow:0 4px 16px rgba(0,0,0,.5),0 14px 50px rgba(0,0,0,.55)">${esc(tagline)}</div>
<div class=inter style="position:absolute;left:0;right:0;top:${footY}px;text-align:center;font-weight:600;font-size:${footSize}px;letter-spacing:.08em;text-transform:uppercase;color:${VOLT};text-shadow:0 3px 12px rgba(0,0,0,.5)">${esc(footer)}</div>${extra}`;
  return frame(body, W, H, "end");
}
