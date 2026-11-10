const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.resolve(__dirname, '../docs/assets/screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function runVisualQA() {
  console.log('=== STARTING PHASE 12 COMPREHENSIVE PLAYWRIGHT VISUAL QA ===');
  const browser = await chromium.launch({ headless: true });
  
  const consoleErrors = [];
  const pageErrors = [];

  // Desktop context: 1440 x 900
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.error('BROWSER CONSOLE ERROR:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.error('PAGE ERROR:', err.message);
  });

  console.log('1. Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Desktop Command Centre Hero
  console.log('2. Capturing Desktop Command Centre Hero...');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '01_tally_nexus_command_centre_hero.png'),
    fullPage: false
  });

  // 2. Judge Briefing Panel & 30s Tour Step Highlights
  console.log('3. Testing 30-Second Tour Step 1 (Clearing Room)...');
  await page.click('#tour-card-1');
  await page.waitForTimeout(300);

  console.log('Capturing Judge Briefing Panel & Tour...');
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '02_judge_briefing_panel_and_30s_tour.png')
  });

  // 3. Search & Command Palette Modal
  console.log('4. Testing Command Palette Search Modal...');
  await page.click('.command-search');
  await page.waitForSelector('#command-palette-modal', { state: 'visible' });
  await page.waitForTimeout(400);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '06_command_palette_global_search.png')
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. AI SLA Judge Adjudication Evidence Modal
  console.log('5. Testing Live AI SLA Judge Adjudication...');
  await page.click('#tour-card-3');
  await page.waitForSelector('#verify-modal-content', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);

  const aiTitle = await page.innerText('#verify-modal-header-title');
  const aiSub = await page.innerText('#verify-modal-header-sub');
  console.log('AI Modal Header Title:', aiTitle);
  console.log('AI Modal Header Sub:', aiSub);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '07_ai_sla_judge_adjudication_modal.png')
  });

  await page.click('#paypal-verify-modal button:has-text("Close")');
  await page.waitForTimeout(400);

  // 5. PayPal Authoritative Sandbox Proof Modal
  console.log('6. Testing PayPal Authoritative Sandbox Proof...');
  await page.click('#tour-card-5');
  await page.waitForSelector('#verify-modal-content', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);

  const ppTitle = await page.innerText('#verify-modal-header-title');
  const ppBadge = await page.innerText('#modal-status-badge');
  console.log('PayPal Modal Header Title:', ppTitle);
  console.log('PayPal Modal Badge:', ppBadge);

  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '08_paypal_authoritative_sandbox_proof.png')
  });

  await page.click('#paypal-verify-modal button:has-text("Close")');
  await page.waitForTimeout(400);

  // 6. Sidebar Tab: Hero Scale & AG Grid (Payment Rail Fee Model)
  console.log('7. Testing Tab: Hero Scale & AG Grid...');
  await page.click('button:has-text("Hero Scale & AG Grid")');
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '09_hero_scale_payment_rail_fee_model.png')
  });

  // 7. Sidebar Tab: Clearing Room & Netting
  console.log('8. Testing Tab: Clearing Room...');
  await page.click('button:has-text("Clearing Room")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '10_clearing_room_netting.png')
  });

  // 8. Sidebar Tab: Agent Directory
  console.log('9. Testing Tab: Agent Directory...');
  await page.click('button:has-text("Agent Directory")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '03_agent_liquidity_and_settlements.png')
  });

  // 9. Sidebar Tab: Payment Rails (PayPal)
  console.log('10. Testing Tab: Payment Rails...');
  await page.click('button:has-text("Payment Rails (PayPal)")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '11_payment_rails_paypal_orders.png')
  });

  // 10. Sidebar Tab: Double-Entry Ledger
  console.log('11. Testing Tab: Double-Entry Ledger...');
  await page.click('button:has-text("Double-Entry Ledger")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '12_double_entry_subledger.png')
  });

  // 11. Sidebar Tab: Recovery Operations
  console.log('12. Testing Tab: Recovery Operations...');
  await page.click('button:has-text("Recovery Operations")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '13_recovery_operations.png')
  });

  // 12. Sidebar Tab: Trust & Security
  console.log('13. Testing Tab: Trust & Security...');
  await page.click('button:has-text("Trust & Security")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '14_trust_security_merkle.png')
  });

  // 13. Sidebar Tab: Live Event Stream (SSE)
  console.log('14. Testing Tab: Live Event Stream...');
  await page.click('button:has-text("Live Event Stream")');
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, '15_live_event_stream_sse.png')
  });

  // 14. Mobile Viewport (390 x 844)
  console.log('15. Testing Mobile Viewport (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.screenshot({
    path: path.join(SCREENSHOT_DIR, '05_mobile_responsive_experience.png')
  });

  await browser.close();

  console.log('=== PLAYWRIGHT QA FINISHED SUCCESSFULLY ===');
  console.log('Total Console Errors:', consoleErrors.length);
  console.log('Total Page Errors:', pageErrors.length);

  if (pageErrors.length > 0) {
    throw new Error('Fatal page errors encountered during visual QA: ' + pageErrors.join(', '));
  }
}

runVisualQA().catch(err => {
  console.error('Visual QA Failed:', err);
  process.exit(1);
});
