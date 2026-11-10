const fs = require('fs');
const path = require('path');

const targetPath = 'D:/tally-nexus/src/dashboard/dashboard-html.ts';
let raw = fs.readFileSync(targetPath, 'utf8');
const isCrlf = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

console.log('Original length:', content.length);

// 1. Fix CSS .metric-value color from #FFF to #0B1E3F
content = content.replace(
  /\.metric-value\s*\{\s*font-size:\s*28px;\s*font-weight:\s*800;\s*letter-spacing:\s*-0\.5px;\s*color:\s*#FFF;/g,
  () => `.metric-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0B1E3F;`
);

// 2. Fix .btn-secondary in CSS to be crisp light fintech button
content = content.replace(
  /\.btn-secondary\s*\{\s*background:\s*rgba\(11,\s*23,\s*44,\s*0\.75\);\s*color:\s*#E2E8F0;\s*border:\s*1px\s*solid\s*rgba\(0,\s*156,\s*222,\s*0\.28\);[\s\S]*?\.btn-secondary:hover\s*\{[\s\S]*?\}/,
  () => `.btn-secondary {
      background: #FFFFFF;
      color: #0F172A;
      border: 1px solid #CBD5E1;
      border-radius: 9999px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      font-weight: 600;
    }
    .btn-secondary:hover {
      background: #F8FAFD;
      border-color: #0070BA;
      color: #0070BA;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 112, 186, 0.12);
    }`
);

// 3. Fix .status-chip-proof to have standardized 36px height matching primary buttons
content = content.replace(
  /\.status-chip-proof\s*\{[\s\S]*?box-shadow:\s*0\s*1px\s*3px\s*rgba\(0,\s*112,\s*186,\s*0\.08\);\s*\}/,
  () => `.status-chip-proof {
      display: inline-flex; align-items: center; gap: 7px;
      background: #EBF4FC; border: 1px solid rgba(0, 112, 186, 0.25);
      color: #0070BA; height: 36px; padding: 0 16px; border-radius: 9999px; font-size: 12.5px; font-weight: 700; cursor: pointer;
      transition: all 0.15s ease; font-variant-numeric: tabular-nums;
      box-shadow: 0 1px 3px rgba(0, 112, 186, 0.08); box-sizing: border-box; text-decoration: none;
    }
    .status-chip-proof:hover {
      background: #DDF0FB; border-color: #0070BA; transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 112, 186, 0.16);
    }`
);

// 4. Standardize 3 Innovation Cards (Card 1, Card 2, Card 3) in Hackathon Judge Briefing Panel
const targetCardsRegex = /<!-- 3 Headline Cards Grid matching user screenshot -->[\s\S]*?<!-- 30-Second Guided Tour Container matching user screenshot -->/;

const replacementCards = `<!-- 3 Headline Cards Grid matching user screenshot -->
              <div class="judge-panel-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 20px;">
                
                <!-- CARD 1: ROYAL BLUE GRADIENT HERO CARD -->
                <div style="background: linear-gradient(145deg, #0070BA 0%, #003087 100%); border-radius: 22px; padding: 24px; color: #FFFFFF; position: relative; box-shadow: 0 14px 32px rgba(0, 112, 186, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3); border: 1px solid rgba(255, 255, 255, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <!-- Top Right Watermark PayPal Logo -->
                  <div style="position: absolute; top: 18px; right: 20px; opacity: 0.25; pointer-events: none;">
                    <svg width="24" height="28" viewBox="0 0 100 115" fill="none">
                      <path d="M26.4 105L37.8 24.3H68.5C79.8 24.3 88.5 27.3 93.4 33.1C98.3 38.9 98.7 47.3 95.8 56.6C92.8 66.5 86.9 74.4 79.1 79.1C72.5 83.1 64.4 85 55.4 85H42.7L36.6 105H26.4Z" fill="#FFF"/>
                    </svg>
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12); flex-shrink: 0;">
                        ⚙️
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #FFFFFF; letter-spacing: -0.2px;">1. AI-Assisted SLA Evaluation</span>
                    </div>
                    <p style="font-size: 12.5px; color: rgba(255, 255, 255, 0.94); line-height: 1.6; margin-bottom: 18px;">
                      Autonomous task deliverables adjudicated via <strong>FreeModel (Gemini 3.7 Flash)</strong> with automatic <strong>DeepSeek v4.1 Flash</strong> failover. Purely advisory; zero access to money movement, enforced by deterministic credit clamps.
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button onclick="testLiveAiJudge()" style="display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; color: #0070BA; font-weight: 700; border-radius: 9999px; height: 36px; padding: 0 18px; font-size: 12.5px; border: none; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15); cursor: pointer; transition: all 0.2s ease; box-sizing: border-box;">
                      <span>▶</span> <span>Run Live AI Evaluation</span>
                    </button>
                    <a href="/api/judge/evaluate" target="_blank" style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.2); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 9999px; height: 36px; padding: 0 16px; font-size: 12.5px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; box-sizing: border-box;">
                      Live Route
                    </a>
                  </div>
                </div>

                <!-- CARD 2: CRISP WHITE GLASSMORPHIC CARD -->
                <div style="background: rgba(255, 255, 255, 0.96); border-radius: 22px; padding: 24px; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.06), inset 0 1px 0 #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: #EBF4FC; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; border: 1px solid rgba(0, 112, 186, 0.18); flex-shrink: 0;">
                        🥞
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">2. Deterministic Netting & PayPal Rails</span>
                    </div>
                    <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">
                      Compresses circular bilateral agent debt by <strong>65.38% to 99.4%</strong>. Settles conserved net debtor balances via <strong>PayPal Orders v2 capture ($1.00)</strong> and creditor disbursements via <strong>PayPal Payouts v1 ($0.50 + $0.50)</strong>.
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button class="status-chip-proof" onclick="verifyPayPalCapture('7PV82720RX415822V')">
                      <span style="color: #0070BA; font-weight: 800;">🅿️</span> Verify Live Capture
                    </button>
                    <button class="status-chip-proof" onclick="verifyPayPalPayout('N4M49PUHNCNQ4')">
                      <span style="color: #0070BA; font-weight: 800;">🅿️</span> Verify Live Payout
                    </button>
                  </div>
                </div>

                <!-- CARD 3: CRISP WHITE GLASSMORPHIC CARD -->
                <div style="background: rgba(255, 255, 255, 0.96); border-radius: 22px; padding: 24px; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.06), inset 0 1px 0 #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: #EBF4FC; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; border: 1px solid rgba(0, 112, 186, 0.18); flex-shrink: 0;">
                        🛡️
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">3. Verifiable Subledger & Cryptography</span>
                    </div>
                    <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">
                      Double-entry subledger asserted by <strong>14 SQLite database triggers</strong>, Ed25519 RFC 8785 signatures, cryptographic SHA-256 Merkle tree anchors, and mathematical zero-variance (<strong>Δ = $0.00</strong>).
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button class="status-chip-proof" onclick="switchTab('ledger')">
                      📊 View Trial Balance
                    </button>
                    <button class="status-chip-proof" onclick="switchTab('security')">
                      🛡️ Invariant Center
                    </button>
                  </div>
                </div>

              </div>

              <!-- 30-Second Guided Tour Container matching user screenshot -->`;

content = content.replace(targetCardsRegex, () => replacementCards);

// 5. Overhaul 30-Second Guided Tour to strict, equal-width, non-wrapping flex layout with chevrons
const targetTourRegex = /<!-- 30-Second Guided Tour Container matching user screenshot -->[\s\S]*?<!-- EXECUTIVE HERO GRID/;

const replacementTour = `<!-- 30-Second Guided Tour Container matching user screenshot -->
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; padding: 18px 22px; box-shadow: 0 6px 20px rgba(0, 112, 186, 0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: #0B1E3F;">
                    <span style="color: #0070BA; font-size: 16px;">⚡</span> 30-Second Tour for Judges (6 Guided Clicks)
                  </div>
                  <span style="font-size: 12px; color: #64748B; font-weight: 500;">Follow steps 1 – 6 to independently inspect end-to-end clearing</span>
                </div>
                <div class="tour-steps-row" style="display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%;">
                  
                  <!-- STEP 1 -->
                  <div class="tour-step-card" id="tour-card-1" onclick="tourStep(1)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🏛️</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Clearing Room</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Open Overview</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #94A3B8; font-weight: 700; font-size: 13px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 2 -->
                  <div class="tour-step-card" id="tour-card-2" onclick="tourStep(2)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🚀</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Run Flagship</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Execute 5-agent sim</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #94A3B8; font-weight: 700; font-size: 13px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 3 -->
                  <div class="tour-step-card" id="tour-card-3" onclick="tourStep(3)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🤖</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">AI SLA Verdict</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Inspect clamp</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #94A3B8; font-weight: 700; font-size: 13px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 4 -->
                  <div class="tour-step-card" id="tour-card-4" onclick="tourStep(4)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">4</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🪙</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Net Positions</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">$130 &rarr; $45 net</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #94A3B8; font-weight: 700; font-size: 13px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 5 -->
                  <div class="tour-step-card" id="tour-card-5" onclick="tourStep(5)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">5</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🅿️</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">PayPal Proof</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Live Debug-ID</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #94A3B8; font-weight: 700; font-size: 13px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 6 -->
                  <div class="tour-step-card" id="tour-card-6" onclick="tourStep(6)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 10px 10px; display: flex; align-items: center; gap: 8px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 56px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 22px; height: 22px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">6</div>
                    <span style="font-size: 17px; flex-shrink: 0;">🔒</span>
                    <div style="min-width: 0; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 12px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">Merkle Ledger</div>
                      <div class="tour-step-sub" style="font-size: 10.5px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.25;">&Delta; = $0.00 proof</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <!-- EXECUTIVE HERO GRID`;

content = content.replace(targetTourRegex, () => replacementTour);

// 6. Fix Secondary Insights Grid (Trust Card + Agent Bar Chart):
// Make Trust Card cohesive with PayPal theme (clean white card with navy text and soft blue chips)
content = content.replace(
  /<div class="card" style="background: linear-gradient\(145deg, rgba\(16, 34, 64, 0\.85\) 0%, rgba\(10, 23, 44, 0\.72\) 100%\);">\s*<div style="font-size: 18px; font-weight: 800; color: #FFF; line-height: 1\.3; margin-bottom: 8px;">\s*Trusted by Autonomous Swarms Worldwide\s*<\/div>\s*<p style="font-size: 12\.5px; color: var\(--text-secondary\); line-height: 1\.6; margin-bottom: 20px;">\s*Secure, deterministic, and cryptographic clearance for micro-IOUs and inter-agent commerce\.\s*<\/p>\s*<!-- Agent Avatars Row -->\s*<div style="display: flex; align-items: center; gap: 6px; margin-bottom: 22px;">[\s\S]*?<button class="btn btn-white" style="width: 100%; padding: 11px;" onclick="switchTab\('security'\)">🛡️ Invariant Center<\/button>\s*<\/div>/,
  () => `<div class="card" style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.05); border-radius: 24px; padding: 26px;">
              <div style="font-size: 18px; font-weight: 800; color: #0B1E3F; line-height: 1.3; margin-bottom: 8px;">
                Trusted by Autonomous Swarms Worldwide
              </div>
              <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Secure, deterministic, and cryptographic clearance for micro-IOUs and inter-agent commerce.
              </p>

              <!-- Agent Avatars Row -->
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 22px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #0070BA; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 112, 186, 0.25);">α</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #009CDE; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 156, 222, 0.25);">β</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #10B981; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">γ</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #003087; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 48, 135, 0.25);">δ</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #EBF4FC; border: 1px solid rgba(0, 112, 186, 0.22); color: #0070BA; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">+10</div>
              </div>

              <button class="btn btn-secondary" style="width: 100%; height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="switchTab('security')">🛡️ Invariant Center</button>
            </div>`
);

// 7. Fix Bar Chart amount and Dec label in Agent Liquidity Distribution
content = content.replace(
  /<div style="font-size: 20px; font-weight: 800; color: #FFF; margin-top: 4px;">\$3,200\.00 <span style="font-size: 12px; font-weight: 600; color: var\(--accent-emerald\);">↑ 1\.52%<\/span><\/div>/,
  () => `<div style="font-size: 20px; font-weight: 800; color: #0B1E3F; margin-top: 4px;">$3,200.00 <span style="font-size: 12px; font-weight: 600; color: var(--accent-emerald);">↑ 1.52%</span></div>`
);

content = content.replace(
  /<span style="font-size: 10px; color: #FFF; font-weight: 700;">Dec<\/span>/,
  () => `<span style="font-size: 10px; color: #059669; font-weight: 800;">Dec</span>`
);

// 8. Fix Architectural Principle description text contrast
content = content.replace(
  /<p style="color: #CBD5E1; font-size: 13\.5px; line-height: 1\.7;">/,
  () => `<p style="color: #334155; font-size: 13.5px; line-height: 1.7;">`
);

// 9. Fix Quick filter input in Scale Tab (IOUS table)
content = content.replace(
  /<div style="display: flex; align-items: center; gap: 10px; background: rgba\(4, 9, 20, 0\.85\); border: 1px solid rgba\(0, 156, 222, 0\.3\); border-radius: 9999px; padding: 6px 16px; flex: 1; max-width: 480px; box-shadow: inset 0 1px 2px rgba\(0,0,0,0\.5\);">\s*<span style="font-size: 14px; color: var\(--accent-secondary\);">🔍<\/span>\s*<input type="text" id="ious-filter-input" style="background: transparent; border: none; color: #FFF; outline: none; font-size: 13px; font-family: var\(--font-sans\); width: 100%;"/,
  () => `<div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; padding: 7px 18px; flex: 1; max-width: 480px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <span style="font-size: 14px; color: #0070BA;">🔍</span>
                <input type="text" id="ious-filter-input" style="background: transparent; border: none; color: #0F172A; outline: none; font-size: 13px; font-family: var(--font-sans); width: 100%;"`
);

// 10. Fix Quick filter input in Security Tab (Verify IOU)
content = content.replace(
  /<div style="display: flex; align-items: center; gap: 10px; background: rgba\(4, 9, 20, 0\.85\); border: 1px solid rgba\(0, 156, 222, 0\.3\); border-radius: 9999px; padding: 6px 18px; flex: 1; min-width: 300px; box-shadow: inset 0 1px 2px rgba\(0,0,0,0\.5\);">\s*<span style="font-size: 14px; color: var\(--accent-secondary\);">🔍<\/span>\s*<input type="text" id="verify-iou-input" style="background: transparent; border: none; color: #FFF; outline: none; font-size: 13px; font-family: var\(--font-sans\); width: 100%;"/,
  () => `<div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; padding: 7px 18px; flex: 1; min-width: 300px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <span style="font-size: 14px; color: #0070BA;">🔍</span>
                <input type="text" id="verify-iou-input" style="background: transparent; border: none; color: #0F172A; outline: none; font-size: 13px; font-family: var(--font-sans); width: 100%;"`
);

// 11. Fix PayPal Verify Modal title & loading text colors
content = content.replace(
  /<div style="font-weight: 800; color: #FFF; font-size: 16px; letter-spacing: -0\.2px;">PayPal Sandbox Authoritative Proof<\/div>/,
  () => `<div style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0.2px;">PayPal Sandbox Authoritative Proof</div>`
);

content = content.replace(
  /<div style="font-size: 14px; font-weight: 600; color: #FFF;">Querying api-m\.sandbox\.paypal\.com in real-time\.\.\.<\/div>/,
  () => `<div style="font-size: 14px; font-weight: 600; color: #0B1E3F;">Querying api-m.sandbox.paypal.com in real-time...</div>`
);

content = content.replace(
  /<span id="mp-task-title" style="font-weight: 600; color: #F1F5F9;">-<\/span>/,
  () => `<span id="mp-task-title" style="font-weight: 600; color: #0F172A;">-</span>`
);

// 12. Update tourStep JS function to highlight the active tour card
content = content.replace(
  /function tourStep\(step\)\s*\{[\s\S]*?console\.log\('Executing Tour Step:', step\);/,
  () => `function tourStep(step) {
    console.log('Executing Tour Step:', step);
    // Visual indicator on active tour card
    document.querySelectorAll('.tour-step-card').forEach(c => {
      c.style.borderColor = '#E2E8F0';
      c.style.background = '#FFFFFF';
      c.style.boxShadow = '0 2px 6px rgba(0, 112, 186, 0.04)';
    });
    document.querySelectorAll('.tour-step-badge').forEach(b => {
      b.style.background = '#EBF4FC';
      b.style.color = '#0070BA';
    });
    const activeCard = document.getElementById('tour-card-' + step);
    if (activeCard) {
      activeCard.style.borderColor = '#0070BA';
      activeCard.style.background = '#F0F7FF';
      activeCard.style.boxShadow = '0 4px 14px rgba(0, 112, 186, 0.16)';
      const activeBadge = activeCard.querySelector('.tour-step-badge');
      if (activeBadge) {
        activeBadge.style.background = '#0070BA';
        activeBadge.style.color = '#FFFFFF';
      }
    }`
);

// Restore line endings if originally CRLF
if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully updated dashboard-html.ts. New length:', content.length);
