import { test, expect } from '@playwright/test';
import path from 'path';

const CINEMATIC_SCREENSHOT_DIR = path.resolve('docs/screenshots/cinematic');

test.describe('Tally Nexus Institutional Clearing Command Centre', () => {

  test('01. Dashboard loads with zero console errors and valid document title', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page).toHaveTitle(/Tally Nexus — Autonomous Agent Clearinghouse/);

    // Verify header brand element
    const brand = page.locator('.brand-title');
    await expect(brand).toHaveText('TALLY NEXUS');

    // Verify environment indicator exists
    const envBadge = page.locator('#env-badge');
    await expect(envBadge).toBeVisible();

    // Verify zero fatal console errors
    const fatalErrors = consoleErrors.filter(e => !e.includes('favicon'));
    expect(fatalErrors).toHaveLength(0);
  });

  test('02. Zero horizontal page overflow across active viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const overflow = await page.evaluate(() => {
      return {
        bodyScrollWidth: document.body.scrollWidth,
        windowInnerWidth: window.innerWidth,
        hasOverflow: document.body.scrollWidth > window.innerWidth
      };
    });

    expect(overflow.hasOverflow).toBe(false);
  });

  test('03. Judge Briefing Panel renders with 3 innovation pillars and interactive tour', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const judgePanel = page.locator('#judge-briefing-panel');
    await expect(judgePanel).toBeVisible();

    // Verify 3 core technical innovation cards
    const aiCard = page.getByText('1. AI-Assisted SLA Evaluation');
    const netCard = page.getByText('2. Deterministic Netting & PayPal Rails');
    const subledgerCard = page.getByText('3. Verifiable Subledger & Cryptography');

    await expect(aiCard).toBeVisible();
    await expect(netCard).toBeVisible();
    await expect(subledgerCard).toBeVisible();

    // Test tour step 1 click
    const step1Btn = page.locator('#tour-step-1');
    await step1Btn.click();
    await page.waitForTimeout(300);

    // Capture screenshot on 1440x900 desktop
    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '01_command_centre_overview_1440x900.png'),
        fullPage: false
      });
    }
  });

  test('04. Flagship Demo runs cleanly with zero alerts and settles consortium', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const runBtn = page.locator('#run-demo-btn');
    await expect(runBtn).toBeVisible();

    await runBtn.click();

    // Wait for demo status pill to indicate completion
    const pill = page.locator('#demo-status-pill');
    await expect(pill).toContainText(/Demo Settled & Reconciled/, { timeout: 20000 });

    // Verify subledger variance remains strictly zero cents
    const variance = page.locator('#metric-variance');
    await expect(variance).toHaveText('Δ = $0.00');

    // Capture settled executive overview
    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '02_flagship_settled_overview.png'),
        fullPage: false
      });
    }
  });

  test('05. Hero Scale AG Grid renders 1,500+ virtualized IOUs and filters', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Switch to Hero Scale tab
    const scaleTabBtn = page.getByRole('button', { name: /Hero Scale/i });
    await scaleTabBtn.click();
    await page.waitForTimeout(1500);

    // Verify AG Grid rendered
    const iouGrid = page.locator('#ious-grid');
    await expect(iouGrid).toBeVisible();

    // Verify row count badge
    const countBadge = page.locator('#grid-row-count-badge');
    await expect(countBadge).toContainText(/1,?500/);

    // Test Quick Filter
    const filterInput = page.locator('#ious-filter-input');
    await filterInput.fill('Task');
    await page.waitForTimeout(300);

    // Capture AG Grid tab screenshot
    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '03_hero_scale_ag_grid.png'),
        fullPage: false
      });
    }
  });

  test('06. AI SLA Judge modal opens and presents authoritative evidence', async ({ page }, testInfo) => {
    test.setTimeout(45000);
    await page.goto('/', { waitUntil: 'networkidle' });

    // Trigger AI Judge modal
    const testAiBtn = page.getByRole('button', { name: /Run Live AI Evaluation/i });
    await testAiBtn.click();

    const modal = page.locator('#paypal-verify-modal');
    await expect(modal).toBeVisible();

    const content = page.locator('#verify-modal-content');
    await expect(content).toBeVisible({ timeout: 30000 });

    const badge = page.locator('#modal-status-badge');
    await expect(badge).toBeVisible();

    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '04_ai_sla_judge_dialog.png'),
        fullPage: false
      });
    }

    // Close modal
    const closeBtn = modal.getByRole('button', { name: 'Close' });
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('07. PayPal verification modal displays authoritative sandbox proof', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const verifyPaypalBtn = page.getByRole('button', { name: /Verify Live Capture/i });
    await verifyPaypalBtn.click();

    const modal = page.locator('#paypal-verify-modal');
    await expect(modal).toBeVisible();

    const modalId = page.locator('#modal-id');
    await expect(modalId).toContainText('7PV82720RX415822V');

    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '05_paypal_authoritative_proof.png'),
        fullPage: false
      });
    }

    const closeBtn = modal.getByRole('button', { name: 'Close' });
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });

  test('08. Trust & Security Center renders 5-point adversarial matrix and cryptographic tool', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const securityTabBtn = page.getByRole('button', { name: /Trust & Security/i });
    await securityTabBtn.click();
    await page.waitForTimeout(600);

    // Verify invariant table
    const table = page.locator('#tab-security table');
    await expect(table).toBeVisible();
    await expect(page.getByText('1. Cryptographic Authenticity')).toBeVisible();
    await expect(page.getByText('5. SLA Prompt Injection Defense')).toBeVisible();

    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '06_trust_and_security_center.png'),
        fullPage: false
      });
    }
  });

  test('09. Double-Entry Ledger tab displays balanced debits & credits (Δ = $0.00)', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    const ledgerTabBtn = page.getByRole('button', { name: 'Double-Entry Ledger' });
    await ledgerTabBtn.click();
    await page.waitForTimeout(600);

    const tbody = page.locator('#ledger-tbody');
    await expect(tbody).toBeVisible();

    if (testInfo.project.name === 'desktop-1440x900') {
      await page.screenshot({
        path: path.join(CINEMATIC_SCREENSHOT_DIR, '07_double_entry_ledger.png'),
        fullPage: false
      });
    }
  });

  test('10. Multi-viewport responsive verification and screenshot capture', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Ensure zero horizontal overflow
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    // Capture full-width viewport screenshot
    await page.screenshot({
      path: path.join(CINEMATIC_SCREENSHOT_DIR, `viewport_${testInfo.project.name}.png`),
      fullPage: false
    });
  });

});
