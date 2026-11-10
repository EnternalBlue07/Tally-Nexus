const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:/Users/Mohammad Zumaan/.gemini/antigravity/brain/e86962ed-a34e-4a5b-b5c6-b980a583ba81';

async function runVerification() {
  console.log('Launching Chromium for Visual Verification...');
  const browser = await chromium.launch({ headless: true });
  
  // 1. Desktop 1440x900 Verification
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Evaluate computed styles and dimensions
  const metrics = await page.evaluate(() => {
    // 1. Tour steps width check
    const tourCards = Array.from(document.querySelectorAll('.tour-step-card'));
    const tourCardWidths = tourCards.map(c => c.getBoundingClientRect().width);
    const tourCardHeights = tourCards.map(c => c.getBoundingClientRect().height);
    
    // Check titles wrapping
    const tourTitles = Array.from(document.querySelectorAll('.tour-step-title')).map(t => ({
      text: t.innerText,
      scrollHeight: t.scrollHeight,
      clientHeight: t.clientHeight,
      isWrapped: t.scrollHeight > t.clientHeight + 2
    }));

    // 2. Innovation Cards dimensions
    const headlineCards = Array.from(document.querySelectorAll('.judge-panel-grid > div'));
    const headlineCardHeights = headlineCards.map(c => c.getBoundingClientRect().height);
    const headlineCardY = headlineCards.map(c => c.getBoundingClientRect().top);

    // 3. KPI metric value colors
    const metricValues = Array.from(document.querySelectorAll('.metric-value')).map(m => ({
      id: m.id || 'unknown',
      text: m.innerText,
      color: window.getComputedStyle(m).color,
      backgroundColor: window.getComputedStyle(m.parentElement).backgroundColor
    }));

    // 4. Architectural Principle contrast
    const archCards = Array.from(document.querySelectorAll('#tab-overview .card'));
    const archCard = archCards.find(c => c.innerText.includes('Architectural Principle'));
    const archP = archCard ? archCard.querySelector('p') : null;
    const archColor = archP ? window.getComputedStyle(archP).color : 'not found';

    // 5. Agent Liquidity Distribution ($3,200.00)
    const agentLiq = document.querySelector('.insights-grid > div:nth-child(2) div[style*="font-size: 20px"]');
    const agentLiqColor = agentLiq ? window.getComputedStyle(agentLiq).color : 'not found';

    return {
      tourCardWidths,
      tourCardHeights,
      tourTitles,
      headlineCardHeights,
      headlineCardY,
      metricValues,
      archColor,
      agentLiqColor
    };
  });

  console.log('\n=== COMPUTED VERIFICATION METRICS ===');
  console.log('Tour Card Widths (px):', metrics.tourCardWidths);
  console.log('Tour Card Heights (px):', metrics.tourCardHeights);
  console.log('Tour Titles Wrapping Status:', metrics.tourTitles);
  console.log('Headline Cards Heights (px):', metrics.headlineCardHeights);
  console.log('Headline Cards Y-Tops (px):', metrics.headlineCardY);
  console.log('Metric Value Colors:', metrics.metricValues.slice(0, 4));
  console.log('Architectural Principle Color:', metrics.archColor);
  console.log('Agent Liquidity Color:', metrics.agentLiqColor);

  // Take Screenshots for Artifacts
  console.log('\nCapturing screenshots to Artifact Directory...');
  
  // 1. Judge Briefing Panel & 30-Second Tour
  const judgePanel = page.locator('#judge-briefing-panel');
  if (await judgePanel.count() > 0) {
    await judgePanel.screenshot({
      path: path.join(ARTIFACT_DIR, '16_judge_panel_and_tour_fixed.png')
    });
    console.log('Saved: 16_judge_panel_and_tour_fixed.png');
  }

  // 2. Full Dashboard Viewport (1440x900)
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, '20_full_dashboard_reconstructed.png'),
    fullPage: false
  });
  console.log('Saved: 20_full_dashboard_reconstructed.png');

  // 3. Lower section: Agent Liquidity, Trust Card, Recent Tx
  const insightsGrid = page.locator('.insights-grid');
  if (await insightsGrid.count() > 0) {
    await insightsGrid.screenshot({
      path: path.join(ARTIFACT_DIR, '18_agent_liquidity_and_kpis_fixed.png')
    });
    console.log('Saved: 18_agent_liquidity_and_kpis_fixed.png');
  }

  // 4. Flagship Stepper & Architectural Principle
  const flagshipCard = page.locator('.stepper').locator('xpath=..');
  if (await flagshipCard.count() > 0) {
    await flagshipCard.screenshot({
      path: path.join(ARTIFACT_DIR, '17_flagship_and_architectural_fixed.png')
    });
    console.log('Saved: 17_flagship_and_architectural_fixed.png');
  }

  await context.close();

  // 5. Mobile Viewport 390x844 (iPhone 14)
  console.log('\nTesting Mobile Viewport (390x844 iPhone 14)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1000);

  await mobilePage.screenshot({
    path: path.join(ARTIFACT_DIR, '19_mobile_viewport_390x844.png'),
    fullPage: false
  });
  console.log('Saved: 19_mobile_viewport_390x844.png');

  await mobileContext.close();
  await browser.close();
  console.log('\nAll Visual Verifications Completed Successfully!');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
