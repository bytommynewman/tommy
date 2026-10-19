// End-to-end smoke test against a running server (default http://localhost:3000).
// Usage: npm run smoke [-- --shots <dir>]
import { chromium, devices } from "playwright";
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const shotsArg = process.argv.indexOf("--shots");
const SHOTS = shotsArg > 0 ? process.argv[shotsArg + 1] : null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const exe = fs.existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
const browser = await chromium.launch({ executablePath: exe && fs.statSync(exe).isFile() ? exe : undefined });
const ctx = await browser.newContext({ ...devices["iPhone 14"] });
// Keep the iOS "Add to Home Screen" hint from covering controls mid-test.
await ctx.addInitScript(() => { try { localStorage.setItem("gr-install-dismissed", "1"); } catch {} });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !/favicon/.test(m.text()) && errors.push(m.text()));
const shot = async (name) => SHOTS && (await page.waitForLoadState("networkidle"), page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true, caret: "initial" }));
const step = (s) => console.log("•", s);
// Any horizontal overflow makes iOS Safari zoom the whole page out.
const noOverflow = async (where) => {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  if (sw > iw) throw new Error(`FAILED: horizontal overflow on ${where} (${sw}px > ${iw}px)`);
};
const phoneShot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/phone-${name}.png`, caret: "initial" });
const expect = async (cond, msg) => { if (!(await cond)) throw new Error("FAILED: " + msg); };

const u = `smoke_${Date.now().toString(36)}`;
step("landing");
await page.goto(BASE);
await page.getByText("We remember who was right").waitFor();
await noOverflow("/");
await shot("01-landing");
await phoneShot("landing");

step("signup");
await page.goto(`${BASE}/signup`);
await page.fill('input[name="email"]', `${u}@example.com`);
await page.fill('input[name="username"]', u);
await page.fill('input[name="password"]', "smoke-password-1");
await shot("02-signup");
await page.click('button[type="submit"]');
await page.waitForURL("**/onboarding");

step("onboarding");
await page.getByRole("button", { name: /NHL/ }).click();
await shot("03-onboarding");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: "Toronto Maple Leafs" }).click();
await shot("04-onboarding-teams");
await page.getByRole("button", { name: "Continue" }).click();
await page.getByRole("button", { name: /Make my first call/ }).click();
await page.waitForURL("**/create?first=1");

step("create: AI structuring");
await page.fill("textarea", "The Leafs are going to have a crazy good season");
await shot("05-create");
await page.getByRole("button", { name: /Make it measurable/ }).click();
await page.getByText("Pick the version you mean").waitFor();
await shot("06-suggestions");
await page.getByRole("button", { name: /Maple Leafs finish 2026-27 with 105\+ points/ }).click();
await shot("07-confidence");
await page.getByRole("button", { name: "Review before locking" }).click();
await page.getByText("Official criteria").waitFor();
await shot("08-review");
await page.getByRole("button", { name: /Lock it in/ }).click();
await page.waitForURL(/\/p\/.+\?locked=1/);
await page.getByText("Record verified — unchanged since lock").waitFor();
await shot("09-locked");
const predUrl = page.url().split("?")[0];

step("duplicate take blocked");
await page.goto(`${BASE}/create?q=nhl-leafs-105-2027`);
await page.getByRole("button", { name: "Review before locking" }).click();
await page.getByRole("button", { name: /Lock it in/ }).click();
await page.getByText(/already have a live take/).waitFor();

step("ballot with dark horse");
await page.goto(`${BASE}/create?q=nba-mvp-2027`);
await page.getByRole("button", { name: /Add a dark horse/ }).click();
await page.getByRole("button", { name: /Cade Cunningham/ }).click();
await shot("10-ballot");
await page.getByRole("button", { name: "Review before locking" }).click();
await page.getByRole("button", { name: /Lock it in/ }).click();
await page.waitForURL(/\/p\/.+\?locked=1/);

step("league picker: take about a player, saved with their avatar");
await page.goto(`${BASE}/create`);
await page.getByRole("tab", { name: /NHL/ }).click();
await page.getByLabel("Search NHL").fill("celeb");
await page.getByRole("button", { name: /Macklin Celebrini/ }).click();
await page.getByText("Your take is about").waitFor();
await page.fill("textarea", "Best young center in the league within two years");
await shot("10b-subject");
await page.getByRole("button", { name: /Make it measurable/ }).click();
await page.getByRole("button", { name: /Hot take/ }).click();
await page.getByRole("button", { name: /Lock it in/ }).click();
await page.waitForURL(/\/p\/.+\?locked=1/);
await page.getByRole("img", { name: "Macklin Celebrini" }).first().waitFor();
await shot("10c-subject-locked");

step("feed, receipt, profile, leaderboards");
for (const [path, name] of [["/feed?tab=trending", "11-feed"], ["/leaderboards", "12-leaderboards"], [`/u/${u}`, "13-profile"], ["/u/darkhorse_dana", "14-profile-dana"], ["/u/darkhorse_dana/reputation", "15-reputation"], ["/battles", "16-battles"], ["/leagues/the-film-room", "17-league"], ["/notifications", "18-notifications"], ["/settings", "19-settings"], ["/how-scoring-works", "20-scoring"]]) {
  const res = await page.goto(BASE + path);
  await expect(res.ok(), `${path} → ${res.status()}`);
  await noOverflow(path);
  await shot(name);
}
const img = await page.request.get(`${predUrl.replace("/p/", "/r/")}/image?format=story`);
await expect(img.ok() && img.headers()["content-type"] === "image/png", "story PNG renders");

step("challenge a take");
await page.goto(`${BASE}/u/lockedin_larry?tab=pending`);
await page.getByRole("link", { name: /Giannis Antetokounmpo is traded/ }).first().click();
await page.getByRole("button", { name: /Challenge @lockedin_larry/ }).click();
await page.getByRole("radio", { name: "Yes" }).click();
await page.getByRole("button", { name: /Send challenge/ }).click();
await page.waitForURL(/\/battles\/.+/);
await shot("21-battle");

step("resolved receipt");
await page.goto(`${BASE}/leaderboards?board=calls`);
await page.locator('a[href^="/r/"]').first().click();
await page.waitForURL(/\/r\/.+/);
await page.waitForLoadState("networkidle");
await noOverflow("receipt");
await shot("22-receipt");
await phoneShot("receipt-top");
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await phoneShot("receipt-bottom");
await page.goto(`${BASE}/feed?tab=trending`);
await page.waitForLoadState("networkidle");
await phoneShot("feed");

step("admin resolve flow");
await page.context().clearCookies();
await page.goto(`${BASE}/login`);
await page.fill('input[name="email"]', "admin@demo.gamereceipts.dev");
await page.fill('input[name="password"]', "receipts-demo");
await page.click('button[type="submit"]');
await page.waitForURL("**/feed");
await page.goto(`${BASE}/admin`);
const card = page.locator('[data-question="nhl-leafs-105-2027"]');
await card.getByRole("button", { name: "Resolve" }).click();
await card.locator('select[name="outcome"]').selectOption("yes");
await card.locator('input[name="source"]').fill("NHL.com");
await card.locator('input[name="url"]').fill("https://www.nhl.com/standings");
await card.locator('input[name="note"]').fill("Smoke-test resolution");
await shot("23-admin");
await card.getByRole("button", { name: /Resolve & grade/ }).click();
await page.getByText("Resolved and graded.").waitFor();
await page.goto(predUrl);
await page.getByText("Why this score").waitFor();
await shot("24-graded");

await browser.close();
if (errors.length) { console.error("Browser errors:\n" + errors.join("\n")); process.exit(1); }
console.log("✓ smoke passed");
