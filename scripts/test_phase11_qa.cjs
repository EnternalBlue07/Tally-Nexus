const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/Mohammad Zumaan/.gemini/antigravity/brain/e86962ed-a34e-4a5b-b5c6-b980a583ba81';

async function runQA() {
  console.log('--- STARTING PHASE 11 PLAYWRIGHT QA ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Listen for console logs and errors
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Screenshot Full Desktop Overview
  console.log('Capturing Desktop Overview...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_01_desktop_overview.png'), fullPage: false });

  // 2. Test Search / Command Palette
  console.log('Testing Command Palette click...');
  const searchPill = await page.$('.command-search');
  if (searchPill) {
    await searchPill.click();
    await page.waitForTimeout(500);
    const paletteVisible = await page.isVisible('#command-palette-modal');
    console.log('Command palette visible after click:', paletteVisible);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_02_command_palette.png') });
    
    // Test typing in search
    await page.fill('#palette-search-input', 'paypal');
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_03_command_palette_filtered.png') });

    // Close palette
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } else {
    console.error('Search pill not found!');
  }

  // 3. Test 30-Second Tour Steps
  console.log('Testing 30-Second Tour Step 1...');
  await page.click('#tour-card-1');
  await page.waitForTimeout(500);

  console.log('Testing Tour Step 3 (Live AI SLA Evaluation)...');
  await page.click('#tour-card-3');
  // Wait for AI judge modal to open and complete evaluation
  await page.waitForSelector('#verify-modal-content', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const modalTitle = await page.innerText('#verify-modal-header-title');
  const modalSub = await page.innerText('#verify-modal-header-sub');
  const modalId = await page.innerText('#modal-id');
  console.log('AI Judge Modal Title:', modalTitle);
  console.log('AI Judge Modal Subtitle:', modalSub);
  console.log('AI Judge Modal ID:', modalId);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_04_ai_judge_modal.png') });

  // Close verify modal
  await page.click('#paypal-verify-modal button:has-text("Close")');
  await page.waitForTimeout(500);

  // 4. Test Tour Step 5 (PayPal Proof Modal)
  console.log('Testing Tour Step 5 (PayPal Proof)...');
  await page.click('#tour-card-5');
  await page.waitForSelector('#verify-modal-content', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const ppTitle = await page.innerText('#verify-modal-header-title');
  const ppStatus = await page.innerText('#modal-status-badge');
  const ppEv = await page.innerText('#modal-evidence-match');
  console.log('PayPal Modal Title:', ppTitle);
  console.log('PayPal Modal Badge:', ppStatus);
  console.log('PayPal Modal Evidence:', ppEv);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_05_paypal_proof_modal.png') });

  await page.click('#paypal-verify-modal button:has-text("Close")');
  await page.waitForTimeout(500);

  // 5. Test Scale Tab & Fee Model Capsule
  console.log('Navigating to Scale Tab...');
  await page.click('button:has-text("Hero Scale & AG Grid")');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_06_scale_tab_fee_model.png') });

  // 6. Test Mobile Viewport
  console.log('Testing Mobile Viewport (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: path.join(ARTIFACT_DIR, 'phase11_07_mobile_overview.png'), fullPage: false });

  await browser.close();
  console.log('--- PHASE 11 PLAYWRIGHT QA FINISHED SUCCESSFULLY ---');
}

runQA().catch(err => {
  console.error('QA Failed:', err);
  process.exit(1);
});

