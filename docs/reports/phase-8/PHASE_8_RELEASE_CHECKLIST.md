# TALLY NEXUS — PHASE 8 PUBLIC RELEASE & DEMO RECORDING CHECKLIST
**Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine with PayPal Settlement**

- **Project:** Tally Nexus  
- **Repository Path:** `D:\tally-nexus`  
- **Git Branch:** `master`  
- **Release Candidate Commit:** `0708a30` (27 commits)  
- **Date:** November 9, 2026  
- **Status:** **FEATURE-FROZEN — RELEASE & RECORDING READY**  

---

## 1. GitHub Public Release Status & Verification

### A. Current Git Inspection
- **Current Branch:** `master`
- **Current HEAD Commit:** `0708a30` (`docs: generate Phase 7 Master Submission and Release Report`)
- **Total Commit Count:** 27 commits
- **Git Working Tree:** Completely clean (`git status` shows nothing to commit)
- **Current Remotes:** None configured (`git remote -v` is empty)
- **Secret Audit:** 27 commits scanned via official Gitleaks — **0 leaks found (100% clean)**.

### B. Public Release Safety Guard
> [!IMPORTANT]
> **No Remote Configured & No Automatic Push:**  
> In strict accordance with execution instructions, no remote has been added, and no external push has been performed. Antigravity will only push after the user explicitly provides and approves the exact GitHub repository URL.

### C. Exact GitHub Push Procedure (Run Once You Create the GitHub Repo):
```powershell
# 1. Add your public GitHub repository as remote origin:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/tally-nexus.git

# 2. Verify the remote URL is correct:
git remote -v

# 3. Push master branch with tags (clean linear history):
git branch -M master
git push -u origin master
```

---

## 2. Environment Configuration Requirements

Before running the application for recording or judge review, verify your environment configuration:

### Required & Recommended Environment Variables (`.env`):

| Variable | Recommended Value | Purpose |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for Express HTTP server and Web Dashboard |
| `NODE_ENV` | `production` (or `development`) | Runtime environment |
| `PUBLIC_DEMO_MODE` | `true` | **CRITICAL FOR RECORDING:** Locks money-moving routes (`/orders`, `/capture`, `/payouts`, `/reissue`, `/cure`) against accidental mutations |
| `DATABASE_PATH` | `./data/tally_nexus.db` | Native SQLite database file location (WAL mode) |
| `OPERATOR_RESERVE_FLOOR` | `10.00` | Minimum liquidity floor ($10.00 USD) enforced by Financial Firewall |
| `PAYPAL_MODE` | `sandbox` (or `mock`) | Sets PayPal client adapter (`sandbox` uses live PayPal API; `mock` runs offline hermetic adapter) |
| `PAYPAL_CLIENT_ID` | *[Your Sandbox Client ID]* | Real PayPal Developer Sandbox Client ID |
| `PAYPAL_CLIENT_SECRET` | *[Your Sandbox Secret]* | Real PayPal Developer Sandbox Secret |
| `PAYPAL_ENVIRONMENT` | `sandbox` | Target PayPal environment (`https://api-m.sandbox.paypal.com`) |
| `FREEMODEL_API_KEY` | *[Your FreeModel Key]* | FreeModel Multi-Model AI Key |
| `FREEMODEL_BASE_URL` | `https://freemodel.in/v1` | FreeModel OpenAI-compatible endpoint |
| `FREEMODEL_PRIMARY_MODEL` | `gemini-3.7-flash` | Primary structured reasoning LLM |
| `FREEMODEL_FALLBACK_MODEL` | `deepseek-v4.1-flash` | Automatic failover LLM |

> [!NOTE]
> If `FREEMODEL_API_KEY` is not set or quota is exhausted, the app automatically and transparently operates in honest `OFFLINE_DETERMINISTIC_FALLBACK` mode. For recording, stored canonical evidence is immediately available in the UI.

---

## 3. Application Startup Commands

### Step 1: Pre-Flight Build Verification
```powershell
# Compile TypeScript and copy SQLite schema
npm run build
```

### Step 2: Seed Flagship Scenario (Populates Database with 5-Agent Consortium)
```powershell
# Executes the deterministic 5-agent consortium simulation (< 100ms)
npm run demo:flagship
```

### Step 3: Start the Production Server with Public Demo Security
```powershell
# Set PUBLIC_DEMO_MODE to true to prevent accidental money movement, then start
$env:PUBLIC_DEMO_MODE="true"
npm start
```
*The server will start at `http://localhost:3000` with Judge Briefing Panel, AG Grid, and Trust Center active.*

---

## 4. Live vs. Stored Evidence Strategy for Recording

To ensure zero downtime, zero latency lag, and zero quota exhaustion during recording:

| Screen / Feature | Evidence Type | Source | Recording Recommendation |
| :--- | :---: | :--- | :--- |
| **Judge Briefing Panel** | Stored Canonical | Pre-rendered in HTML | Instant load, headline claims 100% verified. |
| **PayPal Settlement Modal** | Verified Sandbox Run | `docs/evidence/sandbox-run-verified-success.json` | Displays Capture `7PV82720RX415822V` ($1.00) ≡ Payouts `N4M49PUHNCNQ4` ($0.50 + $0.50) with Debug-IDs and Merkle anchor. Zero risk of network delay. |
| **AI SLA Judge Modal** | Authentic FreeModel Run | `docs/evidence/ai-judge-freemodel-2026-11-09T16-24-42-185Z.json` | Shows genuine Gemini 3.7 Flash verdict, prompt SHA-256 hash, and 2,437 token metrics. Zero risk of API rate limits. |
| **AG Grid 1,500+ IOUs** | Deterministic Seeded PRNG | In-memory / database | Smooth 60 FPS virtualization with sub-millisecond filtering. |
| **Double-Entry Ledger** | SQLite Database | `system_events` & `ledger_entries` | Live trial balance proving $Assets \equiv Liabilities + Equity$ with exact $\$0.00$ variance. |

---

## 5. Precise Demo Recording Procedure (2:40 Master Plan)

Follow the timestamped script in [`DEMO_SCRIPT.md`](../../submission/DEMO_SCRIPT.md):

### Recording Setup:
- **Display Resolution:** 1920×1080 (1080p, 60fps) or 1440×900 window.
- **Browser:** Chrome or Edge in full-screen mode (`F11`), zoom level at 100%, bookmarks bar hidden.
- **Audio:** Clear microphone, quiet room, optional soft background music (-22 dB).

### Sequence of Takes:
1. **0:00 – 0:20 (The Problem):**  
   Display problem slide or visual of micro-transaction fee drag ($0.10 task + $0.49 fee = 500% overhead).
2. **0:20 – 0:40 (The Solution):**  
   Switch to browser at `http://localhost:3000`. Point mouse smoothly to the **Judge Briefing Panel** at the top. Highlight the 3 headline claims:
   - 65.38% Liquidity Compression
   - Conserved PayPal Sandbox Settlement ($1.00 = $0.50 + $0.50)
   - Authentic Multi-Model AI SLA Judge (Gemini 3.7 Flash + DeepSeek v4.1)
3. **0:40 – 1:00 (Signed Micro-IOUs):**  
   Click into the **Cycle View / IOU Table**. Click on an IOU row to reveal the RFC 8785 Canonical JSON modal and Ed25519 digital signature badge.
4. **1:00 – 1:35 (AI SLA Judge & Zero-Trust Clamp):**  
   In the Judge Briefing Panel, click **"Inspect AI SLA Judge Adjudication"**.  
   - Highlight the model badge (`gemini-3.7-flash via FreeModel`).
   - Highlight the token metrics (2,437 tokens, prompt hash).
   - Explain the zero-trust clamp: code clamps credit to contractual max; prompt injections are safely quarantined.
5. **1:35 – 2:00 (Multilateral Netting Engine):**  
   Show the Netting Compression card: 6 gross obligations ($130.00) collapsed into 1 debtor deposit ($45.00) and 4 creditor payouts, with $\sum \text{Net} \equiv \$0.00$.
6. **2:00 – 2:20 (PayPal Sandbox Settlement):**  
   In the Judge Briefing Panel, click **"Verify Authoritative PayPal Sandbox Run"**.  
   - Show Capture ID `7PV82720RX415822V` ($1.00 USD).
   - Show Payout Batch `N4M49PUHNCNQ4` ($0.50 + $0.50 USD).
   - Point to Merkle anchor `custom_id` and the $0.54 cross-border fee explanation.
7. **2:20 – 2:35 (Trust Center & AG Grid):**  
   Switch to the high-density **AG Grid** tab. Scroll through 1,500+ virtualized IOUs. Type "Research Agent" in the filter box to show instantaneous filtering. Point to the double-entry trial balance proving $\Delta = \$0.00$.
8. **2:35 – 2:40 (Closing):**  
   Return to top overview. Conclude with value proposition and GitHub repository link.

---

## 6. Screenshot Capture Instructions (1440×900 Desktop)

Capture and save these 6 authoritative screenshots into `docs/screenshots/`:

| File Name | Target Screen / Modal | Exact Viewport & Content to Frame |
| :--- | :--- | :--- |
| `01_executive_overview.png` | **Dashboard Header & Judge Briefing Panel** | 1440×900 desktop viewport. Frame top 900px showing the title banner, 3 headline claim badges, 3 quick-proof buttons, and the 6-step 30-Second Guided Tour card. |
| `02_hero_scale_ag_grid.png` | **AG Grid 1,500+ Virtualized Ledger** | 1440×900 desktop viewport. Switch to the Hero Scale Clearing tab. Show 1,500+ IOUs loaded in the dark theme grid (`ag-theme-nexus-dark`), with the status bar showing 99.4% reduction and zero-sum proof. |
| `03_ai_sla_judge_adjudication.png` | **AI SLA Judge Modal** | 1440×900 desktop viewport with the AI modal open. Ensure the FreeModel Gemini 3.7 Flash badge, prompt hash, 2,437 token count, and the zero-trust clamp credit breakdown are clearly legible. |
| `04_paypal_authoritative_verify.png` | **PayPal Authoritative Verification Modal** | 1440×900 desktop viewport with the PayPal modal open. Frame the side-by-side Capture ($1.00) and Payouts ($0.50 + $0.50) table with Debug-IDs and Merkle custom IDs visible. |
| `05_trust_and_security_center.png` | **Trust & Security Center View** | 1440×900 desktop viewport. Frame the 14 SQLite triggers status badges, the Ed25519 signature auditor widget, the reserve floor gauge ($\ge \$10.00$), and the attack resistance matrix. |
| `06_double_entry_ledger.png` | **Double-Entry Trial Balance & SSE Stream** | 1440×900 desktop viewport. Frame the balance sheet table proving $Assets \equiv Liabilities + Equity$ with exact $\$0.00$ variance, alongside the live event outbox feed. |

---

## 7. Devpost Submission Checklist

Review [`SUBMISSION.md`](../../submission/SUBMISSION.md) and prepare the Devpost submission form fields:

- [ ] **Project Title:** `TALLY NEXUS`
- [ ] **Elevator Pitch / Tagline:**  
  `Autonomous agent clearinghouse and multilateral netting engine enabling AI agent swarms to clear debts, compress liquidity by 65% to 99.4%, and settle via PayPal with verifiable AI SLA adjudication.`
- [ ] **Project Description:** Copy full formatted markdown text from [`SUBMISSION.md`](../../submission/SUBMISSION.md).
- [ ] **Video URL:** Link to public YouTube / Vimeo video (recorded using `DEMO_SCRIPT.md`).
- [ ] **GitHub Repository URL:** Public GitHub repository URL (after push approval).
- [ ] **Sponsor Track:**  
  - Select **AG Grid Community Partner** (Hero Scale 1,500+ Virtualized Clearinghouse).
  - Select **Autonomous AI Agents / Fintech & Payment Infrastructure**.
- [ ] **Built With Tags:**  
  `typescript`, `node.js`, `sqlite`, `ag-grid`, `paypal-rest-api`, `freemodel`, `gemini-3.7-flash`, `ed25519`, `rfc-8785`, `express`, `vitest`
- [ ] **Uploaded Screenshots:** Attach the 6 screenshots from `docs/screenshots/`.
- [ ] **Sandbox Disclaimers:** Verified present in text (clearly states PayPal Sandbox, India merchant fee model, and FreeModel quota controls).

---

## 8. Known Limitations & Honest Disclaimers

1. **PayPal Sandbox Rails:**  
   All PayPal transactions documented were executed on the **PayPal Developer Sandbox** (`api-m.sandbox.paypal.com`). No real production fiat funds were transferred.
2. **Merchant Fee Derivation ($0.54 USD on $1.00 Capture):**  
   The sandbox business account is registered in India receiving USD, incurring PayPal's published +1.50% cross-border fee ($0.49 fixed + 4.99% = $0.54 USD). In a domestic US production merchant account, standard fees apply ($0.49 + 3.49% = $0.52 USD).
3. **Multi-Model AI Quota & Offline Fallback:**  
   Live evaluation was conducted using FreeModel (`gemini-3.7-flash` and `deepseek-v4.1-flash`). When API keys are omitted or rate limits are reached, the system falls back to stored canonical runs or the deterministic rules engine (`OFFLINE_DETERMINISTIC_FALLBACK`) with zero fabrication.
4. **Hermetic Automated Test Suite:**  
   All 201 automated tests execute in a completely offline, mock-backed environment with zero external network calls to ensure 100% reproducibility across all environments.

---

## 9. Remaining Human Blockers Before November 13 Deadline

| Blocker / Task | Required Action | Status |
| :--- | :--- | :---: |
| **GitHub Push** | Create empty repository on GitHub and approve URL for push. | 🟡 Awaiting User URL |
| **Video Recording** | Record 2:40 video using `DEMO_SCRIPT.md` and upload to YouTube. | 🟡 Ready for User Recording |
| **Screenshot Capture** | Capture 6 screenshots at 1440×900 using Section 6 guide. | 🟡 Ready for Capture |
| **Devpost Submission** | Paste text from `SUBMISSION.md` into Devpost form before Nov 13, 1:30 AM IST. | 🟡 Ready for Submission |

---

*Tally Nexus is feature-frozen, hardened, verified, and completely prepared for public submission.*
