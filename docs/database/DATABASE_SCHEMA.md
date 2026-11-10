# DATABASE_SCHEMA.md — TALLY NEXUS DATA ARCHITECTURE

**Document Version:** 1.1.0 (Phase 4.1 Consistency Specification)  
**System Name:** TALLY NEXUS  
**Target RDBMS:** SQLite 3.38+ (WAL Mode) with PostgreSQL DDL Compatibility  
**Financial Standard:** Minor Units Only (Integer USD Cents)  
**Classification:** Core Data Model & Schema Specification  

---

## 1. Engine Configuration & Pragmas

```sql
-- Mandatory SQLite Pragmas (Executed on every DB connection initialization)
PRAGMA journal_mode = WAL;          -- Write-Ahead Logging for high concurrency
PRAGMA foreign_keys = ON;           -- Strict relational integrity enforcement
PRAGMA synchronous = NORMAL;        -- Safe fsync on checkpoints; fast transactions
PRAGMA busy_timeout = 5000;         -- 5,000ms wait for lock release before throwing busy
```

---

## 2. Relational Entity Diagram

```
[agents]
  ├── (1:N) ──► [tasks] (client / provider)
  │               └── (1:1) ──► [artifacts]
  │               └── (1:1) ──► [sla_verdicts]
  │                                └── (1:1) ──► [ious] (on PASS only; debtor-signed)
  ├── (1:N) ──► [net_positions]                    │ (N:1)
  │                   │ (N:1)                      │
  │                   ▼                            ▼
  └───────────► [settlement_cycles] ◄──────────────┘
                      ├── (1:N) ──► [paypal_orders] (debtor collection)
                      ├── (1:1) ──► [paypal_payouts] (creditor distribution batch)
                      │                 └── (1:N) ──► [paypal_payout_items]
                      │                                   └── (1:N) ──► [paypal_payout_reissues]
                      ├── (1:N) ──► [compensating_ledger] (double-entry post-settlement adjustments)
                      ├── (1:N) ──► [cure_intents] (custodial deficit capital cures)
                      └── (1:N) ──► [recovery_claims] (formal dispute asset recognition & attribution)
                                        └── (1:N) ──► [recovery_claim_events] (immutable idempotency log)

[lifecycle_transitions] (Append-Only Audit History for All State Changes)
[system_events]         (Monotonic Append-Only Stream for SSE Outbox)
[processed_webhooks]   (Anti-Replay Webhook Idempotency Log)
[audit_receipts]       (Cryptographic Settlement Proofs)
```

---

## 3. Detailed DDL Specifications

### 3.1 `agents` — Identity & Key Registry
```sql
CREATE TABLE agents (
    agent_id            TEXT PRIMARY KEY,              -- e.g. "agt_research"
    name                TEXT NOT NULL,                 -- e.g. "Research Agent"
    role                TEXT NOT NULL,                 -- e.g. "Lead Market Strategist"
    public_key          TEXT NOT NULL UNIQUE,          -- Hex-encoded Ed25519 Public Key (32 bytes / 64 hex chars)
    key_version         INTEGER NOT NULL DEFAULT 1,    -- Incremented on rotation; prevents invalidating old IOUs
    sandbox_email       TEXT NOT NULL UNIQUE,          -- PayPal Sandbox receiver email for payouts
    credit_limit_cents  INTEGER NOT NULL DEFAULT 10000,-- Maximum debt per clearing cycle in USD cents ($100.00)
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

### 3.2 `tasks` — Economic Commissioning Requests
```sql
CREATE TABLE tasks (
    task_id             TEXT PRIMARY KEY,              -- e.g. "tsk_001"
    client_agent_id     TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    provider_agent_id   TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    task_type           TEXT NOT NULL,                 -- "RESEARCH_BRIEF" | "DATASET_EXTRACTION" | "TRANSLATION"
    spec_json           TEXT NOT NULL,                 -- JSON string of agreed requirements & SLA criteria
    budget_cents        INTEGER NOT NULL CHECK(budget_cents > 0),
    deadline            TEXT NOT NULL,                 -- ISO 8601 UTC deadline
    status              TEXT NOT NULL CHECK(status IN ('CREATED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'FAILED', 'ABORTED')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    completed_at        TEXT
);
CREATE INDEX idx_tasks_client ON tasks(client_agent_id);
CREATE INDEX idx_tasks_provider ON tasks(provider_agent_id);
```

### 3.3 `artifacts` — Deliverables & SHA-256 Hashes
```sql
CREATE TABLE artifacts (
    artifact_id         TEXT PRIMARY KEY,              -- UUIDv4
    task_id             TEXT NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    content             TEXT NOT NULL,                 -- Raw text / JSON string of delivered artifact
    sha256_hash         TEXT NOT NULL,                 -- SHA-256 hex digest of content
    submitted_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_artifacts_hash ON artifacts(sha256_hash);
```

### 3.4 `sla_verdicts` — Adjudication Records
```sql
CREATE TABLE sla_verdicts (
    verdict_id          TEXT PRIMARY KEY,              -- UUIDv4
    task_id             TEXT NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    outcome             TEXT NOT NULL CHECK(outcome IN ('PASS', 'FAIL', 'REVIEW_REQUIRED')),
    score               INTEGER NOT NULL CHECK(score >= 0 AND score <= 100),
    deterministic_passed INTEGER NOT NULL CHECK(deterministic_passed IN (0, 1)),
    semantic_scores_json TEXT NOT NULL,                -- Criteria breakdown (completeness, accuracy, etc.)
    reasoning           TEXT NOT NULL,                 -- Human-readable AI / deterministic explanation
    evaluator_meta_json TEXT NOT NULL,                 -- Provider, model, latencyMs
    evaluated_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_sla_outcome ON sla_verdicts(outcome);
```

### 3.5 `ious` — Debtor-Signed Cryptographic Micro-Obligations
```sql
CREATE TABLE ious (
    iou_id              TEXT PRIMARY KEY,              -- UUIDv4
    task_id             TEXT NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    debtor_id           TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    creditor_id         TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    currency            TEXT NOT NULL DEFAULT 'USD',
    artifact_hash       TEXT NOT NULL,                 -- Bound to deliverable hash
    ed25519_signature   TEXT NOT NULL,                 -- Hex signature from debtor agent private key
    key_version         INTEGER NOT NULL DEFAULT 1,    -- Debtor key version used to sign
    status              TEXT NOT NULL CHECK(status IN ('DRAFTED', 'SIGNED', 'ELIGIBLE_FOR_CLEARING', 'IN_CLEARING', 'NETTED', 'SETTLED', 'DISPUTED', 'CANCELLED')),
    settlement_cycle_id TEXT REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_ious_debtor ON ious(debtor_id);
CREATE INDEX idx_ious_creditor ON ious(creditor_id);
CREATE INDEX idx_ious_status ON ious(status);
CREATE INDEX idx_ious_cycle ON ious(settlement_cycle_id);

### 3.6 `disputes` — Obligation Dispute Registry
```sql
CREATE TABLE disputes (
    dispute_id          TEXT PRIMARY KEY,              -- UUIDv4
    iou_id              TEXT NOT NULL UNIQUE REFERENCES ious(iou_id) ON DELETE RESTRICT,
    initiator_agent_id  TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    reason              TEXT NOT NULL,                 -- Explanation of defect or challenge
    status              TEXT NOT NULL CHECK(status IN ('OPEN', 'UNDER_REVIEW', 'UPHELD', 'DISMISSED')),
    resolution_notes    TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    resolved_at         TEXT
);
CREATE INDEX idx_disputes_iou ON disputes(iou_id);
CREATE INDEX idx_disputes_status ON disputes(status);
```
```

### 3.6 `settlement_cycles` — Multilateral Clearing Batches
```sql
CREATE TABLE settlement_cycles (
    cycle_id            TEXT PRIMARY KEY,              -- e.g. "cyc_20261104_001"
    status              TEXT NOT NULL CHECK(status IN (
                            'PREPARED', 
                            'FIREWALL_APPROVED', 
                            'COLLECTION_PENDING', 
                            'COLLECTION_CAPTURED', 
                            'COLLECTION_FAILED',
                            'PAYOUT_DISPATCHED', 
                            'RECONCILING', 
                            'SETTLED', 
                            'PARTIAL_FAILURE_HOLD',
                            'PAYOUT_AMBIGUOUS_HOLD',
                            'OPERATOR_DISPUTE_HOLD',
                            'OPERATOR_RESERVE_HOLD',
                            'POST_SETTLEMENT_RECONCILING',
                            'ABORTED'
                        )),
    gross_amount_cents  INTEGER NOT NULL CHECK(gross_amount_cents >= 0),
    net_cash_flow_cents INTEGER NOT NULL CHECK(net_cash_flow_cents >= 0),
    batch_hash          TEXT NOT NULL UNIQUE,          -- Deterministic SHA-256 of all IOU IDs (anti-replay)
    firewall_meta_json  TEXT,                          -- Recorded gate checks and reasons
    prepared_at         TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    settled_at          TEXT
);
CREATE INDEX idx_cycles_status ON settlement_cycles(status);
```

### 3.7 `net_positions` — Calculated Agent Balances per Cycle
```sql
CREATE TABLE net_positions (
    position_id         TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    agent_id            TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    gross_owed_cents    INTEGER NOT NULL DEFAULT 0 CHECK(gross_owed_cents >= 0),
    gross_received_cents INTEGER NOT NULL DEFAULT 0 CHECK(gross_received_cents >= 0),
    net_amount_cents    INTEGER NOT NULL,              -- Signed: Negative = Debtor, Positive = Creditor, 0 = Balanced
    role                TEXT NOT NULL CHECK(role IN ('DEBTOR', 'CREDITOR', 'BALANCED')),
    UNIQUE(cycle_id, agent_id),
    CHECK(
        (role = 'DEBTOR' AND net_amount_cents < 0) OR
        (role = 'CREDITOR' AND net_amount_cents > 0) OR
        (role = 'BALANCED' AND net_amount_cents = 0)
    )
);
CREATE INDEX idx_net_cycle ON net_positions(cycle_id);
```

### 3.8 `paypal_orders` — Debtor Collection Flow
```sql
CREATE TABLE paypal_orders (
    order_id            TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    debtor_agent_id     TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    paypal_order_id     TEXT NOT NULL UNIQUE,          -- PayPal assigned Order ID (e.g. "ORDER-8FG...")
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    currency            TEXT NOT NULL DEFAULT 'USD',
    status              TEXT NOT NULL CHECK(status IN ('CREATED', 'APPROVED', 'CAPTURED', 'FAILED', 'CANCELLED')),
    approval_url        TEXT NOT NULL,
    is_mock             INTEGER NOT NULL DEFAULT 0 CHECK(is_mock IN (0, 1)), -- Transparency flag for sandbox fallback
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    captured_at         TEXT
);
CREATE INDEX idx_paypal_orders_cycle ON paypal_orders(cycle_id);
```

### 3.9 `paypal_payouts` — Creditor Distribution Batches
```sql
CREATE TABLE paypal_payouts (
    payout_id           TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL UNIQUE REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    paypal_batch_id     TEXT NOT NULL UNIQUE,          -- PayPal assigned Batch ID
    sender_batch_id     TEXT NOT NULL UNIQUE,          -- Deterministic idempotency key ("nexus_payout_batch_" + cycle_id)
    total_amount_cents  INTEGER NOT NULL CHECK(total_amount_cents > 0),
    total_fees_cents    INTEGER NOT NULL DEFAULT 0,    -- Dynamically aggregated actual provider fees in cents
    status              TEXT NOT NULL CHECK(status IN ('SUBMITTED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'DENIED')),
    is_mock             INTEGER NOT NULL DEFAULT 0 CHECK(is_mock IN (0, 1)), -- Transparency flag
    submitted_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    completed_at        TEXT
);
```

### 3.10 `paypal_payout_items` — Individual Recipient Lifecycle
```sql
CREATE TABLE paypal_payout_items (
    item_id             TEXT PRIMARY KEY,              -- UUIDv4
    payout_id           TEXT NOT NULL REFERENCES paypal_payouts(payout_id) ON DELETE RESTRICT,
    creditor_agent_id   TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    sender_item_id      TEXT NOT NULL UNIQUE,          -- Deterministic item key ("cyc_001_item_data")
    receiver_email      TEXT NOT NULL,
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    fee_cents           INTEGER NOT NULL DEFAULT 0,    -- Dynamically parsed from payout_item_fee.value in cents
    status              TEXT NOT NULL CHECK(status IN (
                            'PENDING', 
                            'SUCCESS', 
                            'FAILED', 
                            'UNCLAIMED', 
                            'RETURNED', 
                            'ONHOLD', 
                            'BLOCKED', 
                            'REFUNDED', 
                            'REVERSED'
                        )),
    paypal_item_id      TEXT UNIQUE,                   -- PayPal assigned Payout Item ID
    transaction_id      TEXT,                          -- PayPal transaction reference once completed
    error_message       TEXT,
    active_reissue_id   TEXT,                          -- Links to in-flight child reissue if reissued
    reissue_settled_at  TEXT,                          -- Stamped when child reissue confirms SUCCESS
    reissue_authorization_state TEXT NOT NULL DEFAULT 'NONE' CHECK(reissue_authorization_state IN (
                            'NONE', 
                            'PARENT_TERMINAL_CONFIRMED', 
                            'RETURN_FUNDS_VERIFIED', 
                            'INTERNAL_LEDGER_RESTORED', 
                            'CREDITOR_PAYABLE_REINSTATED', 
                            'REISSUE_AUTHORIZED', 
                            'CHILD_ACTIVE', 
                            'CHILD_SETTLED', 
                            'PERMANENTLY_CLOSED'
                        )),
    reissue_active_child_id TEXT,                      -- References active child in paypal_payout_reissues
    collision_flag      INTEGER NOT NULL DEFAULT 0,    -- Set to 1 if dual-success collision occurs
    collision_receivable_cents INTEGER NOT NULL DEFAULT 0, -- Excess disbursed amount tracked in dispute receivable
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_payout_items_payout ON paypal_payout_items(payout_id);
CREATE INDEX idx_payout_items_status ON paypal_payout_items(status);
```

### 3.11 `lifecycle_transitions` — Append-Only State Transition History
```sql
CREATE TABLE lifecycle_transitions (
    transition_id       TEXT PRIMARY KEY,              -- UUIDv4
    entity_type         TEXT NOT NULL CHECK(entity_type IN ('TASK', 'SLA', 'IOU', 'DISPUTE', 'SETTLEMENT_CYCLE', 'PAYOUT_ITEM', 'PAYOUT_REISSUE', 'COMPENSATION', 'CURE_INTENT', 'RECOVERY_CLAIM', 'RECONCILIATION_SNAPSHOT')),
    entity_id           TEXT NOT NULL,                 -- e.g. task_id, iou_id, cycle_id, item_id, reissue_id, compensation_id
    from_status         TEXT,                          -- NULL if initial creation
    to_status           TEXT NOT NULL,
    reason              TEXT,
    metadata_json       TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_transitions_entity ON lifecycle_transitions(entity_type, entity_id);
CREATE INDEX idx_transitions_created ON lifecycle_transitions(created_at);
```

### 3.12 `compensating_ledger` — Double-Entry Post-Settlement Adjustments
```sql
CREATE TABLE compensating_ledger (
    compensation_id     TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    item_id             TEXT NOT NULL REFERENCES paypal_payout_items(item_id) ON DELETE RESTRICT,
    namespace           TEXT NOT NULL DEFAULT 'PROVIDER' CHECK(namespace IN ('PROVIDER', 'OPERATOR_SIGNED')),
    paypal_event_id     TEXT REFERENCES processed_webhooks(paypal_event_id) ON DELETE RESTRICT,
    paypal_txn_id       TEXT,                          -- PayPal original transaction reference
    provider_ref        TEXT,                          -- Validated refund/dispute identifier (e.g. R-xxx, PP-D-xxx)
    operator_correction_ref TEXT,                      -- Unique operator ticket ID (e.g. op_adj_YYYYMMDD_seq)
    operator_signed_hash TEXT,                         -- Ed25519/HMAC signature of adjustment ticket
    compensation_key    TEXT NOT NULL UNIQUE,          -- "comp:" + cycle_id + ":" + item_id + ":" + reversal_type + ":" + namespace + ":" + COALESCE(provider_ref, operator_correction_ref)
    reversal_type       TEXT NOT NULL CHECK(reversal_type IN ('REFUND', 'REVERSAL', 'CHARGEBACK')),
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    status              TEXT NOT NULL DEFAULT 'APPLIED' CHECK(status IN ('APPLIED', 'QUARANTINED', 'REJECTED')),
    debit_account       TEXT NOT NULL,                 -- e.g. 'ASSET:PAYPAL_SETTLEMENT_CASH'
    credit_account      TEXT NOT NULL,                 -- e.g. 'LIABILITY:CREDITOR_PAYABLE:agt_data'
    reinstated_payable_agent_id TEXT REFERENCES agents(agent_id) ON DELETE RESTRICT,
    reason              TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    CHECK (
        (namespace = 'PROVIDER' AND provider_ref IS NOT NULL) OR 
        (namespace = 'OPERATOR_SIGNED' AND operator_correction_ref IS NOT NULL AND operator_signed_hash IS NOT NULL)
    )
);
CREATE INDEX idx_comp_cycle ON compensating_ledger(cycle_id);
CREATE INDEX idx_comp_item ON compensating_ledger(item_id);
CREATE INDEX idx_comp_key ON compensating_ledger(compensation_key);
```

### 3.13 `paypal_payout_reissues` — Reissue History with Ambiguity Recovery
```sql
CREATE TABLE paypal_payout_reissues (
    reissue_id          TEXT PRIMARY KEY,              -- UUIDv4
    original_item_id    TEXT NOT NULL REFERENCES paypal_payout_items(item_id) ON DELETE RESTRICT,
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    reissue_attempt     INTEGER NOT NULL DEFAULT 1,    -- Incremented per attempt
    sender_item_id      TEXT NOT NULL UNIQUE,          -- Deterministic key e.g. "cyc_001_item_data_reissue_1"
    receiver_email      TEXT NOT NULL,                 -- Updated or re-confirmed sandbox recipient email
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    fee_cents           INTEGER NOT NULL DEFAULT 0,    -- Dynamically parsed from payout_item_fee.value in cents
    status              TEXT NOT NULL CHECK(status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS', 'FAILED', 'RETURNED', 'REFUNDED')),
    paypal_item_id      TEXT UNIQUE,                   -- PayPal assigned payout item reference for reissue
    transaction_id      TEXT,
    error_message       TEXT,
    ambiguity_reason    TEXT,                          -- Populated if entered AMBIGUOUS_HOLD
    reconciliation_notes TEXT,                         -- Audit trail of parent/child reconciliation
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    settled_at          TEXT,
    UNIQUE(original_item_id, reissue_attempt)
);
CREATE INDEX idx_reissues_orig ON paypal_payout_reissues(original_item_id);
CREATE INDEX idx_reissues_cycle ON paypal_payout_reissues(cycle_id);
CREATE INDEX idx_reissues_status ON paypal_payout_reissues(status);

-- Partial Unique Index: Exactly at most ONE child reissue in active or settled status per original item
CREATE UNIQUE INDEX uq_active_child_per_parent 
ON paypal_payout_reissues(original_item_id) 
WHERE status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS');

-- Trigger: Complete Reissue Entitlement & Multi-Precondition Guard
CREATE TRIGGER trg_reissue_entitlement_check
BEFORE INSERT ON paypal_payout_reissues
BEGIN
    -- 1. Assert parent status is terminal
    SELECT CASE
        WHEN (SELECT status FROM paypal_payout_items WHERE item_id = NEW.original_item_id) NOT IN ('RETURNED', 'REFUNDED', 'FAILED') THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Parent payout item must be in confirmed terminal RETURNED, REFUNDED, or FAILED status.')
    END;

    -- 2. Assert parent authorization state reached REISSUE_AUTHORIZED
    SELECT CASE
        WHEN (SELECT reissue_authorization_state FROM paypal_payout_items WHERE item_id = NEW.original_item_id) != 'REISSUE_AUTHORIZED' THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state.')
    END;

    -- 3. Assert cycle is not in hold, settled, or aborted
    SELECT CASE
        WHEN (SELECT status FROM settlement_cycles WHERE cycle_id = NEW.cycle_id) IN ('OPERATOR_DISPUTE_HOLD', 'OPERATOR_RESERVE_HOLD', 'SETTLED', 'ABORTED') THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Settlement cycle is in hold, settled, or aborted.')
    END;
END;

-- Trigger: Advance parent item to CHILD_ACTIVE upon child insert
CREATE TRIGGER trg_reissue_mark_parent_active
AFTER INSERT ON paypal_payout_reissues
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'CHILD_ACTIVE',
        reissue_active_child_id = NEW.reissue_id
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger: Advance parent item to CHILD_SETTLED upon child SUCCESS
CREATE TRIGGER trg_reissue_child_terminal_sync
AFTER UPDATE OF status ON paypal_payout_reissues
WHEN NEW.status = 'SUCCESS'
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'CHILD_SETTLED'
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger: Reset parent item to PARENT_TERMINAL_CONFIRMED if child itself fails or returns
CREATE TRIGGER trg_reissue_child_failure_sync
AFTER UPDATE OF status ON paypal_payout_reissues
WHEN NEW.status IN ('RETURNED', 'REFUNDED', 'FAILED')
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'PARENT_TERMINAL_CONFIRMED',
        reissue_active_child_id = NULL
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger: Late Parent Webhook Collision Guard
CREATE TRIGGER trg_parent_payout_item_late_success_guard
BEFORE UPDATE OF status ON paypal_payout_items
WHEN NEW.status = 'SUCCESS' AND OLD.reissue_authorization_state IN ('CHILD_ACTIVE', 'CHILD_SETTLED')
BEGIN
    SELECT RAISE(ABORT, 'LATE_PARENT_SUCCESS_COLLISION: Original payout item cannot be marked SUCCESS when an active or settled child reissue exists. Duplicate must be quarantined.');
END;
```

### 3.14 `system_events` — Monotonic SSE Event Stream (Transactional Outbox)
```sql
CREATE TABLE system_events (
    sequence_id         INTEGER PRIMARY KEY AUTOINCREMENT, -- Strict monotonic 1, 2, 3...
    event_id            TEXT NOT NULL UNIQUE,          -- UUIDv4
    event_type          TEXT NOT NULL,                 -- e.g. "TASK_SUBMITTED", "IOU_SIGNED", "CYCLE_CAPTURED"
    entity_id           TEXT NOT NULL,                 -- Target entity (e.g. task_id, iou_id)
    payload_json        TEXT NOT NULL,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_events_seq ON system_events(sequence_id);
CREATE INDEX idx_events_type ON system_events(event_type);
```

### 3.15 `processed_webhooks` — Anti-Replay Idempotency Log & Cryptographic Verification
```sql
CREATE TABLE processed_webhooks (
    webhook_id          TEXT PRIMARY KEY,              -- UUIDv4 internal ID
    paypal_event_id     TEXT NOT NULL UNIQUE,          -- Authoritative event ID from PayPal body (e.g. "WH-...")
    transmission_id     TEXT NOT NULL UNIQUE,          -- Header: PAYPAL-TRANSMISSION-ID (Anti-Replay Nonce)
    event_type          TEXT NOT NULL,                 -- e.g. "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.PAYOUTS-ITEM.RETURNED"
    transmission_time   TEXT NOT NULL,                 -- Header: PAYPAL-TRANSMISSION-TIME (Enforces <= 300s clock skew)
    cert_url            TEXT NOT NULL,                 -- Header: PAYPAL-CERT-URL (Must match *.paypal.com trust root)
    auth_algo           TEXT NOT NULL,                 -- Header: PAYPAL-AUTH-ALGO (e.g. SHA256withRSA)
    status              TEXT NOT NULL DEFAULT 'PROCESSED' CHECK(status IN ('PROCESSED', 'IGNORED_UNSUPPORTED', 'QUARANTINED_COLLISION')),
    processed_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX idx_webhooks_event_id ON processed_webhooks(paypal_event_id);
CREATE INDEX idx_webhooks_transmission ON processed_webhooks(transmission_id);
```

### 3.16 `audit_receipts` — Tamper-Evident Settlement Proofs
```sql
CREATE TABLE audit_receipts (
    receipt_id          TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL UNIQUE REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    receipt_json        TEXT NOT NULL,                 -- Complete snapshot of IOUs, verdicts, netting, payouts
    merkle_root         TEXT NOT NULL,                 -- SHA-256 Merkle root of all constituent records
    generated_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
```

### 3.17 `cure_intents` — Asynchronous Custodial Deficit Cure Tracking
```sql
CREATE TABLE cure_intents (
    intent_id           TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    funding_route       TEXT NOT NULL CHECK(funding_route IN ('BANK_TOPUP', 'ORDERS_CAPTURE')),
    funding_source      TEXT NOT NULL CHECK(funding_source IN ('OPERATOR_CAPITAL_CONTRIBUTION', 'DEBTOR_COLLECTION', 'OTHER_APPROVED_SOURCE')),
    funding_subrogation_basis TEXT NOT NULL DEFAULT 'EQUITY_INJECTION' CHECK(funding_subrogation_basis IN ('EQUITY_INJECTION', 'SUBORDINATED_LOAN', 'DEBTOR_DISCHARGE', 'ESCROW_GUARANTEE')),
    source_evidence_doc_hash TEXT,                     -- SHA-256 of documentary evidence proving economic substance
    authorization_role  TEXT NOT NULL DEFAULT 'FIDUCIARY_CONTROLLER' CHECK(authorization_role IN ('FIDUCIARY_CONTROLLER', 'COMPLIANCE_OFFICER', 'OPERATOR_SIGNER')),
    source_verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(source_verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
    target_amount_cents INTEGER NOT NULL CHECK(target_amount_cents > 0),
    idempotency_key     TEXT NOT NULL UNIQUE,          -- "cure:" + cycle_id + ":" + funding_route + ":" + funding_source + ":" + sequence
    status              TEXT NOT NULL CHECK(status IN ('INITIATED', 'PENDING_REPORTING_REFLECTION', 'FUNDING_CONFIRMED', 'LEDGER_POSTED', 'RECONCILED', 'FAILED')),
    provider_ref        TEXT,                          -- Bank transfer reference ID or Orders capture_id
    evidence_meta_json  TEXT,                          -- Provider confirmation headers, gross/fee/net breakdown, timestamps, webhook metadata
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    reconciled_at       TEXT
);
CREATE INDEX idx_cure_cycle ON cure_intents(cycle_id);
CREATE INDEX idx_cure_status ON cure_intents(status);
```

### 3.18 `recovery_claims` — Dispute Recovery Asset & Counterparty Attribution Registry
```sql
CREATE TABLE recovery_claims (
    claim_id            TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    payout_item_id      TEXT REFERENCES paypal_payout_items(item_id) ON DELETE RESTRICT,
    counterparty_type   TEXT NOT NULL CHECK(counterparty_type IN ('AGENT', 'PAYPAL')),
    counterparty_id     TEXT NOT NULL,                 -- e.g. 'agt_data' or 'paypal'
    claim_owner         TEXT NOT NULL CHECK(claim_owner IN ('OPERATOR', 'CUSTODIAL_TRUST')),
    accounting_framework TEXT NOT NULL DEFAULT 'US_GAAP_CONSERVATIVE' CHECK(accounting_framework IN ('US_GAAP_CONSERVATIVE', 'IFRS_IAS37')),
    stage               INTEGER NOT NULL DEFAULT 1 CHECK(stage BETWEEN 1 AND 7),
    claim_amount_cents  INTEGER NOT NULL CHECK(claim_amount_cents > 0),
    recognized_receivable_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_cents >= 0),
    cash_recovered_cents INTEGER NOT NULL DEFAULT 0 CHECK(cash_recovered_cents >= 0),
    recognized_receivable_written_off_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_written_off_cents >= 0),
    unrecognized_claim_closed_cents INTEGER NOT NULL DEFAULT 0 CHECK(unrecognized_claim_closed_cents >= 0),
    original_loss_acct  TEXT NOT NULL CHECK(original_loss_acct IN ('EXPENSE:OPERATOR_ANOMALY_LOSS', 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS')),
    stage4_evidence_type TEXT CHECK(stage4_evidence_type IN ('WRITTEN_DEBT_ACKNOWLEDGMENT', 'BINDING_DISPUTE_ADJUDICATION', 'STATUTORY_UNCONTESTED_NOTICE')),
    stage4_evidence_hash TEXT,                         -- SHA-256 of Stage 4 documentary evidence
    authorization_role  TEXT CHECK(authorization_role IN ('FIDUCIARY_CONTROLLER', 'COMPLIANCE_OFFICER')),
    authorizer_id       TEXT,                          -- Operator/compliance officer public key or agent ID
    recovery_dest_acct  TEXT NOT NULL CHECK(recovery_dest_acct IN ('ASSET:OPERATOR_CASH', 'ASSET:PAYPAL_SETTLEMENT_CASH')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    stage4_evaluated_at TEXT,
    stage5_recognized_at TEXT,
    stage6_collected_at TEXT,
    stage7_closed_at    TEXT,
    CHECK (
        -- Mandatory Evidence Gate: Stage >= 4 requires complete evidence, dual authorization, and evaluation timestamp
        (stage < 4 OR (
            stage4_evidence_type IS NOT NULL AND 
            stage4_evidence_hash IS NOT NULL AND 
            authorization_role IS NOT NULL AND 
            authorizer_id IS NOT NULL AND 
            stage4_evaluated_at IS NOT NULL
        ))
    ),
    CHECK (
        -- Global Conservation: Cumulative resolutions cannot exceed nominal claim amount
        (cash_recovered_cents + recognized_receivable_written_off_cents + unrecognized_claim_closed_cents <= claim_amount_cents)
    ),
    CHECK (
        -- Framework Branch 1: US_GAAP_CONSERVATIVE
        -- Principle: Gain contingencies are NEVER recognized on-balance-sheet prior to realization.
        -- Therefore: recognized_receivable_cents == 0 ALWAYS, recognized_receivable_written_off_cents == 0 ALWAYS, stage 5 is skipped.
        (accounting_framework = 'US_GAAP_CONSERVATIVE' AND (
            recognized_receivable_cents = 0 AND 
            recognized_receivable_written_off_cents = 0 AND 
            stage != 5 AND (
                -- Stages 1-4 (Off-Balance-Sheet Tracking): No cash recovered, no claim closed
                (stage IN (1, 2, 3, 4) AND cash_recovered_cents = 0 AND unrecognized_claim_closed_cents = 0) OR
                -- Stage 6 (Realized Cash Recovery): Cash recovered > 0, closed cents == 0
                (stage = 6 AND cash_recovered_cents > 0 AND unrecognized_claim_closed_cents = 0) OR
                -- Stage 7 (Unrecognized Claim Closed / Abandoned, including post-partial recovery): 
                -- Closed cents > 0, cash recovered + closed cents == claim_amount_cents
                (stage = 7 AND unrecognized_claim_closed_cents > 0 AND (cash_recovered_cents + unrecognized_claim_closed_cents = claim_amount_cents))
            )
        ))
        OR
        -- Framework Branch 2: IFRS_IAS37
        -- Principle: Balance sheet receivable is recognized at Stage 5 upon virtual certainty.
        -- Cash recovery reduces recognized receivable; uncollectible receivable is written off as bad debt.
        (accounting_framework = 'IFRS_IAS37' AND unrecognized_claim_closed_cents = 0 AND (
            -- Stages 1-4 (Pre-Recognition): All amounts strictly 0
            (stage IN (1, 2, 3, 4) AND recognized_receivable_cents = 0 AND cash_recovered_cents = 0 AND recognized_receivable_written_off_cents = 0) OR
            -- Stage 5 (Virtually Certain Recognition): Receivable recognized, evidence present, no collections or write-offs yet
            (stage = 5 AND recognized_receivable_cents > 0 AND recognized_receivable_cents <= claim_amount_cents AND cash_recovered_cents = 0 AND recognized_receivable_written_off_cents = 0) OR
            -- Stage 6 (Receivable Collection): Cash recovered > 0, cash <= recognized receivable, zero write-off yet
            (stage = 6 AND recognized_receivable_cents > 0 AND cash_recovered_cents > 0 AND (cash_recovered_cents <= recognized_receivable_cents) AND recognized_receivable_written_off_cents = 0) OR
            -- Stage 7 (Bad-Debt Write-Off, including post-partial recovery): 
            -- Written off > 0, cash + write-off == recognized receivable
            (stage = 7 AND recognized_receivable_cents > 0 AND recognized_receivable_written_off_cents > 0 AND (cash_recovered_cents + recognized_receivable_written_off_cents = recognized_receivable_cents))
        ))
    )
);
CREATE INDEX idx_recovery_cycle ON recovery_claims(cycle_id);
CREATE INDEX idx_recovery_item ON recovery_claims(payout_item_id);
CREATE INDEX idx_recovery_stage ON recovery_claims(stage);
```

### 3.19 `recovery_claim_events` — Immutable Recovery Claim Audit & Idempotency Log
```sql
CREATE TABLE recovery_claim_events (
    event_id            TEXT PRIMARY KEY,              -- UUIDv4
    claim_id            TEXT NOT NULL REFERENCES recovery_claims(claim_id) ON DELETE RESTRICT,
    sequence_id         INTEGER NOT NULL CHECK(sequence_id >= 1),
    from_stage          INTEGER NOT NULL CHECK(from_stage BETWEEN 1 AND 7),
    to_stage            INTEGER NOT NULL CHECK(to_stage BETWEEN 1 AND 7),
    event_type          TEXT NOT NULL CHECK(event_type IN ('CLAIM_CREATED', 'DEMAND_ISSUED', 'STAGE4_EVALUATED', 'STAGE5_RECOGNIZED', 'STAGE6_COLLECTED', 'STAGE7_CLOSED', 'STAGE7_WRITTEN_OFF', 'DIRECT_EXPENSE_RESTITUTION')),
    idempotency_key     TEXT NOT NULL UNIQUE,          -- "rec_evt:" + claim_id + ":" + event_type + ":" + sequence
    amount_cents        INTEGER NOT NULL CHECK(amount_cents >= 0),
    evidence_hash       TEXT,
    authorization_role  TEXT,
    authorizer_id       TEXT,
    journal_entry_ref   TEXT,                          -- References SQLite transaction or compensating_id
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(claim_id, sequence_id)
);
CREATE INDEX idx_rec_evt_claim ON recovery_claim_events(claim_id);
CREATE INDEX idx_rec_evt_key ON recovery_claim_events(idempotency_key);

-- Trigger 1: Prohibit UPDATE on recovery_claim_events (Strict Append-Only Invariant)
CREATE TRIGGER trg_recovery_claim_events_no_update
BEFORE UPDATE ON recovery_claim_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is an immutable append-only audit log; UPDATE operations are strictly prohibited.');
END;

-- Trigger 2: Prohibit DELETE on recovery_claim_events (Strict Append-Only Invariant)
CREATE TRIGGER trg_recovery_claim_events_no_delete
BEFORE DELETE ON recovery_claim_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is an immutable append-only audit log; DELETE operations are strictly prohibited.');
END;

-- Trigger 3: Monotonic Sequence Integrity Check (Gap Prevention)
CREATE TRIGGER trg_recovery_claim_events_sequence_check
BEFORE INSERT ON recovery_claim_events
BEGIN
    SELECT CASE 
        WHEN NEW.sequence_id != (
            SELECT COALESCE(MAX(sequence_id), 0) + 1 
            FROM recovery_claim_events 
            WHERE claim_id = NEW.claim_id
        ) THEN
            RAISE(ABORT, 'SEQUENCE_INTEGRITY_VIOLATION: sequence_id must be strictly monotonic without gaps.')
    END;
END;

-- Trigger 4: Valid Framework-Specific Stage Transition Enforcement & Current State Validation
CREATE TRIGGER trg_recovery_claim_events_transition_check
BEFORE INSERT ON recovery_claim_events
BEGIN
    -- Check 1: from_stage MUST match the actual current stage of the recovery claim
    SELECT CASE
        WHEN NEW.from_stage != (SELECT stage FROM recovery_claims WHERE claim_id = NEW.claim_id) THEN
            RAISE(ABORT, 'STAGE_MISMATCH: event from_stage does not match current recovery_claims.stage.')
    END;

    -- Check 2: Transition path must be legally valid for the specified accounting framework
    SELECT CASE
        -- When claim is US_GAAP_CONSERVATIVE
        WHEN (SELECT accounting_framework FROM recovery_claims WHERE claim_id = NEW.claim_id) = 'US_GAAP_CONSERVATIVE' THEN
            CASE 
                WHEN NOT (
                    (NEW.from_stage = 1 AND NEW.to_stage = 2) OR
                    (NEW.from_stage = 2 AND NEW.to_stage = 3) OR
                    (NEW.from_stage = 3 AND NEW.to_stage = 4) OR
                    (NEW.from_stage = 4 AND NEW.to_stage = 6) OR
                    (NEW.from_stage = 4 AND NEW.to_stage = 7) OR
                    (NEW.from_stage = 6 AND NEW.to_stage = 6) OR
                    (NEW.from_stage = 6 AND NEW.to_stage = 7)
                ) THEN
                    RAISE(ABORT, 'INVALID_STAGE_TRANSITION: Invalid transition path for US_GAAP_CONSERVATIVE lifecycle.')
            END
        -- When claim is IFRS_IAS37
        WHEN (SELECT accounting_framework FROM recovery_claims WHERE claim_id = NEW.claim_id) = 'IFRS_IAS37' THEN
            CASE 
                WHEN NOT (
                    (NEW.from_stage = 1 AND NEW.to_stage = 2) OR
                    (NEW.from_stage = 2 AND NEW.to_stage = 3) OR
                    (NEW.from_stage = 3 AND NEW.to_stage = 4) OR
                    (NEW.from_stage = 4 AND NEW.to_stage = 5) OR
                    (NEW.from_stage = 5 AND NEW.to_stage = 6) OR
                    (NEW.from_stage = 5 AND NEW.to_stage = 7) OR
                    (NEW.from_stage = 6 AND NEW.to_stage = 6) OR
                    (NEW.from_stage = 6 AND NEW.to_stage = 7)
                ) THEN
                    RAISE(ABORT, 'INVALID_STAGE_TRANSITION: Invalid transition path for IFRS_IAS37 lifecycle.')
            END
    END;
END;

-- Trigger 5: Direct Stage Update Prevention Guard
CREATE TRIGGER trg_recovery_claims_prevent_direct_stage_update
BEFORE UPDATE OF stage ON recovery_claims
BEGIN
    SELECT CASE
        WHEN NEW.stage != IFNULL((
            SELECT to_stage 
            FROM recovery_claim_events 
            WHERE claim_id = NEW.claim_id 
            ORDER BY sequence_id DESC 
            LIMIT 1
        ), -1) THEN
            RAISE(ABORT, 'STAGE_DESYNCHRONIZATION: recovery_claims.stage cannot be updated directly; mutations must occur via recovery_claim_events.')
    END;
END;

-- Trigger 6: Stage >= 4 Core Attributes and Documentary Evidence Immutability Guard
CREATE TRIGGER trg_recovery_claims_evidence_immutable
BEFORE UPDATE ON recovery_claims
WHEN OLD.stage >= 4
BEGIN
    SELECT CASE
        WHEN NEW.stage4_evidence_hash != OLD.stage4_evidence_hash OR
             NEW.stage4_evidence_type != OLD.stage4_evidence_type OR
             NEW.authorizer_id != OLD.authorizer_id OR
             NEW.stage4_evaluated_at != OLD.stage4_evaluated_at OR
             NEW.claim_amount_cents != OLD.claim_amount_cents OR
             NEW.counterparty_type != OLD.counterparty_type OR
             NEW.counterparty_id != OLD.counterparty_id OR
             NEW.claim_owner != OLD.claim_owner OR
             NEW.original_loss_acct != OLD.original_loss_acct OR
             NEW.recovery_dest_acct != OLD.recovery_dest_acct THEN
            RAISE(ABORT, 'IMMUTABILITY_VIOLATION: Stage >= 4 recovery claim core financial attributes and documentary evidence are strictly immutable.')
    END;
END;

-- Trigger 7: Atomic Outbox Synchronization (Mutates Parent Claim Automatically upon Event Insertion)
CREATE TRIGGER trg_recovery_claim_events_atomic_sync
AFTER INSERT ON recovery_claim_events
BEGIN
    UPDATE recovery_claims
    SET stage = NEW.to_stage,
        cash_recovered_cents = CASE 
            WHEN NEW.event_type = 'STAGE6_COLLECTED' THEN cash_recovered_cents + NEW.amount_cents 
            ELSE cash_recovered_cents 
        END,
        recognized_receivable_cents = CASE 
            WHEN NEW.event_type = 'STAGE5_RECOGNIZED' THEN NEW.amount_cents 
            ELSE recognized_receivable_cents 
        END,
        unrecognized_claim_closed_cents = CASE 
            WHEN NEW.event_type = 'STAGE7_CLOSED' AND stage < 5 THEN claim_amount_cents - cash_recovered_cents
            ELSE unrecognized_claim_closed_cents 
        END,
        recognized_receivable_written_off_cents = CASE 
            WHEN NEW.event_type = 'STAGE7_CLOSED' AND stage >= 5 THEN recognized_receivable_cents - cash_recovered_cents
            ELSE recognized_receivable_written_off_cents 
        END,
        updated_at = datetime('now', 'utc'),
        stage4_evaluated_at = CASE WHEN NEW.to_stage = 4 THEN datetime('now', 'utc') ELSE stage4_evaluated_at END,
        stage5_recognized_at = CASE WHEN NEW.to_stage = 5 THEN datetime('now', 'utc') ELSE stage5_recognized_at END,
        stage6_collected_at = CASE WHEN NEW.to_stage = 6 THEN datetime('now', 'utc') ELSE stage6_collected_at END,
        stage7_closed_at = CASE WHEN NEW.to_stage = 7 THEN datetime('now', 'utc') ELSE stage7_closed_at END
    WHERE claim_id = NEW.claim_id;
END;
```

---

## 4. Financial Constraints & Invariant Enforcement

1. **Strict Positive Amounts:** Every task budget, IOU amount, PayPal Order, and payout item enforces `amount_cents > 0`.
2. **Zero-Sum Transaction Boundary:** Insertion of a settlement cycle and its associated net positions occurs inside an atomic transaction:
   ```sql
   -- Transaction validation query: Must return exactly 0
   SELECT SUM(net_amount_cents) FROM net_positions WHERE cycle_id = ?;
   ```
   If the result is non-zero, the transaction rolls back immediately.
3. **No Cascading Deletes:** All foreign keys specify `ON DELETE RESTRICT`. No financial record can be accidentally pruned by parent deletion.
4. **Append-Only History:** All mutations across tasks, verdicts, IOUs, cycles, and payout items write an immutable record into `lifecycle_transitions`.
