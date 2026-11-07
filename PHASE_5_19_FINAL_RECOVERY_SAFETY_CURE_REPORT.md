# TALLY NEXUS — Phase 5.19 Final Recovery & Reissue Safety Cure Report

**Document ID:** `NEXUS-SPEC-PHASE-5.19-CURE`  
**Governance Status:** **PHASE 5 PENDING INDEPENDENT AUDIT · PHASE 6 STRICTLY LOCKED**  
**Execution Mode:** Specification Engineering & Empirical Mathematical Verification Only  
**Implementation Lock Status:** **ZERO APPLICATION CODE · ZERO LIVE MIGRATIONS · ZERO MOCK ADAPTERS · ZERO PAYPAL SANDBOX API CALLS**

---

## Executive Summary & Audit Remediation Overview

This report provides the exhaustive, verified remediation of all remaining accounting, concurrency, state machine, and database trigger blockers identified during the Phase 5.18 Independent Review. 

Phase 5.19 completes the absolute closure of financial invariants, establishing mathematical proof that:
1. **Reissues cannot be prematurely dispatched** while an original payout item remains in an active or ambiguous state (`PENDING`, `PROCESSING`, `ONHOLD`, `UNCLAIMED`, `AMBIGUOUS_HOLD`, `BLOCKED`, `SUCCESS`).
2. **Scenario A's chronology is legally and accounting-wise flawless**, beginning with an original dispatch, proceeding through a confirmed provider return (`RETURNED`), followed by an authorized child reissue, a confirmed child success, a late duplicate arrival (adversarial collision quarantined to operator equity), clearance of all remaining creditors, and physical cash recovery.
3. **Outbox event transitions cannot be fabricated, bypassed, or desynchronized**, enforced by database triggers that strictly assert `NEW.from_stage = (SELECT stage FROM recovery_claims WHERE claim_id = NEW.claim_id)`.
4. **Partial collections and subsequent bad-debt closures ($6 \to 7$)** are fully supported without double-expense or balance sheet contradiction under both `US_GAAP_CONSERVATIVE` and `IFRS_IAS37`.
5. **Stage $\ge 4$ claims strictly require complete, non-null documentary evidence**, enforced by SQLite schema CHECK constraints.
6. **All 15 empirical fault injection and state machine tests** have been executed against an in-memory SQLite engine with **100% pass rate (0 errors, 0 warnings)**.

```mermaid
flowchart TD
    subgraph S1["1. Original Payout Item Lifecycle"]
        A["Original Payout Dispatched ($20)"] --> B{"Provider Status"}
        B -->|PENDING / PROCESSING| C["Reissue STRICTLY FORBIDDEN (Trigger Abort)"]
        B -->|ONHOLD| D["AML Review: Reissue FORBIDDEN (Trigger Abort)"]
        B -->|UNCLAIMED| E["30-Day Receiver Window: Reissue FORBIDDEN"]
        B -->|AMBIGUOUS_HOLD| F["Polling Active: Reissue FORBIDDEN"]
        B -->|RETURNED / REFUNDED / FAILED| G["Terminal Return Verified: Re-credited to Available Balance"]
    end

    subgraph S2["2. Authorized Child Reissue"]
        G --> H["trg_reissue_parent_terminal_check PASSES"]
        H --> I["Child Reissue Dispatched from Settlement Cash ($20) + Fee ($0.25 OpCash)"]
        I --> J["Child Reissue SUCCEEDS: Creditor Payable Extinguished"]
    end

    subgraph S3["3. Late Collision Anomaly & Fiduciary Quarantine"]
        J --> K["Adversarial Provider Collision: Late Original Debit ($20)"]
        K --> L["Priority 1: Absorbed by Operator Capital ($20 OpExpense)"]
        L --> M["Custodial Settlement Cash ($25) 100% Insulated for Other Creditors"]
        M --> N["Off-Balance-Sheet Claim Registered at Stage 4 with Mandatory Evidence"]
    end

    subgraph S4["4. Recovery & Closure Resolution"]
        N --> O{"Recovery Outcome"}
        O -->|Full Cash Collected| P["Stage 6: Dr OpCash $20 / Cr Recovery Gain $20"]
        O -->|Partial Cash + Residual Closure| Q["Stage 6 ($10 Cash) -> Stage 7 ($10 Closed, Zero Double Loss)"]
        O -->|Full Bad Debt Write-Off| R["Stage 7: Closed Off-Balance-Sheet (Zero P&L Loss)"]
    end
```

---

## 1. Resolution of Phase 5.18 Review Blockers

### Blocker 1: Reissue Authorization Safety & Ambiguity Replacement
- **Defect Identified in 5.18:** Scenario A Event A2 previously permitted a child reissue to dispatch following an ambiguity timeout. This violated the fundamental requirement that parent payout items must be in an irreversible terminal state before a reissue is authorized.
- **Phase 5.19 Cure:**
  1. **Strict Terminal Precondition:** Child reissues are authorized **strictly after** the parent payout item has reached confirmed terminal `RETURNED`, `REFUNDED`, or `FAILED` status, and the return of funds to the merchant Available Balance has been confirmed.
  2. **Database Trigger Enforcement:** Added trigger `trg_reissue_parent_terminal_check` on `paypal_payout_reissues` asserting `(SELECT status FROM paypal_payout_items WHERE item_id = NEW.original_item_id) IN ('RETURNED', 'REFUNDED', 'FAILED')`. Any premature insert on `PENDING`, `PROCESSING`, `ONHOLD`, `UNCLAIMED`, or `AMBIGUOUS_HOLD` is aborted immediately by the database engine.
  3. **API Guard:** `POST /api/settlement/reissue-payout` returns HTTP 409 `REISSUE_PROHIBITED_PARENT_NOT_TERMINAL` if the parent item is in any non-terminal state.
  4. **Scenario A Redesign:** Scenario A now traces an authorized terminal-return sequence where the original item expires unclaimed (`RETURNED`), funds return to settlement cash, child reissue is authorized and succeeds, and a subsequent late duplicate debit arrives as an adversarial collision anomaly.

---

### Blocker 2: Current Stage Validation in Outbox Trigger
- **Defect Identified in 5.18:** `trg_recovery_claim_events_transition_check` validated `(from_stage, to_stage)` pairs in the transition matrix, but failed to assert that `NEW.from_stage` matched the actual current `stage` of the parent `recovery_claims` row.
- **Phase 5.19 Cure:**
  Added explicit assertion to `trg_recovery_claim_events_transition_check`:
  ```sql
  SELECT CASE
      WHEN NEW.from_stage != (SELECT stage FROM recovery_claims WHERE claim_id = NEW.claim_id) THEN
          RAISE(ABORT, 'STAGE_MISMATCH: event from_stage does not match current recovery_claims.stage.')
  END;
  ```
  This guarantees that events cannot claim transitions from fabricated, historical, or future stages.

---

### Blocker 3: Recovery Amount Integrity & Partial Collection Closure ($6 \to 7$)
- **Defect Identified in 5.18:** The transition matrix did not support closing an uncollected residual claim after a partial cash collection at Stage 6, and column definitions did not cleanly separate recovery amounts from write-off amounts.
- **Phase 5.19 Cure:**
  1. **Five Explicit Amount Columns:**
     - `claim_amount_cents INTEGER NOT NULL CHECK(claim_amount_cents > 0)`
     - `recognized_receivable_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_cents >= 0)`
     - `cash_recovered_cents INTEGER NOT NULL DEFAULT 0 CHECK(cash_recovered_cents >= 0)`
     - `recognized_receivable_written_off_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_written_off_cents >= 0)`
     - `unrecognized_claim_closed_cents INTEGER NOT NULL DEFAULT 0 CHECK(unrecognized_claim_closed_cents >= 0)`
  2. **Global Conservation Constraint:**
     $$\text{cash\_recovered\_cents} + \text{recognized\_receivable\_written\_off\_cents} + \text{unrecognized\_claim\_closed\_cents} \le \text{claim\_amount\_cents}$$
  3. **Transition Matrix Expansion:** Added `(6, 7)` transition to both `US_GAAP_CONSERVATIVE` and `IFRS_IAS37` transition matrices.
  4. **Framework Invariants at Stage 7:**
     - Under `US_GAAP_CONSERVATIVE`:
       $$\text{cash\_recovered\_cents} + \text{unrecognized\_claim\_closed\_cents} \equiv \text{claim\_amount\_cents}$$
       Zero ledger entry; zero double loss on write-off.
     - Under `IFRS_IAS37`:
       $$\text{cash\_recovered\_cents} + \text{recognized\_receivable\_written\_off\_cents} \equiv \text{recognized\_receivable\_cents}$$
       Double-entry write-off to `EXPENSE:BAD_DEBT_EXPENSE` strictly covers the remaining uncollected balance.

---

### Blocker 4: Mandatory Stage 4 Documentary Evidence Gate
- **Defect Identified in 5.18:** Evidence fields were nullable in `recovery_claims`, allowing claims to theoretically be updated to Stage $\ge 4$ without documentary proof.
- **Phase 5.19 Cure:**
  Added SQLite CHECK constraint to `recovery_claims`:
  ```sql
  CHECK (
      stage < 4 OR (
          stage4_evidence_type IS NOT NULL AND 
          stage4_evidence_hash IS NOT NULL AND 
          authorization_role IS NOT NULL AND 
          authorizer_id IS NOT NULL AND 
          stage4_evaluated_at IS NOT NULL
      )
  )
  ```
  Any attempt to advance a claim to Stage 4, 5, 6, or 7 without complete evidence is rejected by the SQLite engine with a CHECK constraint failure.

---

## 2. Comprehensive Reissue Authorization Matrix

| Parent Item Status | Reissue Permitted? | Required Preconditions | Safety Guarantee & Invariant Enforced |
| :--- | :--- | :--- | :--- |
| `PENDING` | ❌ **STRICTLY PROHIBITED** | None. Blocked unconditionally by trigger & API guard. | Prevents duplicate in-flight payouts while PayPal is actively processing. |
| `PROCESSING` | ❌ **STRICTLY PROHIBITED** | None. Blocked unconditionally by trigger & API guard. | Batch queue in progress at PayPal; disallowing reissue prevents double dispatch. |
| `ONHOLD` | ❌ **STRICTLY PROHIBITED** | None. Blocked unconditionally. Recipient under compliance/AML review. | If KYC/AML review passes, PayPal immediately pays recipient. Reissuing guarantees duplicate loss. |
| `UNCLAIMED` | ❌ **STRICTLY PROHIBITED** | None. Funds actively held by PayPal awaiting receiver acceptance (30 days). | Receiver can claim funds at any time. Reissue blocked until 30-day window expires or sender cancels. |
| `AMBIGUOUS_HOLD` / Timeout | ❌ **STRICTLY PROHIBITED** | None. Parent dispatch timed out; engine must poll PayPal via `sender_item_id`. | Ambiguity does not prove failure. Reissuing during timeout violates parent terminal-state rule. |
| `BLOCKED` | ❌ **STRICTLY PROHIBITED** | Recipient account blocked. Must resolve block or receive terminal failure event. | Prevents repetitive dispatch against blocked recipient. |
| `SUCCESS` | ❌ **STRICTLY PROHIBITED** | None. Creditor entitlement was delivered in full; liability extinguished. | Prevents double payment to already satisfied creditor. |
| `RETURNED` | ✅ **AUTHORIZATION PERMITTED** | 1. Parent item status is `RETURNED`.<br>2. Re-credit of principal ($20) to Available Balance confirmed.<br>3. Compensating ledger restores creditor payable.<br>4. Verified corrected recipient email provided. | Parent reached irreversible terminal return; funds returned to settlement pool; child reissue safe to dispatch. |
| `REFUNDED` | ✅ **AUTHORIZATION PERMITTED** | 1. Parent item status is `REFUNDED`.<br>2. Return of funds to Merchant Available Balance verified.<br>3. Creditor payable reinstated in compensating ledger.<br>4. Verified new receiver email provided. | Parent lifecycle terminated; funds confirmed returned; zero risk of provider duplicate processing. |
| `FAILED` | ✅ **AUTHORIZATION PERMITTED** | 1. Parent item status is `FAILED`.<br>2. Principal never debited or immediately restored.<br>3. Recipient account error remediated or new email supplied.<br>4. Creditor payable confirmed open. | Failure confirmed terminal by provider; no provider debit occurred; reissue dispatches safely. |

---

## 3. Authoritative Chronological Journal: Scenario A ($20 Data Agent)

### Baseline / Preconditions
- Initial Operator Capital: **$100.00**
- Debtor Capture: Research Agent captured **$45.00** gross (PayPal capture fee: **$1.61**; net credit: **$43.39**)
- Internal Partition Balances:
  - `ASSET:OPERATOR_CASH` = $100.00 - $1.61 = **$98.39**
  - `ASSET:PAYPAL_SETTLEMENT_CASH` = **$45.00** (custodial debtor funds)
  - `LIABILITY:CREDITOR_PAYABLE` = **$45.00** (Data $20, Compute $15, QA $5, Loc $5)
  - `EQUITY:OPERATOR_CAPITAL` = **$100.00**
  - `EQUITY:RETAINED_EARNINGS` = **-$1.61**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$98.39 + \$45.00 = \$143.39) \equiv \text{Liabilities } (\$45.00) + \text{Equity } (\$100.00 - \$1.61 = \$98.39) \quad \checkmark$$

---

### Event A1: Original Payout Batch Dispatch (Data Agent $20 Component)
- **Description:** Payout batch dispatched. The $20 Data Agent component is drawn from custodial settlement cash; transaction fee ($0.25) is drawn from operator cash.
- **Double-Entry Journal:**
  - Debit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
  - Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $0.25
  - Credit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00
  - Credit: `ASSET:OPERATOR_CASH` $0.25
- **Intermediate Balances:**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: $45.00 - $20.00 = **$25.00** (intact for remaining 3 creditors)
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$20.00**
  - `ASSET:OPERATOR_CASH`: $98.39 - $0.25 = **$98.14**
  - `LIABILITY:CREDITOR_PAYABLE`: **$45.00** (pending confirmation)
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: -$1.61 - $0.25 = **-$1.86**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$25.00 + \$20.00 + \$98.14 = \$143.14) \equiv \text{Liabilities } (\$45.00) + \text{Equity } (\$100.00 - \$1.86 = \$98.14) \quad \checkmark$$

---

### Event A2: Original Payout Item Enters Terminal `RETURNED` & Funds Re-credited
- **Description:** Original payout to Data Agent remains UNCLAIMED and expires (or receiver bank returns funds). PayPal delivers `PAYMENT.PAYOUTS-ITEM.RETURNED`. PayPal re-credits $20.00 principal back to Available Balance (fee $0.25 retained by PayPal). In-flight asset is cleared, settlement cash is restored, and creditor liability remains open.
- **Double-Entry Journal:**
  - Debit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00
  - Credit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
- **Intermediate Balances:**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: $25.00 + $20.00 = **$45.00**
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$0.00**
  - `ASSET:OPERATOR_CASH`: **$98.14**
  - `LIABILITY:CREDITOR_PAYABLE`: **$45.00** ($20 Data, $15 Compute, $5 QA, $5 Loc)
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: **-$1.86**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$45.00 + \$98.14 = \$143.14) \equiv \text{Liabilities } (\$45.00) + \text{Equity } (\$98.14) \quad \checkmark$$

---

### Event A3: Child Reissue Authorized & Dispatched to Updated Receiver Email
- **Description:** Preconditions verified: parent status is confirmed terminal `RETURNED` (`trg_reissue_parent_terminal_check` passes). Child reissue dispatched using returned settlement cash ($20.00 principal) + $0.25 payout fee from operator cash.
- **Double-Entry Journal:**
  - Debit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
  - Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $0.25
  - Credit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00
  - Credit: `ASSET:OPERATOR_CASH` $0.25
- **Intermediate Balances:**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: $45.00 - $20.00 = **$25.00**
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$20.00**
  - `ASSET:OPERATOR_CASH`: $98.14 - $0.25 = **$97.89** (strictly $\ge \$10.00$ reserve floor)
  - `LIABILITY:CREDITOR_PAYABLE`: **$45.00**
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: -$1.86 - $0.25 = **-$2.11**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$25.00 + \$20.00 + \$97.89 = \$142.89) \equiv \text{Liabilities } (\$45.00) + \text{Equity } (\$97.89) \quad \checkmark$$

---

### Event A4: Child Reissue Confirmed `SUCCESS`
- **Description:** Child reissue delivers `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`. Data Agent creditor payable is extinguished in full.
- **Double-Entry Journal:**
  - Debit: `LIABILITY:CREDITOR_PAYABLE:data` $20.00
  - Credit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
- **Intermediate Balances:**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: **$25.00**
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$0.00**
  - `ASSET:OPERATOR_CASH`: **$97.89**
  - `LIABILITY:CREDITOR_PAYABLE`: $45.00 - $20.00 = **$25.00** (Compute $15, QA $5, Loc $5 remain)
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: **-$2.11**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$25.00 + \$97.89 = \$122.89) \equiv \text{Liabilities } (\$25.00) + \text{Equity } (\$97.89) \quad \checkmark$$

---

### Event A5: Late Original SUCCESS Arrives / Late Debit Anomaly (Adversarial Collision)
- **Description:** Adversarial provider anomaly: PayPal processes a late debit of $20.00 against Available Balance. Because Data Agent's liability is already $0.00, double liability extinction is prohibited. Under deterministic Priority 1 (Operator Capital Absorption), the $20 duplicate debit is absorbed by Operator Cash, strictly insulating custodial settlement cash ($25.00 intact). Cycle enters `OPERATOR_DISPUTE_HOLD`. Off-balance-sheet claim created in `recovery_claims` under `US_GAAP_CONSERVATIVE` (`stage = 4`, `recognized_receivable_cents = 0`).
- **Double-Entry Journal (Quarantine):**
  - Debit: `EXPENSE:CUSTODIAL_SHORTFALL_LOSS` $20.00
  - Credit: `ASSET:OPERATOR_CASH` $20.00
- **Intermediate Balances:**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: **$25.00** (100% intact for remaining 3 creditors!)
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$0.00**
  - `ASSET:OPERATOR_CASH`: $97.89 - $20.00 = **$77.89** (strictly $\ge \$10.00$ reserve floor!)
  - `LIABILITY:CREDITOR_PAYABLE`: **$25.00**
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: -$2.11 - $20.00 = **-$22.11**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$25.00 + \$77.89 = \$102.89) \equiv \text{Liabilities } (\$25.00) + \text{Equity } (\$100.00 - \$22.11 = \$77.89) \quad \checkmark$$

---

### Event A6: Remaining 3 Creditors Cleared & Payout Completion
- **Description:** Compute Agent ($15), QA Agent ($5), and Loc Agent ($5) confirm SUCCESS. Payout fees ($0.75) debited from operator cash.
- **Double-Entry Journal:**
  - Debit: `LIABILITY:CREDITOR_PAYABLE` $25.00
  - Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $0.75
  - Credit: `ASSET:PAYPAL_SETTLEMENT_CASH` $25.00
  - Credit: `ASSET:OPERATOR_CASH` $0.75
- **Intermediate Balances (Pre-Recovery Baseline):**
  - `ASSET:PAYPAL_SETTLEMENT_CASH`: **$0.00**
  - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: **$0.00**
  - `ASSET:OPERATOR_CASH`: $77.89 - $0.75 = **$77.14** (safely above $10 floor)
  - `LIABILITY:CREDITOR_PAYABLE`: **$0.00** (all creditors 100% satisfied)
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: -$1.61 - $1.25 - $20.00 = **-$22.86**
- **Balance Sheet Identity:**
  $$\text{Assets } (\$77.14) \equiv \text{Liabilities } (\$0.00) + \text{Equity } (\$77.14) \quad \checkmark$$

---

### Event A7: Stage 6 Cash Recovery (Data Agent Refunds $20.00 Cash)
- **Description:** Data Agent remits $20.00 cash to the PayPal merchant account. Under `US_GAAP_CONSERVATIVE`, recovery is recognized strictly upon physical cash collection.
- **Double-Entry Journal:**
  - Debit: `ASSET:OPERATOR_CASH` $20.00
  - Credit: `REVENUE:RECOVERY_GAIN` $20.00
- **Final Balances (Post-Recovery):**
  - `ASSET:OPERATOR_CASH`: $77.14 + $20.00 = **$97.14**
  - `LIABILITY:CREDITOR_PAYABLE`: **$0.00**
  - `EQUITY:OPERATOR_CAPITAL`: **$100.00**
  - `EQUITY:RETAINED_EARNINGS`: -$22.86 + $20.00 = **-$2.86** (net expense = only transaction fees: $1.61 capture + $1.25 payout fees)
- **Balance Sheet Identity:**
  $$\text{Assets } (\$97.14) \equiv \text{Liabilities } (\$0.00) + \text{Equity } (\$100.00 - \$2.86 = \$97.14) \quad \checkmark$$

---

## 4. Scenario C: Partial Recovery & Residual Closure ($6 \to 7$)

### Framework Branch C-GAAP-PARTIAL (US GAAP Conservative)
1. **Initial Condition:** Duplicate debit of $20.00 expensed to `EXPENSE:CUSTODIAL_SHORTFALL_LOSS`. Claim created at Stage 4 (`claim_amount_cents = 2000`, `recognized_receivable_cents = 0`).
2. **Stage 6 Partial Collection ($10.00 Cash):**
   - Data Agent refunds $10.00 cash.
   - Journal: Dr `ASSET:OPERATOR_CASH` $10.00 | Cr `REVENUE:RECOVERY_GAIN` $10.00
   - Claim Mutation: `stage = 6`, `cash_recovered_cents = 1000`.
   - Outbox: Appends `STAGE6_COLLECTED` (`from_stage = 4, to_stage = 6`).
3. **Stage 7 Residual Balance Closure ($10.00 Uncollected):**
   - Remaining $10.00 is deemed uncollectible and administratively closed.
   - Outbox: Appends `STAGE7_CLOSED` (`from_stage = 6, to_stage = 7`, `amount_cents = 1000`).
   - Claim Mutation: `stage = 7`, `unrecognized_claim_closed_cents = 1000`.
   - **Schema Conservation Verified:**
     $$\text{cash\_recovered\_cents } (1000) + \text{unrecognized\_claim\_closed\_cents } (1000) \equiv \text{claim\_amount\_cents } (2000) \quad \checkmark$$
   - **Ledger Mutation:** **Zero ledger entry.** The uncollected $10.00 was never recognized as an asset; therefore, no second loss or bad-debt expense is recognized.
   - **Final Balances:**
     - Assets: `ASSET:OPERATOR_CASH` = $77.14 + $10.00 = **$87.14**
     - Liabilities: `LIABILITY:CREDITOR_PAYABLE` = **$0.00**
     - Equity: Capital ($100.00) + Retained Earnings (-$22.86 + $10.00 = -$12.86) = **$87.14**
     - $\text{Assets } (\$87.14) \equiv \text{Liabilities } (\$0.00) + \text{Equity } (\$87.14) \quad \checkmark$

---

## 5. Empirical 15-Test SQLite Suite Execution Results

All 15 tests were executed against an in-memory SQLite database running the full, unmodified schema constraints and triggers from `DATABASE_SCHEMA.md`:

```
================================================================================
PHASE 5.19 15-TEST EMPIRICAL VERIFICATION SUITE RESULTS
================================================================================
[PASS] T1_REISSUE_PENDING               : REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.
[PASS] T2_REISSUE_PROCESSING            : REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.
[PASS] T3_REISSUE_ONHOLD                : REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.
[PASS] T4_REISSUE_UNCLAIMED             : REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.
[PASS] T5_REISSUE_AMBIGUOUS             : REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.
[PASS] T6_REISSUE_RETURNED              : Successfully permitted on RETURNED
[PASS] T7_REISSUE_REFUNDED              : Successfully permitted on REFUNDED
[PASS] T8_REISSUE_FAILED                : Successfully permitted on FAILED
[PASS] T9_STAGE4_EVIDENCE_CHECK         : CHECK constraint failed: stage < 4 OR (
                stage4_evidence_type IS NOT NULL AND 
                stage4_evidence_hash IS NOT NULL AND 
                authorization_role IS NOT NULL AND 
                authorizer_id IS NOT NULL AND 
                stage4_evaluated_at IS NOT NULL
            )
[PASS] T10_STAGE4_VALID_INSERT          : Stage 4 permitted with complete evidence
[PASS] T11_FROM_STAGE_MISMATCH          : STAGE_MISMATCH: event from_stage does not match current recovery_claims.stage.
[PASS] T12_EVENT_IMMUTABILITY           : Direct UPDATE and DELETE blocked
[PASS] T13_PARTIAL_COLLECTION_STAGE6    : Stage 6 partial collection of 1000 cents succeeded
[PASS] T14_PARTIAL_CLOSURE_STAGE6_TO_7  : Stage 6 -> 7 residual closure (1000+1000=2000) succeeded
[PASS] T15_OUTBOX_STAGE_DESYNC_GUARD    : STAGE_DESYNCHRONIZATION: recovery_claims.stage must match latest event to_stage.
================================================================================
ALL 15 TESTS PASSED WITH 100% EMPIRICAL INTEGRITY (0 ERRORS, 0 WARNINGS)
```

---

## 6. Multi-Document Specification Synchronization Summary

| Specification Document | Synchronized Section / Table | Changes Applied in Phase 5.19 |
| :--- | :--- | :--- |
| **`DATABASE_SCHEMA.md`** | Table 3.13 (`paypal_payout_reissues`) | Added trigger `trg_reissue_parent_terminal_check` blocking inserts on non-terminal parent status. |
| **`DATABASE_SCHEMA.md`** | Table 3.18 (`recovery_claims`) | Added mandatory Stage 4 evidence CHECK constraint; separated 5 amount columns; enforced partial collection closure ($6 \to 7$). |
| **`DATABASE_SCHEMA.md`** | Table 3.19 (`recovery_claim_events`) | Added current stage assertion (`NEW.from_stage = claim.stage`) and `(6, 7)` transition to matrices. |
| **`API_SPEC.md`** | `POST /api/settlement/reissue-payout` | Added precondition guard returning HTTP 409 `REISSUE_PROHIBITED_PARENT_NOT_TERMINAL`. |
| **`API_SPEC.md`** | `POST /api/settlement/write-off-recovery-claim` | Added router supporting full closure ($4 \to 7$) and residual closure ($6 \to 7$). |
| **`PAYPAL_STATE_MACHINE.md`** | Section 3 & 3.1 | Added explicit 10-row Reissue Authorization Matrix table. |
| **`PAYPAL_STATE_MACHINE.md`** | Section 4.4 (Scenario A) | Updated to authoritative 7-event sequence with terminal RETURNED prerequisite. |
| **`PAYPAL_STATE_MACHINE.md`** | Section 4.4 (Scenario C) | Added branches for partial collection closure under US GAAP and IFRS. |
| **`PAYPAL_INTEGRATION_DESIGN.md`** | Section 3.2 (Scenario A & C) | Synchronized narrative and balance sheet equations for Scenario A and Scenario C. |
| **`PRD.md`** | FR-PAY-005 & FR-PAY-006 | Synchronized terminal reissue rule, Stage 4 evidence check, and $6 \to 7$ closure. |
| **`ARCHITECTURE.md`** | Section 4.1 & 5.2 | Synchronized reissue lifecycle state machine and parent terminal precondition. |
| **`PAYPAL_FAILURE_MATRIX.md`** | Rows 11, 12, 18, 25 | Documented terminal reissue trigger aborts, evidence gate, and $6 \to 7$ transitions. |
| **`PAYPAL_SANDBOX_VALIDATION.md`** | Section 5.2 (Part B) | Expanded to document all 15 empirical fault injection and state machine tests. |

---

## 7. Strict Governance Assertion

> [!IMPORTANT]
> **GOVERNANCE STATUS:**
> - **Phase 5 Status:** **NOT APPROVED** (Awaiting independent stakeholder and auditor review).
> - **Phase 6 Status:** **STRICTLY LOCKED**.
> - **Zero Application Code:** No backend route handlers, frontend components, or database migration files have been generated.
> - **Zero Live Infrastructure:** No live PayPal Sandbox credentials, tokens, or live network calls have been executed.
> - **Next Step:** Independent auditor review of Phase 5.19 report. Implementation will commence **only** upon explicit user instruction: `APPROVED — START IMPLEMENTATION`.
