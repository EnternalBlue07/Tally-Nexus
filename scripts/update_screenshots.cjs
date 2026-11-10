const fs = require('fs');
const path = require('path');

const srcDir = 'C:/Users/Mohammad Zumaan/.gemini/antigravity/brain/e86962ed-a34e-4a5b-b5c6-b980a583ba81';
const destDir = 'D:/tally-nexus/docs/assets/screenshots';

const mappings = [
  ['phase11_01_desktop_overview.png', '02_judge_briefing_panel_and_30s_tour.png'],
  ['phase11_02_command_palette.png', '06_command_palette_global_search.png'],
  ['phase11_04_ai_judge_modal.png', '07_ai_sla_judge_adjudication_modal.png'],
  ['phase11_05_paypal_proof_modal.png', '08_paypal_authoritative_sandbox_proof.png'],
  ['phase11_06_scale_tab_fee_model.png', '09_hero_scale_payment_rail_fee_model.png'],
  ['phase11_07_mobile_overview.png', '05_mobile_responsive_experience.png']
];

for (const [srcName, destName] of mappings) {
  const src = path.join(srcDir, srcName);
  const dest = path.join(destDir, destName);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${srcName} -> ${destName}`);
  } else {
    console.warn(`Source not found: ${src}`);
  }
}
