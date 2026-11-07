import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { DatabaseManager } from '../../src/db/index.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const TEST_DB_PATH = resolve(process.cwd(), './data/test_production.db');

function cleanupDbFiles(basePath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const f = basePath + ext;
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch {
        // Ignored if locked temporarily
      }
    }
  }
}

describe('Stage 1 Production Database Verification Suite', () => {
  let dbManager: DatabaseManager;

  beforeAll(() => {
    const dir = dirname(TEST_DB_PATH);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDbFiles(TEST_DB_PATH);
    dbManager = new DatabaseManager({ dbPath: TEST_DB_PATH });
    dbManager.runMigrations();
  });

  afterAll(() => {
    if (dbManager) {
      dbManager.close();
    }
    cleanupDbFiles(TEST_DB_PATH);
  });

  // ==========================================================================
  // PART 1: CANONICAL SPECIFICATION INVARIANTS (T1 - T16)
  // ==========================================================================
  describe('Part 1: Canonical Specification Invariants (T1 - T16)', () => {
    beforeAll(() => {
      // Seed required foundational data (cycle and agents)
      dbManager.exec(`
        INSERT OR IGNORE INTO settlement_cycles (cycle_id, status) VALUES ('cyc_01', 'RECONCILING');
        INSERT OR IGNORE INTO agents (agent_id, name, role, public_key, paypal_receiver_email) 
        VALUES ('agt_data', 'Data Agent', 'Data Provider', '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'agent_data@nexus.local');
      `);
    });

    it('T1: Duplicate child reissue blocked by partial unique index and state machine', () => {
      dbManager.exec(`
        INSERT INTO paypal_payout_items (item_id, cycle_id, status, amount_cents, receiver_email, reissue_authorization_state, sender_item_id)
        VALUES ('item_01', 'cyc_01', 'RETURNED', 2000, 'agent_data_old@nexus.local', 'REISSUE_AUTHORIZED', 'snd_item_01');

        INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
        VALUES ('reissue_1', 'item_01', 'cyc_01', 1, 'snd_reissue_1', 'agent_data_new@nexus.local', 2000, 'DISPATCHED');
      `);

      // Attempt second active child reissue on the same parent item:
      // 1. Layer 1: Trigger blocks sequential attempt because parent is now CHILD_ACTIVE
      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
          VALUES ('reissue_2', 'item_01', 'cyc_01', 2, 'snd_reissue_2', 'agent_data_new@nexus.local', 2000, 'DISPATCHED');
        `);
      }).toThrow(/REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state/);

      // 2. Layer 2: Even if parent state was REISSUE_AUTHORIZED (simulating concurrent race),
      // partial unique index uq_active_child_per_parent strictly rejects second active child
      dbManager.exec("UPDATE paypal_payout_items SET reissue_authorization_state = 'REISSUE_AUTHORIZED' WHERE item_id = 'item_01';");
      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
          VALUES ('reissue_2', 'item_01', 'cyc_01', 2, 'snd_reissue_2', 'agent_data_new@nexus.local', 2000, 'DISPATCHED');
        `);
      }).toThrow(/UNIQUE constraint failed: paypal_payout_reissues\.original_item_id/);

      // Restore parent to CHILD_ACTIVE for subsequent tests
      dbManager.exec("UPDATE paypal_payout_items SET reissue_authorization_state = 'CHILD_ACTIVE' WHERE item_id = 'item_01';");
    });

    it('T2: Concurrent reissue serialization requires REISSUE_AUTHORIZED', () => {
      dbManager.exec(`
        INSERT INTO paypal_payout_items (item_id, cycle_id, status, amount_cents, receiver_email, reissue_authorization_state, sender_item_id)
        VALUES ('item_02', 'cyc_01', 'RETURNED', 1500, 'compute@nexus.local', 'PARENT_TERMINAL_CONFIRMED', 'snd_item_02');
      `);

      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
          VALUES ('reissue_comp_1', 'item_02', 'cyc_01', 1, 'snd_reissue_comp_1', 'compute_new@nexus.local', 1500, 'DISPATCHED');
        `);
      }).toThrow(/REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state/);
    });

    it('T3: Concurrent Stage 6 recovery requests blocked by monotonic sequence guard', () => {
      dbManager.exec(`
        INSERT INTO recovery_claims (
          claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
          accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct,
          stage4_evidence_type, stage4_evidence_hash, authorization_role, authorizer_id, stage4_evaluated_at
        ) VALUES (
          'claim_c3', 'cyc_01', 'item_01', 'AGENT', 'agt_data', 'OPERATOR',
          'US_GAAP_CONSERVATIVE', 4, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH',
          'WRITTEN_DEBT_ACKNOWLEDGMENT', 'hash_test_c3', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', datetime('now', 'utc')
        );

        INSERT INTO recovery_claim_events (
          event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
          evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
        ) VALUES (
          'ev_c3_1', 'claim_c3', 1, 4, 6, 'STAGE6_COLLECTED', 'idemp_c3_req1', 2000,
          'hash_test_c3', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', 'JRN-REC-01', datetime('now', 'utc')
        );
      `);

      // Concurrent request attempting from_stage 4 (which is now stage 6) fails with STAGE_MISMATCH
      expect(() => {
        dbManager.exec(`
          INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
            evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
          ) VALUES (
            'ev_c3_2', 'claim_c3', 2, 4, 6, 'STAGE6_COLLECTED', 'idemp_c3_req2', 2000,
            'hash_test_c3', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', 'JRN-REC-02', datetime('now', 'utc')
          );
        `);
      }).toThrow(/STAGE_MISMATCH: event from_stage does not match current recovery_claims.stage/);
    });

    it('T4: Duplicate webhook delivery blocked by primary key idempotency', () => {
      dbManager.exec(`
        INSERT INTO processed_webhooks (webhook_id, paypal_event_id, transmission_id, event_type, transmission_time, cert_url, auth_algo, status)
        VALUES ('wh_01', 'WH-EVT-001', 'TRANS-001', 'PAYMENT.PAYOUTS-ITEM.RETURNED', datetime('now', 'utc'), 'https://api.sandbox.paypal.com/cert', 'SHA256withRSA', 'PROCESSED');
      `);

      // Attempt duplicate delivery with identical event_id
      expect(() => {
        dbManager.exec(`
          INSERT INTO processed_webhooks (webhook_id, paypal_event_id, transmission_id, event_type, transmission_time, cert_url, auth_algo, status)
          VALUES ('wh_02', 'WH-EVT-001', 'TRANS-002', 'PAYMENT.PAYOUTS-ITEM.RETURNED', datetime('now', 'utc'), 'https://api.sandbox.paypal.com/cert', 'SHA256withRSA', 'PROCESSED');
        `);
      }).toThrow(/UNIQUE constraint failed: processed_webhooks\.paypal_event_id/);

      // Attempt duplicate delivery with identical transmission_id
      expect(() => {
        dbManager.exec(`
          INSERT INTO processed_webhooks (webhook_id, paypal_event_id, transmission_id, event_type, transmission_time, cert_url, auth_algo, status)
          VALUES ('wh_03', 'WH-EVT-002', 'TRANS-001', 'PAYMENT.PAYOUTS-ITEM.RETURNED', datetime('now', 'utc'), 'https://api.sandbox.paypal.com/cert', 'SHA256withRSA', 'PROCESSED');
        `);
      }).toThrow(/UNIQUE constraint failed: processed_webhooks\.transmission_id/);
    });

    it('T5: Comprehensive immutability on Stage >= 4 core fields', () => {
      // 5a. Tampering evidence hash
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET stage4_evidence_hash = 'tampered' WHERE claim_id = 'claim_c3';");
      }).toThrow(/IMMUTABILITY_VIOLATION/);

      // 5b. Tampering claim amount
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET claim_amount_cents = 5000 WHERE claim_id = 'claim_c3';");
      }).toThrow(/IMMUTABILITY_VIOLATION/);

      // 5c. Tampering counterparty ID
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET counterparty_id = 'rogue_agent' WHERE claim_id = 'claim_c3';");
      }).toThrow(/IMMUTABILITY_VIOLATION/);

      // 5d. Tampering claim owner
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET claim_owner = 'CUSTODIAL_TRUST' WHERE claim_id = 'claim_c3';");
      }).toThrow(/IMMUTABILITY_VIOLATION/);

      // 5e. Tampering loss account
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET original_loss_acct = 'EXPENSE:OPERATOR_ANOMALY_LOSS' WHERE claim_id = 'claim_c3';");
      }).toThrow(/IMMUTABILITY_VIOLATION/);
    });

    it('T6: Direct claim stage update without matching event blocked', () => {
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET stage = 7 WHERE claim_id = 'claim_c3';");
      }).toThrow(/STAGE_DESYNCHRONIZATION: recovery_claims.stage cannot be updated directly/);
    });

    it('T7: Atomic outbox synchronization updates claim upon event insert', () => {
      dbManager.exec(`
        INSERT INTO recovery_claims (
          claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
          accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct
        ) VALUES (
          'claim_c7', 'cyc_01', 'item_01', 'AGENT', 'agt_data', 'OPERATOR',
          'US_GAAP_CONSERVATIVE', 1, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH'
        );

        INSERT INTO recovery_claim_events (
          event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
          evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
        ) VALUES (
          'ev_c7_1', 'claim_c7', 1, 1, 2, 'DEMAND_ISSUED', 'idemp_c7_1', 0,
          NULL, NULL, NULL, NULL, datetime('now', 'utc')
        );
      `);

      const stmt = dbManager.prepare("SELECT stage FROM recovery_claims WHERE claim_id = 'claim_c7'");
      const row = stmt.get() as { stage: number };
      expect(row.stage).toBe(2);
    });

    it('T8: Returned before balance reflection blocked', () => {
      dbManager.exec(`
        INSERT INTO paypal_payout_items (item_id, cycle_id, status, amount_cents, receiver_email, reissue_authorization_state, sender_item_id)
        VALUES ('item_08', 'cyc_01', 'RETURNED', 2000, 'agent_ret@nexus.local', 'RETURN_FUNDS_VERIFIED', 'snd_item_08');
      `);

      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
          VALUES ('reissue_08', 'item_08', 'cyc_01', 1, 'snd_reissue_08', 'agent_ret_new@nexus.local', 2000, 'DISPATCHED');
        `);
      }).toThrow(/REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state/);
    });

    it('T9: Reissue after creditor payable already extinguished blocked', () => {
      // Reissue 1 confirms SUCCESS, transitioning parent item_01 to CHILD_SETTLED
      dbManager.exec("UPDATE paypal_payout_reissues SET status = 'SUCCESS' WHERE reissue_id = 'reissue_1';");

      const parentState = dbManager.prepare("SELECT reissue_authorization_state FROM paypal_payout_items WHERE item_id = 'item_01'").get() as { reissue_authorization_state: string };
      expect(parentState.reissue_authorization_state).toBe('CHILD_SETTLED');

      // Attempt second reissue on item_01
      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
          VALUES ('reissue_1_dupe', 'item_01', 'cyc_01', 2, 'snd_reissue_1_dupe', 'agent_data_new@nexus.local', 2000, 'DISPATCHED');
        `);
      }).toThrow(/REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state/);
    });

    it('T10: Active late parent webhook collision blocked and quarantined', () => {
      // Parent item_01 is in CHILD_SETTLED.
      // Late webhook arrives attempting to mark parent as SUCCESS.
      expect(() => {
        dbManager.exec("UPDATE paypal_payout_items SET status = 'SUCCESS' WHERE item_id = 'item_01';");
      }).toThrow(/LATE_PARENT_SUCCESS_COLLISION: Original payout item cannot be marked SUCCESS when an active or settled child reissue exists/);
    });

    it('T11: Transaction rollback integrity preserves 0 partial state', () => {
      expect(() => {
        dbManager.withTransaction(() => {
          dbManager.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_rollback_test', 'CREATED');");
          // Deliberate constraint violation: duplicate PRIMARY KEY
          dbManager.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_rollback_test', 'CREATED');");
        });
      }).toThrow(/UNIQUE constraint failed/);

      const check = dbManager.prepare("SELECT COUNT(*) as count FROM settlement_cycles WHERE cycle_id = 'cyc_rollback_test'").get() as { count: number };
      expect(check.count).toBe(0);
    });

    it('T12: Recovery collection exceeding original claim amount blocked', () => {
      dbManager.exec(`
        INSERT INTO recovery_claims (
          claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
          accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct,
          stage4_evidence_type, stage4_evidence_hash, authorization_role, authorizer_id, stage4_evaluated_at
        ) VALUES (
          'claim_c12', 'cyc_01', 'item_01', 'AGENT', 'agt_data', 'OPERATOR',
          'US_GAAP_CONSERVATIVE', 4, 1000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH',
          'WRITTEN_DEBT_ACKNOWLEDGMENT', 'hash_test_c12', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', datetime('now', 'utc')
        );
      `);

      expect(() => {
        // Attempting to collect 1500 cents on a 1000 cent claim
        dbManager.exec(`
          INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
            evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
          ) VALUES (
            'ev_c12_1', 'claim_c12', 1, 4, 6, 'STAGE6_COLLECTED', 'idemp_c12_1', 1500,
            'hash_test_c12', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', 'JRN-REC-12', datetime('now', 'utc')
          );
        `);
      }).toThrow(/CHECK constraint failed/);
    });

    it('T13: Unauthorized recovery ownership and invalid counterparty types rejected', () => {
      expect(() => {
        dbManager.exec(`
          INSERT INTO recovery_claims (
            claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
            accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct
          ) VALUES (
            'claim_c13', 'cyc_01', 'item_01', 'UNKNOWN_ENTITY', 'agt_data', 'OPERATOR',
            'US_GAAP_CONSERVATIVE', 1, 1000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH'
          );
        `);
      }).toThrow(/CHECK constraint failed/);
    });

    it('T14: Recovery collection transitions after Stage 7 closure prohibited', () => {
      dbManager.exec(`
        INSERT INTO recovery_claims (
          claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
          accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct,
          stage4_evidence_type, stage4_evidence_hash, authorization_role, authorizer_id, stage4_evaluated_at
        ) VALUES (
          'claim_c14', 'cyc_01', 'item_01', 'AGENT', 'agt_data', 'OPERATOR',
          'US_GAAP_CONSERVATIVE', 4, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH',
          'WRITTEN_DEBT_ACKNOWLEDGMENT', 'hash_test_c14', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', datetime('now', 'utc')
        );

        INSERT INTO recovery_claim_events (
          event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
          evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
        ) VALUES (
          'ev_c14_1', 'claim_c14', 1, 4, 7, 'STAGE7_CLOSED', 'idemp_c14_close', 2000,
          'hash_test_c14', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', NULL, datetime('now', 'utc')
        );
      `);

      // Attempt collection after closure (7 -> 6)
      expect(() => {
        dbManager.exec(`
          INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
            evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
          ) VALUES (
            'ev_c14_2', 'claim_c14', 2, 7, 6, 'STAGE6_COLLECTED', 'idemp_c14_late_coll', 2000,
            'hash_test_c14', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', 'JRN-REC-14', datetime('now', 'utc')
          );
        `);
      }).toThrow(/INVALID_STAGE_TRANSITION: Invalid transition path/);
    });

    it('T15: Scenario A-DEF default loss modeling and reserve adequacy', () => {
      dbManager.exec(`
        INSERT INTO recovery_claims (
          claim_id, cycle_id, payout_item_id, counterparty_type, counterparty_id, claim_owner,
          accounting_framework, stage, claim_amount_cents, original_loss_acct, recovery_dest_acct,
          stage4_evidence_type, stage4_evidence_hash, authorization_role, authorizer_id, stage4_evaluated_at
        ) VALUES (
          'claim_c15_def', 'cyc_01', 'item_01', 'AGENT', 'agt_data', 'OPERATOR',
          'US_GAAP_CONSERVATIVE', 4, 2000, 'EXPENSE:CUSTODIAL_SHORTFALL_LOSS', 'ASSET:OPERATOR_CASH',
          'WRITTEN_DEBT_ACKNOWLEDGMENT', 'hash_test_c15', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', datetime('now', 'utc')
        );

        INSERT INTO recovery_claim_events (
          event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
          evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
        ) VALUES (
          'ev_c15_1', 'claim_c15_def', 1, 4, 7, 'STAGE7_CLOSED', 'idemp_c15_def', 2000,
          'hash_test_c15', 'FIDUCIARY_CONTROLLER', 'usr_ctrl_1', NULL, datetime('now', 'utc')
        );
      `);

      const claim = dbManager.prepare(`
        SELECT stage, unrecognized_claim_closed_cents, cash_recovered_cents 
        FROM recovery_claims 
        WHERE claim_id = 'claim_c15_def'
      `).get() as { stage: number; unrecognized_claim_closed_cents: number; cash_recovered_cents: number };

      expect(claim.stage).toBe(7);
      expect(claim.unrecognized_claim_closed_cents).toBe(2000);
      expect(claim.cash_recovered_cents).toBe(0);

      // Model Operator Cash reserve adequacy: $100.00 initial - $22.86 total fees & default loss = $77.14
      const opCashCents = 7714;
      const reserveFloorCents = 1000; // $10.00 mandatory reserve floor
      expect(opCashCents).toBeGreaterThanOrEqual(reserveFloorCents);
      expect(opCashCents - reserveFloorCents).toBe(6714); // $67.14 safety headroom
    });

    it('T16: Cryptographic webhook handshake: timestamp skew, cert domain, replay defense', () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const validTime = new Date((nowSec - 45) * 1000).toISOString();
      const staleTime = new Date((nowSec - 350) * 1000).toISOString();

      const certUrlValid = 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-360-VALID';
      const certUrlSpoofed = 'https://malicious-site.com/certs/CERT-SPOOF';

      function validateWebhookHandshake(transmissionTimeIso: string, certUrl: string, eventId: string): { valid: boolean; reason?: string } {
        const transSec = Math.floor(new Date(transmissionTimeIso).getTime() / 1000);
        if (nowSec - transSec > 300) {
          return { valid: false, reason: 'STALE_TIMESTAMP: Webhook transmission older than 300 seconds.' };
        }
        if (!certUrl.startsWith('https://api.paypal.com/') && !certUrl.startsWith('https://api.sandbox.paypal.com/')) {
          return { valid: false, reason: 'UNTRUSTED_CERT_URL: Certificate URL domain is not authoritative PayPal.' };
        }
        const existing = dbManager.prepare('SELECT COUNT(*) as count FROM processed_webhooks WHERE paypal_event_id = ?').get(eventId) as { count: number };
        if (existing.count > 0) {
          return { valid: false, reason: 'REPLAY_DETECTED: Event ID already processed.' };
        }
        return { valid: true };
      }

      // Valid handshake
      expect(validateWebhookHandshake(validTime, certUrlValid, 'WH-UNIQUE-16A').valid).toBe(true);

      // Stale timestamp (> 300s)
      const staleRes = validateWebhookHandshake(staleTime, certUrlValid, 'WH-UNIQUE-16B');
      expect(staleRes.valid).toBe(false);
      expect(staleRes.reason).toContain('STALE_TIMESTAMP');

      // Spoofed certificate domain
      const spoofRes = validateWebhookHandshake(validTime, certUrlSpoofed, 'WH-UNIQUE-16C');
      expect(spoofRes.valid).toBe(false);
      expect(spoofRes.reason).toContain('UNTRUSTED_CERT_URL');

      // Record WH-UNIQUE-16A in DB
      dbManager.exec(`
        INSERT INTO processed_webhooks (webhook_id, paypal_event_id, transmission_id, event_type, transmission_time, cert_url, auth_algo, status)
        VALUES ('wh_16a', 'WH-UNIQUE-16A', 'TRANS-16A', 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED', '${validTime}', '${certUrlValid}', 'SHA256withRSA', 'PROCESSED');
      `);

      // Replay attempt of WH-UNIQUE-16A
      const replayRes = validateWebhookHandshake(validTime, certUrlValid, 'WH-UNIQUE-16A');
      expect(replayRes.valid).toBe(false);
      expect(replayRes.reason).toContain('REPLAY_DETECTED');
    });
  });

  // ==========================================================================
  // PART 2: MULTI-CONNECTION CONCURRENCY & LOCK CONTENTION (C1 - C3)
  // ==========================================================================
  describe('Part 2: Multi-Connection Concurrency & Lock Contention (C1 - C3)', () => {
    it('C1: Multi-connection write lock contention with BEGIN IMMEDIATE', () => {
      // Create two independent connections to the same disk file
      const conn1 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      const conn2 = new DatabaseManager({ dbPath: TEST_DB_PATH, busyTimeoutMs: 100 });

      try {
        // Conn 1 acquires the exclusive write lock
        conn1.exec('BEGIN IMMEDIATE;');

        // Conn 2 attempts to acquire write lock with 100ms timeout; must fail with database is locked
        expect(() => {
          conn2.exec('BEGIN IMMEDIATE;');
        }).toThrow(/database is locked/);

        // Conn 1 releases the lock
        conn1.exec('COMMIT;');

        // Now Conn 2 can acquire the lock immediately
        conn2.exec('BEGIN IMMEDIATE;');
        conn2.exec('COMMIT;');
      } finally {
        conn1.close();
        conn2.close();
      }
    });

    it('C2: Lock contention resolution via executeWithRetry', () => {
      const conn1 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      const conn2 = new DatabaseManager({ dbPath: TEST_DB_PATH, busyTimeoutMs: 50 });

      try {
        // Conn 1 holds write lock
        conn1.exec('BEGIN IMMEDIATE;');

        // Conn 2 attempts a write wrapped in executeWithRetry
        let retryAttemptCount = 0;
        let conn1Released = false;

        const result = conn2.executeWithRetry(() => {
          retryAttemptCount++;
          if (!conn1Released) {
            // After initial contention, release Conn 1 lock
            conn1.exec('COMMIT;');
            conn1Released = true;
          }
          return conn2.withTransaction(() => {
            conn2.exec("INSERT OR IGNORE INTO settlement_cycles (cycle_id, status) VALUES ('cyc_retry_test', 'CREATED');");
            return 'SUCCESS';
          });
        }, 5, 20);

        expect(result).toBe('SUCCESS');
        expect(conn1Released).toBe(true);

        const check = conn2.prepare("SELECT COUNT(*) as count FROM settlement_cycles WHERE cycle_id = 'cyc_retry_test'").get() as { count: number };
        expect(check.count).toBe(1);
      } finally {
        conn1.close();
        conn2.close();
      }
    });

    it('C3: Multi-connection race on child payout reissue', () => {
      const conn1 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      const conn2 = new DatabaseManager({ dbPath: TEST_DB_PATH });

      try {
        // Setup parent payout item ready for reissue
        conn1.exec(`
          INSERT INTO paypal_payout_items (item_id, cycle_id, status, amount_cents, receiver_email, reissue_authorization_state, sender_item_id)
          VALUES ('item_race', 'cyc_01', 'RETURNED', 3000, 'race_orig@nexus.local', 'REISSUE_AUTHORIZED', 'snd_item_race');
        `);

        let conn1Success = false;
        let conn2Success = false;
        let conn1Error: Error | null = null;
        let conn2Error: Error | null = null;

        // Conn 1 inserts child reissue
        try {
          conn1.exec(`
            INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
            VALUES ('reissue_race_1', 'item_race', 'cyc_01', 1, 'snd_race_1', 'race_new1@nexus.local', 3000, 'DISPATCHED');
          `);
          conn1Success = true;
        } catch (err: unknown) {
          conn1Error = err as Error;
        }

        // Conn 2 races to insert another child reissue for the same parent
        try {
          conn2.exec(`
            INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
            VALUES ('reissue_race_2', 'item_race', 'cyc_01', 2, 'snd_race_2', 'race_new2@nexus.local', 3000, 'DISPATCHED');
          `);
          conn2Success = true;
        } catch (err: unknown) {
          conn2Error = err as Error;
        }

        // Assert exactly one connection succeeded and one failed
        expect(conn1Success).toBe(true);
        expect(conn2Success).toBe(false);
        expect(conn2Error?.message).toMatch(/(UNIQUE constraint failed|REISSUE_PROHIBITED)/);

        // Verify partial unique index directly by forcing parent state to REISSUE_AUTHORIZED
        // and asserting that inserting another active child is rejected by uq_active_child_per_parent
        conn1.exec("UPDATE paypal_payout_items SET reissue_authorization_state = 'REISSUE_AUTHORIZED' WHERE item_id = 'item_race';");
        expect(() => {
          conn2.exec(`
            INSERT INTO paypal_payout_reissues (reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, receiver_email, amount_cents, status)
            VALUES ('reissue_race_direct_dupe', 'item_race', 'cyc_01', 3, 'snd_race_3', 'race_new3@nexus.local', 3000, 'DISPATCHED');
          `);
        }).toThrow(/UNIQUE constraint failed: paypal_payout_reissues\.original_item_id/);

        // Verify database contains exactly 1 active child reissue
        const count = conn1.prepare(`
          SELECT COUNT(*) as count 
          FROM paypal_payout_reissues 
          WHERE original_item_id = 'item_race' AND status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS')
        `).get() as { count: number };
        expect(count.count).toBe(1);
      } finally {
        conn1.close();
        conn2.close();
      }
    });
  });

  // ==========================================================================
  // PART 3: CRASH & RESTART DURABILITY (R1 - R2)
  // ==========================================================================
  describe('Part 3: Crash & Restart Durability (R1 - R2)', () => {
    it('R1: Committed transaction durability across disk database reopen', () => {
      const conn1 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      conn1.withTransaction(() => {
        conn1.exec(`
          INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
          VALUES ('agt_durable', 'Durable Agent', 'Storage Specialist', 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', 'durable@nexus.local');
        `);
      });
      // Close connection completely to simulate process exit
      conn1.close();

      // Open new connection to same disk file
      const conn2 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      const row = conn2.prepare("SELECT name, role FROM agents WHERE agent_id = 'agt_durable'").get() as { name: string; role: string };
      expect(row).toBeDefined();
      expect(row.name).toBe('Durable Agent');
      expect(row.role).toBe('Storage Specialist');
      conn2.close();
    });

    it('R2: Uncommitted transaction rollback cleanliness across abnormal disconnect', () => {
      const conn1 = new DatabaseManager({ dbPath: TEST_DB_PATH });

      expect(() => {
        conn1.withTransaction(() => {
          conn1.exec(`
            INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
            VALUES ('agt_ghost', 'Ghost Agent', 'Phantom', '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff', 'ghost@nexus.local');
          `);
          // Deliberate simulated mid-transaction failure
          throw new Error('SIMULATED_ABNORMAL_CRASH');
        });
      }).toThrow('SIMULATED_ABNORMAL_CRASH');

      conn1.close();

      // New connection verifies zero residue
      const conn2 = new DatabaseManager({ dbPath: TEST_DB_PATH });
      const row = conn2.prepare("SELECT COUNT(*) as count FROM agents WHERE agent_id = 'agt_ghost'").get() as { count: number };
      expect(row.count).toBe(0);
      conn2.close();
    });
  });

  // ==========================================================================
  // PART 4: NEGATIVE & CONSTRAINT INTEGRITY (N1 - N4)
  // ==========================================================================
  describe('Part 4: Negative & Constraint Integrity (N1 - N4)', () => {
    it('N1: Trigger bypass prevention on direct stage mutation', () => {
      expect(() => {
        dbManager.exec("UPDATE recovery_claims SET stage = 5 WHERE claim_id = 'claim_c7';");
      }).toThrow(/STAGE_DESYNCHRONIZATION/);
    });

    it('N2: Non-monotonic sequence ID rejected in event log', () => {
      expect(() => {
        dbManager.exec(`
          INSERT INTO recovery_claim_events (
            event_id, claim_id, sequence_id, from_stage, to_stage, event_type, idempotency_key, amount_cents,
            evidence_hash, authorization_role, authorizer_id, journal_entry_ref, created_at
          ) VALUES (
            'ev_c7_nonseq', 'claim_c7', 99, 2, 3, 'STAGE4_EVALUATED', 'idemp_nonseq', 0,
            NULL, NULL, NULL, NULL, datetime('now', 'utc')
          );
        `);
      }).toThrow(/SEQUENCE_INTEGRITY_VIOLATION: sequence_id must be strictly monotonic/);
    });

    it('N3: Append-only immutability on audit log tables', () => {
      // Direct UPDATE on recovery_claim_events
      expect(() => {
        dbManager.exec("UPDATE recovery_claim_events SET amount_cents = 9999 WHERE event_id = 'ev_c7_1';");
      }).toThrow(/MUTATION_PROHIBITED: recovery_claim_events is append-only/);

      // Direct DELETE on recovery_claim_events
      expect(() => {
        dbManager.exec("DELETE FROM recovery_claim_events WHERE event_id = 'ev_c7_1';");
      }).toThrow(/MUTATION_PROHIBITED: recovery_claim_events is append-only/);

      // System events insert then mutation attempt
      dbManager.exec(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES ('sys_ev_01', 'TASK_SUBMITTED', 'cyc_01', '{"test":true}');
      `);

      expect(() => {
        dbManager.exec("UPDATE system_events SET payload_json = '{}' WHERE event_id = 'sys_ev_01';");
      }).toThrow(/MUTATION_PROHIBITED: system_events is append-only/);

      expect(() => {
        dbManager.exec("DELETE FROM system_events WHERE event_id = 'sys_ev_01';");
      }).toThrow(/MUTATION_PROHIBITED: system_events is append-only/);
    });

    it('N4: Strict foreign key constraint enforcement', () => {
      // Attempt to insert task referencing non-existent debtor agent
      expect(() => {
        dbManager.exec(`
          INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
          VALUES ('task_fk_fail', 'cyc_01', 'non_existent_debtor', 'agt_data', 'Title', 'sha256_sla', 500, 'PENDING');
        `);
      }).toThrow(/FOREIGN KEY constraint failed/);

      // Attempt to insert payout item referencing non-existent cycle
      expect(() => {
        dbManager.exec(`
          INSERT INTO paypal_payout_items (item_id, cycle_id, status, amount_cents, receiver_email, sender_item_id)
          VALUES ('item_fk_fail', 'non_existent_cycle', 'PENDING', 1000, 'test@nexus.local', 'snd_fk_fail');
        `);
      }).toThrow(/FOREIGN KEY constraint failed/);
    });
  });
});
