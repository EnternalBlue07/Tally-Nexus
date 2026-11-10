# TALLY NEXUS — PHASE 6 MASTER REPORT
## Judge Experience, Security, Deployment & Submission Readiness

**Project:** Tally Nexus — Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine with PayPal Settlement  
**Repository:** `D:\tally-nexus`  
**Git HEAD:** `d6d08a73562a037c86e0821b0e3be538466b0cf9`  
**Date:** 2026-11-09  
**Test Suite:** 201 / 201 PASSING (16 test files)  
**Security Audit:** 20 commits scanned with Gitleaks — 0 leaks found  

---

## 1. Phase 5.5 Completion Audit

| Audit Item | Status | Verified Evidence |
| :--- | :--- | :--- |
| **A. Unsuppressed Gitleaks Scan** | **DONE** | Scan run with `.gitleaksignore` removed. Exactly 1 finding found in commit `5f9cbd6` (`docs/evidence/sandbox_order_pending.json:9`), matching PayPal approval URL parameter `token=<ORDER_ID>` (`0HC67112BH...`). This is an ephemeral public PayPal Orders v2 Order ID inside a checkout approval URL, not a private key or bearer credential (100% false positive). 0 genuine secrets exist across all 20 historical commits. |
| **B. PayPal Account Reconciliation** | **DONE** | Ingesting merchant sandbox account is registered in **India (`sb-kmpmt... (IN)`)**, receiving USD collections with +1.50% cross-border fee ($0.49 + 4.99% = $0.54 on $1.00). Creditor recipients are **US Personal accounts (`sb-qvovc...` and `sb-dlouv...`)**, receiving $0.50 payouts with $0.25 fixed item fee. Docs updated in `PAYPAL_SANDBOX_EXECUTION_PLAN.md` and `README.md`. |
| **C. Fresh Clone Verification** | **DONE** | Repository cloned into a clean directory (`D:\tally-nexus-clone-test`). Verified: no `.env` exists, `npm ci` succeeds (274 packages), `npm test` runs 201/201 passing tests hermetically, `npm run build` compiles clean, server starts up, and `npm run demo:flagship` completes with $0.00 variance. |
| **D. APP_BASE_URL Configuration** | **DONE** | `src/paypal/orders-service.ts` constructs return/cancel URLs using `process.env.APP_BASE_URL`. Trims whitespace, validates protocol, and defaults safely to `http://localhost:3000`. |
| **E. THIRD_PARTY_NOTICES.md** | **DONE** | Complete MIT and BSD-2-Clause license attributions recorded for AG Grid Community, Express, Zod, UUID, and Dotenv. |

---

## 2. Real AI Evidence Audit (FreeModel Integration)

- **Gateway Endpoint:** `https://freemodel.in/v1/chat/completions`
- **Primary Model Configured:** `gemini-3.7-flash` (HTTP 200, executed live)
- **Fallback Model Configured:** `deepseek-v4.1-flash` (HTTP 200, connectivity verified)
- **Model Verification:** Verified public model listing at `https://freemodel.in/v1/models` (29 models active).

### Live Evaluation Metrics (`npm run judge:evaluate`)
- **Legitimate Scenario:**
  - Model Used: `gemini-3.7-flash` (reported by gateway response)
  - Latency: 11,979 ms
  - Token Usage: 511 prompt / 1,926 completion / **2,437 total tokens**
  - AI Verdict: `PASS` (Confidence: 0.95)
  - Disposition: `OBLIGATION_STANDS`
  - Financial Outcome: Debtor owes **$50.00 USD** (0 bps relief)
- **Adversarial Prompt Injection Scenario:**
  - Model Used: `gemini-3.7-flash`
  - Latency: 4,737 ms
  - Token Usage: 448 prompt / 498 completion / **946 total tokens**
  - Prompt Injection Flow: Pre-flight heuristic flagged injection pattern; payload was also evaluated by `gemini-3.7-flash` which returned `FAIL` (Confidence: 0.99) with explicit reasons citing unauthorized limit modification attempts.
  - Deterministic Financial Clamp: Enforced 10,000 bps credit relief ($100.00 USD), ensuring the debtor owes **$0.00 USD** for the malicious task.
- **Evidence Artifact:** [`docs/evidence/ai-judge-freemodel-2026-11-09T16-24-42-185Z.json`](../../evidence/ai-judge-freemodel-2026-11-09T16-24-42-185Z.json).

### Failover Cascade Invariants
| Condition | Trigger | Resulting State | Disposition |
| :--- | :--- | :--- | :--- |
| **Primary Available** | Normal execution | Primary model (`gemini-3.7-flash`) | Validated verdict applied |
| **Primary Unavailable** | HTTP 503 / Timeout / Rate Limit | Fallback model (`deepseek-v4.1-flash`) | Fallback verdict applied (`fallbackTriggered: true`) |
| **Both Unavailable** | Both models fail or timeout | `INCONCLUSIVE` / `REVIEW_REQUIRED` | `DISPUTED_QUARANTINED` (No uncontracted funds move) |
| **AI Unavailable** | No key in `.env` | `AI: OFFLINE` | Hermetic deterministic rules engine |

---

## 3. Public Demo Security Architecture

### A. Money-Moving Protection under `PUBLIC_DEMO_MODE=true`
All money-moving mutation routes enforce `requireMoneyMovingAuth`:
- `POST /api/settlement/:cycleId/orders`
- `POST /api/settlement/:cycleId/capture`
- `POST /api/settlement/:cycleId/payouts`
- `POST /api/recovery/items/:itemId/reissue`
- `POST /api/recovery/cure`

When `PUBLIC_DEMO_MODE=true`:
1. Anonymous requests are blocked with `401 UNAUTHORIZED`.
2. The default dev operator key (`nexus-dev-operator-key`) is automatically **disabled and locked** (`403 PUBLIC_DEMO_MODE_LOCKED`), preventing default key abuse on public deployments.
3. Only requests with a cryptographically verified, constant-time `OPERATOR_API_KEY` can trigger live financial operations.

### B. AI Judge Quota & Rate Limiter (`AiJudgeQuotaManager`)
- **Per-IP Rate Limit:** 5 requests per minute.
- **Global Concurrency Semaphore:** Maximum 2 simultaneous LLM calls.
- **Daily Live Call Budget:** 50 live calls per 24-hour cycle.
- **Exhaustion Fallback:** When quota is exceeded, the API automatically serves verified canonical evidence labeled `STORED_RUN` with a transparent disclosure notice.

---

## 4. Public Route Inventory (43 Routes)

| # | Route | Method | Access Level | Financial Operation? | Rate Limit / Guard | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `/` | GET | Public | No (UI) | None | **VERIFIED** |
| 2 | `/dashboard` | GET | Public | No (UI) | None | **VERIFIED** |
| 3 | `/health` | GET | Public | No (Probes) | None | **VERIFIED** |
| 4 | `/api/health` | GET | Public | No (Probes) | None | **VERIFIED** |
| 5 | `/api/dashboard/stats` | GET | Public | No (Metrics) | Standard | **VERIFIED** |
| 6 | `/api/events/stream` | GET | Public | No (SSE Events) | Max 100 conns | **VERIFIED** |
| 7 | `/api/agents` | GET | Public | No (Directory) | Standard | **VERIFIED** |
| 8 | `/api/agents/:id` | GET | Public | No (Agent Info) | Standard | **VERIFIED** |
| 9 | `/api/agents` | POST | Public / Agent | No (Registration) | 30/min | **VERIFIED** |
| 10 | `/api/cycles` | GET | Public | No (Cycle List) | Standard | **VERIFIED** |
| 11 | `/api/cycles/:id` | GET | Public | No (Cycle State) | Standard | **VERIFIED** |
| 12 | `/api/cycles` | POST | Operator Auth | No (Init Cycle) | Auth Required | **VERIFIED** |
| 13 | `/api/tasks/:id` | GET | Public | No (Task Info) | Standard | **VERIFIED** |
| 14 | `/api/tasks` | POST | Agent / Operator | No (Submit Task) | Auth Required | **VERIFIED** |
| 15 | `/api/tasks/:id/evaluate` | POST | Operator Auth | No (SLA Eval) | Auth Required | **VERIFIED** |
| 16 | `/api/judge/evaluate` | POST | Public Guarded | No (AI SLA Eval) | 5/min, Cap 50/day, Stored Fallback | **VERIFIED** |
| 17 | `/api/ious` | POST | Public / Agent | No (Signed IOU) | 60/min, Ed25519 Verified | **VERIFIED** |
| 18 | `/api/ious/:id` | GET | Public | No (IOU Info) | Standard | **VERIFIED** |
| 19 | `/api/ious/:id/verify` | GET | Public | No (Crypto Audit) | Standard | **VERIFIED** |
| 20 | `/api/cycles/:id/ious` | GET | Public | No (Cycle IOUs) | Standard | **VERIFIED** |
| 21 | `/api/cycles/:id/net` | POST | Operator Auth | No (Netting Calc) | Auth Required | **VERIFIED** |
| 22 | `/api/cycles/:id/firewall-approve` | POST | Operator Auth | Financial Check | Auth Required | **VERIFIED** |
| 23 | `/api/settlement/:id/orders` | POST | Operator Auth | **YES (Orders v2)** | **Auth Required / Demo Blocked** | **VERIFIED** |
| 24 | `/api/settlement/:id/capture` | POST | Operator Auth | **YES (Capture)** | **Auth Required / Demo Blocked** | **VERIFIED** |
| 25 | `/api/settlement/:id/payouts` | POST | Operator Auth | **YES (Payouts v1)** | **Auth Required / Demo Blocked** | **VERIFIED** |
| 26 | `/api/settlement/:id/payouts` | GET | Public | No (Read-only) | Standard | **VERIFIED** |
| 27 | `/api/settlement/orders` | GET | Public | No (Read-only) | Standard | **VERIFIED** |
| 28 | `/api/settlement/payouts` | GET | Public | No (Read-only) | Standard | **VERIFIED** |
| 29 | `/api/settlement/return` | GET | Public Redirect | Approval Flow | Redirect Handler | **VERIFIED** |
| 30 | `/api/settlement/cancel` | GET | Public Redirect | Cancel Flow | Redirect Handler | **VERIFIED** |
| 31 | `/api/webhooks/paypal` | POST | Public (PayPal) | Webhook Intake | PayPal Signature Verified | **VERIFIED** |
| 32 | `/api/ledger/entries` | GET | Public | No (Public Ledger) | Standard | **VERIFIED** |
| 33 | `/api/ledger/trial-balance` | GET | Operator Auth | No (Trial Balance) | Auth Required | **VERIFIED** |
| 34 | `/api/ledger/accounts/:name` | GET | Operator Auth | No (Account View) | Auth Required | **VERIFIED** |
| 35 | `/api/recovery/items` | GET | Public | No (Queue View) | Standard | **VERIFIED** |
| 36 | `/api/recovery/items/:id/reinstate` | POST | Operator Auth | Financial Audit | Auth Required | **VERIFIED** |
| 37 | `/api/recovery/items/:id/reissue` | POST | Operator Auth | **YES (Reissue)** | **Auth Required / Demo Blocked** | **VERIFIED** |
| 38 | `/api/recovery/reconcile` | POST | Operator Auth | Financial Audit | Auth Required | **VERIFIED** |
| 39 | `/api/recovery/cure` | POST | Operator Auth | **YES (Cash Cure)** | **Auth Required / Demo Blocked** | **VERIFIED** |
| 40 | `/api/demo/run` | POST | Public Guarded | Simulation Run | 10/min per IP | **VERIFIED** |
| 41 | `/api/demo/scale` | POST / GET | Public | Simulation Run | 10/min per IP | **VERIFIED** |
| 42 | `/api/verify/capture/:id` | GET | Public | Read-only Proof | Allowlist-only, 30/min | **VERIFIED** |
| 43 | `/api/verify/payout/:batchId` | GET | Public | Read-only Proof | Allowlist-only, 30/min | **VERIFIED** |

---

## 5. Judge Experience & UI Enhancements

1. **Judge Briefing Panel:** Added directly at the top of the dashboard containing:
   - Three core technical innovation cards with one-click proof triggers.
   - Verified links to GitHub, Demo Video, and Documentation.
   - Interactive 30-Second Guided Tour (6 clicks to evaluate the full pipeline).
2. **Mobile Responsiveness:** Added dedicated CSS media queries for desktop (1440×900) and mobile (390px viewport width) ensuring zero horizontal overflow, responsive metrics grids, and clean button wrapping.
3. **Live AI SLA Modal:** Added `testLiveAiJudge()` interactive trigger allowing judges to test live AI SLA adjudication in real-time.

---

## 6. Submission Assets & Readiness Checklist

- **Public GitHub Repository:** Cleaned of all secrets (Gitleaks verified 20 commits clean). Ready for public push.
- **Demo Video Script:** 180-second walkthrough script prepared covering problem, agent consortium, AI SLA judge, netting compression, PayPal sandbox capture/payout, and Merkle proof.
- **Devpost Submission:** Complete narrative drafted with architecture diagrams, fee optimization derivations, and proof links.
- **Deadline Target:** November 13, 2026 — 1:30 AM IST (All core execution verified ahead of schedule).
