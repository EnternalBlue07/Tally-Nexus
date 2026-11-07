# TALLY NEXUS — END-TO-END SYSTEM FLOW & SEQUENCE SPECIFICATION
**Project:** Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine  
**Version:** 1.0.0 (Master Visual Flow)  
**Date:** November 7, 2026  

---

## 1. Master Sequence Flow: The 10-Step Clearing Lifecycle

The diagram below details the entire end-to-end operational sequence of Tally Nexus, from task submission to immutable settlement finality:

```mermaid
sequenceDiagram
    autonumber
    actor DebtorAgent as Debtor Agent (Research)
    actor CreditorAgents as Creditor Agents (Data, Compute, QA, Loc)
    participant Judge as SLA Judge (Cognitive)
    participant Engine as Netting Engine (Deterministic)
    participant Firewall as Financial Firewall (Fiduciary Guard)
    participant DB as SQLite Subledger & Outbox
    participant PayPal as PayPal Sandbox API
    actor HumanDebtor as Human Approver
    participant SSE as Operator Dashboard (SSE Client)

    %% Step 1: Task Exchange
    Note over DebtorAgent,CreditorAgents: Step 1: Agent Task Exchange & Contract Issuance
    DebtorAgent->>CreditorAgents: Dispatch Sub-Tasks (6 Tasks, Gross: $130.00)
    CreditorAgents-->>DebtorAgent: Deliver Completed Outputs (Data, Compute, QA, Loc)

    %% Step 2 & 3: SLA Judge & Ed25519 IOUs
    Note over CreditorAgents,Judge: Step 2 & 3: SLA Verification & Cryptographic IOUs
    DebtorAgent->>Judge: Submit Outputs for Verification
    Judge->>Judge: Evaluate SLAs (5 PASS, 1 Malformed FAIL)
    Note over Judge: Failed task produces 0 IOUs!
    DebtorAgent->>DB: Sign & Register Ed25519 Micro-IOUs (5 Valid IOUs)
    DB-->>SSE: Emit "IOU_SIGNED" Events (Monotonic Stream)

    %% Step 4: Multilateral Netting
    Note over Engine,DB: Step 4: Multilateral Netting Calculation
    Engine->>DB: Query Valid Verified IOUs for Cycle
    Engine->>Engine: Run Multilateral Netting Algorithm O(V+E)
    Note over Engine: Gross $130.00 compresses to Single Net Debtor: Research Agent ($45.00)<br/>4 Creditors: Data ($20), Compute ($15), QA ($5), Loc ($5)
    Engine->>DB: Persist Net Positions (Cycle State: NETTING_PROPOSED)

    %% Step 5: Financial Firewall
    Note over Firewall,DB: Step 5: Fiduciary Financial Firewall Audit
    Firewall->>DB: Audit Invariants: Zero-Sum (Sum=0), Reserve Floor (OpCash >= $10.00)
    Firewall->>Firewall: Verify Invariants Pass
    Firewall->>DB: Transition Cycle State: FIREWALL_APPROVED

    %% Step 6: Debtor Collection
    Note over DebtorAgent,HumanDebtor: Step 6: Debtor Ingestion via PayPal Orders v2
    Engine->>PayPal: POST /v2/checkout/orders ($45.00, intent: CAPTURE)
    PayPal-->>Engine: Order Created (links: approve)
    Engine->>HumanDebtor: Prompt Approval Redirect
    HumanDebtor->>PayPal: Approve Order in Sandbox
    Engine->>PayPal: POST /v2/checkout/orders/{id}/capture
    PayPal-->>Engine: Capture Completed (Gross: $45.00, Rail Fee: $1.61, Net Cash: $43.39)
    Engine->>DB: Execute Atomic Compound Capture Journal:<br/>Dr SETTLEMENT_CASH $45.00 | Dr FEE $1.61<br/>Cr CREDITOR_PAYABLE $45.00 | Cr OPERATOR_CASH $1.61
    DB-->>SSE: Emit "CYCLE_CAPTURED" Event

    %% Step 7: Creditor Disbursement
    Note over Engine,PayPal: Step 7: Creditor Batch Payout via PayPal Payouts v1
    Engine->>PayPal: POST /v1/payments/payouts (Batch $45.00 + $1.00 fees)
    PayPal-->>Engine: Payout Batch Accepted (status: PENDING)
    Engine->>DB: Journal: Dr IN_FLIGHT $45, Dr FEE $1.00 | Cr SETTLEMENT_CASH $45, Cr OPERATOR_CASH $1.00

    %% Step 8: Item-Level Settlement & Webhooks
    Note over PayPal,DB: Step 8: Asynchronous Webhook Settlement
    PayPal->>Engine: POST /api/webhooks/paypal (PAYMENT.PAYOUTS-ITEM.SUCCEEDED)
    Engine->>Engine: Verify 5 Headers (RSA-SHA256, Cert URL, Skew <= 300s)
    Engine->>DB: Deduplicate Transmission ID & Extinguish Liability:<br/>Dr CREDITOR_PAYABLE $25 | Cr IN_FLIGHT $25 (Compute, QA, Loc)

    %% Step 9: Exceptional Anomaly & Collision Handling
    Note over PayPal,DB: Step 9: Reissue & Late Parent Collision Quarantine
    PayPal->>Engine: Webhook: Data Agent Payout RETURNED ($20.00)
    Engine->>DB: Re-credit Cash: Dr SETTLEMENT_CASH $20 | Cr IN_FLIGHT $20
    Note over DB: Verify Parent Terminal -> RETURN_FUNDS_VERIFIED -> REISSUE_AUTHORIZED
    Engine->>PayPal: Dispatch Child Reissue ($20.00) -> Succeeds!
    DB->>DB: Child Reissue Confirmed SUCCESS -> Parent advances to CHILD_SETTLED!
    Note over PayPal,Engine: Late Original SUCCESS Arrives!
    PayPal->>Engine: Late Webhook (PAYMENT.PAYOUTS-ITEM.SUCCEEDED on item_01)
    Engine->>DB: Update item_01 to SUCCESS
    Note over DB: Trigger trg_parent_payout_item_late_success_guard ABORTS!
    Engine->>DB: Divert to QUARANTINED_COLLISION & Set Cycle to OPERATOR_DISPUTE_HOLD

    %% Step 10: Finality & Proofs
    Note over Engine,SSE: Step 10: Finality & Merkle Settlement Proofs
    Engine->>DB: Generate Merkle Settlement Proof & Audit Receipt
    DB-->>SSE: Emit "CYCLE_SETTLED" Event & Receipt Merkle Root
```

---

## 2. Detailed State Machine Transitions

### 2.1 Settlement Cycle State Machine
```mermaid
stateDiagram-v2
    [*] --> CREATED: Tasks Submitted
    CREATED --> NETTING_PROPOSED: SLA Passed & IOUs Signed
    NETTING_PROPOSED --> FIREWALL_APPROVED: Invariants Verified (Zero-Sum, Reserve >= $10)
    NETTING_PROPOSED --> FIREWALL_REJECTED: Invariant Violation Detected
    FIREWALL_APPROVED --> COLLECTION_PENDING: PayPal Order Created
    COLLECTION_PENDING --> CAPTURED: PayPal Order Captured ($45 Net)
    COLLECTION_PENDING --> COLLECTION_FAILED: Payer Aborted / Timeout
    CAPTURED --> DISPATCHED: Payout Batch Submitted
    DISPATCHED --> RECONCILING: Payouts In-Flight
    RECONCILING --> SETTLED: All Creditor Items Confirmed SUCCESS
    RECONCILING --> PARTIAL_FAILURE_HOLD: 1+ Payouts Failed / Returned
    RECONCILING --> OPERATOR_DISPUTE_HOLD: Late Debit / Duplicate Collision Detected
    OPERATOR_DISPUTE_HOLD --> SETTLED: Recovery / Write-off Completed (Scenario A or A-DEF)
    SETTLED --> [*]
```

### 2.2 Payout Item Lifecycle & Reissue Gate
```mermaid
stateDiagram-v2
    [*] --> PENDING: Created in Batch
    PENDING --> PROCESSING: PayPal Accepted
    PROCESSING --> SUCCESS: Normal Delivery
    PROCESSING --> UNCLAIMED: Receiver Has No PayPal Account (30-day window)
    UNCLAIMED --> RETURNED: 30-Day Window Expired (Funds Returned)
    PROCESSING --> FAILED: Invalid Email / Country Restricted
    
    RETURNED --> PARENT_TERMINAL_CONFIRMED: Provider Status Terminal
    PARENT_TERMINAL_CONFIRMED --> RETURN_FUNDS_VERIFIED: Physical Balance Replenished
    RETURN_FUNDS_VERIFIED --> INTERNAL_LEDGER_RESTORED: Subledger Dr Cash / Cr InFlight
    INTERNAL_LEDGER_RESTORED --> CREDITOR_PAYABLE_REINSTATED: Creditor Liability Restored
    CREDITOR_PAYABLE_REINSTATED --> REISSUE_AUTHORIZED: Corrected Email & Fiduciary Signoff
    
    REISSUE_AUTHORIZED --> CHILD_ACTIVE: Child Reissue Dispatched (uq_active_child_per_parent enforces single child)
    CHILD_ACTIVE --> CHILD_SETTLED: Child Confirms SUCCESS
    CHILD_ACTIVE --> PARENT_TERMINAL_CONFIRMED: Child Fails / Returns (Permits Next Attempt)
    
    CHILD_SETTLED --> QUARANTINED: Late Parent Webhook Arrives (Blocked by trg_parent_payout_item_late_success_guard)
```

---

## 3. Recovery Claim 7-Stage State Machine

```mermaid
flowchart TD
    S1["Stage 1: Identification<br/>Anomaly detected & claim created"] --> S2["Stage 2: Demand<br/>Formal restitution notice issued"]
    S2 --> S3["Stage 3: Response<br/>Acknowledgment, contestation, or silence"]
    S3 --> S4["Stage 4: Evaluation<br/>Evidence hashed, role signed, claim frozen"]
    
    subgraph "Accounting Framework Branch"
        S4 -->|"US_GAAP_CONSERVATIVE<br/>(100% Off-Balance-Sheet)"| S6_US["Stage 6: Realized Collection<br/>Physical cash received in bank"]
        S4 -->|"IFRS_IAS37<br/>(Virtually Certain)"| S5_IFRS["Stage 5: Accrued Receivable<br/>CPA signed off on virtual certainty"]
        S5_IFRS --> S6_IFRS["Stage 6: Realized Collection<br/>Cash collected against receivable"]
    end
    
    S4 -->|"Default / Unrecoverable"| S7_DEF["Stage 7: Closed / Written Off<br/>Scenario A-DEF permanent loss"]
    S5_IFRS -->|"Default / Impairment"| S7_BAD["Stage 7: Bad Debt Write-Off<br/>Receivable derecognized"]
    S6_US -->|"Residual Closure"| S7_RES["Stage 7: Residual Claim Closed"]
```

