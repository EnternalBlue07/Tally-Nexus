# PAYPAL_INTEGRATION_DESIGN.md — TALLY NEXUS PAYPAL SETTLEMENT ARCHITECTURE

**Document Version:** 1.0.0 (Phase 5 Specification)  
**System Name:** TALLY NEXUS  
**Integration Scope:** PayPal REST APIs (Orders v2, Payments v2, Payouts v1, Webhooks v1)  
**Target Environment:** PayPal Developer Sandbox (`https://api-m.sandbox.paypal.com`)  
**Classification:** Core Financial Rail & Settlement Specification  

---

## 1. PayPal API Capability Validation & Technical Baselines

Tally Nexus integrates two distinct PayPal rails to achieve complete clearing and settlement:
1. **Debtor Collection Rail:** PayPal Orders API (v2) with `intent: "CAPTURE"` to collect net debtor balances with operator approval.
2. **Creditor Distribution Rail:** PayPal Payouts API (v1) to disburse verified collected funds to net creditors in a single atomic batch.

### 1.1 API Capability & Sandbox Truth Matrix

| API / Feature | Endpoint / Mechanism | Confirmed Official Capability | Sandbox Constraints & Account Dependency |
| :--- | :--- | :--- | :--- |
| **OAuth 2.0 Token** | `POST /v1/oauth2/token` | Basic Auth (`client_id:client_secret`), returns Bearer token with `expires_in` (typically 32400s / 9 hours). | Fully supported in Sandbox. Requires in-memory caching with proactive refresh (refresh at $T - 300\text{s}$). |
| **Orders Creation** | `POST /v2/checkout/orders` | Creates an order with `intent: "CAPTURE"`, `purchase_units` with integer minor units formatted as decimal string (e.g. `"45.00"`), and idempotency via `PayPal-Request-Id` header. | Supported. Returns `links[rel="payer-action"]` (`approve`) URL for sandbox redirect. |
| **Order Capture** | `POST /v2/checkout/orders/{id}/capture` | Authoritative settlement capture. Idempotent via `PayPal-Request-Id`. Returns `status: "COMPLETED"` and capture ID. | Supported. Payer approval in sandbox is mandatory before capture succeeds. |
| **Payouts Batch** | `POST /v1/payments/payouts` | Dispatches batch payout with `sender_batch_id` (idempotency key) and list of items with `sender_item_id`. Returns `batch_status: "PENDING"`. | **Account-Dependent:** Requires Payouts feature enablement on the Sandbox Business account. If unapproved, returns `INSUFFICIENT_FUNDS` or `PERMISSION_DENIED`. |
| **Payout Batch Status** | `GET /v1/payments/payouts/{payout_batch_id}` | Returns overall batch status (`PENDING`, `PROCESSING`, `SUCCESS`, `DENIED`) and summary of item counts. | Supported. Polling interval must respect rate limits ($\ge 2,000\text{ms}$). |
| **Payout Item Status** | `GET /v1/payments/payouts-item/{payout_item_id}` | Authoritative status of individual recipient (`SUCCESS`, `FAILED`, `PENDING`, `UNCLAIMED`, `RETURNED`, `ONHOLD`, `BLOCKED`, `REFUNDED`, `REVERSED`). | Supported. Returns PayPal fee and transaction ID once completed. |
| **Webhook Signature Verification** | `POST /v1/notifications/verify-webhook-signature` | Official PayPal endpoint to verify webhook authenticity without bundling PayPal root certificates. | Supported. Requires exact raw string request body and headers. |

---

## 2. Debtor Collection Workflow (Orders API v2)

Debtor collection follows a strict human-in-the-loop authorization path. Agents cannot bypass human payer consent.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ DEBTOR COLLECTION LIFECYCLE (Research Agent: $45.00 USD)                               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. SETTLEMENT PREPARATION                                                              │
│    • Financial Firewall approves netting proposal. Net debtor: Research Agent ($45.00).│
│    • Cycle status: 'FIREWALL_APPROVED' -> 'COLLECTION_PENDING'.                        │
│                                                                                        │
│ 2. ORDER CREATION (Idempotent)                                                         │
│    • Backend generates idempotency key: `req_id = "nexus_order_" + cycle_id`.          │
│    • Calls PayPal: POST /v2/checkout/orders                                            │
│      Headers: PayPal-Request-Id: {req_id}                                              │
│      Payload: intent="CAPTURE", amount="45.00", currency="USD"                         │
│    • PayPal returns: order_id="ORDER-9DF821948B", status="CREATED", approve_url.       │
│    • DB Transaction: Inserts row into `paypal_orders` (status='CREATED').              │
│                                                                                        │
│ 3. OPERATOR APPROVAL REDIRECT                                                          │
│    • Frontend displays: "Awaiting Operator Authorization ($45.00)".                    │
│    • Operator clicks -> Opens PayPal Sandbox checkout window.                          │
│    • Operator authenticates using Sandbox Personal/Buyer account -> Approves payment.  │
│    • PayPal redirects browser to return_url: /api/settlement/return?token={order_id}   │
│                                                                                        │
│ 4. CAPTURE EXECUTION & DUAL-PATH RECONCILIATION                                        │
│    • Path A (Synchronous Return):                                                      │
│        Backend calls PayPal: POST /v2/checkout/orders/{order_id}/capture               │
│        Headers: PayPal-Request-Id: "nexus_cap_" + cycle_id                             │
│        PayPal responds: status="COMPLETED", capture_id="CAP-3819283719"                │
│    • Path B (Asynchronous Webhook):                                                    │
│        PayPal emits webhook: PAYMENT.CAPTURE.COMPLETED                                 │
│    • ATOMIC TRANSACTION:                                                               │
│        Whichever path arrives first updates `paypal_orders.status = 'CAPTURED'`,       │
│        sets `settlement_cycles.status = 'COLLECTION_CAPTURED'`, records transition.    │
│        Second path detects 'CAPTURED' and exits idempotently (noop).                   │
│                                                                                        │
│ 5. RECONCILIATION GATE                                                                 │
│    • Verified Collected Funds ($45.00) == Total Net Creditor Entitlement ($45.00).     │
│    • Only upon this exact match does the system unlock Payout Batch Dispatch.          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Creditor Distribution Workflow (Payouts API v1)

Payouts distribute confirmed collected funds to the 4 net creditors. Under no circumstances may payouts be triggered from authorized or pending funds.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ CREDITOR DISTRIBUTION LIFECYCLE ($45.00 USD Distributed to 4 Creditors)               │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. PAYOUT PREPARATION                                                                  │
│    • Precondition: settlement_cycles.status == 'COLLECTION_CAPTURED'.                  │
│    • Assert: Total Collected ($45.00) == Sum(Net Creditors: $20 + $15 + $5 + $5).      │
│    • Generates stable sender_batch_id: "nexus_payout_batch_" + cycle_id.               │
│                                                                                        │
│ 2. BATCH DISPATCH (Atomic Single Call)                                                 │
│    • Calls PayPal: POST /v1/payments/payouts                                           │
│      Payload:                                                                          │
│        sender_batch_header: { sender_batch_id, email_subject: "Nexus Clearing" }       │
│        items: [                                                                        │
│          { sender_item_id: "cyc_001_item_data",    amount: "20.00", receiver: "..." }, │
│          { sender_item_id: "cyc_001_item_compute", amount: "15.00", receiver: "..." }, │
│          { sender_item_id: "cyc_001_item_qa",      amount: "5.00",  receiver: "..." }, │
│          { sender_item_id: "cyc_001_item_loc",     amount: "5.00",  receiver: "..." }  │
│        ]                                                                               │
│    • PayPal returns: batch_status="PENDING", payout_batch_id="PAYOUT-BATCH-7749182".   │
│    • DB Transaction:                                                                   │
│        Inserts `paypal_payouts` (status='SUBMITTED')                                   │
│        Inserts 4 rows into `paypal_payout_items` (status='PENDING')                     │
│        Updates `settlement_cycles.status = 'PAYOUT_DISPATCHED'`.                       │
│                                                                                        │
│ 3. ITEM-LEVEL STATUS TRACKING & RECONCILIATION                                         │
│    • System tracks status via:                                                         │
│        A. Webhooks: PAYMENT.PAYOUTS-ITEM.SUCCEEDED / FAILED / UNCLAIMED / HELD /       │
│                     RETURNED / REFUNDED / CANCELED                                     │
│        B. Polling Fallback: GET /v1/payments/payouts/{payout_batch_id} (every 3s).     │
│    • DB Updates: Each item updates individually across 9 official statuses:            │
│      SUCCESS, FAILED, PENDING, UNCLAIMED, RETURNED, ONHOLD, BLOCKED, REFUNDED, REVERSED│
│                                                                                        │
│ 4. CYCLE SETTLEMENT COMPLETION RULES                                                   │
│    • Case A (100% Success): All 4 items reach 'SUCCESS'.                               │
│        Disbursed Principal ($45.00) == Collected Principal ($45.00). Residual = $0.00.  │
│        Cycle updates to: 'SETTLED'. Immutable Audit Receipt anchored.                  │
│    • Case B (Unclaimed / On Hold): Items in 'UNCLAIMED' or 'ONHOLD'.                   │
│        Cycle remains in 'RECONCILING' with hold flag; funds remain encumbered.         │
│    • Case C (Partial Item Failure / Block): 1+ items reach 'FAILED' or 'BLOCKED'.      │
│        Cycle updates to: 'PARTIAL_FAILURE_HOLD'.                                       │
│        Unallocated funds remain quarantined. System alerts operator.                   │
│        Batch acceptance NEVER equates to settlement completion.                        │
│    • Case D (Returned / Refunded): Items in 'RETURNED' or 'REFUNDED'.                  │
│        Cycle updates to 'PARTIAL_FAILURE_HOLD'; credit ledger logs reversal.           │
└────────────────────────────────────────────────────────────────────────────────────────┘

---

## 3.1 Payout Dispatch Recovery & HATEOAS Re-Anchoring

If `POST /v1/payments/payouts` experiences a network timeout, socket drop, HTTP 5xx, or process crash before local DB commit:

```
                      PAYOUT DISPATCH AMBIGUOUS OUTCOME
                                       │
                                       ▼
             Case 1: Within Idempotency Window (<= 30 Days)
             Re-send POST /v1/payments/payouts with EXACT same
             `PayPal-Request-Id` and `sender_batch_id`
                                       │
             ┌─────────────────────────┴─────────────────────────┐
             ▼                                                   ▼
     HTTP 201 (CREATED)                                  HTTP 400 (DUPLICATE_SENDER_BATCH_ID)
     Process normal batch response.                      Extract HATEOAS link: rel="batch"
             │                                           href="https://.../payouts/{id}"
             │                                                   │
             │                                                   ▼
             │                                           Follow HATEOAS link:
             │                                           GET /v1/payments/payouts/{id}
             │                                                   │
             └─────────────────────────┬─────────────────────────┘
                                       ▼
                 Persist Recovered paypal_batch_id & item array atomically
                                       │
                                       ▼
             Case 2: After Idempotency Expiry (> 30-45 Days) or Unlocatable
             - If HATEOAS lookup returns 404 or original batch cannot be verified:
               Cycle transitions to [PAYOUT_AMBIGUOUS_HOLD].
               Freeze automated execution. Alert platform operator.
               Operator performs manual audit in PayPal Developer Dashboard.
               NEVER dispatch a fresh payout batch blindly with new IDs.
```

### Idempotency Triad Details:
- `PayPal-Request-Id`: Transport-level REST idempotency header (valid up to 45 days).
- `sender_batch_id`: Business-level batch idempotency key (unique per 30 days).
- `sender_item_id`: Recipient-level unique identifier (e.g. `"cyc_001_item_data"`).

---

## 3.2 PayPal Fee Policy & Double-Entry Accounting Architecture

Tally Nexus enforces a formal nine-account double-entry ledger that strictly segregates **Custodial Settlement Principal** from **Operator Working Capital, Payment Rail Operating Expenses (OpEx), and On-Balance-Sheet Dispute Receivables**.

### Internal Accounting Partitions vs External Provider Balances

To prevent conflation between internal ledger partitions and actual funds held by PayPal, Tally Nexus strictly distinguishes **external provider-reported physical money** from **internal double-entry subledger partitions**:

1. **External Provider Balances (Authoritative PayPal State):**
   - $PP_{\text{Physical\_Available}}$: Single physical available cash balance reported by PayPal via `GET /v1/reporting/balances?as_of_time=...`. *Note on Provider Freshness:* As officially documented by PayPal, this reporting endpoint can take **up to three hours to appear** and reflects the `last_refresh_time`. It represents the single, indivisible external money pool held by PayPal.
   - $PP_{\text{Reported\_Pending}}$: Cumulative principal of payout items currently pending, processing, unclaimed, or held inside PayPal's processing pipeline, queried in real time via the Payouts API (`GET /v1/payments/payouts/{payout_batch_id}`).
2. **Internal Cash Partitions (Subledger Partitions of the Single Available Balance):**
   - `ASSET:OPERATOR_CASH` and `ASSET:PAYPAL_SETTLEMENT_CASH` are **not separate physical bank accounts**. They are internal subledger accounting partitions of the single $PP_{\text{Physical\_Available}}$ balance.
   - `ASSET:OPERATOR_CASH`: Operator-owned working capital partition inside the PayPal account (used to fund rail fees, absorb operational discrepancies, and maintain the reserve floor).
   - `ASSET:PAYPAL_SETTLEMENT_CASH`: Custodial debtor principal partition inside the PayPal account, strictly ring-fenced for payout dispatch to creditors.
   - *Expected Available Cash:* $\text{Cash}_{\text{Expected}} \equiv \text{ASSET:OPERATOR\_CASH} + \text{ASSET:PAYPAL\_SETTLEMENT\_CASH} \equiv PP_{\text{Physical\_Available}}$.
   - *Internal Partition Transfers:* Any transfer between operator cash and settlement cash (e.g. fee absorption) is an **internal subledger reclassification**, not a physical banking movement.
3. **Internal Transit Asset (Custodial Accounting Asset):**
   - `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`: Internal accounting asset representing custodial debtor principal that has been dispatched and debited from PayPal's available balance, but not yet finalized by recipient delivery (`SUCCESS`) or return (`RETURNED`). *Note:* This is an internal accounting claim on in-transit money, **not** money physically sitting in PayPal's available balance.
4. **On-Balance-Sheet Recovery Claim:**
   - `ASSET:OPERATOR_DISPUTE_RECEIVABLE:{counterparty}`: **On-balance-sheet** legal recovery asset established ONLY after meeting formal Stage 4 recognition criteria and authorized by Fiduciary Controller under applicable accounting framework.

```
Physical PayPal Account (api-m.sandbox.paypal.com)
└── PP_Physical_Available (Single external money pool reported via GET /v1/reporting/balances)
    ├── ASSET:OPERATOR_CASH                         [Internal Subledger Partition: Operator capital & OpEx]
    └── ASSET:PAYPAL_SETTLEMENT_CASH                [Internal Subledger Partition: Custodial debtor funds]
└── Dispatched Payout Pipeline (Deducted by PayPal upon batch acceptance - Real-time queryable)
    └── ASSET:PAYPAL_PAYOUTS_IN_FLIGHT              [Internal Accounting Asset: Tracking in-flight items]

Off-Balance-Sheet / On-Balance-Sheet Recovery Claims:
    └── ASSET:OPERATOR_DISPUTE_RECEIVABLE:{counterparty} [Recognized ONLY upon Stage 4 threshold satisfaction]
```

### Decoupled Safety & Reconciliation Architecture

Tally Nexus operates two independent systems:
1. **System A: Immediate Settlement Safety Engine (Transactional):** Real-time gatekeeping using Orders v2 capture confirmation, Payouts API query, idempotent deduplication, and item-level liability extinction.
2. **System B: Periodic External Accounting Reconciliation (Audit):** Evaluates `GET /v1/reporting/balances` against expected balances subject to provider freshness metadata (`as_of_time`, `last_refresh_time`).

$$\boxed{\text{\textbf{Axis 1 (Periodic Available Cash Variance):}} \quad \Delta_{\text{Available}} = PP_{\text{Actual\_Available}} - (\text{ASSET:OPERATOR\_CASH} + \text{ASSET:PAYPAL\_SETTLEMENT\_CASH})}$$
$$\boxed{\text{\textbf{Axis 2 (Real-Time In-Flight Variance):}} \quad \Delta_{\text{InFlight}} = PP_{\text{Reported\_Pending}} - \text{ASSET:PAYPAL\_PAYOUTS\_IN\_FLIGHT}}$$

*Reporting Reflection Policy for Axis 1:*
Axis 1 enforces the formal **Five-State Reporting Taxonomy**:
1. `STALE_REPORTING_DATA`: `last_refresh_time < cycle.dispatched_at` or age > 3h (informational; never halts clearing).
2. `PENDING_PROVIDER_REFLECTION`: Refreshed post-dispatch, elapsed time $\le 3\text{h}$, transaction completeness pending (variance classified as pending reflection, not discrepancy).
3. `REFLECTION_CONFIRMED` (`RECONCILED_MATCH`): Verified match of exact transaction identifiers (`transaction_id`, amount, currency, event codes `T0001`/`T0104`/`T0107`/`T1114`) and $\Delta_{\text{Available}} \equiv 0$.
4. `REFLECTION_TIMEOUT`: Elapsed time > 3h without provider reflection. Escalates to operator warning and audit log review; **does NOT halt clearing automatically**.
5. `DISCREPANCY_DETECTED`: Verified fresh reporting with confirmed transaction reflection and unexplained $\Delta_{\text{Available}} \neq 0$. Cycle transitions to `OPERATOR_DISPUTE_HOLD`.
Axis 2 ($\Delta_{\text{InFlight}}$) is evaluated strictly in real time against `GET /v1/payments/payouts/{id}`.

```
Chart of Accounts:
ASSETS:
 1. ASSET:OPERATOR_CASH                               (Operator-owned funds inside PayPal Available Balance)
 2. ASSET:PAYPAL_SETTLEMENT_CASH                      (Custodial debtor funds inside PayPal Available Balance)
 3. ASSET:PAYPAL_PAYOUTS_IN_FLIGHT                    (Custodial funds in PayPal payout transit)
 4. ASSET:OPERATOR_DISPUTE_RECEIVABLE:{counterparty}  (On-balance-sheet claim against overpaid agent or PayPal)
    • ASSET:OPERATOR_DISPUTE_RECEIVABLE:{agent_id}    (Counterparty = Overpaid recipient agent)
    • ASSET:OPERATOR_DISPUTE_RECEIVABLE:paypal         (Counterparty = PayPal provider for erroneous debit)

LIABILITIES:
 5. LIABILITY:CREDITOR_PAYABLE:{agent_id}             (Debt owed by clearinghouse to creditor agent)

EQUITY & EXPENSES:
 6. EQUITY:OPERATOR_CAPITAL                           (Contributed working capital from human operator)
 7. EQUITY:RETAINED_EARNINGS                          (Cumulative net: -fees - losses)
 8. EXPENSE:PAYPAL_TRANSACTION_FEE                    (Payment rail fees: $0.25/item baseline; dynamic from API)
 9. EXPENSE:UNRECOVERABLE_DISBURSEMENT_LOSS           (Bad debt when duplicate payout/debit is unrecoverable)
10. EXPENSE:CUSTODIAL_SHORTFALL_LOSS                  (Loss recognized upon custodial shortfall breach)
11. EXPENSE:OPERATOR_ANOMALY_LOSS                     (Operational expense upon unexpected debit from operator funds)
12. REVENUE:DISPUTE_RECOVERY_RECOGNITION              (Conditional revenue recognized ONLY upon verified legal claim)
```

### Complete Balanced Journal Entries (Flagship Scenario: 4 Creditors):
*(Note: Fees use illustrative US domestic rate of $0.25/item; production dynamically parses `payout_item_fee.value` from PayPal API responses).*

1. **Operator Pre-Funds Operating Capital ($100.00):**
   - Debit: `ASSET:OPERATOR_CASH` $100.00 | Credit: `EQUITY:OPERATOR_CAPITAL` $100.00
   *(Assets: $100 = Liabilities: $0 + Equity: $100. Expected Avail Cash: $100. PP Avail: $100).*
2. **Debtor Order Captured ($45.00 from Research Consortium Debtor):**
   - *Authoritative Physical PayPal Provider Event:*
     - Payer Debtor Gross Captured: $45.00
     - PayPal Payment Rail Fee Deducted: $1.61 (`seller_receivable_breakdown.paypal_fee`)
     - **Physical Cash Deposited into PayPal Balance:** **+$43.39** (`seller_receivable_breakdown.net_amount`)
     - *Physical Truth:* The physical PayPal account strictly receives **$43.39**, NOT $45.00.
   - *Internal Subledger Allocation & Fee Absorption (Atomic Journal Entry):*
     To ensure creditors receive 100% of their cleared entitlement without fee deduction, the clearinghouse records a **single, balanced compound entry** inside SQLite `BEGIN IMMEDIATE ... COMMIT`. This entry records the $43.39 physical deposit and simultaneously reclassifies $1.61 from the operator cash partition to the custodial settlement partition:
     ```
     Debit:  ASSET:PAYPAL_SETTLEMENT_CASH          $45.00  [Internal Custodial Allocation: $43.39 physical net + $1.61 operator reclassification]
     Debit:  EXPENSE:PAYPAL_TRANSACTION_FEE         $1.61  [Payment rail OpEx absorbed by operator equity]
     Credit: LIABILITY:CREDITOR_PAYABLE:agt_data   $20.00  [Creditor 1 cleared entitlement]
     Credit: LIABILITY:CREDITOR_PAYABLE:agt_compute$15.00  [Creditor 2 cleared entitlement]
     Credit: LIABILITY:CREDITOR_PAYABLE:agt_qa      $5.00  [Creditor 3 cleared entitlement]
     Credit: LIABILITY:CREDITOR_PAYABLE:agt_loc     $5.00  [Creditor 4 cleared entitlement]
     Credit: ASSET:OPERATOR_CASH                    $1.61  [Internal operator partition reclassification to fund rail fee]
     ```
   - *Physical vs Internal Reconciliation Proof:*
     - **Physical Account Movement:** $PP_{\text{Physical\_Available}}$ increases by **+$43.39**.
     - **Internal Subledger Allocation Movement:**
       - Custodial Partition (`SETTLEMENT_CASH`): increases by $45.00.
       - Operator Partition (`OPERATOR_CASH`): decreases by $1.61.
       - Net Internal Available Cash Change: $\$45.00 - \$1.61 = \mathbf{+\$43.39} \equiv \Delta PP_{\text{Physical\_Available}}$ ✓
     - **Double-Entry Balance:** Total Debits ($\$46.61$) $\equiv$ Total Credits ($\$46.61$) ✓
     - **Internal Custodial Conservation Invariant:**
       $$\text{ASSET:PAYPAL\_SETTLEMENT\_CASH } (\$45.00) \equiv \sum_{a} \text{LIABILITY:CREDITOR\_PAYABLE}:a \quad (\$45.00) \quad \checkmark$$
       *(Note: This is an internal ledger allocation guarantee. Local database atomicity guarantees that no committed internal ledger state exposes an unbalanced custodial allocation).*
3. **Payout Batch Dispatched to 4 Creditors ($45.00 Principal + $1.00 Fees [4 × $0.25]):**
   - **Principal in Transit:** Debit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $45.00 | Credit: `ASSET:PAYPAL_SETTLEMENT_CASH` $45.00
   - **Rail Fee Recognized:** Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $1.00 | Credit: `ASSET:OPERATOR_CASH` $1.00
   *(Assets: $144 = Liabilities: $45 + Equity: $99. Expected Avail Cash: $99, In-Flight: $45. Real-time Δ_InFlight = $0).*
4. **3 Payouts Succeed ($15 Compute + $5 QA + $5 Loc = $25.00):**
   - Debit: `LIABILITY:CREDITOR_PAYABLE:{compute,qa,loc}` $25.00 | Credit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $25.00
   *(Assets: $119 = Liabilities: $20 + Equity: $99. Expected Avail Cash: $99, In-Flight: $20. Real-time Δ_InFlight = $0).*
5. **Data Agent's $20 Payout UNCLAIMED (30-day claim window open):**
   - *No ledger mutation.* Funds remain in `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT`; liability remains in `LIABILITY:CREDITOR_PAYABLE`.
6. **Data Agent's $20 Payout RETURNED (30-day window expired):**
   - Debit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00 | Credit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
   *(Cash restored to PP Available. Liability was never extinguished. Assets: $119 = Liab: $20 + Eq: $99. Expected Avail Cash: $119, In-Flight: $0).*
7. **Reissue Dispatched ($20.00 Principal + $0.25 Fee):**
   - Debit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00 | Credit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00
   - Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $0.25 | Credit: `ASSET:OPERATOR_CASH` $0.25
   *(Total illustrative payout fees so far: $1.00 + $0.25 = $1.25. Assets: $118.75 = Liab: $20 + Eq: $98.75. Expected Avail Cash: $98.75, In-Flight: $20).*
8. **Reissue Confirmed SUCCESS ($20.00 to Data Agent):**
   - Debit: `LIABILITY:CREDITOR_PAYABLE:agt_data` $20.00 | Credit: `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20.00
   *(Liability extinguished. Assets: $98.75 = Liab: $0 + Eq: $98.75. Expected Avail Cash: $98.75, In-Flight: $0).*
9. **Post-Settlement Reversal/Refund ($20.00):**
   - Debit: `ASSET:PAYPAL_SETTLEMENT_CASH` $20.00 | Credit: `LIABILITY:CREDITOR_PAYABLE:agt_data` $20.00
   *(PP returns funds to Available Balance; liability reinstated. Cycle in POST_SETTLEMENT_RECONCILING).*
10. **Exceptional Duplicate-Disbursement Collision Architecture (Four Scenarios):**
    - **Scenario A (Complete Chronological Authorized Return, Reissue & Dual-Disbursement Collision):**
       - *Event A1 (Original Dispatch):* Dr `IN_FLIGHT` $20, Dr `EXPENSE:FEE` $0.25 | Cr `SETTLEMENT_CASH` $20, Cr `OPERATOR_CASH` $0.25. (Assets: $143.14 $\equiv$ L+E: $143.14).
       - *Event A2 (Parent Item Terminal RETURNED & Re-credited):* Dr `SETTLEMENT_CASH` $20 | Cr `IN_FLIGHT` $20. Parent reaches terminal `RETURNED`; $20 restored to Available Balance; liability remains open. (Assets: $143.14 $\equiv$ L+E: $143.14).
       - *Event A3 (Child Reissue Dispatch):* Authorized only after complete atomic return verification sequence reaching `REISSUE_AUTHORIZED` status (`trg_reissue_entitlement_check` passes, `uq_active_child_per_parent` enforces single child exclusivity). Dr `IN_FLIGHT` $20, Dr `EXPENSE:FEE` $0.25 | Cr `SETTLEMENT_CASH` $20, Cr `OPERATOR_CASH` $0.25. (OpCash drops to $97.89, safe above $10 floor; Assets: $142.89 $\equiv$ L+E: $142.89).
       - *Event A4 (Child Reissue SUCCESS):* Dr `LIABILITY:CREDITOR_PAYABLE:data` $20 | Cr `IN_FLIGHT` $20. Extinguishes creditor entitlement in full. Parent advances to `CHILD_SETTLED`. (Assets: $122.89 $\equiv$ L+E: $122.89).
       - *Event A5 (Late Original SUCCESS / Duplicate Debit Anomaly & Quarantine):* Dr `EXPENSE:CUSTODIAL_SHORTFALL_LOSS` $20 | Cr `OPERATOR_CASH` $20. Extinction prevented; duplicate quarantined; cycle enters `OPERATOR_DISPUTE_HOLD`. Off-balance-sheet claim created in `recovery_claims` under `US_GAAP_CONSERVATIVE` (`stage = 4`, `recognized_receivable_cents = 0`). Under Tally Nexus Platform Terms of Service — Operational Recoupment Policy, if recipient wallet was credited twice, Data Agent holds $20.00 in excess disbursement subject to on-platform recoupment and internal loss attribution to Operator (`claim_owner = 'OPERATOR'`, `counterparty_type = 'AGENT'`); if provider billing error without recipient delivery, claim is an operational dispute against `PAYPAL`. (Assets: $102.89 $\equiv$ L+E: $102.89).
       - *Event A6 (Remaining Creditors Clear):* Dr `LIABILITY:CREDITOR_PAYABLE` $25, Dr `EXPENSE:FEE` $0.75 | Cr `SETTLEMENT_CASH` $25, Cr `OPERATOR_CASH` $0.75. (Pre-recovery baseline: OpCash=$77.14, SetCash=$0, CredPay=$0, Equity=$77.14).
       - *Event A7 (Stage 6 Cash Recovery):* Dr `ASSET:OPERATOR_CASH` $20 | Cr `REVENUE:RECOVERY_GAIN` $20. `recovery_claims.stage = 6`, `cash_recovered_cents = 2000`. (Final Assets: $97.14 $\equiv$ L+E: $97.14; net expense = only transaction fees).
       - *Event A7-DEF (Counterparty Default & Write-Off — Scenario A-DEF):* If Data Agent defaults, refuses cooperation, or terminates, claim closes at Stage 7 (`unrecognized_claim_closed_cents = 2000`, `stage = 7`). **Zero ledger entry** under `US_GAAP_CONSERVATIVE` (loss already recognized at Event A5). Final Assets: OpCash=$77.14 $\equiv$ Total Equity: $77.14 (Retained Earnings = -$22.86). Operator Reserve Floor ($77.14 $\ge$ $10.00) strictly preserved with +$67.14 headroom.
     - **Scenario B (Debits Custodial Cash — Custodial Shortfall & Mandatory Cure):** If debit physically consumes custodial cash (`SETTLEMENT_CASH`), an explicit **Custodial Shortfall** occurs.
       - *Step 1 (Loss Recognition):* Dr `EXPENSE:CUSTODIAL_SHORTFALL_LOSS` $20 | Cr `ASSET:PAYPAL_SETTLEMENT_CASH` $20. Assets: $0, Liabilities: $20, Equity: -$20. Custodial deficit of $20.00 audited. Cycle enters `OPERATOR_DISPUTE_HOLD`.
       - *Step 2 (Mandatory Operator Capital Cure & Asynchronous Evidence Verification):* Requires persistent intent (`cure_intents`), explicit `funding_source` (`OPERATOR_CAPITAL_CONTRIBUTION`, `DEBTOR_COLLECTION`, `OTHER_APPROVED_SOURCE`), distinct evidence routes:
         - *Route A (`BANK_TOPUP` via ACH/Wire/EFT):* Verified via transaction search with event codes `T0300`, `T0301`, or `T0303`. Generic payment code `T0000` is strictly rejected. Incurs `PENDING_REPORTING_REFLECTION` while awaiting 3h reporting search update. Dr `ASSET:PAYPAL_SETTLEMENT_CASH` $20 | Cr `EQUITY:OPERATOR_CAPITAL` $20. Pure equity injection, **zero revenue recognized**.
         - *Route B (`ORDERS_CAPTURE`):* Confirmed via Orders v2 capture status and `PAYMENT.CAPTURE.COMPLETED`. Evaluates `seller_receivable_breakdown` (gross/fee/net); capture fees absorbed by operator cash via compound atomic entry. Dr `ASSET:PAYPAL_SETTLEMENT_CASH` $20 | Cr `EQUITY:OPERATOR_CAPITAL` $20.
         - *Precondition Check:* Physical balance verification ($PP_{\text{Actual\_Available}} \ge \sum \text{Creditors}$). Custodial cash restored to $20.00; custodial trust 100% restored ($20 cash = $20 liability).
       - *Step 3 (Counterparty Attribution, Subrogation & Framework Separation):*
         - *US_GAAP_CONSERVATIVE:* Claim remains in Stages 1–4 off-balance-sheet (`recognized_receivable_cents = 0`). Cash recovery recognized at Stage 6: Dr `ASSET:OPERATOR_CASH` $20 | Cr `REVENUE:RECOVERY_GAIN` $20.
         - *IFRS_IAS37:* Stage 5 accrual allowed upon virtually certain proof + CPA signoff: Dr `ASSET:OPERATOR_DISPUTE_RECEIVABLE:agt_data` $20 | Cr `REVENUE:DISPUTE_RECOVERY_RECOGNITION` $20. Collection at Stage 6 credits the receivable.
     - **Scenario C (Bad-Debt Impairment / Claim Closure):**
       - *US_GAAP_CONSERVATIVE Full Closure (Stage 4 ──► Stage 7):* Uncollectible claim closed in `recovery_claims` (`unrecognized_claim_closed_cents = 2000`, `stage = 7`). **Zero ledger entry** (initial loss already recognized in equity at Event A5; zero double-loss). Post-closure balance: Assets: $77.14 $\equiv$ Equity: $77.14.
       - *US_GAAP_CONSERVATIVE Partial Collection & Residual Closure (Stage 6 ──► Stage 7):* After partial cash collection (e.g. $10 collected at Stage 6), remaining uncollected balance ($10) is closed (`cash_recovered_cents = 1000`, `unrecognized_claim_closed_cents = 1000`, sum = 2000, `stage = 7`). **Zero ledger entry**.
       - *IFRS_IAS37 Full Write-Off (Stage 5 ──► Stage 7):* Recognized receivable written off: Dr `EXPENSE:BAD_DEBT_EXPENSE` $20 | Cr `ASSET:OPERATOR_DISPUTE_RECEIVABLE` $20. Post-write-off balance: Assets: $77.14 $\equiv$ Equity: $77.14.
       - *IFRS_IAS37 Partial Write-Off (Stage 6 ──► Stage 7):* After partial cash collection against recognized receivable, remaining uncollected balance ($10) is written off: Dr `EXPENSE:BAD_DEBT_EXPENSE` $10 | Cr `ASSET:OPERATOR_DISPUTE_RECEIVABLE` $10.
     - **Scenario D (Creditor Payout Cancellation / 30-Day Return):** Unclaimed item returns from PayPal. Compensating ledger restores: Dr `ASSET:PAYPAL_SETTLEMENT_CASH` $20 | Cr `LIABILITY:CREDITOR_PAYABLE:agt_data` $20. Cycle enters `POST_SETTLEMENT_RECONCILING`. Liability preserved for operator address verification and reissue. Zero false write-off.
11. **Duplicate Payout Recovered (Counterparty Returns Excess):**
    - Debit: `ASSET:OPERATOR_CASH` $20.00 | Credit: `ASSET:OPERATOR_DISPUTE_RECEIVABLE:{counterparty}` $20.00
12. **Duplicate Payout Unrecoverable Write-Off:**
    - Debit: `EXPENSE:UNRECOVERABLE_DISBURSEMENT_LOSS` $20.00 | Credit: `ASSET:OPERATOR_DISPUTE_RECEIVABLE:{counterparty}` $20.00
13. **Additional Operator Capital Injection:**
    - Debit: `ASSET:OPERATOR_CASH` $50.00 | Credit: `EQUITY:OPERATOR_CAPITAL` $50.00
14. **Fee Charged but Principal Payout Rejected:**
    - Debit: `EXPENSE:PAYPAL_TRANSACTION_FEE` $0.25 | Credit: `ASSET:OPERATOR_CASH` $0.25
    *(OpEx fee deducted from operator share of PP Available; principal stays in custodial SETTLEMENT_CASH).*

---

### Audit Display & Invariants:
- `Gross Obligation Volume: $130.00`
- `Net Principal Settlement: $45.00 (Debtor Collected: $45.00 / Creditor Disbursed: $45.00)`
- `Principal Residual: $0.00 (100% Conserved)`
- `PayPal Transaction Fees: $1.25 (4 original items + 1 reissue; Paid from Operator Cash)`
- `Creditor Entitlements: 100% Protected (Zero Fee Deduction)`
```

---

## 4. Webhook Security & Verification Architecture

PayPal webhooks originate asynchronously from PayPal infrastructure. To prevent spoofing, replay attacks, and state corruption:

### 4.1 Cryptographic Verification Procedure & Header Specification

All incoming HTTP requests to `POST /api/webhooks/paypal` must satisfy strict two-tier cryptographic and anti-replay verification before any body parsing or database processing occurs:

#### Tier 1: Anti-Replay, Clock Skew & Certificate Authority Verification
1. **Clock Skew Enforcement:** The `PAYPAL-TRANSMISSION-TIME` header must be within $\pm 300$ seconds ($\le 5$ minutes) of current UTC server time:
   $$\left| T_{	ext{server}} - T_{	ext{transmission}} ight| \le 300	ext{ seconds}$$
   Stale webhooks are immediately rejected with HTTP 400 (`STALE_WEBHOOK_TRANSMISSION`).
2. **Authoritative Certificate Domain Whitelist:** The `PAYPAL-CERT-URL` header must be an HTTPS URL strictly terminating in authoritative PayPal trust domains (`api.paypal.com` or `api.sandbox.paypal.com`):
   ```typescript
   const certUrl = new URL(req.headers['paypal-cert-url']);
   if (certUrl.protocol !== 'https:' || !(certUrl.hostname === 'api.paypal.com' || certUrl.hostname === 'api.sandbox.paypal.com')) {
     throw new SecurityException('UNTRUSTED_CERT_URL: Certificate URL does not belong to authoritative PayPal domain.');
   }
   ```
3. **Transmission Nonce Deduplication:** The `PAYPAL-TRANSMISSION-ID` header is deduplicated against `processed_webhooks.transmission_id`. If previously processed, the webhook is recognized as a duplicate replay, returning HTTP 200 without modifying state.

#### Tier 2: Asymmetric Cryptographic Signature Verification
Verification supports both native server-side RSA-SHA256 signature verification and PayPal API verification:
- **Asymmetric Signature Verification:**
  1. Fetch and cache public X.509 certificate from validated `PAYPAL-CERT-URL`.
  2. Compute CRC32 checksum of raw unparsed request body string: $	ext{CRC} = 	ext{crc32}(req.rawBody)$.
  3. Form authoritative verification string:
     $$S = 	ext{transmission\_id} + "|" + 	ext{transmission\_time} + "|" + 	ext{webhook\_id} + "|" + 	ext{CRC}$$
  4. Verify RSA-SHA256 signature against base64-decoded `PAYPAL-TRANSMISSION-SIG` using certificate public key.
- **PayPal Verification Service (`POST /v1/notifications/verify-webhook-signature`):**
  Forward unparsed raw body and all 5 headers to PayPal's verification endpoint. Only `verification_status: "SUCCESS"` proceeds to transactional handling.

```typescript
interface WebhookVerificationHeaders {
  'paypal-auth-algo': string;         // e.g. "SHA256withRSA"
  'paypal-cert-url': string;          // Authoritative *.paypal.com X.509 cert URL
  'paypal-transmission-id': string;   // Unique UUID nonce per transmission
  'paypal-transmission-sig': string;  // Base64-encoded RSA signature
  'paypal-transmission-time': string; // ISO 8601 UTC timestamp
}
```

### 4.2 Raw Body Preservation
Express by default parses JSON, altering whitespace and key ordering, which invalidates cryptographic signatures.
- **Rule:** The webhook route (`POST /api/webhooks/paypal`) utilizes `express.raw({ type: 'application/json' })` or preserves `req.rawBody` buffer before JSON parsing.

### 4.3 Atomic Webhook Processing (Branched Predecessor Validation)
To guarantee that a crash, invalid state transition, or processing error never drops an event or causes inconsistent ledger states, the webhook router branches by event category with strict predecessor validation:

```sql
-- Executed inside a single atomic SQLite BEGIN IMMEDIATE transaction:
BEGIN IMMEDIATE TRANSACTION;

-- 1. Deduplication Gate
SELECT 1 FROM processed_webhooks WHERE paypal_event_id = :event_id AND status = 'PROCESSED';
-- If found: COMMIT and return HTTP 200 {"received": true, "duplicate": true} immediately.

-- 2. Handle Unknown / Unsupported Webhook Events
-- If event_type not in catalog:
--   INSERT INTO processed_webhooks (webhook_id, paypal_event_id, event_type, status, processed_at)
--   VALUES (:uuid, :event_id, :event_type, 'IGNORED_UNSUPPORTED', datetime('now', 'utc'));
--   COMMIT and return HTTP 200 to acknowledge PayPal without modifying financial state.

-- 3. Identifier Resolution (Matches PayPal payload to local DB entity)
-- PayPal payload provides resource.payout_item_id AND resource.payout_item.sender_item_id:
SELECT item_id, cycle_id, creditor_agent_id, amount_cents, status 
FROM paypal_payout_items 
JOIN paypal_payouts USING (payout_id)
WHERE paypal_item_id = :paypal_item_id OR sender_item_id = :sender_item_id;
-- If no row found: ROLLBACK and throw EntityNotFoundError("Unknown payout item identifier.");

-- 4. Branching Predecessor Validation & Exactly-One-Row Mutation by Primary Key (item_id):

-- BRANCH A: Normal In-Flight Payout Events (SUCCESS, UNCLAIMED, ONHOLD, FAILED, BLOCKED)
-- Triggered by: PAYMENT.PAYOUTS-ITEM.SUCCEEDED, UNCLAIMED, HELD, FAILED, BLOCKED, CANCELED
UPDATE paypal_payout_items 
SET status = :target_status, transaction_id = :txn_id, updated_at = datetime('now', 'utc')
WHERE item_id = :local_item_id 
  AND status IN ('PENDING', 'UNCLAIMED', 'ONHOLD'); -- Allowed predecessor states

-- BRANCH B: Post-Settlement Reversal Events (REFUNDED, REVERSED)
-- Triggered by: PAYMENT.PAYOUTS-ITEM.REFUNDED, PAYMENT.PAYOUTS-ITEM.REVERSED
UPDATE paypal_payout_items 
SET status = :target_status, updated_at = datetime('now', 'utc')
WHERE item_id = :local_item_id 
  AND status = 'SUCCESS'; -- MUST have previously succeeded

-- BRANCH C: Unclaimed Expiry / Resolution (RETURNED)
-- Triggered by: PAYMENT.PAYOUTS-ITEM.RETURNED
UPDATE paypal_payout_items 
SET status = 'RETURNED', updated_at = datetime('now', 'utc')
WHERE item_id = :local_item_id 
  AND status = 'UNCLAIMED'; -- MUST have been in unclaimed state

-- Strict Exactly-One-Row Assertion (Applied to whichever branch executed):
-- If changes() != 1: 
--   ROLLBACK TRANSACTION;
--   Throw InconsistentEntityTransitionError("Expected 1 row update; affected " || changes() || ". Rolled back.");

-- 5. Double-Entry Financial Ledger Compensation (Branch B Post-Settlement Reversals):
-- If event in ('REFUNDED', 'REVERSED', 'CHARGEBACK'):
-- A. Cumulative Reversal Boundary Assertion:
-- Ensure cumulative reversals never exceed original item principal:
SELECT COALESCE(SUM(amount_cents), 0) AS total_reversed FROM compensating_ledger WHERE item_id = :local_item_id;
-- If total_reversed + :amount_cents > :original_amount_cents:
--   ROLLBACK;
--   Throw OverCompensationViolationError("Cumulative compensation exceeds original item principal.");

-- B. Deterministic Idempotency Key (Bound to Provider Correction Ref or Signed Operator Ref):
-- Extracts provider reference (refund_id / dispute_id / reversal_id) or requires operator signature:
-- Key format: "comp:" + item_id + ":" + reversal_type + ":" + COALESCE(provider_ref, operator_correction_ref)
-- Prevents duplicate compensation even if PayPal re-emits under a different webhook transmission ID:
INSERT INTO compensating_ledger (
    compensation_id, 
    cycle_id, 
    item_id, 
    paypal_event_id,
    paypal_txn_id,
    provider_ref,
    operator_correction_ref,
    compensation_key,
    reversal_type, 
    amount_cents, 
    debit_account, 
    credit_account, 
    reinstated_payable_agent_id, 
    reason,
    created_at
) VALUES (
    :comp_id, 
    :cycle_id, 
    :local_item_id, 
    :event_id,
    :paypal_txn_id,
    :provider_ref,
    :operator_correction_ref,
    'comp:' || :local_item_id || ':' || :target_status || ':' || COALESCE(:provider_ref, :operator_correction_ref),
    :target_status, 
    :amount_cents, 
    'ASSET:PAYPAL_SETTLEMENT_CASH', 
    'LIABILITY:CREDITOR_PAYABLE:' || :creditor_agent_id, 
    :creditor_agent_id, 
    'Post-settlement reversal processed via webhook',
    datetime('now', 'utc')
);
UPDATE settlement_cycles SET status = 'POST_SETTLEMENT_RECONCILING' WHERE cycle_id = :cycle_id;

-- 6. Standard Reconcile Check (Only on Normal Settlement):
-- If all items in cycle are now 'SUCCESS' -> UPDATE settlement_cycles SET status = 'SETTLED' ...

-- 7. Insert Append-Only Lifecycle Transition
INSERT INTO lifecycle_transitions (transition_id, entity_type, entity_id, from_status, to_status, reason, created_at)
VALUES (:uuid2, 'PAYOUT_ITEM', :local_item_id, :old_status, :target_status, 'Webhook verified transition', datetime('now', 'utc'));

-- 8. Insert Transactional Outbox Event for Real-Time SSE Stream
INSERT INTO system_events (event_id, event_type, entity_id, payload_json)
VALUES (:uuid3, 'PAYOUT_ITEM_' || :target_status, :local_item_id, :payload_json);

-- 9. Mark Event as PROCESSED in Anti-Replay Log
INSERT INTO processed_webhooks (webhook_id, paypal_event_id, event_type, status, processed_at)
VALUES (:uuid, :event_id, :event_type, 'PROCESSED', datetime('now', 'utc'));

COMMIT TRANSACTION;
-- 10. Return HTTP 200 OK to PayPal
```

**Failure Semantics:** If any step fails or `changes() !== 1`, SQLite automatically rolls back the entire transaction. `processed_webhooks` is **not** committed. When PayPal retries the webhook delivery, the retry will safely re-attempt full execution. A duplicate event can **never** conceal a previous partial failure.

### 4.4 Supported Webhook Event Catalog

| Event Name | Source Rail | Trigger Condition | Tally Nexus Reaction |
| :--- | :--- | :--- | :--- |
| **`PAYMENT.CAPTURE.COMPLETED`** | Orders | Debtor capture confirmed by PayPal. | Reconciles `paypal_orders.status = 'CAPTURED'`; marks cycle `COLLECTION_CAPTURED`. |
| **`PAYMENT.CAPTURE.DENIED`** | Orders | Debtor card/bank capture rejected. | Reconciles `paypal_orders.status = 'FAILED'`; marks cycle `COLLECTION_FAILED`. |
| **`PAYMENT.PAYOUTSBATCH.SUCCESS`** | Payouts | Entire payout batch processed by PayPal. | Updates `paypal_payouts.status = 'SUCCESS'`. |
| **`PAYMENT.PAYOUTSBATCH.PROCESSING`**| Payouts | Payout batch actively being routed. | Updates `paypal_payouts.status = 'PROCESSING'`. |
| **`PAYMENT.PAYOUTSBATCH.DENIED`** | Payouts | Batch rejected (insufficient funds/auth).| Updates `paypal_payouts.status = 'DENIED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |
| **`PAYMENT.PAYOUTS-ITEM.SUCCEEDED`**| Payouts | Specific creditor item paid successfully.| Updates `paypal_payout_items.status = 'SUCCESS'`. |
| **`PAYMENT.PAYOUTS-ITEM.FAILED`** | Payouts | Specific recipient email closed/error. | Updates `paypal_payout_items.status = 'FAILED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |
| **`PAYMENT.PAYOUTS-ITEM.UNCLAIMED`**| Payouts | Sent to unregistered email; pending 30d.| Updates `paypal_payout_items.status = 'UNCLAIMED'`; cycle in `RECONCILING`. |
| **`PAYMENT.PAYOUTS-ITEM.HELD`** | Payouts | Transaction held for compliance review.| Updates `paypal_payout_items.status = 'ONHOLD'`; cycle in `RECONCILING`. |
| **`PAYMENT.PAYOUTS-ITEM.BLOCKED`** | Payouts | Compliance / regulatory block. | Updates `paypal_payout_items.status = 'BLOCKED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |
| **`PAYMENT.PAYOUTS-ITEM.RETURNED`** | Payouts | Unclaimed funds returned after 30 days. | Updates `paypal_payout_items.status = 'RETURNED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |
| **`PAYMENT.PAYOUTS-ITEM.REFUNDED`** | Payouts | Receiver refunded payment to sender. | Updates `paypal_payout_items.status = 'REFUNDED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |
| **`PAYMENT.PAYOUTS-ITEM.CANCELED`** | Payouts | Item canceled before processing. | Updates `paypal_payout_items.status = 'FAILED'`; sets cycle `PARTIAL_FAILURE_HOLD`. |

---

## 5. PayPal Provider Adapter Architecture

To decouple the deterministic financial core from external PayPal SDK changes and support offline mock testing, `packages/paypal` defines a strict provider adapter interface:

```typescript
export interface IPayPalSettlementAdapter {
  // OAuth Token Management
  getAccessToken(): Promise<string>;

  // Orders (Debtor Collection)
  createOrder(params: {
    cycleId: string;
    debtorAgentId: string;
    amountCents: number;
    currency: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ orderId: string; approvalUrl: string }>;

  captureOrder(params: {
    orderId: string;
    cycleId: string;
  }): Promise<{ captureId: string; status: 'COMPLETED' | 'FAILED'; amountCapturedCents: number }>;

  getOrderStatus(orderId: string): Promise<{ status: string; amountCents: number }>;

  // Payouts (Creditor Distribution)
  dispatchPayoutBatch(params: {
    cycleId: string;
    recipients: Array<{
      agentId: string;
      receiverEmail: string;
      amountCents: number;
      senderItemId: string;
    }>;
  }): Promise<{ batchId: string; status: 'SUBMITTED' | 'PENDING' }>;

  getPayoutBatchStatus(batchId: string): Promise<{ batchStatus: string }>;

  getPayoutItemStatus(itemId: string): Promise<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'BLOCKED' | 'RETURNED';
    transactionId?: string;
    errorMessage?: string;
  }>;

  // Webhook Signature Verification
  verifyWebhookSignature(params: {
    rawBody: string;
    headers: Record<string, string>;
  }): Promise<boolean>;
}
```

### Deterministic Mock Adapter (Fallback Strategy)
If the sandbox environment is offline or the user's PayPal Sandbox account does not have Payouts enabled:
- System provides `MockPayPalAdapter` implementing `IPayPalSettlementAdapter`.
- Operates entirely in memory and SQLite without making external network calls.
- **Transparency Invariant:** Mock operations emit events labeled `[MOCK_SETTLEMENT]`. Mock transactions are explicitly flagged in `paypal_orders` and `paypal_payouts` with `is_mock = 1`. The UI displays an amber banner: *"Sandbox Payouts Unavailable — Operating in Verified Mock Mode"*. Mock operations never pretend to be real PayPal transactions.

---

## 6. PayPal Provider Facts vs Internal Assumptions vs Sandbox Validation

To ensure rigorous transparency and avoid inventing PayPal behavior, all financial operations are cataloged into four distinct truth tiers with authoritative official documentation links:

| Category | Domain | Official PayPal Specification & Documentation Reference | System Implementation Handling |
| :--- | :--- | :--- | :--- |
| **1. Officially Documented PayPal Behavior** | **Orders v2 API** | [PayPal Orders v2 Reference](https://developer.paypal.com/docs/api/orders/v2/)<br>• `POST /v2/checkout/orders` creates intent `CAPTURE`<br>• `POST /v2/checkout/orders/{id}/capture` captures authorized funds<br>• `GET /v2/checkout/orders/{id}` retrieves authoritative state. | Orders captured only after explicit debtor human approval redirect; payment captured into PayPal sandbox business balance. |
| | **Payouts v1 API** | [PayPal Payouts v1 Reference](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/)<br>• `POST /v1/payments/payouts` creates asynchronous batch<br>• `GET /v1/payments/payouts/{payout_batch_id}` polls batch<br>• `GET /v1/payments/payouts-item/{payout_item_id}` queries item state<br>• `sender_batch_id` & `sender_item_id` provide client-side idempotency. | Batch and items created with deterministic keys (`cyc_001_payout_batch`, `cyc_001_item_data`). Recovery uses batch/item IDs. |
| | **Payout Item Lifecycle** | [PayPal Payouts Item Statuses](https://developer.paypal.com/docs/api/payments.payouts-batch/v1/#definition-payout_item_detail)<br>Documented statuses: `PENDING`, `SUCCESS`, `FAILED`, `UNCLAIMED`, `RETURNED`, `ONHOLD`, `BLOCKED`, `REFUNDED`, `REVERSED`. | Exhaustive state machine in `paypal_payout_items` handles all 9 statuses with branched transitions and row-count assertions. |
| | **Webhook Signatures** | [PayPal Webhook Verification API](https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature_post)<br>`POST /v1/notifications/verify-webhook-signature` verifies transmission headers against webhook payload and certificate URL. | Raw request payload preserved; signature validated before any database mutation. |
| | **Balance Funding** | [PayPal Payouts Overview](https://developer.paypal.com/docs/payouts/)<br>Payouts v1 draws exclusively from existing available account balance; cannot auto-debit external cards or bank accounts in real time. | Pre-requisite gate: Net debtor collection captured into balance before payout batch dispatch is permitted. |
| | **Balance Reporting API** | [PayPal Reporting API Reference](https://developer.paypal.com/docs/api/transaction-search/v1/#balances_get)<br>• `GET /v1/reporting/balances` retrieves `available_balance`, `total_balance`, and `withheld_balance` with UTC `as_of_time`.<br>• **Documented Latency:** Balance records can take **up to three hours to appear** in response.<br>• Returns last refreshed balance when `as_of_time` is omitted. | Used exclusively for periodic external accounting audits subject to freshness metadata (`as_of_time`, `last_refresh_time`). **Never** used as a real-time settlement authorization gate. Stale data labeled `STALE_REPORTING_DATA` without halting clearing. |
| | **Transaction Event Codes & Identifiers** | [PayPal Transaction Event Codes](https://developer.paypal.com/docs/reports/reference/transaction-event-codes/)<br>• `T0001`: Mass Payment / Payout item execution (Debit)<br>• `T0104`: Mass Payment Batch Fee (Debit)<br>• `T1114`: Mass Payment Reversal (Credit)<br>• `T0006`: Express Checkout Payment (Credit via Orders v2 capture)<br>• `T0100`/`T0106`: Express Checkout Fee (Debit)<br>• `T1106`/`T1107`: Express Checkout Refund/Reversal<br>• `T0300`: Bank Deposit to PayPal balance (Credit via ACH/Wire)<br>• `T0301`: Balance Manager Deposit (Credit)<br>• `T0303`: EFT Deposit (Credit)<br>• **Strict Rejection:** `T0000` (General payment) is strictly rejected as sole proof of bank top-up.<br>• Identifiers: `transaction_id` (movement ID) vs `payout_item_id` (batch line-item ID). | Reconciler strictly matches `transaction_info.transaction_id == paypal_payout_items.transaction_id`. Never conflates `transaction_id` with `payout_item_id`. Validates exact event codes for payout (`T0001`), fee (`T0104`), reversal (`T1114`), collection (`T0006`), and bank top-up (`T0300`/`T0301`/`T0303`). Rejects ambiguous `T0000`. |
| | **Batch Acceptance Deduction** | [PayPal Payouts Integration Guide](https://developer.paypal.com/docs/payouts/standard/integrate-payouts/)<br>PayPal immediately debits the total batch principal + transaction fees from the sender's available balance upon batch acceptance (`PENDING`/`PROCESSING`). | Internal ledger mirrors deduction: `SETTLEMENT_CASH` $\rightarrow$ `IN_FLIGHT` and `OPERATOR_CASH` $\rightarrow$ `EXPENSE:FEE`. |
| | **Unclaimed Expiry & Fee Retention** | [PayPal Payouts Life Cycle](https://developer.paypal.com/docs/payouts/integrate/lifecycle/)<br>Unclaimed payouts remain available for 30 calendar days. If unclaimed, PayPal returns principal to sender available balance; transaction fee is NOT refunded. | Return restores custodial principal to `SETTLEMENT_CASH`; rail fee remains absorbed in `EXPENSE:PAYPAL_TRANSACTION_FEE`. |
| **2. Internal Application Assumptions** | **Sequential Cycles** | Internal Architectural Decision: Clearing cycles execute serially per agent consortium without concurrent overlapping netting runs for identical agents. | Cycle state machine enforces serial execution (`CREATED` $\rightarrow$ `NETTING_PROPOSED` $\rightarrow$ ... $\rightarrow$ `SETTLED`). |
| | **Dynamic Fee Absorption Policy & Active Reserve Floor** | Internal Financial Model: Human operator funds an operating reserve to absorb payment rail transaction fees. Production dynamically reads actual fees from `payout_item_fee.value` in the PayPal batch response. $0.25/item is an illustrative scenario baseline only.<br>• `OPERATOR_RESERVE_FLOOR = $10.00` active buffer.<br>• Pre-dispatch gate `GATE-RESERVE-FLOOR`: Assert current and projected post-fee operator cash $\ge \$10.00$. Breach triggers `OPERATOR_RESERVE_HOLD`. | Fees debited against `EXPENSE:PAYPAL_TRANSACTION_FEE` and credited against `ASSET:OPERATOR_CASH`; creditor entitlements are 100% preserved. Payout dispatch blocked if operator cash falls below $10.00 buffer. |
| | **Mock Transparency** | Internal Compliance Rule: If Sandbox Payouts permissions are absent on test accounts, system transparently falls back to `MockPayPalAdapter`. | `is_mock = 1` persisted on all entities; UI renders amber warning banner; mock transactions are never presented as real. |
| **3. Sandbox-Only Behavior Requiring Live Validation** | **Webhook Timing** | Sandbox environment latency varies between 2s and 60s under test load. | Polling fallback triggers if webhook is not received within 15 seconds; state reconciled via `GET /v1/payments/payouts-item/{id}`. |
| | **Reporting Freshness Latency** | Official documentation notes up to 3h latency for List Balances. Sandbox accounts may update faster or intermittently. | Sandbox runbook measures exact delay between batch dispatch and `GET /v1/reporting/balances` update. |
| | **Item Reversal Webhooks** | Exact event payload structure for `ITEM.REFUNDED` vs `ITEM.REVERSED` in Sandbox. | Reversal listener checks for `resource.id` (refund/dispute reference); if absent, routes to `operator_correction_ref` flow. |
| | **Return Balance Timing** | Exact delay between `PAYMENT.PAYOUTS-ITEM.RETURNED` and funds appearing in available balance. | Sandbox validation suite monitors account balance before and after simulated expiration. |
| | **Actual Fee Schedule in Sandbox** | PayPal developer accounts vary in fee structure by tier and merchant region ($0.25 flat vs 2% cap vs international rates). | System dynamically captures actual `payout_item_fee` returned in payout batch response header/item detail. |
| **4. Unsupported or Uncertain Behavior** | **RETURNED $\rightarrow$ Late SUCCESS** | PayPal documentation defines RETURNED as terminal funds restoration. A late duplicate disbursement is an exceptional operational collision, not a documented normal API transition. | Modeled as an anomaly recovery scenario. If provider statement confirms duplicate debit, operator absorbs it into `OPERATOR_DISPUTE_RECEIVABLE` without mutating standard item state machine. |
| | **Partial Item Reversals** | Payouts v1 documentation does not specify atomic sub-item partial refunds via API. | System treats partial reversals as requiring explicit operator verification (`operator_correction_ref`) with cumulative principal cap. |
| | **Direct Bank Debit for Payouts**| Payouts cannot pull directly from agent bank accounts or credit cards without intermediate balance. | Debtor collection strictly separated: Orders v2 captures funds first, Payouts v1 distributes second. |
| | **Direct Lookup by sender_item_id without batch ID** | PayPal REST API exposes `GET /v1/payments/payouts-item/{payout_item_id}` but direct query by custom `sender_item_id` without batch context is unindexed on PayPal endpoints. | System always persists and indexes PayPal's `payout_batch_id` and `payout_item_id` upon batch submission for reliable lookups. |


