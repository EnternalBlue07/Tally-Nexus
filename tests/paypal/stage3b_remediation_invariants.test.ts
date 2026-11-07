import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import {
  MockPayPalClient,
  PayPalOrdersService,
  PayPalPayoutsService,
  PayPalWebhookService,
  assertSandboxEnvironment,
} from '../../src/paypal/index.js';
import { generateAgentKeyPair } from '../../src/crypto/agent-keys.js';
import { IouService } from '../../src/ious/iou-service.js';
import { NettingEngine } from '../../src/netting/netting-engine.js';
import { FinancialFirewall } from '../../src/firewall/financial-firewall.js';
import { LedgerCore } from '../../src/ledger/ledger-core.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const REMEDIATION_TEST_DB = resolve(process.cwd(), './data/test_stage3b_remediation.db');
const OPERATOR_KEY = 'test-operator-remediation-key';

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

describe('Stage 3B Gate 3B Remediation Suite: Financial Invariants & Concurrency Guards', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: Express;

  let debtor1Keys: { publicKeyHex: string; privateKeyHex: string };
  let debtor2Keys: { publicKeyHex: string; privateKeyHex: string };
  let creditor1Keys: { publicKeyHex: string; privateKeyHex: string };
  let creditor2Keys: { publicKeyHex: string; privateKeyHex: string };

  const cycleId = 'cyc_remed_multi_01';

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = OPERATOR_KEY;
    process.env.PAYPAL_ENV = 'sandbox';

    const dir = dirname(REMEDIATION_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(REMEDIATION_TEST_DB);

    db = new DatabaseManager({ dbPath: REMEDIATION_TEST_DB });
    db.runMigrations();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });

    debtor1Keys = generateAgentKeyPair();
    debtor2Keys = generateAgentKeyPair();
    creditor1Keys = generateAgentKeyPair();
    creditor2Keys = generateAgentKeyPair();

    // 1. Seed 2 debtors and 2 creditors
    db.exec(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
      ('debtor_1', 'Research Alpha', 'Debtor 1', '${debtor1Keys.publicKeyHex}', 'debtor1@alpha.local'),
      ('debtor_2', 'Research Beta', 'Debtor 2', '${debtor2Keys.publicKeyHex}', 'debtor2@beta.local'),
      ('creditor_1', 'GPU Compute Host', 'Creditor 1', '${creditor1Keys.publicKeyHex}', 'creditor1@gpu.local'),
      ('creditor_2', 'Audit Lab Gamma', 'Creditor 2', '${creditor2Keys.publicKeyHex}', 'creditor2@audit.local');

      INSERT INTO settlement_cycles (cycle_id, status) VALUES ('${cycleId}', 'CREATED');

      -- Task 1: Debtor 1 owes Creditor 1 $35.00 (3500 cents)
      INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
      ('t_rem_1', '${cycleId}', 'debtor_1', 'creditor_1', 'Work 1', 'sla_ref_1', 3500, 'VERIFIED');

      -- Task 2: Debtor 2 owes Creditor 1 $25.00 (2500 cents)
      INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
      ('t_rem_2', '${cycleId}', 'debtor_2', 'creditor_1', 'Work 2', 'sla_ref_2', 2500, 'VERIFIED');

      -- Task 3: Debtor 2 owes Creditor 2 $40.00 (4000 cents)
      INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
      ('t_rem_3', '${cycleId}', 'debtor_2', 'creditor_2', 'Work 3', 'sla_ref_3', 4000, 'VERIFIED');
    `);

    // Record verified signed IOUs
    const iou1 = IouService.signIou(
      { taskId: 't_rem_1', cycleId, debtorAgentId: 'debtor_1', creditorAgentId: 'creditor_1', amountCents: 3500 },
      debtor1Keys.privateKeyHex
    );
    IouService.recordIou(iou1, db);

    const iou2 = IouService.signIou(
      { taskId: 't_rem_2', cycleId, debtorAgentId: 'debtor_2', creditorAgentId: 'creditor_1', amountCents: 2500 },
      debtor2Keys.privateKeyHex
    );
    IouService.recordIou(iou2, db);

    const iou3 = IouService.signIou(
      { taskId: 't_rem_3', cycleId, debtorAgentId: 'debtor_2', creditorAgentId: 'creditor_2', amountCents: 4000 },
      debtor2Keys.privateKeyHex
    );
    IouService.recordIou(iou3, db);

    // Compute Netting:
    // Debtor 1: -$35.00
    // Debtor 2: -$65.00 ($25 + $40)
    // Creditor 1: +$60.00 ($35 + $25)
    // Creditor 2: +$40.00
    // Net sum: (-35) + (-65) + 60 + 40 = 0 [VALID CONSERVATION]
    NettingEngine.computeCycleNetting(cycleId, db);

    // Financial firewall approval
    FinancialFirewall.evaluateAndApproveCycle(cycleId, db, 25000);
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(REMEDIATION_TEST_DB);
  });

  // =========================================================================
  // 1. P2-02 REMEDIATION: STRICT SANDBOX ALLOWLISTING
  // =========================================================================
  describe('P2-02 Remediation: Strict Sandbox Allowlist & Fail-Closed Guards', () => {
    it('1. Authorizes valid sandbox environment and endpoint', () => {
      expect(() =>
        assertSandboxEnvironment({ environment: 'sandbox', apiBase: 'https://api-m.sandbox.paypal.com' })
      ).not.toThrow();
      expect(() =>
        assertSandboxEnvironment({ environment: 'sandbox', apiBase: 'https://api.sandbox.paypal.com' })
      ).not.toThrow();
    });

    it('2. Rejects unauthorized environment names (live, prod, production, stage)', () => {
      expect(() => assertSandboxEnvironment({ environment: 'live' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ environment: 'production' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ environment: 'prod' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ environment: 'stage' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
    });

    it('3. Rejects production PayPal API endpoints (api.paypal.com, api-m.paypal.com)', () => {
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api.paypal.com' })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api-m.paypal.com' })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api.paypal.com/v2/checkout' })).toThrow(/FATAL_SAFETY_VIOLATION/);
    });
  });

  // =========================================================================
  // 2. P2-03 REMEDIATION: WEBHOOK CERTIFICATE URL VALIDATION
  // =========================================================================
  describe('P2-03 Remediation: Certificate URL Validation', () => {
    it('4. Rejects webhook with untrusted non-paypal certificate domain', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_evil_cert_01')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'https://attacker.evil.com/certs/paypal')
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'VALID_MOCK_SIGNATURE')
        .send({
          id: 'WH-EVIL-CERT',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('INVALID_CERT_URL');
    });

    it('5. Rejects webhook with non-HTTPS certificate URL', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_http_cert_02')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'http://api.sandbox.paypal.com/certs/1')
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'VALID_MOCK_SIGNATURE')
        .send({
          id: 'WH-HTTP-CERT',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('HTTPS');
    });
  });

  // =========================================================================
  // 3. P2-04 REMEDIATION: CONCURRENT ORDER CREATION IDEMPOTENCY
  // =========================================================================
  describe('P2-04 Remediation: Concurrent Order Creation Idempotency', () => {
    it('6. Handles concurrent order creation requests without HTTP 500 error', async () => {
      // Execute 3 concurrent creation requests for Debtor 1
      const [res1, res2, res3] = await Promise.all([
        PayPalOrdersService.createDebtorOrder(cycleId, 'debtor_1', db, mockClient),
        PayPalOrdersService.createDebtorOrder(cycleId, 'debtor_1', db, mockClient),
        PayPalOrdersService.createDebtorOrder(cycleId, 'debtor_1', db, mockClient),
      ]);

      expect(res1.orderId).toBeDefined();
      expect(res1.amountCents).toBe(3500);

      // All 3 concurrent calls resolve to the exact same order
      expect(res2.orderId).toBe(res1.orderId);
      expect(res2.paypalOrderId).toBe(res1.paypalOrderId);
      expect(res3.orderId).toBe(res1.orderId);

      // Database has exactly 1 order row for debtor_1
      const count = db
        .prepare('SELECT COUNT(*) as c FROM paypal_orders WHERE cycle_id = ? AND debtor_agent_id = ?')
        .get(cycleId, 'debtor_1') as { c: number };
      expect(count.c).toBe(1);
    });
  });

  // =========================================================================
  // 4. P1-01 & P1-02 REMEDIATION: MULTI-DEBTOR CAPTURE ACCOUNTING & CONCURRENCY
  // =========================================================================
  describe('P1-01 & P1-02 Remediation: Multi-Debtor Capture & Concurrency Safety', () => {
    let debtor1Order: any;
    let debtor2Order: any;

    it('7. Creates order for Debtor 2 ($65.00)', async () => {
      debtor1Order = db
        .prepare('SELECT paypal_order_id, amount_cents FROM paypal_orders WHERE cycle_id = ? AND debtor_agent_id = ?')
        .get(cycleId, 'debtor_1') as { paypal_order_id: string; amount_cents: number };

      debtor2Order = await PayPalOrdersService.createDebtorOrder(cycleId, 'debtor_2', db, mockClient);
      expect(debtor2Order.amountCents).toBe(6500);

      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get(cycleId) as { status: string };
      expect(cycle.status).toBe('COLLECTION_PENDING');
    });

    it('8. Capturing Debtor 1 order ($35.00) does NOT advance cycle to CAPTURED and locks creditor payouts', async () => {
      const capture1 = await PayPalOrdersService.captureDebtorOrder(cycleId, debtor1Order.paypal_order_id, db, mockClient);
      expect(capture1.status).toBe('COMPLETED');

      // CRITICAL P1-01 ASSERTION: Cycle status must REMAIN COLLECTION_PENDING because Debtor 2 has not paid!
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get(cycleId) as { status: string };
      expect(cycle.status).toBe('COLLECTION_PENDING');

      // Payouts must strictly FAIL because cycle is not fully captured!
      await expect(PayPalPayoutsService.dispatchCreditorPayouts(cycleId, db, mockClient)).rejects.toThrow(
        /PRECONDITION_FAILED/
      );

      // Ledger: Debtor 1 cash collected into clearing account
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(3500); // Exactly $35.00

      const clearingBal = LedgerCore.getAccountBalance('LIABILITY:COLLECTION_IN_CLEARING', db);
      expect(clearingBal.totalCredits).toBe(3500);

      // Creditors must NOT be allocated yet!
      const cred1Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_1', db);
      expect(cred1Bal.totalCredits).toBe(0);

      const cred2Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_2', db);
      expect(cred2Bal.totalCredits).toBe(0);

      // Zero-sum balance holds
      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });

    it('9. P1-02 Concurrency Guard: Simultaneous capture requests do NOT produce duplicate ledger postings', async () => {
      // Execute 3 concurrent capture requests for Debtor 1's already captured order
      const [c1, c2, c3] = await Promise.all([
        PayPalOrdersService.captureDebtorOrder(cycleId, debtor1Order.paypal_order_id, db, mockClient),
        PayPalOrdersService.captureDebtorOrder(cycleId, debtor1Order.paypal_order_id, db, mockClient),
        PayPalOrdersService.captureDebtorOrder(cycleId, debtor1Order.paypal_order_id, db, mockClient),
      ]);

      expect(c1.status).toBe('COMPLETED');
      expect(c2.status).toBe('COMPLETED');
      expect(c3.status).toBe('COMPLETED');

      // Cash balance remains strictly $35.00 (Zero duplicate debits!)
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(3500);

      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });

    it('10. Capturing Debtor 2 order ($65.00) completes cycle collection and authorizes creditor allocations', async () => {
      const capture2 = await PayPalOrdersService.captureDebtorOrder(cycleId, debtor2Order.paypalOrderId, db, mockClient);
      expect(capture2.status).toBe('COMPLETED');

      // Cycle has collected Debtor 1 ($35) + Debtor 2 ($65) = $100.00
      // Authoritative transition to CAPTURED
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get(cycleId) as { status: string };
      expect(cycle.status).toBe('CAPTURED');

      // Cash balance is now $100.00
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(10000);

      // Intermediate clearing account balance has been extinguished to creditors
      const clearingBal = LedgerCore.getAccountBalance('LIABILITY:COLLECTION_IN_CLEARING', db);
      expect(clearingBal.netDebitBalance).toBe(0); // Debited 10,000, Credited 10,000 -> Net 0

      // Creditor 1 allocated exactly $60.00
      const cred1Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_1', db);
      expect(cred1Bal.totalCredits).toBe(6000);

      // Creditor 2 allocated exactly $40.00
      const cred2Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_2', db);
      expect(cred2Bal.totalCredits).toBe(4000);

      // Trial balance is strictly balanced
      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });

    it('11. Dispatches creditor payouts for fully collected multi-debtor cycle', async () => {
      const batch = await PayPalPayoutsService.dispatchCreditorPayouts(cycleId, db, mockClient);

      expect(batch.batchStatus).toBe('PENDING'); // Never treated as PAID
      expect(batch.totalAmountCents).toBe(10000);
      expect(batch.itemCount).toBe(2);

      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get(cycleId) as { status: string };
      expect(cycle.status).toBe('DISPATCHED');

      // In-flight transit has $100.00
      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(10000);

      // Creditor liabilities remain INTACT (not prematurely extinguished)
      const cred1Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_1', db);
      expect(cred1Bal.netDebitBalance).toBe(-6000); // 6000c credit remains payable
    });

    it('12. Individual recipient delivery success extinguishes liabilities one by one', () => {
      // Creditor 1 succeeds
      PayPalPayoutsService.markItemSuccess(`${cycleId}_item_creditor_1`, 'TXN-DISB-CRED1', 25, db);

      const cred1Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_1', db);
      expect(cred1Bal.netDebitBalance).toBe(0); // Extinguished!

      // Creditor 2 liability remains intact
      const cred2Bal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_2', db);
      expect(cred2Bal.netDebitBalance).toBe(-4000);

      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(4000); // $40.00 remaining in-flight
    });
  });

  // =========================================================================
  // 5. P2-01 REMEDIATION: ORDER_ALREADY_CAPTURED AUTHORITATIVE RECONCILIATION
  // =========================================================================
  describe('P2-01 Remediation: ORDER_ALREADY_CAPTURED Reconciliation', () => {
    it('13. Authoritatively reconciles when PayPal returns 422 ORDER_ALREADY_CAPTURED', async () => {
      // Setup second single-debtor cycle
      db.exec(`
        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_already_cap', 'FIREWALL_APPROVED');
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type)
        VALUES ('pos_alr_deb', 'cyc_already_cap', 'debtor_1', 0, 5000, -5000, 'NET_DEBTOR'),
               ('pos_alr_crd', 'cyc_already_cap', 'creditor_1', 5000, 0, 5000, 'NET_CREDITOR');
      `);

      const order = await PayPalOrdersService.createDebtorOrder('cyc_already_cap', 'debtor_1', db, mockClient);

      // Configure mock client to throw 422 ORDER_ALREADY_CAPTURED on capture
      mockClient.forceOrderAlreadyCapturedOrderId = order.paypalOrderId;

      // Capture attempt: Should authoritatively reconcile instead of failing
      const reconciled = await PayPalOrdersService.captureDebtorOrder('cyc_already_cap', order.paypalOrderId, db, mockClient);

      expect(reconciled.status).toBe('COMPLETED');
      expect(reconciled.paypalCaptureId).toBe(`CAP-${order.paypalOrderId}`);

      // Order row is marked COMPLETED in database
      const row = db.prepare('SELECT status, paypal_capture_id FROM paypal_orders WHERE paypal_order_id = ?').get(order.paypalOrderId) as {
        status: string;
        paypal_capture_id: string;
      };
      expect(row.status).toBe('COMPLETED');
      expect(row.paypal_capture_id).toBe(`CAP-${order.paypalOrderId}`);

      // Cycle transitioned to CAPTURED
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_already_cap') as { status: string };
      expect(cycle.status).toBe('CAPTURED');
    });

    it('14. Webhook reconciliation passes authoritative captureId from payload', async () => {
      // Setup third cycle
      db.exec(`
        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_wh_recon', 'FIREWALL_APPROVED');
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type)
        VALUES ('pos_wh_deb', 'cyc_wh_recon', 'debtor_1', 0, 3000, -3000, 'NET_DEBTOR'),
               ('pos_wh_crd', 'cyc_wh_recon', 'creditor_1', 3000, 0, 3000, 'NET_CREDITOR');
      `);

      const order = await PayPalOrdersService.createDebtorOrder('cyc_wh_recon', 'debtor_1', db, mockClient);

      // Process asynchronous webhook delivering the completed capture
      const webhookPayload = {
        id: 'WH-EVENT-CAPTURED-999',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-AUTHORITATIVE-999',
          custom_id: 'cyc_wh_recon',
          supplementary_data: {
            related_ids: { order_id: order.paypalOrderId },
          },
        },
      };

      const result = await PayPalWebhookService.processWebhook(
        {
          transmissionId: 'trans_wh_recon_01',
          transmissionTime: new Date().toISOString(),
          certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
          authAlgo: 'SHA256withRSA',
          transmissionSig: 'VALID_MOCK_SIGNATURE',
        },
        webhookPayload,
        db,
        mockClient
      );

      expect(result.processed).toBe(true);

      const orderRow = db.prepare('SELECT status, paypal_capture_id FROM paypal_orders WHERE paypal_order_id = ?').get(order.paypalOrderId) as {
        status: string;
        paypal_capture_id: string;
      };
      expect(orderRow.status).toBe('COMPLETED');
      expect(orderRow.paypal_capture_id).toBe('CAP-AUTHORITATIVE-999');
    });
  });
});
