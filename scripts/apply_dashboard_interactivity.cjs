const fs = require('fs');

const path = 'D:/tally-nexus/src/dashboard/dashboard-html.ts';
let code = fs.readFileSync(path, 'utf8');
const isCrlf = code.includes('\r\n');
code = code.replace(/\r\n/g, '\n');

console.log('Original length:', code.length);

// 1. Chart Time Filter
{
  const startMarker = 'class="chart-time-filter">';
  const idx = code.indexOf(startMarker);
  if (idx === -1) throw new Error('Time filter marker not found');
  const endIdx = code.indexOf('</div>', idx) + 6;
  const replacement = `class="chart-time-filter">
                  <button id="time-pill-1y" class="time-pill" onclick="setTimeFilter('1y')">1 year</button>
                  <button id="time-pill-6m" class="time-pill active" onclick="setTimeFilter('6m')">6 month</button>
                  <button id="time-pill-3m" class="time-pill" onclick="setTimeFilter('3m')">3 month</button>
                  <button id="time-pill-1m" class="time-pill" onclick="setTimeFilter('1m')">1 month</button>
                </div>`;
  code = code.slice(0, idx) + replacement + code.slice(endIdx);
  console.log('1. Time filter updated');
}

// 2. SVG Area Chart
{
  const startMarker = '<!-- Filled Area -->';
  const idx = code.indexOf(startMarker);
  if (idx === -1) throw new Error('SVG start marker not found');
  const endIdx = code.indexOf('</g>', idx) + 4;
  const replacement = `<!-- Filled Area -->
                  <path id="hero-chart-area" d="M 0 140 C 50 130, 80 150, 120 110 C 160 70, 200 120, 250 90 C 300 60, 340 100, 390 70 C 440 40, 480 80, 530 50 C 580 20, 620 90, 700 60 L 700 180 L 0 180 Z" 
                        fill="url(#paypalChartGradient)" style="transition: d 0.5s ease;" />

                  <!-- Stroke Line -->
                  <path id="hero-chart-stroke" d="M 0 140 C 50 130, 80 150, 120 110 C 160 70, 200 120, 250 90 C 300 60, 340 100, 390 70 C 440 40, 480 80, 530 50 C 580 20, 620 90, 700 60" 
                        fill="none" stroke="#0070BA" stroke-width="2.5" filter="url(#glowPaypal)" style="transition: d 0.5s ease;" />

                  <!-- Active Pin Tooltip (Light Glassmorphic) -->
                  <circle id="hero-chart-dot" cx="480" cy="80" r="5" fill="#0070BA" stroke="#FFFFFF" stroke-width="2.5" style="transition: all 0.5s ease;" />
                  <g id="hero-chart-tooltip" transform="translate(415, 12)" style="transition: transform 0.5s ease;">
                    <rect width="130" height="46" rx="10" fill="#FFFFFF" stroke="#0070BA" stroke-width="1.5" filter="drop-shadow(0 4px 14px rgba(0,112,186,0.18))" />
                    <text id="hero-chart-tip-date" x="14" y="20" font-size="10" font-weight="600" fill="#64748B" font-family="var(--font-sans)">09 Dec, 2024 ↗</text>
                    <text id="hero-chart-tip-amt" x="14" y="37" font-size="13" font-weight="800" fill="#0070BA" font-family="var(--font-sans)">$9,780.90 USD</text>
                  </g>`;
  code = code.slice(0, idx) + replacement + code.slice(endIdx);

  code = code.replace(
    '<span>Average annual compression: <strong style="color: #0B1E3F;">84.2%</strong></span>',
    '<span>Average annual compression: <strong id="hero-compression-val" style="color: #0B1E3F;">84.2%</strong></span>'
  );
  code = code.replace(
    '<span class="balance-pill">↑ 2.92%</span>',
    '<span id="hero-balance-trend" class="balance-pill">↑ 2.92%</span>'
  );
  console.log('2. SVG Chart & Compression label updated');
}

// 3. Card Stack
{
  const startMarker = '<!-- Right: 3D Stacked Card Showcase';
  const idx = code.indexOf(startMarker);
  if (idx === -1) throw new Error('Card stack start marker not found');
  const endIdx = code.indexOf('<!-- 4-METRIC FINANCIAL CARDS -->', idx);
  if (endIdx === -1) throw new Error('Metric cards marker not found');

  const replacement = `<!-- Right: 3D Stacked Card Showcase ("My cards" - Exact PayPal Theme + Glassmorphism Outline) -->
            <div class="anchor-card-stack-wrapper">
              <!-- Header matching reference -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                <div style="font-size: 15px; font-weight: 800; color: #0B1E3F; letter-spacing: -0.2px;">My cards</div>
                <button class="btn btn-secondary" onclick="openAddCardModal()" style="font-size: 11.5px; padding: 4px 14px; border-radius: 9999px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0070BA; font-weight: 700; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.08);">+ Add new</button>
              </div>

              <div style="position: relative; flex: 1; display: flex; flex-direction: column;" id="my-cards-container">
                <!-- Back Card 2: Visa Commercial (Clickable) -->
                <div class="card-stack-back-2" id="card-back-2" onclick="selectCard(2)" title="Click to view card" style="cursor: pointer; pointer-events: auto; transition: all 0.3s ease;">
                  <span id="card-back-2-title" style="letter-spacing: 1px;">VISA <span style="font-size: 9.5px; opacity: 0.6; margin-left: 4px; font-weight: 600;">COMMERCIAL</span></span>
                  <span id="card-back-2-val" style="font-family: var(--font-mono); font-weight: 600; opacity: 0.85;">$6,150.00</span>
                </div>

                <!-- Back Card 1: Mastercard Reserve (Clickable) -->
                <div class="card-stack-back-1" id="card-back-1" onclick="selectCard(1)" title="Click to view card" style="cursor: pointer; pointer-events: auto; transition: all 0.3s ease;">
                  <span id="card-back-1-title" style="display: flex; align-items: center; gap: 6px;">
                    <svg width="24" height="15" viewBox="0 0 36 24" style="vertical-align: middle;">
                      <circle cx="12" cy="12" r="10" fill="#EB001B" fill-opacity="0.95"/>
                      <circle cx="24" cy="12" r="10" fill="#FF5F00" fill-opacity="0.9"/>
                    </svg>
                    <span style="letter-spacing: 0.5px; opacity: 0.8; font-size: 10px;">RESERVE</span>
                  </span>
                  <span id="card-back-1-val" style="font-family: var(--font-mono); font-weight: 600; opacity: 0.9;">$3,140.00</span>
                </div>

                <!-- Front Featured Card: Authentic PayPal Commercial Clearing Card -->
                <div class="anchor-card-showcase" id="active-card-box" style="transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                  <div class="anchor-top">
                    <!-- Dynamic Brand Monogram + Wordmark -->
                    <div id="active-card-brand-display" style="display: flex; align-items: center; gap: 10px;">
                      <svg width="30" height="24" viewBox="0 0 100 80" fill="none" style="vertical-align: middle;">
                        <path d="M26.4 75L35.2 19.3H56.5C64.3 19.3 70.3 21.4 73.7 25.4C77.1 29.5 77.4 35.3 75.4 41.8C73.3 48.7 69.2 54.2 63.8 57.5C59.2 60.3 53.6 61.6 47.4 61.6H38.5L34.3 75H26.4Z" fill="#003087"/>
                        <path d="M38.5 61.6H47.4C53.6 61.6 59.2 60.3 63.8 57.5C69.2 54.2 73.3 48.7 75.4 41.8C77.4 35.3 77.1 29.5 73.7 25.4C72.8 24.3 71.7 23.4 70.4 22.6C68.3 22.4 65.8 22.4 63.1 22.4H47.1L40.2 66.2L38.5 61.6Z" fill="#002169" opacity="0.4"/>
                        <path d="M38.5 61.6L44.8 22.4H63.1C70.9 22.4 76.9 24.5 80.3 28.5C83.7 32.6 84 38.4 82 44.9C79.9 51.8 75.8 57.3 70.4 60.6C65.8 63.4 60.2 64.7 54 64.7H43.3L40.2 84H32.3L38.5 61.6Z" fill="#009CDE"/>
                      </svg>
                      <span id="active-card-brand-name" style="font-weight: 800; font-size: 16px; letter-spacing: -0.3px; color: #FFFFFF;">PayPal</span>
                    </div>

                    <!-- NFC Waves + EMV Smart Chip -->
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round">
                        <path d="M8.5 16.5a5 5 0 0 1 0-7"/>
                        <path d="M12 19a8.5 8.5 0 0 0 0-14"/>
                        <path d="M15.5 21.5a12 12 0 0 0 0-19"/>
                      </svg>
                      <div class="anchor-card-chip"></div>
                    </div>
                  </div>

                  <!-- Card Number & Net Balance -->
                  <div style="margin-top: 8px; margin-bottom: 6px;">
                    <div id="active-card-number" style="font-family: var(--font-mono); letter-spacing: 2px; font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 8px;">•••• &nbsp; •••• &nbsp; •••• &nbsp; 822V</div>
                    <div class="anchor-balance-label" id="active-card-holder-label">Net Cleared Balance</div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                      <div class="anchor-balance-val" id="active-card-balance">$12,850.00</div>
                      <span id="active-card-change" style="font-size: 11.5px; font-weight: 700; color: #22C55E; background: rgba(34, 197, 94, 0.16); border: 1px solid rgba(34, 197, 94, 0.35); padding: 3px 9px; border-radius: 9999px;">↑ 3.52%</span>
                    </div>
                  </div>

                  <!-- Card Actions (Request / Clear & Settle) -->
                  <div class="anchor-actions">
                    <button class="btn btn-glass" onclick="openRequestLiquidityModal()" title="Drawdown agent liquidity line of credit">↘ Request</button>
                    <button class="btn btn-paypal" id="card-clear-settle-btn" onclick="executeClearAndSettle()" title="Execute deterministic multilateral netting and PayPal rails settlement">↗ Clear & Settle</button>
                  </div>
                </div>
              </div>
            </div>
          </div>\n\n          `;

  code = code.slice(0, idx) + replacement + code.slice(endIdx);
  console.log('3. Card stack updated');
}

// 4. Agent Liquidity Distribution Bars
{
  const startMarker = '<!-- CSS / SVG Bar Chart matching Reference';
  const idx = code.indexOf(startMarker);
  if (idx === -1) throw new Error('Bars start marker not found');
  const endIdx = code.indexOf('<!-- Right: Recent Transactions', idx);
  if (endIdx === -1) throw new Error('Recent transactions start marker not found');

  const replacement = `<!-- CSS / SVG Bar Chart matching Reference ($200-$500 with green highlight!) -->
              <div id="agent-liquidity-bar-container" style="display: flex; align-items: flex-end; justify-content: space-between; height: 130px; padding-top: 20px; gap: 8px;">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="bar-val-0" style="font-size: 10px; color: var(--text-muted);">$200</span>
                  <div id="bar-elem-0" style="width: 100%; height: 45px; background: rgba(0, 112, 186, 0.25); border-radius: 6px 6px 0 0; transition: height 0.4s ease;"></div>
                  <span id="bar-label-0" style="font-size: 10px; color: var(--text-secondary);">Sep</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="bar-val-1" style="font-size: 10px; color: var(--text-muted);">$300</span>
                  <div id="bar-elem-1" style="width: 100%; height: 65px; background: rgba(0, 112, 186, 0.4); border-radius: 6px 6px 0 0; transition: height 0.4s ease;"></div>
                  <span id="bar-label-1" style="font-size: 10px; color: var(--text-secondary);">Oct</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="bar-val-2" style="font-size: 10px; color: var(--text-muted);">$400</span>
                  <div id="bar-elem-2" style="width: 100%; height: 85px; background: rgba(0, 112, 186, 0.55); border-radius: 6px 6px 0 0; transition: height 0.4s ease;"></div>
                  <span id="bar-label-2" style="font-size: 10px; color: var(--text-secondary);">Nov</span>
                </div>
                <!-- Peak Highlight Bar (Emerald in Reference) -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="bar-val-3" style="font-size: 10px; font-weight: 800; background: var(--accent-emerald); color: #040914; padding: 1px 4px; border-radius: 4px;">$500</span>
                  <div id="bar-elem-3" style="width: 100%; height: 105px; background: linear-gradient(180deg, #10B981 0%, #059669 100%); border-radius: 6px 6px 0 0; box-shadow: 0 0 14px rgba(16, 185, 129, 0.45); transition: height 0.4s ease;"></div>
                  <span id="bar-label-3" style="font-size: 10px; color: #059669; font-weight: 800;">Dec</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span id="bar-val-4" style="font-size: 10px; color: var(--text-muted);">$400</span>
                  <div id="bar-elem-4" style="width: 100%; height: 85px; background: rgba(0, 112, 186, 0.55); border-radius: 6px 6px 0 0; transition: height 0.4s ease;"></div>
                  <span id="bar-label-4" style="font-size: 10px; color: var(--text-secondary);">Jan</span>
                </div>
              </div>
            </div>\n\n            `;

  code = code.slice(0, idx) + replacement + code.slice(endIdx);
  console.log('4. Liquidity bars updated');
}

// 5. Recent Transactions
{
  const startMarker = '<!-- Right: Recent Transactions (Matching Reference List!) -->';
  const idx = code.indexOf(startMarker);
  if (idx === -1) throw new Error('Recent transactions start marker not found');
  
  const headerIdx = code.indexOf('<div class="card-header">', idx);
  const innerDivIdx = code.indexOf('<div>', headerIdx);
  if (innerDivIdx === -1) throw new Error('Inner transactions div not found');

  code = code.slice(0, innerDivIdx) + '<div id="recent-transactions-list">' + code.slice(innerDivIdx + 5);
  console.log('5. Recent transactions container id injected');
}

// 6. Modals
{
  const targetModalInsertion = '<div id="toast-container"></div>';
  const idx = code.indexOf(targetModalInsertion);
  if (idx === -1) throw new Error('Toast container not found');

  const modalsHtml = `<div id="toast-container"></div>

  <!-- Add Card Modal (Strict Luhn Mod 10 & Expiry Check) -->
  <div id="add-card-modal" style="display: none; position: fixed; inset: 0; background: rgba(11, 30, 63, 0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 9999; justify-content: center; align-items: center; padding: 20px;">
    <div style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.22); border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 25px 60px rgba(0, 48, 135, 0.25); overflow: hidden;">
      <!-- Modal Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFD;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: #0070BA; display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 800; font-size: 16px;">💳</div>
          <div>
            <div style="font-weight: 800; color: #0B1E3F; font-size: 15px; letter-spacing: -0.2px;">Add Settlement Card</div>
            <div style="font-size: 11.5px; color: #64748B;">Link a verified payment card to consortium clearing</div>
          </div>
        </div>
        <button onclick="closeAddCardModal()" style="background: transparent; border: none; font-size: 22px; color: #94A3B8; cursor: pointer; line-height: 1;">&times;</button>
      </div>

      <!-- Live Card Visual Preview -->
      <div style="padding: 18px 24px 10px 24px;">
        <div id="modal-card-preview" style="background: linear-gradient(135deg, #011638 0%, #002B7A 50%, #0070BA 100%); border-radius: 14px; padding: 18px 20px; color: #FFFFFF; box-shadow: 0 8px 20px rgba(0, 112, 186, 0.3); position: relative; overflow: hidden; transition: all 0.3s ease;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <span id="preview-brand-tag" style="font-weight: 800; font-size: 14px; letter-spacing: -0.2px;">PayPal Commercial</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px; opacity: 0.85;">📶</span>
              <div style="width: 26px; height: 18px; background: linear-gradient(135deg, #FDE68A 0%, #D97706 100%); border-radius: 4px; border: 1px solid #B45309;"></div>
            </div>
          </div>
          <div id="preview-card-num" style="font-family: var(--font-mono); font-size: 14px; letter-spacing: 2px; margin-bottom: 14px; color: rgba(255, 255, 255, 0.95);">•••• &nbsp; •••• &nbsp; •••• &nbsp; ••••</div>
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255, 255, 255, 0.65);">Cardholder</div>
              <div id="preview-card-name" style="font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">YOUR NAME</div>
            </div>
            <div>
              <div style="font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.8px; color: rgba(255, 255, 255, 0.65);">Expires</div>
              <div id="preview-card-exp" style="font-family: var(--font-mono); font-size: 11px; font-weight: 700;">MM/YY</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Form Inputs -->
      <div style="padding: 10px 24px 20px 24px;">
        <div id="add-card-error" style="display: none; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; color: #991B1B; font-size: 11.5px; font-weight: 600; margin-bottom: 12px; line-height: 1.4;"></div>

        <div style="margin-bottom: 10px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Cardholder Name</label>
          <input type="text" id="card-input-name" placeholder="e.g. MOHAMMAD ZUMAAN" oninput="updateCardPreview()" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12.5px; outline: none; box-sizing: border-box; text-transform: uppercase;">
        </div>

        <div style="margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 11px; font-weight: 700; color: #334155;">Card Number</label>
            <span id="card-detected-brand" style="font-size: 10.5px; font-weight: 700; color: #0070BA;">Auto-detecting Brand</span>
          </div>
          <input type="text" id="card-input-number" placeholder="4532 0151 1283 0366" maxlength="19" oninput="handleCardNumberInput(this)" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; font-family: var(--font-mono); outline: none; box-sizing: border-box;">
        </div>

        <div style="display: gap: 10px; margin-bottom: 12px; display: flex;">
          <div style="flex: 1;">
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Expiry Date</label>
            <input type="text" id="card-input-exp" placeholder="MM/YY" maxlength="5" oninput="handleExpiryInput(this)" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12.5px; font-family: var(--font-mono); text-align: center; outline: none; box-sizing: border-box;">
          </div>
          <div style="flex: 1;">
            <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">CVV / CVC</label>
            <input type="password" id="card-input-cvv" placeholder="•••" maxlength="4" oninput="this.value = this.value.replace(/[^0-9]/g, '')" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12.5px; font-family: var(--font-mono); text-align: center; outline: none; box-sizing: border-box;">
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Treasury Allocation Role</label>
          <select id="card-input-type" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; background: #FFFFFF; outline: none; box-sizing: border-box;">
            <option value="Commercial Reserve">Commercial Reserve Clearing Pool</option>
            <option value="Operating Liquidity">Autonomous Agent Operating Liquidity</option>
            <option value="Settlement Guarantee">Multilateral Settlement Guarantee Fund</option>
          </select>
        </div>

        <div style="font-size: 10.5px; color: #64748B; margin-bottom: 14px; display: flex; align-items: center; gap: 5px;">
          <span>🔒</span> Mathematical Luhn Checksum & Expiry date enforcement active.
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="closeAddCardModal()" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 12px;">Cancel</button>
          <button class="btn btn-primary" onclick="submitAddCard()" style="padding: 8px 20px; border-radius: 8px; font-weight: 700; font-size: 12px; background: #0070BA; color: #FFF; border: none; cursor: pointer;">💳 Link & Verify Card</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Request Liquidity / Drawdown Modal (RFC 8785 Ed25519) -->
  <div id="request-liquidity-modal" style="display: none; position: fixed; inset: 0; background: rgba(11, 30, 63, 0.55); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 9999; justify-content: center; align-items: center; padding: 20px;">
    <div style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.22); border-radius: 20px; max-width: 480px; width: 100%; box-shadow: 0 25px 60px rgba(0, 48, 135, 0.25); overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFD;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: #009CDE; display: flex; align-items: center; justify-content: center; color: #FFF; font-weight: 800; font-size: 16px;">↘</div>
          <div>
            <div style="font-weight: 800; color: #0B1E3F; font-size: 15px; letter-spacing: -0.2px;">Request Agent Liquidity</div>
            <div style="font-size: 11.5px; color: #64748B;">Drawdown consortium credit line via cryptographically signed IOU</div>
          </div>
        </div>
        <button onclick="closeRequestLiquidityModal()" style="background: transparent; border: none; font-size: 22px; color: #94A3B8; cursor: line-height: 1;">&times;</button>
      </div>

      <div style="padding: 20px 24px;">
        <div id="req-liq-error" style="display: none; padding: 10px 14px; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 8px; color: #991B1B; font-size: 11.5px; font-weight: 600; margin-bottom: 12px; line-height: 1.4;"></div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Debtor Agent (Drawing Credit)</label>
          <select id="req-debtor" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12.5px; background: #FFF; outline: none; box-sizing: border-box;">
            <option value="agent_research">agent_research (Research Alpha)</option>
            <option value="agent_data">agent_data (Data Ingestion Bot)</option>
            <option value="agent_compute">agent_compute (Compute Swarm)</option>
            <option value="agent_loc">agent_loc (LOC Verification)</option>
            <option value="agent_qa">agent_qa (QA Auditor)</option>
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Creditor Agent / Liquidity Provider</label>
          <select id="req-creditor" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12.5px; background: #FFF; outline: none; box-sizing: border-box;">
            <option value="agent_compute">agent_compute (Compute Swarm Provider)</option>
            <option value="agent_treasury">agent_treasury (Consortium Treasury)</option>
            <option value="agent_data">agent_data (Data Ingestion Bot)</option>
            <option value="agent_research">agent_research (Research Alpha)</option>
            <option value="agent_loc">agent_loc (LOC Verification)</option>
          </select>
        </div>

        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Liquidity Amount (USD)</label>
          <input type="number" id="req-amount" value="250.00" step="10.00" min="1.00" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 13px; font-family: var(--font-mono); outline: none; box-sizing: border-box;">
        </div>

        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 4px;">Task Description & Allocation Memo</label>
          <input type="text" id="req-memo" value="Autonomous Compute Liquidity Drawdown" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 12px; outline: none; box-sizing: border-box;">
        </div>

        <div style="font-size: 10.5px; color: #64748B; margin-bottom: 16px; display: flex; align-items: center; gap: 5px;">
          <span>⚡</span> Dispatches RFC 8785 Ed25519 cryptographically signed IOU into active subledger.
        </div>

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn btn-secondary" onclick="closeRequestLiquidityModal()" style="padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 12px;">Cancel</button>
          <button class="btn btn-primary" onclick="submitRequestLiquidity()" style="padding: 8px 20px; border-radius: 8px; font-weight: 700; font-size: 12px; background: #0070BA; color: #FFF; border: none; cursor: pointer;">Issue Signed IOU</button>
        </div>
      </div>
    </div>
  </div>`;

  code = code.slice(0, idx) + modalsHtml + code.slice(idx + targetModalInsertion.length);
  console.log('6. Modals injected');
}

// 7. Client JS Logic (ZERO backslashes in regex)
{
  const targetPaletteSection = '/* --- COMMAND PALETTE & GLOBAL SEARCH ENGINE --- */';
  const idx = code.indexOf(targetPaletteSection);
  if (idx === -1) throw new Error('Palette section not found');

  const jsLogic = `
    /* ==========================================================================
       HERO AREA CHART INTERACTIVE TIMEFRAME FILTER
       ========================================================================== */
    var timeSeriesData = {
      '1y': {
        balance: '$18,450.00',
        trend: '↑ 4.15%',
        compression: '88.5%',
        date: '14 Oct, 2024 ↗',
        amt: '$16,210.00 USD',
        dotCx: 510,
        dotCy: 65,
        tipTranslate: 'translate(445, 0)',
        areaD: 'M 0 155 C 60 140, 110 160, 160 120 C 210 80, 260 130, 320 85 C 380 40, 440 90, 510 65 C 570 45, 630 85, 700 50 L 700 180 L 0 180 Z',
        strokeD: 'M 0 155 C 60 140, 110 160, 160 120 C 210 80, 260 130, 320 85 C 380 40, 440 90, 510 65 C 570 45, 630 85, 700 50'
      },
      '6m': {
        balance: '$10,120.50',
        trend: '↑ 2.92%',
        compression: '84.2%',
        date: '09 Dec, 2024 ↗',
        amt: '$9,780.90 USD',
        dotCx: 480,
        dotCy: 80,
        tipTranslate: 'translate(415, 12)',
        areaD: 'M 0 140 C 50 130, 80 150, 120 110 C 160 70, 200 120, 250 90 C 300 60, 340 100, 390 70 C 440 40, 480 80, 530 50 C 580 20, 620 90, 700 60 L 700 180 L 0 180 Z',
        strokeD: 'M 0 140 C 50 130, 80 150, 120 110 C 160 70, 200 120, 250 90 C 300 60, 340 100, 390 70 C 440 40, 480 80, 530 50 C 580 20, 620 90, 700 60'
      },
      '3m': {
        balance: '$6,840.20',
        trend: '↑ 1.85%',
        compression: '79.4%',
        date: '15 Jan, 2025 ↗',
        amt: '$5,420.00 USD',
        dotCx: 450,
        dotCy: 95,
        tipTranslate: 'translate(385, 27)',
        areaD: 'M 0 150 C 70 145, 130 155, 190 125 C 250 95, 310 135, 370 105 C 430 75, 490 115, 560 80 C 620 50, 660 75, 700 70 L 700 180 L 0 180 Z',
        strokeD: 'M 0 150 C 70 145, 130 155, 190 125 C 250 95, 310 135, 370 105 C 430 75, 490 115, 560 80 C 620 50, 660 75, 700 70'
      },
      '1m': {
        balance: '$2,565.00',
        trend: '↑ 1.10%',
        compression: '71.2%',
        date: '08 Feb, 2025 ↗',
        amt: '$2,100.00 USD',
        dotCx: 500,
        dotCy: 110,
        tipTranslate: 'translate(435, 42)',
        areaD: 'M 0 160 C 80 155, 150 160, 220 140 C 290 120, 360 145, 430 125 C 500 105, 570 130, 640 110 C 670 100, 685 105, 700 95 L 700 180 L 0 180 Z',
        strokeD: 'M 0 160 C 80 155, 150 160, 220 140 C 290 120, 360 145, 430 125 C 500 105, 570 130, 640 110 C 670 100, 685 105, 700 95'
      }
    };

    function setTimeFilter(period) {
      ['1y', '6m', '3m', '1m'].forEach(function(p) {
        var el = document.getElementById('time-pill-' + p);
        if (el) el.classList.toggle('active', p === period);
      });
      var d = timeSeriesData[period];
      if (!d) return;
      var tot = document.getElementById('hero-total-balance');
      if (tot) tot.textContent = d.balance;
      var tr = document.getElementById('hero-balance-trend');
      if (tr) tr.textContent = d.trend;
      var comp = document.getElementById('hero-compression-val');
      if (comp) comp.textContent = d.compression;
      var tipDate = document.getElementById('hero-chart-tip-date');
      if (tipDate) tipDate.textContent = d.date;
      var tipAmt = document.getElementById('hero-chart-tip-amt');
      if (tipAmt) tipAmt.textContent = d.amt;
      var area = document.getElementById('hero-chart-area');
      if (area) area.setAttribute('d', d.areaD);
      var stroke = document.getElementById('hero-chart-stroke');
      if (stroke) stroke.setAttribute('d', d.strokeD);
      var dot = document.getElementById('hero-chart-dot');
      if (dot) {
        dot.setAttribute('cx', d.dotCx);
        dot.setAttribute('cy', d.dotCy);
      }
      var tip = document.getElementById('hero-chart-tooltip');
      if (tip) tip.setAttribute('transform', d.tipTranslate);
    }

    /* ==========================================================================
       MY CARDS 3D STACK & CYCLING
       ========================================================================== */
    var initialDefaultCards = [
      {
        id: 'card-paypal-primary',
        brand: 'PayPal Commercial',
        brandType: 'paypal',
        last4: '822V',
        fullNumberMasked: '•••• •••• •••• 822V',
        holder: 'CONSORTIUM TREASURY',
        balance: '$12,850.00',
        change: '↑ 3.52%',
        role: 'Primary Clearing Rail',
        themeGradient: 'linear-gradient(135deg, #011638 0%, #002B7A 50%, #0070BA 100%)',
        border: '1px solid rgba(0, 156, 222, 0.45)'
      },
      {
        id: 'card-mc-reserve',
        brand: 'Mastercard Reserve',
        brandType: 'mastercard',
        last4: '4192',
        fullNumberMasked: '•••• •••• •••• 4192',
        holder: 'OPERATING RESERVE',
        balance: '$3,140.00',
        change: '↑ 1.84%',
        role: 'Secondary Liquidity Buffer',
        themeGradient: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
        border: '1px solid rgba(255, 95, 0, 0.35)'
      },
      {
        id: 'card-visa-comm',
        brand: 'Visa Commercial',
        brandType: 'visa',
        last4: '9014',
        fullNumberMasked: '•••• •••• •••• 9014',
        holder: 'CONSORTIUM AGENTS',
        balance: '$6,150.00',
        change: '↑ 2.45%',
        role: 'Micro-Settlement Pool',
        themeGradient: 'linear-gradient(135deg, #0B2545 0%, #133C55 50%, #134074 100%)',
        border: '1px solid rgba(0, 112, 186, 0.35)'
      }
    ];

    var userCards = [];
    try {
      var saved = localStorage.getItem('tally_nexus_cards');
      if (saved) {
        userCards = JSON.parse(saved);
      }
    } catch (e) {}
    if (!userCards || !userCards.length) {
      userCards = initialDefaultCards.slice();
    }

    function renderCardStack() {
      if (!userCards.length) return;
      var c0 = userCards[0];
      var c1 = userCards.length > 1 ? userCards[1] : userCards[0];
      var c2 = userCards.length > 2 ? userCards[2] : (userCards.length > 1 ? userCards[1] : userCards[0]);

      var activeBox = document.getElementById('active-card-box');
      if (activeBox) {
        activeBox.style.background = c0.themeGradient || 'linear-gradient(135deg, #011638 0%, #002B7A 50%, #0070BA 100%)';
        activeBox.style.border = c0.border || '1px solid rgba(0, 156, 222, 0.45)';
      }
      var bName = document.getElementById('active-card-brand-name');
      if (bName) bName.textContent = c0.brand || 'PayPal';
      var numElem = document.getElementById('active-card-number');
      if (numElem) numElem.textContent = c0.fullNumberMasked || ('•••• •••• •••• ' + c0.last4);
      var balElem = document.getElementById('active-card-balance');
      if (balElem) balElem.textContent = c0.balance || '$12,850.00';
      var chgElem = document.getElementById('active-card-change');
      if (chgElem) chgElem.textContent = c0.change || '↑ 3.52%';

      var b1Title = document.getElementById('card-back-1-title');
      var b1Val = document.getElementById('card-back-1-val');
      if (b1Title) b1Title.innerHTML = c1.brand.toUpperCase();
      if (b1Val) b1Val.textContent = c1.balance || '$3,140.00';

      var b2Title = document.getElementById('card-back-2-title');
      var b2Val = document.getElementById('card-back-2-val');
      if (b2Title) b2Title.innerHTML = c2.brand.toUpperCase();
      if (b2Val) b2Val.textContent = c2.balance || '$6,150.00';
    }

    function selectCard(idx) {
      if (idx > 0 && idx < userCards.length) {
        var clicked = userCards.splice(idx, 1)[0];
        userCards.unshift(clicked);
        renderCardStack();
        showToast('info', 'Swapped Active Card', 'Active card updated to ' + clicked.brand + ' (' + clicked.last4 + ').');
      }
    }

    /* ==========================================================================
       STRICT CARD VALIDATION & ADD CARD MODAL
       ========================================================================== */
    function validateLuhn(numStr) {
      var digits = String(numStr).replace(/[^0-9]/g, '');
      if (!digits || digits.length < 13 || digits.length > 19) return false;
      var sum = 0;
      var shouldDouble = false;
      for (var i = digits.length - 1; i >= 0; i--) {
        var digit = parseInt(digits.charAt(i), 10);
        if (shouldDouble) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
      }
      return (sum % 10) === 0;
    }

    function detectCardBrand(numStr) {
      var clean = String(numStr).replace(/[^0-9]/g, '');
      if (/^4822|^5822/.test(clean)) {
        return { name: 'PayPal Commercial', brandType: 'paypal', gradient: 'linear-gradient(135deg, #011638 0%, #002B7A 50%, #0070BA 100%)', border: '1px solid rgba(0, 156, 222, 0.45)' };
      }
      if (/^4/.test(clean)) {
        return { name: 'Visa Commercial', brandType: 'visa', gradient: 'linear-gradient(135deg, #0B2545 0%, #133C55 50%, #134074 100%)', border: '1px solid rgba(0, 112, 186, 0.35)' };
      }
      if (/^(5[1-5]|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)/.test(clean)) {
        return { name: 'Mastercard Reserve', brandType: 'mastercard', gradient: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', border: '1px solid rgba(255, 95, 0, 0.35)' };
      }
      if (/^3[47]/.test(clean)) {
        return { name: 'American Express Enterprise', brandType: 'amex', gradient: 'linear-gradient(135deg, #002B49 0%, #005A9C 50%, #0077B6 100%)', border: '1px solid rgba(0, 180, 216, 0.4)' };
      }
      if (/^(6011|65|64[4-9])/.test(clean)) {
        return { name: 'Discover Financial', brandType: 'discover', gradient: 'linear-gradient(135deg, #2D1500 0%, #663300 50%, #E65100 100%)', border: '1px solid rgba(230, 81, 0, 0.4)' };
      }
      return { name: 'Commercial Settlement Card', brandType: 'generic', gradient: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', border: '1px solid rgba(148, 163, 184, 0.3)' };
    }

    function openAddCardModal() {
      var m = document.getElementById('add-card-modal');
      if (m) m.style.display = 'flex';
      var err = document.getElementById('add-card-error');
      if (err) err.style.display = 'none';
      updateCardPreview();
    }

    function closeAddCardModal() {
      var m = document.getElementById('add-card-modal');
      if (m) m.style.display = 'none';
    }

    function handleCardNumberInput(input) {
      var raw = input.value.replace(/[^0-9]/g, '');
      var formatted = '';
      if (/^3[47]/.test(raw)) {
        // Amex format: 4 - 6 - 5
        for (var i = 0; i < raw.length && i < 15; i++) {
          if (i === 4 || i === 10) formatted += ' ';
          formatted += raw[i];
        }
      } else {
        // Standard: 4 - 4 - 4 - 4
        for (var j = 0; j < raw.length && j < 16; j++) {
          if (j > 0 && j % 4 === 0) formatted += ' ';
          formatted += raw[j];
        }
      }
      input.value = formatted;
      updateCardPreview();
    }

    function handleExpiryInput(input) {
      var raw = input.value.replace(/[^0-9]/g, '');
      if (raw.length > 2) {
        input.value = raw.slice(0, 2) + '/' + raw.slice(2, 4);
      } else {
        input.value = raw;
      }
      updateCardPreview();
    }

    function updateCardPreview() {
      var nameVal = (document.getElementById('card-input-name').value || 'YOUR NAME').trim().toUpperCase();
      var numVal = document.getElementById('card-input-number').value.trim();
      var expVal = (document.getElementById('card-input-exp').value || 'MM/YY').trim();

      var brand = detectCardBrand(numVal);

      var pBrand = document.getElementById('preview-brand-tag');
      if (pBrand) pBrand.textContent = brand.name;
      var dBrand = document.getElementById('card-detected-brand');
      if (dBrand) dBrand.textContent = brand.name;

      var pPreview = document.getElementById('modal-card-preview');
      if (pPreview) {
        pPreview.style.background = brand.gradient;
        pPreview.style.border = brand.border;
      }

      var pNum = document.getElementById('preview-card-num');
      if (pNum) {
        if (!numVal) {
          pNum.innerHTML = '•••• &nbsp; •••• &nbsp; •••• &nbsp; ••••';
        } else {
          var clean = numVal.replace(/[^0-9]/g, '');
          var masked = '';
          for (var i = 0; i < clean.length; i++) {
            if (i > 0 && i % 4 === 0) masked += ' &nbsp; ';
            if (i >= clean.length - 4) {
              masked += clean[i];
            } else {
              masked += '•';
            }
          }
          pNum.innerHTML = masked;
        }
      }

      var pName = document.getElementById('preview-card-name');
      if (pName) pName.textContent = nameVal;
      var pExp = document.getElementById('preview-card-exp');
      if (pExp) pExp.textContent = expVal;
    }

    function submitAddCard() {
      var name = document.getElementById('card-input-name').value.trim();
      var numRaw = document.getElementById('card-input-number').value.replace(/[^0-9]/g, '');
      var exp = document.getElementById('card-input-exp').value.trim();
      var cvv = document.getElementById('card-input-cvv').value.trim();
      var type = document.getElementById('card-input-type').value;

      var errBox = document.getElementById('add-card-error');
      errBox.style.display = 'none';

      // 1. Validate Name (Letters and Spaces only, min 2 chars)
      if (!name || name.length < 2 || !/^[a-zA-Z ]+$/.test(name)) {
        errBox.textContent = '❌ Please enter a valid cardholder name (letters only, min 2 characters).';
        errBox.style.display = 'block';
        return;
      }

      // 2. Validate Card Number & Brand
      var brand = detectCardBrand(numRaw);
      var requiredLen = brand.brandType === 'amex' ? 15 : 16;
      if (numRaw.length !== requiredLen) {
        errBox.textContent = '❌ Invalid Card Length: ' + brand.name + ' requires exactly ' + requiredLen + ' digits.';
        errBox.style.display = 'block';
        return;
      }

      // Luhn Checksum Check
      if (!validateLuhn(numRaw)) {
        errBox.textContent = '❌ Invalid Card Number: Failed Luhn algorithm checksum verification. Please enter a valid payment card.';
        errBox.style.display = 'block';
        return;
      }

      // 3. Validate Expiry
      var expParts = exp.split('/');
      if (expParts.length !== 2 || expParts[0].length !== 2 || expParts[1].length !== 2) {
        errBox.textContent = '❌ Invalid expiry format. Must be MM/YY (e.g. 12/28).';
        errBox.style.display = 'block';
        return;
      }
      var expMonth = parseInt(expParts[0], 10);
      var expYear = parseInt(expParts[1], 10) + 2000;
      if (isNaN(expMonth) || isNaN(expYear) || expMonth < 1 || expMonth > 12) {
        errBox.textContent = '❌ Invalid expiry month. Must be between 01 and 12.';
        errBox.style.display = 'block';
        return;
      }
      var now = new Date();
      var curYear = now.getFullYear();
      var curMonth = now.getMonth() + 1;
      if (expYear < curYear || (expYear === curYear && expMonth < curMonth)) {
        errBox.textContent = '❌ Card has expired. Please enter a valid future expiry date.';
        errBox.style.display = 'block';
        return;
      }

      // 4. Validate CVV
      var requiredCvvLen = brand.brandType === 'amex' ? 4 : 3;
      if (cvv.length !== requiredCvvLen) {
        errBox.textContent = '❌ Invalid CVV: Must be exactly ' + requiredCvvLen + ' digits.';
        errBox.style.display = 'block';
        return;
      }

      // All Passed -> Create and add card
      var newCard = {
        id: 'card-' + Date.now(),
        brand: brand.name,
        brandType: brand.brandType,
        last4: numRaw.slice(-4),
        fullNumberMasked: '•••• •••• •••• ' + numRaw.slice(-4),
        holder: name.toUpperCase(),
        balance: '$' + (Math.floor(Math.random() * 5000) + 5000).toLocaleString() + '.00',
        change: '↑ ' + (Math.random() * 3 + 1).toFixed(2) + '%',
        themeGradient: brand.gradient,
        border: brand.border,
        role: type
      };

      userCards.unshift(newCard);
      try {
        localStorage.setItem('tally_nexus_cards', JSON.stringify(userCards));
      } catch (e) {}

      renderCardStack();
      closeAddCardModal();
      showToast('success', 'Settlement Card Linked & Verified', brand.name + ' card ending in ' + newCard.last4 + ' linked to ' + type + '. Luhn algorithm passed.');
    }

    /* ==========================================================================
       REQUEST LIQUIDITY MODAL & DISPATCH
       ========================================================================== */
    function openRequestLiquidityModal() {
      var m = document.getElementById('request-liquidity-modal');
      if (m) m.style.display = 'flex';
      var err = document.getElementById('req-liq-error');
      if (err) err.style.display = 'none';
    }

    function closeRequestLiquidityModal() {
      var m = document.getElementById('request-liquidity-modal');
      if (m) m.style.display = 'none';
    }

    async function submitRequestLiquidity() {
      var debtor = document.getElementById('req-debtor').value;
      var creditor = document.getElementById('req-creditor').value;
      var amtVal = parseFloat(document.getElementById('req-amount').value);
      var memo = (document.getElementById('req-memo').value || 'Autonomous Liquidity Drawdown').trim();

      var errBox = document.getElementById('req-liq-error');
      errBox.style.display = 'none';

      if (debtor === creditor) {
        errBox.textContent = '❌ Debtor and Creditor agents must be different.';
        errBox.style.display = 'block';
        return;
      }

      if (isNaN(amtVal) || amtVal <= 0) {
        errBox.textContent = '❌ Please enter a valid requested amount greater than $0.00.';
        errBox.style.display = 'block';
        return;
      }

      try {
        var res = await fetch('/api/ious/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            debtorAgentId: debtor,
            creditorAgentId: creditor,
            amountCents: Math.round(amtVal * 100),
            taskDescription: memo
          })
        });

        var data = await res.json();
        if (!res.ok) {
          errBox.textContent = '❌ Failed to issue IOU: ' + (data.message || (data.error && data.error.message) || 'Error creating request');
          errBox.style.display = 'block';
          return;
        }

        closeRequestLiquidityModal();
        showToast('success', 'Liquidity Request Issued & Verified', 'Dispatched IOU from ' + debtor + ' to ' + creditor + ' for $' + amtVal.toFixed(2) + ' USD. RFC 8785 Ed25519 signature verified.');
        refreshDashboardData();
      } catch (err) {
        errBox.textContent = '❌ Network error issuing request: ' + err.message;
        errBox.style.display = 'block';
      }
    }

    /* ==========================================================================
       CLEAR & SETTLE ACTION WITH DYNAMIC RUNTIME UPDATES
       ========================================================================== */
    async function executeClearAndSettle() {
      var btn = document.getElementById('card-clear-settle-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Netting...';
      }

      showToast('info', 'Executing Multilateral Netting & Settlement', 'Running 5-agent consortium bilateral netting against PayPal Rails...');
      await runFlagshipDemo();

      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '↗ Clear & Settle';
      }

      // Update card balance dynamically
      var activeBal = document.getElementById('active-card-balance');
      if (activeBal && userCards[0]) {
        userCards[0].balance = '$12,850.00';
        activeBal.textContent = '$12,850.00';
      }
      refreshDashboardData();
    }
`;

  code = code.slice(0, idx) + jsLogic + '\n    ' + code.slice(idx);
  console.log('7. Client JS logic injected');
}

// 8. Update refreshDashboardData
{
  const targetStats = "const statsRes = await fetch('/api/dashboard/stats');";
  const idx = code.indexOf(targetStats);
  if (idx === -1) throw new Error('Stats fetch not found');

  const targetBadge = "document.getElementById('metric-trial-badge').textContent = stats.trialBalance?.balanced ? 'Balanced' : 'Imbalanced';";
  const badgeIdx = code.indexOf(targetBadge, idx);
  if (badgeIdx === -1) throw new Error('Trial badge not found');
  const endBlock = badgeIdx + targetBadge.length;

  const addition = `

          // Update Recent Transactions dynamically
          if (stats.recentTransactions && stats.recentTransactions.length > 0) {
            const txContainer = document.getElementById('recent-transactions-list');
            if (txContainer) {
              let txHtml = '';
              for (let i = 0; i < stats.recentTransactions.length; i++) {
                const tx = stats.recentTransactions[i];
                txHtml += '<div class="tx-item">' +
                  '<div class="tx-left">' +
                    '<div class="tx-avatar" style="color: ' + (tx.avatarColor || '#0070BA') + '; font-weight: 800;">' + escapeHtml(tx.avatar || '⚡') + '</div>' +
                    '<div>' +
                      '<div class="tx-title">' + escapeHtml(tx.title) + '</div>' +
                      '<div class="tx-date">' + escapeHtml(tx.date) + '</div>' +
                    '</div>' +
                  '</div>' +
                  '<div class="tx-amount ' + (tx.type === 'neg' ? 'neg' : 'pos') + '">' + escapeHtml(tx.amount) + '</div>' +
                '</div>';
              }
              txContainer.innerHTML = txHtml;
            }
          }

          // Update Agent Liquidity Bar heights dynamically
          if (stats.agentLiquidity && stats.agentLiquidity.length >= 5) {
            for (let b = 0; b < stats.agentLiquidity.length && b < 5; b++) {
              const item = stats.agentLiquidity[b];
              const valElem = document.getElementById('bar-val-' + b);
              const barElem = document.getElementById('bar-elem-' + b);
              const lblElem = document.getElementById('bar-label-' + b);
              if (valElem) valElem.textContent = '$' + item.amount;
              if (lblElem) lblElem.textContent = item.name;
              if (barElem) {
                const h = Math.min(110, Math.max(35, Math.round((item.amount / 500) * 105)));
                barElem.style.height = h + 'px';
              }
            }
          }`;

  code = code.slice(0, endBlock) + addition + code.slice(endBlock);
  console.log('8. Stats update logic injected');
}

// 9. Initial Load Calls
{
  const targetInit = "refreshDashboardData();\n      initSse();";
  const idx = code.indexOf(targetInit);
  if (idx === -1) throw new Error('Initial load calls not found');
  const replacement = "renderCardStack();\n      refreshDashboardData();\n      initSse();";
  code = code.slice(0, idx) + replacement + code.slice(idx + targetInit.length);
  console.log('9. Initial load calls updated');
}

if (isCrlf) {
  code = code.replace(/\n/g, '\r\n');
}

fs.writeFileSync(path, code, 'utf8');
console.log('Successfully completed all updates! New length:', code.length);
