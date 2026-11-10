# PAYPAL_SANDBOX_VALIDATION.md — SANDBOX ONBOARDING & VALIDATION RUNBOOK

**Document Version:** 1.0.0 (Phase 5 Specification)  
**System Name:** TALLY NEXUS  
**Scope:** Sandbox Account Configuration, Verification Runbook & Fallback Procedures  
**Classification:** Operational Runbook & Demo Verification Guide  

---

## 1. Sandbox Onboarding & Configuration Checklist

To execute live PayPal transactions during development and judging, the operator must configure the following Sandbox assets in the [PayPal Developer Dashboard](https://developer.paypal.com):

### Step 1: Sandbox Accounts Setup
1. **Sandbox Business (Merchant) Account:**
   - Role: Acts as the Tally Nexus clearinghouse settlement account.
   - Initial Balance: Ensure at least **$500.00 USD** in sandbox funds.
   - Payouts Permission: In Account Settings $\rightarrow$ Sandbox $\rightarrow$ Accounts, verify that **Payouts** is listed under Account Features.
2. **Sandbox Personal (Buyer) Account:**
   - Role: Represents the funding source for the net debtor (Research Agent).
   - Email / Password: Used during the live demo to log in and approve the $45.00 PayPal Sandbox Order.
   - Balance: Ensure at least **$100.00 USD** balance or a linked test credit card.
3. **Creditor Sandbox Receiver Emails:**
   - The 4 net creditors must have valid recipient email addresses in the sandbox environment:
     - `agent-data@nexus.local` (or pre-configured sandbox email)
     - `agent-compute@nexus.local`
     - `agent-qa@nexus.local`
     - `agent-loc@nexus.local`
   *(Note: PayPal Sandbox allows sending payouts to any sandbox email address; recipient accounts do not need pre-existing balances).*

### Step 2: REST API App Registration
1. Navigate to **Dashboard $\rightarrow$ Apps & Credentials $\rightarrow$ Sandbox**.
2. Click **Create App** $\rightarrow$ Name: `Tally Nexus Clearinghouse`.
3. Select App Type: **Merchant**.
4. Link to the Sandbox Business Account created in Step 1.
5. Copy credentials into `.env`:
   ```bash
   PAYPAL_CLIENT_ID="AXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
   PAYPAL_CLIENT_SECRET="EYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY"
   PAYPAL_SANDBOX_URL="https://api-m.sandbox.paypal.com"
   ```

### Step 3: Webhook Registration
1. In the App settings, click **Add Webhook**.
2. Webhook URL: `https://<your-ngrok-or-local-tunnel>/api/webhooks/paypal` (or local test tunnel).
3. Select Event Triggers:
   - `Payment capture completed` (`PAYMENT.CAPTURE.COMPLETED`)
   - `Payment capture denied` (`PAYMENT.CAPTURE.DENIED`)
   - `Payouts batch success` (`PAYMENT.PAYOUTSBATCH.SUCCESS`)
   - `Payouts batch denied` (`PAYMENT.PAYOUTSBATCH.DENIED`)
   - `Payout item succeeded` (`PAYMENT.PAYOUTS-ITEM.SUCCEEDED`)
   - `Payout item failed` (`PAYMENT.PAYOUTS-ITEM.FAILED`)
   - `Payout item blocked` (`PAYMENT.PAYOUTS-ITEM.BLOCKED`)
4. Copy the assigned **Webhook ID** into `.env`:
   ```bash
   PAYPAL_WEBHOOK_ID="WH-ZZZZZZZZZZZZZZZZZ"
   ```

---

## 2. Pre-Flight Connectivity Verification Spike (Milestone 5)

Before integrating UI or complex clearing logic, execute a standalone pre-flight CLI test verifying raw sandbox communications:

```bash
# Pre-Flight Command Test (to be run during Milestone 5)
npm run test:paypal-connectivity
```

### Verification Criteria Checklist:
- [ ] **Check 1: OAuth Authentication** $\rightarrow$ Successfully acquires Bearer token (`scope: "https://uri.paypal.com/services/payments/payouts"`).
- [ ] **Check 2: Orders Creation** $\rightarrow$ Successfully generates Order for `$1.00 USD` and receives valid approval URL.
- [ ] **Check 3: Payouts Feature Check** $\rightarrow$ Dispatches a minimal `$1.00 USD` test payout to a sandbox email.
  - *If HTTP 201*: Payouts API is active and functional.
  - *If HTTP 403 / 400 (Feature disabled)*: Immediately flags need for manual portal toggle or switches to the verified mock strategy below.
- [ ] **Check 4: Webhook Signature Verification** $\rightarrow$ Tests simulated signature against `POST /v1/notifications/verify-webhook-signature`.

---

## 3. Demo-First Execution Plan (The 180-Second Live Walkthrough)

During the hackathon judging evaluation or recording of the 3-minute video:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ THE 180-SECOND DEMO SCRIPT & INTERACTION GUIDE                                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [0:00 - 0:30] PREPARATION & ECONOMY TRIGGER                                            │
│ • Operator opens http://localhost:3000/clearing-room.                                  │
│ • Clicks [Run Research Consortium]. 5 agents execute tasks.                           │
│ • UI shows 6 valid tasks generating $130.00 gross debt.                                │
│                                                                                        │
│ [0:30 - 1:00] THE SLA DEFENSE                                                          │
│ • Operator clicks [Inject Adversarial Task].                                           │
│ • Data Agent returns corrupted schema.                                                 │
│ • SLA Judge flags FAIL. Banner confirms: "Deliverable Rejected — No IOU Created".      │
│                                                                                        │
│ [1:00 - 1:35] NETTING & FIREWALL GATE                                                  │
│ • Operator clicks [Run Multilateral Netting].                                          │
│ • Graph collapses $130 gross to $45 net. Liquidity reduction: 65.38%.                  │
│ • Financial Firewall validates: All 4 gates PASSED (Green checkmarks).                │
│                                                                                        │
│ [1:35 - 2:25] REAL PAYPAL SANDBOX SETTLEMENT (The Climax)                              │
│ • Clearing Room button illuminates: [Authorize Collection via PayPal Sandbox ($45.00)]│
│ • Operator clicks -> Redirects to sandbox.paypal.com checkout page.                    │
│ • Operator enters Sandbox Buyer credentials -> Clicks "Pay Now".                      │
│ • Browser redirects back to Nexus Clearing Room.                                       │
│ • Screen displays live capture confirmation: "Order CAP-XXXX Captured ($45.00)".      │
│ • System immediately triggers PayPal Payout batch to 4 creditors.                      │
│ • Recipient progress tracks item-by-item:                                              │
│     - Data Agent:         +$20.00 [SUCCESS]                                            │
│     - Compute Agent:      +$15.00 [SUCCESS]                                            │
│     - QA Agent:           +$5.00  [SUCCESS]                                            │
│     - Localization Agent: +$5.00  [SUCCESS]                                            │
│                                                                                        │
│ [2:25 - 3:00] RECONCILIATION & AUDIT PROOF                                             │
│ • All items confirmed; cycle badge updates to: SETTLED.                                │
│ • Operator opens Audit Drawer: displays zero residual balance, Ed25519 signatures,    │
│   and JSON receipt with Merkle anchor.                                                 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Fallback Strategy: Verified Mock Mode

If PayPal Sandbox Payouts access is unavailable due to account approval latency or transient PayPal Sandbox downtime:

### Transparency & Integrity Invariant
Tally Nexus will **never** silently fabricate fake PayPal success or misrepresent simulated operations as genuine PayPal Sandbox transactions.

### Fallback Implementation Protocol:
1. **Detection:** When `test:paypal-connectivity` or the live payment flow detects that PayPal Payouts returns `PERMISSION_DENIED` or service unavailable:
2. **Activation:** The operator can toggle `PAYPAL_MODE=mock` in `.env` (or via a deliberate UI fallback switch).
3. **Execution Behavior:**
   - Real PayPal Orders API collection is preserved (since Orders works unconditionally in Sandbox).
   - Payout distribution routes through `MockPayPalAdapter`, which simulates recipient status transitions with realistic 1,500ms network latency.
4. **UI Disclosure:**
   - The Clearing Room displays a prominent high-contrast banner:
     $$\text{"PAYPAL ORDERS: LIVE SANDBOX} \quad \vert \quad \text{PAYPAL PAYOUTS: VERIFIED MOCK MODE"}$$
   - Every mock record in `paypal_payouts` is stamped with `is_mock = 1`.
   - The demo video script explicitly states: *"Debtor collection is live PayPal Sandbox; creditor payouts are demonstrated via verified local adapter due to Sandbox Payouts account provisioning."*

---

## 5. Provider Evidence & Empirical Validation Suite (Milestone 11 Execution Gates)

To prevent conflating internal software testing with actual external provider behavior, testing is strictly partitioned into three distinct tiers:

### 5.1 Part A: Empirical Live Sandbox Provider Tests (Actual Provider Verification)
These tests validate only behaviors that PayPal's Sandbox API genuinely produces:

| Test ID | Objective | Test Procedure | Pass / Assert Criteria |
| :--- | :--- | :--- | :--- |
| **SB-VAL-01** | **Reporting API Freshness & Latency** | Dispatch a $1.00 payout batch. Query `GET /v1/reporting/balances` immediately, at 1-minute intervals, and observe `last_refresh_time`. | Measure actual provider latency. Confirm that stale snapshots return `STALE_REPORTING_DATA`, `PENDING_PROVIDER_REFLECTION`, or `REFLECTION_TIMEOUT` without triggering false discrepancy alerts. |
| **SB-VAL-02** | **Item-Level Truth vs Batch Status** | Submit a payout batch with 2 items: 1 valid sandbox email and 1 unregistered sandbox email (which enters `UNCLAIMED`). | Batch status reaches `SUCCESS` / `PROCESSING`, but only the claimed item transitions to `SUCCESS`. Assert that the second creditor payable remains outstanding and cycle remains in `RECONCILING`. |
| **SB-VAL-03** | **Dynamic Fee Extraction** | Inspect the HTTP response body of `POST /v1/payments/payouts` and `GET /v1/payments/payouts/{id}`. | Assert that `payout_item_fee.value` is dynamically extracted and recorded in `EXPENSE:PAYPAL_TRANSACTION_FEE`, replacing the default estimate. |
| **SB-VAL-04** | **30-Day Unclaimed Expiration / Return** | Trigger a payout to an unregistered test account. Cancel the unclaimed payout via sandbox portal or simulate `PAYMENT.PAYOUTS-ITEM.RETURNED`. | Assert that principal is restored to `SETTLEMENT_CASH` and transaction fee is retained by operator as OpEx. |

### 5.2 Part B: Internal Fault Injection Tests (System Self-Defense Verification)
These tests validate internal state machine, Financial Firewall, single-reissue entitlement, evidence immutability, and double-entry journal integrity under simulated adversity. **They do not claim that PayPal generates these sequences natively**:

| Test ID | Objective | Test Procedure | Pass / Assert Criteria |
| :--- | :--- | :--- | :--- |
| **INT-FAULT-01** | **Duplicate Child Reissue Blocked** | Concurrent or repeated insert into `paypal_payout_reissues` while parent has an active child. | Aborted by partial unique index `uq_active_child_per_parent`. Exactly at most ONE child in active/settled status allowed. |
| **INT-FAULT-02** | **Reissue Entitlement Serialization** | Insert child reissue when parent status is `RETURNED` but `reissue_authorization_state` is `PARENT_TERMINAL_CONFIRMED`. | Aborted by `trg_reissue_entitlement_check`. Requires completing atomic return verification sequence up to `REISSUE_AUTHORIZED`. |
| **INT-FAULT-03** | **Concurrent Stage 6 Recovery Race** | Concurrent second collection attempt against an already collected claim. | Aborted by `trg_recovery_claim_events_transition_check` with `STAGE_MISMATCH` or schema conservation constraint. |
| **INT-FAULT-04** | **Duplicate Webhook Delivery** | Transmit identical `paypal_event_id` into `processed_webhooks`. | Aborted by primary key `UNIQUE` constraint; returns HTTP 200 without executing side-effects. |
| **INT-FAULT-05** | **Stage 4 Evidence Immutability** | Attempt to update `stage4_evidence_hash`, `evidence_type`, or `authorizer_id` on a claim at `stage >= 4`. | Aborted by trigger `trg_recovery_claims_evidence_immutable` with `EVIDENCE_TAMPERING_PROHIBITED`. |
| **INT-FAULT-06** | **Claim Update Without Outbox Event** | Attempt direct `UPDATE recovery_claims SET stage = 7` without appending event to outbox. | Aborted by trigger `trg_recovery_claims_sync` with `STAGE_DESYNCHRONIZATION`. |
| **INT-FAULT-07** | **Event Insert Without Claim Update** | Insert event 1 -> 2, omit claim stage update, then attempt insert of event 2 -> 3. | Aborted by trigger `trg_recovery_claim_events_transition_check` with `STAGE_MISMATCH`. |
| **INT-FAULT-08** | **RETURNED Before Balance Reflection** | Attempt reissue when parent is `RETURNED` but `reissue_authorization_state` is `RETURN_FUNDS_VERIFIED`. | Aborted by `trg_reissue_entitlement_check`. Stale balance reporting cannot authorize premature dispatch. |
| **INT-FAULT-09** | **Reissue After Creditor Payable Extinguished** | Attempt reissue insert on an original item whose child already reached `SUCCESS`. | Aborted: parent state is `CHILD_SETTLED` and partial unique index blocks second child. |
| **INT-FAULT-10** | **Adversarial Collision Isolation** | Child reissue confirms `SUCCESS`; late original arrives. | Parent marked `CHILD_SETTLED`; duplicate debit quarantined to operator capital; zero double-liability extinction. |
| **INT-FAULT-11** | **Transaction Rollback Integrity** | Provoke a database constraint error mid-transaction inside `BEGIN IMMEDIATE ... COMMIT`. | Entire transaction rolls back cleanly; 0 partial state persisted. |
| **INT-FAULT-12** | **Recovery Exceeding Claim Blocked** | Attempt to collect 1,500 cents against a 1,000 cent recovery claim. | Aborted by schema CHECK constraint `cash_recovered_cents <= claim_amount_cents`. |
| **INT-FAULT-13** | **Unauthorized Recovery Ownership** | Attempt to insert claim with unapproved counterparty or owner combination. | Aborted by schema `CHECK(counterparty_type IN ('AGENT', 'PAYPAL'))`. |
| **INT-FAULT-14** | **Recovery Collection After Stage 7 Closure** | Attempt to execute Stage 6 cash recovery on a claim previously closed at Stage 7. | Aborted by trigger `trg_recovery_claim_events_transition_check` (`7 -> 6` invalid transition). |

### 5.3 Part C: Documented Theoretical Anomaly Recovery Scenarios
Theoretical edge cases (e.g. offline banking re-debits, retroactive manual chargebacks, cross-border settlement collisions) are formally specified in `PAYPAL_STATE_MACHINE.md` Section 4.4 and `PAYPAL_FAILURE_MATRIX.md` as defensive recovery designs without claiming they represent normal PayPal behavior.



## 7. Phase 5.22 Verified Fault-Injection Test Matrix

The Phase 5.22 16-test comprehensive suite (`verify_phase5_22_complete_suite.py`) verified the following critical fault-injection scenarios:

1. **Active Late Parent Webhook Collision (`T10`):** Injects a late `PAYMENT.PAYOUTS-ITEM.SUCCEEDED` webhook on a parent item in `CHILD_SETTLED` state. Actively blocked by `trg_parent_payout_item_late_success_guard`.
2. **Atomic Recovery Outbox Synchronization (`T7`):** Proves that event insertion atomically mutates parent claim stage and balances via `trg_recovery_claim_events_atomic_sync` with zero split-brain possibility.
3. **Core Field Immutability on Frozen Claims (`T5`):** Attempts to mutate `claim_amount_cents`, `counterparty_id`, and `evidence_hash` on a Stage 4 claim. All blocked by `trg_recovery_claims_evidence_immutable`.
4. **Counterparty Default & Reserve Adequacy (`T15`):** Simulates 100% counterparty default in Scenario A-DEF. Proves that closing claim at Stage 7 maintains Operator Cash = $77.14, exceeding the $10.00 reserve floor with +$67.14 headroom.
5. **Cryptographic Webhook Handshake & Replay Defense (`T16`):** Validates timestamp skew ($\le 300	ext{s}$), cert domain whitelist (`api.paypal.com` / `api.sandbox.paypal.com`), and replay deduplication.
