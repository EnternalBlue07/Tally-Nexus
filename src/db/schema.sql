-- ============================================================================
-- TALLY NEXUS — CANONICAL PRODUCTION DATABASE SCHEMA (DDL)
-- Database Engine: SQLite 3 (WAL Mode Enabled)
-- Foreign Keys: STRICTLY ENFORCED (PRAGMA foreign_keys = ON)
-- ============================================================================

-- 1. Agents & Cryptographic Key Registry
CREATE TABLE IF NOT EXISTS agents (
    agent_id            TEXT PRIMARY KEY,              -- e.g. "agt_research"
    name                TEXT NOT NULL,                 -- e.g. "Research Agent"
    role                TEXT NOT NULL,                 -- e.g. "Lead Market Strategist"
    public_key          TEXT NOT NULL UNIQUE,          -- Hex-encoded Ed25519 Public Key (32 bytes / 64 hex chars)
    paypal_receiver_email TEXT NOT NULL,               -- Verified PayPal receiver email address
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 2. Tasks & Task Verifications
CREATE TABLE IF NOT EXISTS tasks (
    task_id             TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL,                 -- e.g. "cyc_20261107_001"
    debtor_agent_id     TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    creditor_agent_id   TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    title               TEXT NOT NULL,                 -- e.g. "Data Aggregation & Filtering"
    sla_contract_ref    TEXT NOT NULL,                 -- SHA-256 hash or URI of SLA contract terms
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0), -- Micro-unit financial obligation
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED')),
    submitted_at        TEXT,
    completed_at        TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    CHECK(debtor_agent_id != creditor_agent_id)
);
CREATE INDEX IF NOT EXISTS idx_tasks_cycle ON tasks(cycle_id);
CREATE INDEX IF NOT EXISTS idx_tasks_debtor ON tasks(debtor_agent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creditor ON tasks(creditor_agent_id);

-- 3. Task Verdicts (SLA Judge Output)
CREATE TABLE IF NOT EXISTS task_verdicts (
    verdict_id          TEXT PRIMARY KEY,              -- UUIDv4
    task_id             TEXT NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    evaluator_type      TEXT NOT NULL CHECK(evaluator_type IN ('PROGRAMMATIC_TEST', 'LLM_JUDGE', 'HYBRID')),
    verdict             TEXT NOT NULL CHECK(verdict IN ('PASS', 'FAIL', 'REVIEW_REQUIRED')),
    confidence_score    REAL CHECK(confidence_score BETWEEN 0.0 AND 1.0),
    evaluator_notes     TEXT,
    evaluated_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 4. Micro-IOUs (Signed Debtor Acknowledgments)
CREATE TABLE IF NOT EXISTS ious (
    iou_id              TEXT PRIMARY KEY,              -- UUIDv4
    task_id             TEXT NOT NULL UNIQUE REFERENCES tasks(task_id) ON DELETE RESTRICT,
    cycle_id            TEXT NOT NULL,
    debtor_agent_id     TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    creditor_agent_id   TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    signature           TEXT NOT NULL,                 -- Hex-encoded Ed25519 digital signature
    signed_payload      TEXT NOT NULL,                 -- Canonical JSON string that was signed
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_ious_cycle ON ious(cycle_id);
CREATE INDEX IF NOT EXISTS idx_ious_debtor ON ious(debtor_agent_id);
CREATE INDEX IF NOT EXISTS idx_ious_creditor ON ious(creditor_agent_id);

-- 5. Settlement Cycles (The Clearing Coordination Boundary)
CREATE TABLE IF NOT EXISTS settlement_cycles (
    cycle_id            TEXT PRIMARY KEY,              -- e.g. "cyc_20261107_001"
    status              TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN (
                            'CREATED',
                            'NETTING_PROPOSED',
                            'FIREWALL_APPROVED',
                            'COLLECTION_PENDING',
                            'CAPTURED',
                            'DISPATCHED',
                            'RECONCILING',
                            'POST_SETTLEMENT_RECONCILING',
                            'OPERATOR_DISPUTE_HOLD',
                            'OPERATOR_RESERVE_HOLD',
                            'SETTLED',
                            'ABORTED'
                        )),
    gross_volume_cents  INTEGER NOT NULL DEFAULT 0 CHECK(gross_volume_cents >= 0),
    net_volume_cents    INTEGER NOT NULL DEFAULT 0 CHECK(net_volume_cents >= 0),
    compression_ratio   REAL NOT NULL DEFAULT 0.0 CHECK(compression_ratio BETWEEN 0.0 AND 1.0),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    settled_at          TEXT
);

-- 6. Net Positions (Multilateral Netting Engine Output)
CREATE TABLE IF NOT EXISTS net_positions (
    position_id         TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    agent_id            TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    gross_credit_cents  INTEGER NOT NULL CHECK(gross_credit_cents >= 0),
    gross_debt_cents    INTEGER NOT NULL CHECK(gross_debt_cents >= 0),
    net_amount_cents    INTEGER NOT NULL,              -- Signed integer: Positive = Creditor, Negative = Debtor, 0 = Flat
    position_type       TEXT NOT NULL CHECK(position_type IN ('NET_CREDITOR', 'NET_DEBTOR', 'NET_ZERO')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(cycle_id, agent_id),
    CHECK(
        (position_type = 'NET_CREDITOR' AND net_amount_cents > 0 AND net_amount_cents = (gross_credit_cents - gross_debt_cents)) OR
        (position_type = 'NET_DEBTOR'   AND net_amount_cents < 0 AND net_amount_cents = (gross_credit_cents - gross_debt_cents)) OR
        (position_type = 'NET_ZERO'     AND net_amount_cents = 0 AND gross_credit_cents = gross_debt_cents)
    )
);

-- 7. PayPal Orders (Debtor Collection Ingestion)
CREATE TABLE IF NOT EXISTS paypal_orders (
    order_id            TEXT PRIMARY KEY,              -- Internal UUIDv4
    paypal_order_id     TEXT UNIQUE,                   -- PayPal-assigned Order ID (e.g. "5O190127TN364715T")
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    debtor_agent_id     TEXT NOT NULL REFERENCES agents(agent_id) ON DELETE RESTRICT,
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    status              TEXT NOT NULL DEFAULT 'CREATED' CHECK(status IN ('CREATED', 'SAVED', 'APPROVED', 'VOIDED', 'COMPLETED', 'PAYER_ACTION_REQUIRED')),
    idempotency_key     TEXT NOT NULL UNIQUE,          -- PayPal-Request-Id header
    paypal_capture_id   TEXT UNIQUE,                   -- Resulting Capture ID once captured
    approval_url        TEXT,                          -- PayPal checkout redirect URL
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    captured_at         TEXT
);

-- 8. PayPal Payout Batches (Creditor Disbursement)
CREATE TABLE IF NOT EXISTS paypal_payouts (
    payout_id           TEXT PRIMARY KEY,              -- Internal UUIDv4
    paypal_payout_batch_id TEXT UNIQUE,                -- PayPal-assigned Batch ID
    cycle_id            TEXT NOT NULL UNIQUE REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    sender_batch_id     TEXT NOT NULL UNIQUE,          -- Idempotency key sent to PayPal
    batch_status        TEXT NOT NULL DEFAULT 'DRAFT' CHECK(batch_status IN ('DRAFT', 'PENDING', 'PROCESSING', 'SUCCESS', 'DENIED', 'CANCELED')),
    total_amount_cents  INTEGER NOT NULL CHECK(total_amount_cents > 0),
    total_fee_cents     INTEGER NOT NULL DEFAULT 0 CHECK(total_fee_cents >= 0),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    completed_at        TEXT
);

-- 9. PayPal Payout Items (Item-Level Tracking)
CREATE TABLE IF NOT EXISTS paypal_payout_items (
    item_id             TEXT PRIMARY KEY,              -- Internal UUIDv4
    payout_id           TEXT REFERENCES paypal_payouts(payout_id) ON DELETE RESTRICT,
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    creditor_agent_id   TEXT REFERENCES agents(agent_id) ON DELETE RESTRICT,
    sender_item_id      TEXT NOT NULL UNIQUE,          -- Unique per payout batch item
    paypal_item_id      TEXT UNIQUE,                   -- PayPal-assigned payout_item_id
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    fee_cents           INTEGER NOT NULL DEFAULT 0 CHECK(fee_cents >= 0),
    receiver_email      TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'UNCLAIMED', 'RETURNED', 'ONHOLD', 'BLOCKED', 'REFUNDED', 'REVERSED')),
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
    reissue_active_child_id TEXT,
    transaction_id      TEXT UNIQUE,
    error_code          TEXT,
    error_message       TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_payout_items_status ON paypal_payout_items(status);
CREATE INDEX IF NOT EXISTS idx_payout_items_reissue ON paypal_payout_items(reissue_authorization_state);

-- 10. PayPal Payout Reissues
CREATE TABLE IF NOT EXISTS paypal_payout_reissues (
    reissue_id          TEXT PRIMARY KEY,              -- UUIDv4
    original_item_id    TEXT NOT NULL REFERENCES paypal_payout_items(item_id) ON DELETE RESTRICT,
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    reissue_attempt     INTEGER NOT NULL DEFAULT 1 CHECK(reissue_attempt >= 1),
    sender_item_id      TEXT NOT NULL UNIQUE,          -- e.g. "item_01_reissue_1"
    paypal_item_id      TEXT UNIQUE,
    receiver_email      TEXT NOT NULL,
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    status              TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS', 'FAILED', 'RETURNED', 'REFUNDED')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(original_item_id, reissue_attempt)
);
CREATE INDEX IF NOT EXISTS idx_reissues_orig ON paypal_payout_reissues(original_item_id);
CREATE INDEX IF NOT EXISTS idx_reissues_cycle ON paypal_payout_reissues(cycle_id);
CREATE INDEX IF NOT EXISTS idx_reissues_status ON paypal_payout_reissues(status);

-- Partial Unique Index: Exactly at most ONE child reissue in active or settled status per original parent item
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_child_per_parent 
ON paypal_payout_reissues(original_item_id) 
WHERE status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS');

-- 11. Compensating Double-Entry Subledger
CREATE TABLE IF NOT EXISTS compensating_ledger (
    entry_id            TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    debit_account       TEXT NOT NULL,                 -- e.g. "ASSET:PAYPAL_SETTLEMENT_CASH"
    credit_account      TEXT NOT NULL,                 -- e.g. "LIABILITY:CREDITOR_PAYABLE:agt_data"
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    reason              TEXT NOT NULL,                 -- e.g. "UNCLAIMED_RETURN_RESTORE", "FEE_ABSORPTION"
    external_ref        TEXT,                          -- PayPal Transaction ID
    journal_entry_ref   TEXT,                          -- Unique journal entry transaction ID
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 12. Audit Receipts (Cryptographic Settlement Proofs)
CREATE TABLE IF NOT EXISTS audit_receipts (
    receipt_id          TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL UNIQUE REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    receipt_json        TEXT NOT NULL,                 -- Snapshot of IOUs, verdicts, netting, payouts
    merkle_root         TEXT NOT NULL,                 -- SHA-256 Merkle root of constituent records
    generated_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 13. System Events (Monotonic SSE Outbox Stream)
CREATE TABLE IF NOT EXISTS system_events (
    sequence_id         INTEGER PRIMARY KEY AUTOINCREMENT, -- Strict monotonic 1, 2, 3...
    event_id            TEXT NOT NULL UNIQUE,          -- UUIDv4
    event_type          TEXT NOT NULL,                 -- e.g. "TASK_SUBMITTED", "IOU_SIGNED", "CYCLE_CAPTURED"
    cycle_id            TEXT REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    payload_json        TEXT NOT NULL,                 -- Complete serialized event payload
    emitted_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_system_events_seq ON system_events(sequence_id);

-- 14. Processed Webhooks (Anti-Replay Idempotency Log & Cryptographic Headers)
CREATE TABLE IF NOT EXISTS processed_webhooks (
    webhook_id          TEXT PRIMARY KEY,              -- UUIDv4
    paypal_event_id     TEXT NOT NULL UNIQUE,          -- Authoritative event ID from PayPal body
    transmission_id     TEXT NOT NULL UNIQUE,          -- Header: PAYPAL-TRANSMISSION-ID (Anti-Replay Nonce)
    event_type          TEXT NOT NULL,                 -- e.g. "PAYMENT.CAPTURE.COMPLETED"
    transmission_time   TEXT NOT NULL,                 -- Header: PAYPAL-TRANSMISSION-TIME
    cert_url            TEXT NOT NULL,                 -- Header: PAYPAL-CERT-URL
    auth_algo           TEXT NOT NULL,                 -- Header: PAYPAL-AUTH-ALGO
    status              TEXT NOT NULL DEFAULT 'PROCESSED' CHECK(status IN ('PROCESSED', 'IGNORED_UNSUPPORTED', 'QUARANTINED_COLLISION')),
    processed_at        TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);
CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON processed_webhooks(paypal_event_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_transmission ON processed_webhooks(transmission_id);

-- 15. Cure Intents (Asynchronous Custodial Deficit Capital Cures)
CREATE TABLE IF NOT EXISTS cure_intents (
    intent_id           TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    funding_route       TEXT NOT NULL CHECK(funding_route IN ('BANK_TOPUP', 'ORDERS_CAPTURE')),
    funding_source      TEXT NOT NULL CHECK(funding_source IN ('OPERATOR_CAPITAL_CONTRIBUTION', 'DEBTOR_COLLECTION', 'OTHER_APPROVED_SOURCE')),
    funding_subrogation_basis TEXT NOT NULL CHECK(funding_subrogation_basis IN ('EQUITY_INJECTION', 'SUBORDINATED_LOAN', 'DEBTOR_DISCHARGE', 'ESCROW_GUARANTEE')),
    amount_cents        INTEGER NOT NULL CHECK(amount_cents > 0),
    status              TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'FUNDS_CONFIRMED', 'APPLIED', 'ABORTED')),
    evidence_reference  TEXT NOT NULL,                 -- PayPal Transaction ID
    evaluated_at        TEXT,
    applied_at          TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- 16. Recovery Claims (Asset Recognition & Internal Loss Attribution)
CREATE TABLE IF NOT EXISTS recovery_claims (
    claim_id            TEXT PRIMARY KEY,              -- UUIDv4
    cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
    payout_item_id      TEXT REFERENCES paypal_payout_items(item_id) ON DELETE RESTRICT,
    counterparty_type   TEXT NOT NULL CHECK(counterparty_type IN ('AGENT', 'PAYPAL')),
    counterparty_id     TEXT NOT NULL,                 -- Agent ID or "paypal_rail"
    claim_owner         TEXT NOT NULL CHECK(claim_owner IN ('OPERATOR', 'CUSTODIAL_TRUST')),
    accounting_framework TEXT NOT NULL DEFAULT 'US_GAAP_CONSERVATIVE' CHECK(accounting_framework IN ('US_GAAP_CONSERVATIVE', 'IFRS_IAS37')),
    stage               INTEGER NOT NULL DEFAULT 1 CHECK(stage BETWEEN 1 AND 7),
    claim_amount_cents  INTEGER NOT NULL CHECK(claim_amount_cents > 0),
    recognized_receivable_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_cents >= 0),
    cash_recovered_cents INTEGER NOT NULL DEFAULT 0 CHECK(cash_recovered_cents >= 0),
    recognized_receivable_written_off_cents INTEGER NOT NULL DEFAULT 0 CHECK(recognized_receivable_written_off_cents >= 0),
    unrecognized_claim_closed_cents INTEGER NOT NULL DEFAULT 0 CHECK(unrecognized_claim_closed_cents >= 0),
    original_loss_acct  TEXT NOT NULL CHECK(original_loss_acct IN ('EXPENSE:OPERATOR_ANOMALY_LOSS', 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS')),
    stage4_evidence_type TEXT CHECK(stage4_evidence_type IN ('WRITTEN_DEBT_ACKNOWLEDGMENT', 'BINDING_DISPUTE_ADJUDICATION', 'STATUTORY_UNCONTESTED_NOTICE', 'PROVIDER_BILLING_ERROR_LOG')),
    stage4_evidence_hash TEXT,
    authorization_role  TEXT CHECK(authorization_role IN ('FIDUCIARY_CONTROLLER', 'COMPLIANCE_OFFICER')),
    authorizer_id       TEXT,
    recovery_dest_acct  TEXT NOT NULL CHECK(recovery_dest_acct IN ('ASSET:OPERATOR_CASH', 'ASSET:PAYPAL_SETTLEMENT_CASH')),
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    updated_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    stage4_evaluated_at TEXT,
    stage5_recognized_at TEXT,
    stage6_collected_at TEXT,
    stage7_closed_at    TEXT,
    CHECK (
        stage < 4 OR (
            stage4_evidence_type IS NOT NULL AND 
            stage4_evidence_hash IS NOT NULL AND 
            authorization_role IS NOT NULL AND 
            authorizer_id IS NOT NULL AND 
            stage4_evaluated_at IS NOT NULL
        )
    ),
    CHECK (
        cash_recovered_cents + recognized_receivable_written_off_cents + unrecognized_claim_closed_cents <= claim_amount_cents
    ),
    CHECK (
        (accounting_framework = 'US_GAAP_CONSERVATIVE' AND (
            recognized_receivable_cents = 0 AND 
            recognized_receivable_written_off_cents = 0 AND 
            stage != 5 AND (
                (stage IN (1, 2, 3, 4) AND cash_recovered_cents = 0 AND unrecognized_claim_closed_cents = 0) OR
                (stage = 6 AND cash_recovered_cents > 0 AND unrecognized_claim_closed_cents = 0) OR
                (stage = 7 AND unrecognized_claim_closed_cents > 0 AND (cash_recovered_cents + unrecognized_claim_closed_cents = claim_amount_cents))
            )
        ))
        OR
        (accounting_framework = 'IFRS_IAS37' AND unrecognized_claim_closed_cents = 0 AND (
            (stage IN (1, 2, 3, 4) AND recognized_receivable_cents = 0 AND cash_recovered_cents = 0 AND recognized_receivable_written_off_cents = 0) OR
            (stage = 5 AND recognized_receivable_cents > 0 AND recognized_receivable_cents <= claim_amount_cents AND cash_recovered_cents = 0 AND recognized_receivable_written_off_cents = 0) OR
            (stage = 6 AND recognized_receivable_cents > 0 AND cash_recovered_cents > 0 AND (cash_recovered_cents <= recognized_receivable_cents) AND recognized_receivable_written_off_cents = 0) OR
            (stage = 7 AND recognized_receivable_cents > 0 AND recognized_receivable_written_off_cents > 0 AND (cash_recovered_cents + recognized_receivable_written_off_cents = recognized_receivable_cents))
        ))
    )
);

-- 17. Recovery Claim Events (Immutable Outbox Log)
CREATE TABLE IF NOT EXISTS recovery_claim_events (
    event_id            TEXT PRIMARY KEY,              -- UUIDv4
    claim_id            TEXT NOT NULL REFERENCES recovery_claims(claim_id) ON DELETE RESTRICT,
    sequence_id         INTEGER NOT NULL CHECK(sequence_id >= 1),
    from_stage          INTEGER NOT NULL CHECK(from_stage BETWEEN 1 AND 7),
    to_stage            INTEGER NOT NULL CHECK(to_stage BETWEEN 1 AND 7),
    event_type          TEXT NOT NULL CHECK(event_type IN (
                            'CLAIM_CREATED',
                            'DEMAND_ISSUED',
                            'STAGE4_EVALUATED',
                            'STAGE5_RECOGNIZED',
                            'STAGE6_COLLECTED',
                            'STAGE7_CLOSED',
                            'STAGE7_WRITTEN_OFF',
                            'DIRECT_EXPENSE_RESTITUTION'
                        )),
    idempotency_key     TEXT NOT NULL UNIQUE,          -- Unique per API request
    amount_cents        INTEGER NOT NULL CHECK(amount_cents >= 0),
    evidence_hash       TEXT,
    authorization_role  TEXT,
    authorizer_id       TEXT,
    journal_entry_ref   TEXT,
    created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
    UNIQUE(claim_id, sequence_id)
);

-- 18. Lifecycle Transitions (Audit Trail)
CREATE TABLE IF NOT EXISTS lifecycle_transitions (
    transition_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type         TEXT NOT NULL,                 -- e.g. "SETTLEMENT_CYCLE", "PAYOUT_ITEM", "CLAIM"
    entity_id           TEXT NOT NULL,
    from_state          TEXT NOT NULL,
    to_state            TEXT NOT NULL,
    trigger_action      TEXT NOT NULL,
    actor_id            TEXT NOT NULL,
    timestamp           TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
);

-- ============================================================================
-- DECLARATIVE TRIGGERS
-- ============================================================================

-- Trigger 1: Reissue Entitlement & Precondition Check
CREATE TRIGGER IF NOT EXISTS trg_reissue_entitlement_check
BEFORE INSERT ON paypal_payout_reissues
BEGIN
    SELECT CASE
        WHEN (SELECT status FROM paypal_payout_items WHERE item_id = NEW.original_item_id) NOT IN ('RETURNED', 'REFUNDED', 'FAILED') THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Parent payout item must be in confirmed terminal RETURNED, REFUNDED, or FAILED status.')
    END;

    SELECT CASE
        WHEN (SELECT reissue_authorization_state FROM paypal_payout_items WHERE item_id = NEW.original_item_id) != 'REISSUE_AUTHORIZED' THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state.')
    END;

    SELECT CASE
        WHEN (SELECT status FROM settlement_cycles WHERE cycle_id = NEW.cycle_id) IN ('OPERATOR_DISPUTE_HOLD', 'OPERATOR_RESERVE_HOLD', 'SETTLED', 'ABORTED') THEN
            RAISE(ABORT, 'REISSUE_PROHIBITED: Settlement cycle is in hold, settled, or aborted.')
    END;
END;

-- Trigger 2: Advance parent item to CHILD_ACTIVE upon child insert
CREATE TRIGGER IF NOT EXISTS trg_reissue_mark_parent_active
AFTER INSERT ON paypal_payout_reissues
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'CHILD_ACTIVE',
        reissue_active_child_id = NEW.reissue_id
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger 3: Advance parent item to CHILD_SETTLED upon child SUCCESS
CREATE TRIGGER IF NOT EXISTS trg_reissue_child_terminal_sync
AFTER UPDATE OF status ON paypal_payout_reissues
WHEN NEW.status = 'SUCCESS'
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'CHILD_SETTLED'
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger 4: Reset parent item to PARENT_TERMINAL_CONFIRMED if child itself fails or returns
CREATE TRIGGER IF NOT EXISTS trg_reissue_child_failure_sync
AFTER UPDATE OF status ON paypal_payout_reissues
WHEN NEW.status IN ('RETURNED', 'REFUNDED', 'FAILED')
BEGIN
    UPDATE paypal_payout_items 
    SET reissue_authorization_state = 'PARENT_TERMINAL_CONFIRMED',
        reissue_active_child_id = NULL
    WHERE item_id = NEW.original_item_id;
END;

-- Trigger 5: Late Parent Webhook Collision Guard
CREATE TRIGGER IF NOT EXISTS trg_parent_payout_item_late_success_guard
BEFORE UPDATE OF status ON paypal_payout_items
WHEN NEW.status = 'SUCCESS' AND OLD.reissue_authorization_state IN ('CHILD_ACTIVE', 'CHILD_SETTLED')
BEGIN
    SELECT RAISE(ABORT, 'LATE_PARENT_SUCCESS_COLLISION: Original payout item cannot be marked SUCCESS when an active or settled child reissue exists. Duplicate must be quarantined.');
END;

-- Trigger 6: Recovery Claim Events Monotonic Sequence Guard
CREATE TRIGGER IF NOT EXISTS trg_recovery_claim_events_sequence_check
BEFORE INSERT ON recovery_claim_events
BEGIN
    SELECT CASE 
        WHEN NEW.sequence_id != (
            SELECT COALESCE(MAX(sequence_id), 0) + 1 
            FROM recovery_claim_events 
            WHERE claim_id = NEW.claim_id
        ) THEN
            RAISE(ABORT, 'SEQUENCE_INTEGRITY_VIOLATION: sequence_id must be strictly monotonic.')
    END;
END;

-- Trigger 7: Recovery Claim Events Transition Check
CREATE TRIGGER IF NOT EXISTS trg_recovery_claim_events_transition_check
BEFORE INSERT ON recovery_claim_events
BEGIN
    SELECT CASE
        WHEN NEW.from_stage != (SELECT stage FROM recovery_claims WHERE claim_id = NEW.claim_id) THEN
            RAISE(ABORT, 'STAGE_MISMATCH: event from_stage does not match current recovery_claims.stage.')
    END;

    SELECT CASE
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

-- Trigger 8: Direct Stage Update Prevention Guard
CREATE TRIGGER IF NOT EXISTS trg_recovery_claims_prevent_direct_stage_update
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

-- Trigger 9: Stage >= 4 Core Attributes and Documentary Evidence Immutability Guard
CREATE TRIGGER IF NOT EXISTS trg_recovery_claims_evidence_immutable
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

-- Trigger 10: Atomic Outbox Synchronization (Mutates Parent Claim Automatically upon Event Insertion)
CREATE TRIGGER IF NOT EXISTS trg_recovery_claim_events_atomic_sync
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

-- Trigger 11: Append-Only Immutability on recovery_claim_events (No UPDATE)
CREATE TRIGGER IF NOT EXISTS trg_recovery_claim_events_no_update
BEFORE UPDATE ON recovery_claim_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is append-only.');
END;

-- Trigger 12: Append-Only Immutability on recovery_claim_events (No DELETE)
CREATE TRIGGER IF NOT EXISTS trg_recovery_claim_events_no_delete
BEFORE DELETE ON recovery_claim_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is append-only.');
END;

-- Trigger 13: Append-Only Immutability on system_events (No UPDATE)
CREATE TRIGGER IF NOT EXISTS trg_system_events_no_update
BEFORE UPDATE ON system_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: system_events is append-only.');
END;

-- Trigger 14: Append-Only Immutability on system_events (No DELETE)
CREATE TRIGGER IF NOT EXISTS trg_system_events_no_delete
BEFORE DELETE ON system_events
BEGIN
    SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: system_events is append-only.');
END;
