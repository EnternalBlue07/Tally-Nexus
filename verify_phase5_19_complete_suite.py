import sqlite3
import sys

def run_tests():
    conn = sqlite3.connect(':memory:')
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = ON;")

    # 1. Base Setup
    c.execute("CREATE TABLE settlement_cycles (cycle_id TEXT PRIMARY KEY);")
    c.execute("INSERT INTO settlement_cycles VALUES ('cyc_01');")

    c.execute("""
    CREATE TABLE paypal_payout_items (
        item_id TEXT PRIMARY KEY,
        status TEXT NOT NULL
    );
    """)
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_pending', 'PENDING');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_processing', 'PROCESSING');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_onhold', 'ONHOLD');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_unclaimed', 'UNCLAIMED');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_ambiguous', 'AMBIGUOUS_HOLD');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_blocked', 'BLOCKED');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_returned', 'RETURNED');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_refunded', 'REFUNDED');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_failed', 'FAILED');")
    c.execute("INSERT INTO paypal_payout_items VALUES ('item_success', 'SUCCESS');")

    c.execute("""
    CREATE TABLE paypal_payout_reissues (
        reissue_id TEXT PRIMARY KEY,
        original_item_id TEXT NOT NULL REFERENCES paypal_payout_items(item_id),
        cycle_id TEXT NOT NULL REFERENCES settlement_cycles(cycle_id),
        reissue_attempt INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL
    );
    """)

    c.execute("""
    CREATE TRIGGER trg_reissue_parent_terminal_check
    BEFORE INSERT ON paypal_payout_reissues
    BEGIN
        SELECT CASE
            WHEN (SELECT status FROM paypal_payout_items WHERE item_id = NEW.original_item_id) NOT IN ('RETURNED', 'REFUNDED', 'FAILED') THEN
                RAISE(ABORT, 'REISSUE_PROHIBITED: Child reissue can ONLY be authorized after original parent item reaches terminal RETURNED, REFUNDED, or FAILED status.')
        END;
    END;
    """)

    c.execute("""
    CREATE TABLE recovery_claims (
        claim_id            TEXT PRIMARY KEY,
        cycle_id            TEXT NOT NULL REFERENCES settlement_cycles(cycle_id) ON DELETE RESTRICT,
        payout_item_id      TEXT,
        counterparty_type   TEXT NOT NULL CHECK(counterparty_type IN ('AGENT', 'PAYPAL')),
        counterparty_id     TEXT NOT NULL,
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
    """)

    c.execute("""
    CREATE TABLE recovery_claim_events (
        event_id            TEXT PRIMARY KEY,
        claim_id            TEXT NOT NULL REFERENCES recovery_claims(claim_id) ON DELETE RESTRICT,
        sequence_id         INTEGER NOT NULL CHECK(sequence_id >= 1),
        from_stage          INTEGER NOT NULL CHECK(from_stage BETWEEN 1 AND 7),
        to_stage            INTEGER NOT NULL CHECK(to_stage BETWEEN 1 AND 7),
        event_type          TEXT NOT NULL CHECK(event_type IN ('CLAIM_CREATED', 'DEMAND_ISSUED', 'STAGE4_EVALUATED', 'STAGE5_RECOGNIZED', 'STAGE6_COLLECTED', 'STAGE7_CLOSED', 'STAGE7_WRITTEN_OFF', 'DIRECT_EXPENSE_RESTITUTION')),
        idempotency_key     TEXT NOT NULL UNIQUE,
        amount_cents        INTEGER NOT NULL CHECK(amount_cents >= 0),
        evidence_hash       TEXT,
        authorization_role  TEXT,
        authorizer_id       TEXT,
        journal_entry_ref   TEXT,
        created_at          TEXT NOT NULL DEFAULT (datetime('now', 'utc')),
        UNIQUE(claim_id, sequence_id)
    );
    """)

    c.execute("""
    CREATE TRIGGER trg_recovery_claim_events_no_update
    BEFORE UPDATE ON recovery_claim_events
    BEGIN
        SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is append-only.');
    END;
    """)

    c.execute("""
    CREATE TRIGGER trg_recovery_claim_events_no_delete
    BEFORE DELETE ON recovery_claim_events
    BEGIN
        SELECT RAISE(ABORT, 'MUTATION_PROHIBITED: recovery_claim_events is append-only.');
    END;
    """)

    c.execute("""
    CREATE TRIGGER trg_recovery_claim_events_sequence_check
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
    """)

    c.execute("""
    CREATE TRIGGER trg_recovery_claim_events_transition_check
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
    """)

    c.execute("""
    CREATE TRIGGER trg_recovery_claims_sync
    BEFORE UPDATE ON recovery_claims
    BEGIN
        SELECT CASE
            WHEN NEW.stage != (
                SELECT to_stage 
                FROM recovery_claim_events 
                WHERE claim_id = NEW.claim_id 
                ORDER BY sequence_id DESC 
                LIMIT 1
            ) THEN
                RAISE(ABORT, 'STAGE_DESYNCHRONIZATION: recovery_claims.stage must match latest event to_stage.')
            WHEN NEW.stage = 6 AND (SELECT to_stage FROM recovery_claim_events WHERE claim_id = NEW.claim_id ORDER BY sequence_id DESC LIMIT 1) = 6 AND NEW.cash_recovered_cents != (SELECT SUM(amount_cents) FROM recovery_claim_events WHERE claim_id = NEW.claim_id AND event_type = 'STAGE6_COLLECTED') THEN
                RAISE(ABORT, 'AMOUNT_DESYNCHRONIZATION: recovery_claims.cash_recovered_cents must match cumulative STAGE6_COLLECTED events.')
        END;
    END;
    """)

    results = []

    # Test 1: Premature reissue on PENDING
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r1', 'item_pending', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T1_REISSUE_PENDING", "FAIL", "Allowed reissue on PENDING"))
    except sqlite3.IntegrityError as e:
        results.append(("T1_REISSUE_PENDING", "PASS", str(e)))

    # Test 2: Premature reissue on PROCESSING
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r2', 'item_processing', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T2_REISSUE_PROCESSING", "FAIL", "Allowed reissue on PROCESSING"))
    except sqlite3.IntegrityError as e:
        results.append(("T2_REISSUE_PROCESSING", "PASS", str(e)))

    # Test 3: Premature reissue on ONHOLD
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r3', 'item_onhold', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T3_REISSUE_ONHOLD", "FAIL", "Allowed reissue on ONHOLD"))
    except sqlite3.IntegrityError as e:
        results.append(("T3_REISSUE_ONHOLD", "PASS", str(e)))

    # Test 4: Premature reissue on UNCLAIMED
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r4', 'item_unclaimed', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T4_REISSUE_UNCLAIMED", "FAIL", "Allowed reissue on UNCLAIMED"))
    except sqlite3.IntegrityError as e:
        results.append(("T4_REISSUE_UNCLAIMED", "PASS", str(e)))

    # Test 5: Premature reissue on AMBIGUOUS_HOLD
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r5', 'item_ambiguous', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T5_REISSUE_AMBIGUOUS", "FAIL", "Allowed reissue on AMBIGUOUS_HOLD"))
    except sqlite3.IntegrityError as e:
        results.append(("T5_REISSUE_AMBIGUOUS", "PASS", str(e)))

    # Test 6: Authorized reissue on RETURNED
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r6', 'item_returned', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T6_REISSUE_RETURNED", "PASS", "Successfully permitted on RETURNED"))
    except Exception as e:
        results.append(("T6_REISSUE_RETURNED", "FAIL", str(e)))

    # Test 7: Authorized reissue on REFUNDED
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r7', 'item_refunded', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T7_REISSUE_REFUNDED", "PASS", "Successfully permitted on REFUNDED"))
    except Exception as e:
        results.append(("T7_REISSUE_REFUNDED", "FAIL", str(e)))

    # Test 8: Authorized reissue on FAILED
    try:
        c.execute("INSERT INTO paypal_payout_reissues VALUES ('r8', 'item_failed', 'cyc_01', 1, 'DISPATCHED');")
        results.append(("T8_REISSUE_FAILED", "PASS", "Successfully permitted on FAILED"))
    except Exception as e:
        results.append(("T8_REISSUE_FAILED", "FAIL", str(e)))

    # Test 9: Stage 4 missing documentary evidence check
    try:
        c.execute("""
        INSERT INTO recovery_claims (
            claim_id, cycle_id, counterparty_type, counterparty_id, claim_owner,
            accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct
        ) VALUES (
            'c_fail_ev', 'cyc_01', 'AGENT', 'agt_data', 'OPERATOR',
            'US_GAAP_CONSERVATIVE', 4, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH'
        );
        """)
        results.append(("T9_STAGE4_EVIDENCE_CHECK", "FAIL", "Allowed Stage 4 without evidence"))
    except sqlite3.IntegrityError as e:
        results.append(("T9_STAGE4_EVIDENCE_CHECK", "PASS", str(e)))

    # Test 10: Stage 4 with complete documentary evidence
    try:
        c.execute("""
        INSERT INTO recovery_claims (
            claim_id, cycle_id, counterparty_type, counterparty_id, claim_owner,
            accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct,
            stage4_evidence_type, stage4_evidence_hash, authorization_role, authorizer_id, stage4_evaluated_at
        ) VALUES (
            'c_ok_ev', 'cyc_01', 'AGENT', 'agt_data', 'OPERATOR',
            'US_GAAP_CONSERVATIVE', 4, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH',
            'WRITTEN_DEBT_ACKNOWLEDGMENT', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            'FIDUCIARY_CONTROLLER', 'usr_fiduciary_01', datetime('now', 'utc')
        );
        """)
        results.append(("T10_STAGE4_VALID_INSERT", "PASS", "Stage 4 permitted with complete evidence"))
    except Exception as e:
        results.append(("T10_STAGE4_VALID_INSERT", "FAIL", str(e)))

    # Test 11: Outbox from_stage mismatch guard
    try:
        c.execute("""
        INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents
        ) VALUES (
            'ev_mis', 'c_ok_ev', 1, 1, 2, 'CLAIM_CREATED', 'idemp_mis', 2000
        );
        """)
        results.append(("T11_FROM_STAGE_MISMATCH", "FAIL", "Allowed from_stage mismatch"))
    except sqlite3.IntegrityError as e:
        results.append(("T11_FROM_STAGE_MISMATCH", "PASS", str(e)))

    # Test 12: Event append-only immutability (UPDATE and DELETE)
    c.execute("""
    INSERT INTO recovery_claim_events (
        event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents
    ) VALUES (
        'ev_seq1', 'c_ok_ev', 1, 4, 6, 'STAGE6_COLLECTED', 'idemp_p1', 1000
    );
    """)
    try:
        c.execute("UPDATE recovery_claim_events SET amount_cents = 500 WHERE event_id = 'ev_seq1';")
        results.append(("T12_EVENT_IMMUTABILITY", "FAIL", "Allowed UPDATE on recovery_claim_events"))
    except sqlite3.IntegrityError as e:
        try:
            c.execute("DELETE FROM recovery_claim_events WHERE event_id = 'ev_seq1';")
            results.append(("T12_EVENT_IMMUTABILITY", "FAIL", "Allowed DELETE on recovery_claim_events"))
        except sqlite3.IntegrityError as e2:
            results.append(("T12_EVENT_IMMUTABILITY", "PASS", "Direct UPDATE and DELETE blocked"))

    # Test 13: Partial collection at Stage 6 ($10.00 of $20.00)
    try:
        c.execute("UPDATE recovery_claims SET stage = 6, cash_recovered_cents = 1000 WHERE claim_id = 'c_ok_ev';")
        results.append(("T13_PARTIAL_COLLECTION_STAGE6", "PASS", "Stage 6 partial collection of 1000 cents succeeded"))
    except Exception as e:
        results.append(("T13_PARTIAL_COLLECTION_STAGE6", "FAIL", str(e)))

    # Test 14: Partial collection closure of remaining balance (Stage 6 -> 7)
    try:
        c.execute("""
        INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents
        ) VALUES (
            'ev_seq2', 'c_ok_ev', 2, 6, 7, 'STAGE7_CLOSED', 'idemp_p2', 1000
        );
        """)
        c.execute("UPDATE recovery_claims SET stage = 7, unrecognized_claim_closed_cents = 1000 WHERE claim_id = 'c_ok_ev';")
        results.append(("T14_PARTIAL_CLOSURE_STAGE6_TO_7", "PASS", "Stage 6 -> 7 residual closure (1000+1000=2000) succeeded"))
    except Exception as e:
        results.append(("T14_PARTIAL_CLOSURE_STAGE6_TO_7", "FAIL", str(e)))

    # Test 15: Outbox stage desynchronization guard
    try:
        c.execute("UPDATE recovery_claims SET stage = 3 WHERE claim_id = 'c_ok_ev';")
        results.append(("T15_OUTBOX_STAGE_DESYNC_GUARD", "FAIL", "Allowed arbitrary stage update without matching event"))
    except sqlite3.IntegrityError as e:
        results.append(("T15_OUTBOX_STAGE_DESYNC_GUARD", "PASS", str(e)))

    conn.close()

    print("================================================================================")
    print("PHASE 5.19 15-TEST EMPIRICAL VERIFICATION SUITE RESULTS")
    print("================================================================================")
    all_passed = True
    for tid, status, msg in results:
        print(f"[{status}] {tid:<32} : {msg}")
        if status != "PASS":
            all_passed = False
    print("================================================================================")
    if all_passed:
        print("ALL 15 TESTS PASSED WITH 100% EMPIRICAL INTEGRITY (0 ERRORS, 0 WARNINGS)")
    else:
        print("TEST FAILURES DETECTED!")
        sys.exit(1)

if __name__ == '__main__':
    run_tests()
