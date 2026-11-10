const fs = require('fs');

const targetPath = 'D:/tally-nexus/src/dashboard/dashboard-html.ts';
let raw = fs.readFileSync(targetPath, 'utf8');
const isCrlf = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

// Update 30-Second Tour container and step cards with optimized compact padding to prevent any ellipsis
const targetTourRegex = /<!-- 30-Second Guided Tour Container matching user screenshot -->[\s\S]*?<!-- EXECUTIVE HERO GRID/;

const refinedTour = `<!-- 30-Second Guided Tour Container matching user screenshot -->
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; padding: 18px 20px; box-shadow: 0 6px 20px rgba(0, 112, 186, 0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: #0B1E3F;">
                    <span style="color: #0070BA; font-size: 16px;">⚡</span> 30-Second Tour for Judges (6 Guided Clicks)
                  </div>
                  <span style="font-size: 12px; color: #64748B; font-weight: 500;">Follow steps 1 – 6 to independently inspect end-to-end clearing</span>
                </div>
                <div class="tour-steps-row" style="display: flex; align-items: center; justify-content: space-between; gap: 4px; width: 100%;">
                  
                  <!-- STEP 1 -->
                  <div class="tour-step-card" id="tour-card-1" onclick="tourStep(1)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🏛️</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Clearing Room</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Open Overview</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 2 -->
                  <div class="tour-step-card" id="tour-card-2" onclick="tourStep(2)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🚀</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Run Flagship</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Execute 5-agent sim</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 3 -->
                  <div class="tour-step-card" id="tour-card-3" onclick="tourStep(3)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🤖</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">AI SLA Verdict</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Inspect clamp</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 4 -->
                  <div class="tour-step-card" id="tour-card-4" onclick="tourStep(4)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">4</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🪙</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Net Positions</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">$130 &rarr; $45 net</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 5 -->
                  <div class="tour-step-card" id="tour-card-5" onclick="tourStep(5)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">5</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🅿️</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">PayPal Proof</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Live Debug-ID</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 6 -->
                  <div class="tour-step-card" id="tour-card-6" onclick="tourStep(6)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">6</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🔒</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Merkle Ledger</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">&Delta; = $0.00 proof</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <!-- EXECUTIVE HERO GRID`;

content = content.replace(targetTourRegex, () => refinedTour);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Refined tour cards applied cleanly.');

