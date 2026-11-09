const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join(__dirname, '../../docs/screenshots/audit');
fs.mkdirSync(AUDIT_DIR, { recursive: true });

const viewports = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'laptop_1366x768', width: 1366, height: 768 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_390x844', width: 390, height: 844, isMobile: true }
];

async function run() {
  console.log('Launching Playwright Chromium for Visual Audit...');
  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    console.log(`Auditing viewport: ${vp.name} (${vp.width}x${vp.height})...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: Boolean(vp.isMobile)
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Check for horizontal overflow
    const overflow = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasHorizontalOverflow: document.body.scrollWidth > window.innerWidth,
        docTitle: document.title
      };
    });
    console.log(`[${vp.name}] Overflow Check:`, overflow);

    // Capture baseline overview
    const outPath = path.join(AUDIT_DIR, `baseline_${vp.name}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${outPath}`);

    await context.close();
  }

  await browser.close();
  console.log('Visual audit viewport capture complete!');
}

run().catch(err => {
  console.error('Audit capture failed:', err);
  process.exit(1);
});
