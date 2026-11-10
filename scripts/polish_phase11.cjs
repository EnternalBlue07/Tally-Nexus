const fs = require('fs');

const targetPath = 'D:/tally-nexus/src/dashboard/dashboard-html.ts';
let raw = fs.readFileSync(targetPath, 'utf8');
const isCrlf = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

console.log('Original length:', content.length);

// 1. Add IDs to the modal header in paypal-verify-modal so it can be dynamically contextualized
content = content.replace(
  /<div style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0\.2px;">PayPal Sandbox Authoritative Proof<\/div>\s*<div style="font-size: 12\.5px; color: var\(--text-secondary\); margin-top: 2px;">Cryptographically linked server-side verification<\/div>/,
  () => `<div id="verify-modal-header-title" style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0.2px;">PayPal Sandbox Authoritative Proof</div>
            <div id="verify-modal-header-sub" style="font-size: 12.5px; color: #64748B; margin-top: 2px;">Cryptographically linked server-side verification</div>`
);

// 2. Fix the modal footer background in paypal-verify-modal to be clean light theme
content = content.replace(
  /<div style="padding: 16px 28px; border-top: 1px solid rgba\(0, 156, 222, 0\.2\); background: rgba\(7, 13, 26, 0\.9\); display: flex; justify-content: flex-end;">\s*<button class="btn btn-secondary" style="padding: 8px 20px; border-radius: 9999px; font-size: 13px; font-weight: 600;" onclick="closeVerifyModal\(\)">Close<\/button>\s*<\/div>/,
  () => `<div style="padding: 14px 28px; border-top: 1px solid #E2E8F0; background: #F8FAFD; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" style="padding: 8px 22px; border-radius: 9999px; font-size: 13px; font-weight: 700; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;" onclick="closeVerifyModal()">Close</button>
      </div>`
);

// 3. Fix the Merkle Proof modal title & styling
content = content.replace(
  /<div id="merkle-modal-title" style="font-weight: 700; color: var\(--accent-secondary\); font-size: 15px;">IOU Cryptographic Proof & Merkle Anchor<\/div>/,
  () => `<div id="merkle-modal-title" style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0.2px;">IOU Cryptographic Proof & Merkle Anchor</div>`
);

// Fix colors inside Merkle Proof details grid
content = content.replace(
  /<span id="mp-amount" style="font-weight: 700; color: var\(--accent-secondary\); font-variant-numeric: tabular-nums;">-<\/span>/,
  () => `<span id="mp-amount" style="font-weight: 800; color: #0070BA; font-variant-numeric: tabular-nums;">-</span>`
);

content = content.replace(
  /<span id="mp-anchor" class="mono" style="color: var\(--accent-amber\); word-break: break-all;">-<\/span>/,
  () => `<span id="mp-anchor" class="mono" style="color: #B45309; word-break: break-all; font-weight: 600;">-</span>`
);

content = content.replace(
  /<span id="mp-pubkey" class="mono" style="color: #A7F3D0; word-break: break-all; font-size: 11px;">-<\/span>/,
  () => `<span id="mp-pubkey" class="mono" style="color: #047857; word-break: break-all; font-size: 11px; font-weight: 600;">-</span>`
);

content = content.replace(
  /<span id="mp-signature" class="mono" style="color: #A5B4FC; word-break: break-all; font-size: 11px;">-<\/span>/,
  () => `<span id="mp-signature" class="mono" style="color: #4338CA; word-break: break-all; font-size: 11px; font-weight: 600;">-</span>`
);

content = content.replace(
  /<div style="padding: 14px 24px; border-top: 1px solid var\(--border-subtle\); background: var\(--surface-elevated\); display: flex; justify-content: flex-end;">/,
  () => `<div style="padding: 14px 24px; border-top: 1px solid #E2E8F0; background: #F8FAFD; display: flex; justify-content: flex-end;">`
);

// 4. Overhaul tourStep(step) with robust active state & complete end-to-end interactions
const targetTourStepRegex = /function tourStep\(step\)\s*\{[\s\S]*?async function testLiveAiJudge\(\)/;

const refinedTourStep = `function tourStep(step) {
      console.log('Executing Tour Step:', step);

      // Reset all 6 step cards
      for (let i = 1; i <= 6; i++) {
        const card = document.getElementById('tour-card-' + i);
        if (card) {
          card.style.borderColor = '#E2E8F0';
          card.style.background = '#FFFFFF';
          card.style.boxShadow = '0 2px 6px rgba(0, 112, 186, 0.04)';
          const badge = card.querySelector('.tour-step-badge');
          if (badge) {
            badge.style.background = '#EBF4FC';
            badge.style.color = '#0070BA';
          }
        }
      }

      // Highlight the active step card with signature PayPal blue border & soft tint
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
      }

      if (step === 1) {
        switchTab('overview');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (step === 2) {
        switchTab('overview');
        const stepper = document.querySelector('.stepper');
        if (stepper) stepper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        runFlagshipDemo();
      } else if (step === 3) {
        testLiveAiJudge();
      } else if (step === 4) {
        switchTab('scale');
        setTimeout(() => {
          const posGrid = document.getElementById('positions-grid');
          if (posGrid) posGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else if (step === 5) {
        verifyPayPalCapture('7PV82720RX415822V');
      } else if (step === 6) {
        switchTab('ledger');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    async function testLiveAiJudge()`;

content = content.replace(targetTourStepRegex, () => refinedTourStep);

// 5. Update testLiveAiJudge to dynamically set modal header title & sub
content = content.replace(
  /async function testLiveAiJudge\(\)\s*\{[\s\S]*?document\.getElementById\('modal-id'\)\.textContent = 'Live SLA AI Adjudication';/,
  () => `async function testLiveAiJudge() {
      openVerifyModal();
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'AI SLA Judge Adjudication Evidence';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Live FreeModel (Gemini 3.7 / DeepSeek) evaluation with deterministic clamping';

      document.getElementById('modal-id').textContent = 'Live SLA AI Adjudication';`
);

// 6. Update verifyPayPalCapture & verifyPayPalPayout to set PayPal-specific modal header
content = content.replace(
  /function verifyPayPalCapture\(captureId\)\s*\{[\s\S]*?openVerifyModal\(\);/,
  () => `function verifyPayPalCapture(captureId) {
      openVerifyModal();
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'PayPal Sandbox Authoritative Proof';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Cryptographically linked server-side verification against PayPal rails';`
);

content = content.replace(
  /async function verifyPayPalPayout\(batchId\)\s*\{[\s\S]*?openVerifyModal\(\);/,
  () => `async function verifyPayPalPayout(batchId) {
      openVerifyModal();
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'PayPal Sandbox Authoritative Proof';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Cryptographically linked server-side verification against PayPal rails';`
);

// 7. Harden renderVerifyResult for Bug B (never show misleading green for NOT_FOUND)
const targetRenderVerifyRegex = /function renderVerifyResult\(data\)\s*\{[\s\S]*?function renderVerifyError\(err\)/;

const refinedRenderVerify = `function renderVerifyResult(data) {
      document.getElementById('verify-modal-loading').style.display = 'none';
      document.getElementById('verify-modal-content').style.display = 'block';

      const noticeBanner = document.getElementById('modal-notice-banner');
      const badge = document.getElementById('modal-status-badge');
      const vStatus = data.verificationStatus || data.providerVerificationStatus;
      const provStatusElem = document.getElementById('modal-provider-status');
      const provStatus = data.providerStatus || data.batchHeader?.batchStatus || (data.isSimulatedRecord ? 'NOT_FOUND_ON_RAILS' : 'NOT_FOUND');
      provStatusElem.textContent = provStatus;

      const evMatch = document.getElementById('modal-evidence-match');

      // Clear any prior inline styles
      badge.style.background = '';
      badge.style.color = '';
      evMatch.style.background = '';
      evMatch.style.color = '';

      if (vStatus === 'VERIFIED_ON_PAYPAL_SANDBOX' || ((provStatus === 'COMPLETED' || provStatus === 'SUCCESS') && !data.isSimulatedRecord && vStatus !== 'RESOURCE_NOT_FOUND')) {
        provStatusElem.style.color = 'var(--accent-emerald)';
        badge.className = 'tag tag-success';
        badge.textContent = 'VERIFIED ON PAYPAL SANDBOX';
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'LIVE SANDBOX & LEDGER VERIFIED';
      } else if (vStatus === 'STORED_CANONICAL_EVIDENCE' || data.storedEvidenceMatched) {
        provStatusElem.style.color = 'var(--accent-emerald)';
        badge.className = 'tag';
        badge.style.background = '#F59E0B';
        badge.style.color = '#000';
        badge.style.fontWeight = '700';
        badge.textContent = 'STORED CANONICAL EVIDENCE (SANDBOX RUN)';
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'MATCHED CANONICAL PROOF';
      } else if (provStatus === 'NOT_FOUND' || vStatus === 'RESOURCE_NOT_FOUND' || vStatus === 'LOCAL_RECORD_FOUND') {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = 'RESOURCE NOT FOUND ON PAYPAL';
        if (data.dbRecordMatched) {
          evMatch.className = 'tag';
          evMatch.style.background = '#FEF3C7';
          evMatch.style.color = '#B45309';
          evMatch.style.border = '1px solid #FDE68A';
          evMatch.textContent = 'LOCAL LEDGER ONLY (UNCONFIRMED ON PAYPAL)';
        } else {
          evMatch.className = 'tag tag-error';
          evMatch.textContent = 'RECORD NOT FOUND';
        }
      } else if (data.isSimulatedRecord) {
        provStatusElem.style.color = 'var(--accent-amber)';
        badge.className = 'tag tag-info';
        badge.textContent = 'LOCAL LEDGER RECORD (SIMULATED)';
        evMatch.className = 'tag tag-info';
        evMatch.textContent = 'SIMULATED DEMO RECORD';
      } else if (vStatus === 'EVIDENCE_MISMATCH') {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = 'EVIDENCE MISMATCH (AMOUNT / CURRENCY)';
        evMatch.className = 'tag tag-error';
        evMatch.textContent = 'AMOUNT MISMATCH';
      } else {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = vStatus || 'RESOURCE NOT FOUND';
        evMatch.className = 'tag tag-error';
        evMatch.textContent = 'UNCONFIRMED';
      }

      // Display Contextual Notice Banners
      if (noticeBanner) {
        if (data.notice || data.explanation) {
          noticeBanner.style.display = 'block';
          const icon = data.isSimulatedRecord ? 'ℹ️' : (data.amountMatched === false ? '❌' : '⚠️');
          noticeBanner.innerHTML = icon + ' <strong>' + (data.isSimulatedRecord ? 'Simulation Notice:' : 'Verification Notice:') + '</strong> ' + (data.notice || data.explanation);
          if (data.isSimulatedRecord) {
            noticeBanner.style.background = 'rgba(0, 112, 186, 0.08)';
            noticeBanner.style.borderColor = 'rgba(0, 112, 186, 0.3)';
            noticeBanner.style.color = '#0070BA';
          } else if (data.amountMatched === false) {
            noticeBanner.style.background = 'rgba(239, 68, 68, 0.08)';
            noticeBanner.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            noticeBanner.style.color = '#DC2626';
          } else {
            noticeBanner.style.background = 'rgba(245, 158, 11, 0.08)';
            noticeBanner.style.borderColor = '#FDE68A';
            noticeBanner.style.color = '#B45309';
          }
        } else if ((provStatus === 'NOT_FOUND' || vStatus === 'RESOURCE_NOT_FOUND') && data.dbRecordMatched) {
          noticeBanner.style.display = 'block';
          noticeBanner.style.background = '#FEF3C7';
          noticeBanner.style.borderColor = '#FDE68A';
          noticeBanner.style.color = '#B45309';
          noticeBanner.innerHTML = '⚠️ <strong>Unconfirmed on Live Rails:</strong> This record exists in the local clearinghouse database, but PayPal Sandbox reported NOT_FOUND. It represents a local test cycle.';
        } else {
          noticeBanner.style.display = 'none';
        }
      }

      document.getElementById('modal-id').textContent = data.identifier || '-';
      const amt = data.amount || data.batchHeader?.amount;
      document.getElementById('modal-amount').textContent = amt ? (amt.value + ' ' + (amt.currency_code || amt.currency || 'USD')) : '-';
      
      const anchor = data.merkleAnchor || data.customId || '-';
      document.getElementById('modal-anchor').textContent = anchor;

      document.getElementById('modal-debug-id').textContent = data.paypalDebugId || (data.isSimulatedRecord ? 'N/A (Simulated Demonstration)' : 'N/A');

      document.getElementById('modal-raw-json').textContent = JSON.stringify(data, null, 2);
    }

    function renderVerifyError(err)`;

content = content.replace(targetRenderVerifyRegex, () => refinedRenderVerify);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(targetPath, content, 'utf8');
console.log('Successfully polished dashboard-html.ts. New length:', content.length);

