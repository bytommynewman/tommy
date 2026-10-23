// Screenshot the waitlist page: node marketing/prelaunch/waitlist/shoot.mjs  (needs a server on :4173 serving this folder)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(path.resolve(process.cwd(), 'package.json'));
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
for (const [name, w, h] of [['mobile-390x844', 390, 844], ['desktop-1280x800', 1280, 800]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.goto('http://localhost:4173/index.html');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: path.join(here, `preview-${name}.png`) });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log(name, 'horizontal overflow px:', overflow);
  await page.close();
}
await browser.close();
