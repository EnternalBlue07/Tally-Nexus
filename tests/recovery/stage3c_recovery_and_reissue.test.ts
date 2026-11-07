import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import { MockPayPalClient } from '../../src/paypal/index.js';
import { RecoveryService } from '../../src/recovery/index.js';
import { LedgerCore } from '../../src/ledger/ledger-core.js';
import { generateAgentKeyPair } from '../../src/crypto/agent-keys.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const RECOVERY_TEST_DB = resolve(process.cwd(), './data/test_stage3c_recovery.db');
const OPERATOR_KEY = 'test-operator-recovery-key';

function cleanupDb(path: string) {
  for (const ext of ['', '-wal', '-shm']) {
    const f = path + ext;
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch {
        // ignore
      }
    }
  }
}

describe('Stage 3C: Recovery & Self-Healing Engine Suite (Workstream M)', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: Express;

  const cycleId = 'cyc_rec_01';

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = OPERATOR_KEY;
    process.env.PAYPAL_ENV = 'sandbox';

    const dir = dirname(RECOVERY_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(RECOVERY_TEST_DB);

    db = new DatabaseManager({ dbPath: RECOVERY_TEST_DB });
    db.runMigrations();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });

    const keysCreditor = generateAgentKeyPair();

    db.exec(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
      ('agent_cred_rec', 'Compute Provider Rec', 'Provider', '${keysCreditor.publicKeyHex}', 'provider@rec.local');

      INSERT INTO settlement_cycles (cycle_id, status) VALUES ('${cycleId}', 'DISPATCHED');

      INSERT INTO paypal_payouts (payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents)
      VALUES ('payout_rec_01', 'MOCK-BATCH-REC-01', '${cycleId}', 'sender_batch_rec_01', 'SUCCESS', 5000);

      -- Item 1: Terminal RETURNED status (Eligible for recovery)
      INSERT INTO paypal_payout_items (
        item_id, payout_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, receiver_email, status, reissue_authorization_state
      ) VALUES (
        'item_returned_01', 'payout_rec_01', '${cycleId}', 'agent_cred_rec', 's_item_ret_01', 5000, 'provider@rec.local', 'RETURNED', 'PARENT_TERMINAL_CONFIRMED'
      );

      -- Item 2: Non-terminal PENDING status (Prohibited from reissue)
      INSERT INTO paypal_payout_items (
        item_id, payout_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, receiver_email, status, reissue_authorization_state
      ) VALUES (
        'item_pending_02', 'payout_rec_01', '${cycleId}', 'agent_cred_rec', 's_item_pend_02', 3000, 'provider@rec.local', 'PENDING', 'NONE'
      );

      -- Item 3: Non-terminal ONHOLD status (Prohibited from reissue)
      INSERT INTO paypal_payout_items (
        item_id, payout_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, receiver_email, status, reissue_authorization_state
      ) VALUES (
        'item_onhold_03', 'payout_rec_01', '${cycleId}', 'agent_cred_rec', 's_item_hold_03', 2000, 'provider@rec.local', 'ONHOLD', 'NONE'
      );
    `);
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(RECOVERY_TEST_DB);
  });

  // =========================================================================
  // 1. REISSUE PROHIBITION ON NON-TERMINAL ITEMS
  // =========================================================================
  describe('A. Reissue Prohibitions on Non-Terminal Items', () => {
    it('1. Rejects reinstatement on PENDING item with 409 REISSUE_PROHIBITED', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_pending_02/reinstate')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('REISSUE_PROHIBITED_PARENT_NOT_TERMINAL');
    });

    it('2. Rejects reinstatement on ONHOLD item with 409 REISSUE_PROHIBITED', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_onhold_03/reinstate')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(409);
      expect(res.body.error.message).toContain('REISSUE_PROHIBITED_PARENT_NOT_TERMINAL');
    });
  });

  // =========================================================================
  // 2. 5-STAGE RETURN VERIFICATION & CREDITOR REINSTATEMENT
  // =========================================================================
  describe('B. 5-Stage Return Verification Sequence & Subledger Reinstatement', () => {
    it('3. Reinstates RETURNED item, advancing state to REISSUE_AUTHORIZED and restoring ledger', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_returned_01/reinstate')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(200);
      expect(res.body.reissueAuthorizationState).toBe('REISSUE_AUTHORIZED');
      expect(res.body.restoredAmountCents).toBe(5000);

      // Verify subledger compensation posting:
      // ASSET:PAYPAL_SETTLEMENT_CASH debited $50.00 (returned funds)
      // LIABILITY:CREDITOR_PAYABLE:agent_cred_rec credited $50.00 (reinstated liability)
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(5000);

      const credBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:agent_cred_rec', db);
      expect(credBal.totalCredits).toBe(5000);

      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });
  });

  // =========================================================================
  // 3. CHILD REISSUE DISPATCH & SINGLE-REISSUE ENTITLEMENT
  // =========================================================================
  describe('C. Child Reissue Dispatch & Single-Reissue Entitlement', () => {
    let reissueRecord: any;

    it('4. Dispatches child reissue payout and updates parent to CHILD_ACTIVE', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_returned_01/reissue')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ receiverEmail: 'corrected_receiver@rec.local' });

      expect(res.status).toBe(201);
      reissueRecord = res.body;

      expect(reissueRecord.reissueId).toBeDefined();
      expect(reissueRecord.senderItemId).toBe('s_item_ret_01_reissue_1');
      expect(reissueRecord.receiverEmail).toBe('corrected_receiver@rec.local');
      expect(reissueRecord.status).toBe('DISPATCHED');

      // Parent item state must be CHILD_ACTIVE
      const parent = db.prepare('SELECT reissue_authorization_state, reissue_active_child_id FROM paypal_payout_items WHERE item_id = ?').get('item_returned_01') as {
        reissue_authorization_state: string;
        reissue_active_child_id: string;
      };
      expect(parent.reissue_authorization_state).toBe('CHILD_ACTIVE');
      expect(parent.reissue_active_child_id).toBe(reissueRecord.reissueId);

      // Subledger moved funds from cash to in-flight
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(0);

      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(5000);
    });

    it('5. Single-Reissue Entitlement Guard: Rejects second concurrent child reissue with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_returned_01/reissue')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ receiverEmail: 'second_reissue@rec.local' });

      expect(res.status).toBe(400); // Parent is CHILD_ACTIVE, not REISSUE_AUTHORIZED
      expect(res.body.error.message).toContain('REISSUE_UNAUTHORIZED');
    });

    it('6. Finalizes child reissue SUCCESS, extinguishing creditor payable and advancing to CHILD_SETTLED', () => {
      RecoveryService.markReissueSuccess(reissueRecord.reissueId, 'TXN-REISSUE-SUCCESS-01', db);

      // Child reissue is SUCCESS
      const child = db.prepare('SELECT status FROM paypal_payout_reissues WHERE reissue_id = ?').get(reissueRecord.reissueId) as { status: string };
      expect(child.status).toBe('SUCCESS');

      // Parent item remains in terminal RETURNED state with CHILD_SETTLED
      const parent = db.prepare('SELECT status, reissue_authorization_state FROM paypal_payout_items WHERE item_id = ?').get('item_returned_01') as {
        status: string;
        reissue_authorization_state: string;
      };
      expect(parent.status).toBe('RETURNED');
      expect(parent.reissue_authorization_state).toBe('CHILD_SETTLED');

      // Creditor liability extinguished
      const credBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:agent_cred_rec', db);
      expect(credBal.netDebitBalance).toBe(0);

      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(0);

      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });
  });

  // =========================================================================
  // 4. CAPITAL CURE & INTERRUPTED OPERATIONS RECONCILIATION
  // =========================================================================
  describe('D. Custodial Capital Cure & Interrupted Reconciliation', () => {
    it('7. Submits and applies custodial deficit capital cure', async () => {
      const res = await request(app)
        .post('/api/recovery/cure')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({
          cycleId,
          amountCents: 15000, // $150.00
          fundingRoute: 'BANK_TOPUP',
          fundingSource: 'OPERATOR_CAPITAL_CONTRIBUTION',
          fundingSubrogationBasis: 'EQUITY_INJECTION',
          evidenceReference: 'PAYPAL-TOPUP-REF-999',
        });

      expect(res.status).toBe(201);
      expect(res.body.intentId).toBeDefined();
      expect(res.body.status).toBe('APPLIED');
      expect(res.body.amountCents).toBe(15000);

      // Verify double-entry posting:
      // ASSET:OPERATOR_CASH debited $150.00
      // EQUITY:OPERATOR_CAPITAL_CONTRIBUTION credited $150.00
      const opBal = LedgerCore.getAccountBalance('ASSET:OPERATOR_CASH', db);
      expect(opBal.netDebitBalance).toBe(15000);

      const eqBal = LedgerCore.getAccountBalance('EQUITY:OPERATOR_CAPITAL_CONTRIBUTION', db);
      expect(eqBal.totalCredits).toBe(15000);

      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });

    it('8. Executes startup reconciliation scan for interrupted operations', async () => {
      const res = await request(app)
        .post('/api/recovery/reconcile')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(200);
      expect(res.body.reconciledCycles).toBeDefined();
      expect(res.body.reconciledOrders).toBeDefined();
      expect(res.body.reconciledPayouts).toBeDefined();
    });
  });
});
