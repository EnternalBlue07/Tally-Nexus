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

const PAYPAL_TEST_DB = resolve(process.cwd(), './data/test_stage3b_paypal.db');
const OPERATOR_KEY = 'test-operator-paypal-key';

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

describe('Stage 3B: PayPal Rails & Webhook Verification Suite (Workstreams J, K, L)', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: Express;

  let agentDebtor: { publicKeyHex: string; privateKeyHex: string };
  let agentCreditor1: { publicKeyHex: string; privateKeyHex: string };
  let agentCreditor2: { publicKeyHex: string; privateKeyHex: string };

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = OPERATOR_KEY;
    process.env.PAYPAL_ENV = 'sandbox';

    const dir = dirname(PAYPAL_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(PAYPAL_TEST_DB);

    db = new DatabaseManager({ dbPath: PAYPAL_TEST_DB });
    db.runMigrations();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });

    agentDebtor = generateAgentKeyPair();
    agentCreditor1 = generateAgentKeyPair();
    agentCreditor2 = generateAgentKeyPair();

    // Seed agents
    db.exec(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
      ('debtor_alpha', 'Research Lab Alpha', 'Buyer', '${agentDebtor.publicKeyHex}', 'debtor@alpha.local'),
      ('creditor_beta', 'Compute Cluster Beta', 'GPU Host', '${agentCreditor1.publicKeyHex}', 'creditor@beta.local'),
      ('creditor_gamma', 'Audit Lab Gamma', 'QA Host', '${agentCreditor2.publicKeyHex}', 'creditor@gamma.local');

      -- Pre-fund operator cash for liquidity reserve floor
      INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_pp_01', 'CREATED');

      INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
      ('t_pp_1', 'cyc_pp_01', 'debtor_alpha', 'creditor_beta', 'Compute Work', 'sha_1', 3000, 'VERIFIED'),
      ('t_pp_2', 'cyc_pp_01', 'debtor_alpha', 'creditor_gamma', 'Audit Work', 'sha_2', 2000, 'VERIFIED');
    `);

    // Record verified IOUs: Debtor Alpha owes Beta $30.00 and Gamma $20.00 (Total debtor liability = $50.00)
    const iou1 = IouService.signIou({ taskId: 't_pp_1', cycleId: 'cyc_pp_01', debtorAgentId: 'debtor_alpha', creditorAgentId: 'creditor_beta', amountCents: 3000 }, agentDebtor.privateKeyHex);
    IouService.recordIou(iou1, db);

    const iou2 = IouService.signIou({ taskId: 't_pp_2', cycleId: 'cyc_pp_01', debtorAgentId: 'debtor_alpha', creditorAgentId: 'creditor_gamma', amountCents: 2000 }, agentDebtor.privateKeyHex);
    IouService.recordIou(iou2, db);

    // Compute Netting proposal: Debtor Alpha = -$50.00, Creditor Beta = +$30.00, Creditor Gamma = +$20.00
    NettingEngine.computeCycleNetting('cyc_pp_01', db);

    // Approve cycle through financial firewall
    FinancialFirewall.evaluateAndApproveCycle('cyc_pp_01', db, 15000);
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(PAYPAL_TEST_DB);
  });

  // =========================================================================
  // 1. ENVIRONMENT & SANDBOX SAFETY GUARDS
  // =========================================================================
  describe('A. Sandbox Environment Guard', () => {
    it('1. Passes when configured with sandbox mode', () => {
      expect(() => assertSandboxEnvironment({ environment: 'sandbox', apiBase: 'https://api-m.sandbox.paypal.com' })).not.toThrow();
    });

    it('2. Throws fatal error if live environment or production URL is detected', () => {
      expect(() => assertSandboxEnvironment({ environment: 'live' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api-m.paypal.com' })).toThrow(/FATAL_SAFETY_VIOLATION/);
    });
  });

  // =========================================================================
  // 2. WORKSTREAM J: PAYPAL ORDERS V2 (DEBTOR COLLECTION)
  // =========================================================================
  describe('B. Workstream J: PayPal Orders v2 Debtor Collection', () => {
    let orderResult: any;

    it('3. Rejects debtor order creation if cycle is not FIREWALL_APPROVED', async () => {
      db.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_unapproved', 'CREATED');");
      await expect(
        PayPalOrdersService.createDebtorOrder('cyc_unapproved', 'debtor_alpha', db, mockClient)
      ).rejects.toThrow(/INVALID_CYCLE_STATE/);
    });

    it('4. Rejects debtor order creation if agent is not an active net debtor', async () => {
      await expect(
        PayPalOrdersService.createDebtorOrder('cyc_pp_01', 'creditor_beta', db, mockClient)
      ).rejects.toThrow(/INVALID_DEBTOR/);
    });

    it('5. Creates idempotent PayPal Order for net debtor matching net deficit ($50.00)', async () => {
      orderResult = await PayPalOrdersService.createDebtorOrder('cyc_pp_01', 'debtor_alpha', db, mockClient, {
        returnUrl: 'https://nexus.local/settlement/return',
        cancelUrl: 'https://nexus.local/settlement/cancel',
      });

      expect(orderResult.orderId).toBeDefined();
      expect(orderResult.paypalOrderId).toMatch(/^MOCK-ORDER-/);
      expect(orderResult.amountCents).toBe(5000); // Exactly $50.00
      expect(orderResult.status).toBe('CREATED');
      expect(orderResult.approvalUrl).toContain('checkoutnow?token=');

      // Verify settlement cycle advanced to COLLECTION_PENDING
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_pp_01') as { status: string };
      expect(cycle.status).toBe('COLLECTION_PENDING');
    });

    it('6. Idempotent order creation returns existing order without creating duplicate row', async () => {
      const secondCall = await PayPalOrdersService.createDebtorOrder('cyc_pp_01', 'debtor_alpha', db, mockClient);
      expect(secondCall.orderId).toBe(orderResult.orderId);
      expect(secondCall.paypalOrderId).toBe(orderResult.paypalOrderId);

      const count = db.prepare('SELECT COUNT(*) as c FROM paypal_orders WHERE cycle_id = ?').get('cyc_pp_01') as { c: number };
      expect(count.c).toBe(1);
    });

    it('7. Captures debtor order and performs atomic double-entry subledger allocation', async () => {
      const captureResult = await PayPalOrdersService.captureDebtorOrder('cyc_pp_01', orderResult.paypalOrderId, db, mockClient);

      expect(captureResult.status).toBe('COMPLETED');
      expect(captureResult.paypalCaptureId).toMatch(/^CAP-/);

      // Verify settlement cycle advanced to CAPTURED
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_pp_01') as { status: string };
      expect(cycle.status).toBe('CAPTURED');

      // Verify subledger allocation:
      // ASSET:PAYPAL_SETTLEMENT_CASH debited $50.00
      // LIABILITY:CREDITOR_PAYABLE:creditor_beta credited $30.00
      // LIABILITY:CREDITOR_PAYABLE:creditor_gamma credited $20.00
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(5000);

      const betaBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_beta', db);
      expect(betaBal.totalCredits).toBe(3000);

      const gammaBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_gamma', db);
      expect(gammaBal.totalCredits).toBe(2000);

      // Verify trial balance holds
      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
    });

    it('8. Idempotent capture call returns existing capture without duplicate postings', async () => {
      const secondCapture = await PayPalOrdersService.captureDebtorOrder('cyc_pp_01', orderResult.paypalOrderId, db, mockClient);
      expect(secondCapture.status).toBe('COMPLETED');

      // Cash balance remains strictly $50.00 (no double debit)
      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(5000);
    });
  });

  // =========================================================================
  // 3. WORKSTREAM K: PAYPAL PAYOUTS V1 (CREDITOR DISBURSEMENT)
  // =========================================================================
  describe('C. Workstream K: PayPal Payouts v1 Creditor Disbursement', () => {
    let payoutResult: any;

    it('9. Rejects creditor payout dispatch if cycle is not CAPTURED', async () => {
      db.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_not_cap', 'FIREWALL_APPROVED');");
      await expect(
        PayPalPayoutsService.dispatchCreditorPayouts('cyc_not_cap', db, mockClient)
      ).rejects.toThrow(/PRECONDITION_FAILED/);
    });

    it('10. Dispatches batch payout to creditors and records PENDING status (Never treated as PAID)', async () => {
      payoutResult = await PayPalPayoutsService.dispatchCreditorPayouts('cyc_pp_01', db, mockClient);

      expect(payoutResult.payoutId).toBeDefined();
      expect(payoutResult.paypalPayoutBatchId).toMatch(/^MOCK-BATCH-/);
      expect(payoutResult.batchStatus).toBe('PENDING'); // Strictly PENDING, NOT PAID!
      expect(payoutResult.totalAmountCents).toBe(5000);
      expect(payoutResult.itemCount).toBe(2);

      // Verify cycle status transitioned to DISPATCHED
      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_pp_01') as { status: string };
      expect(cycle.status).toBe('DISPATCHED');

      // Verify payout items stored in DB
      const items = db.prepare('SELECT item_id, creditor_agent_id, amount_cents, status FROM paypal_payout_items WHERE cycle_id = ?').all('cyc_pp_01') as Array<{
        item_id: string;
        creditor_agent_id: string;
        amount_cents: number;
        status: string;
      }>;
      expect(items.length).toBe(2);
      expect(items.every((i) => i.status === 'PENDING')).toBe(true);

      // Verify subledger in-flight transit entry:
      // ASSET:PAYPAL_PAYOUTS_IN_FLIGHT debited $50.00
      // ASSET:PAYPAL_SETTLEMENT_CASH credited $50.00
      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(5000);

      const cashBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(cashBal.netDebitBalance).toBe(0); // Available cash moved to in-flight transit
    });

    it('11. Idempotent payout dispatch returns existing batch without duplicate dispatch', async () => {
      const secondPayout = await PayPalPayoutsService.dispatchCreditorPayouts('cyc_pp_01', db, mockClient);
      expect(secondPayout.payoutId).toBe(payoutResult.payoutId);
      expect(secondPayout.paypalPayoutBatchId).toBe(payoutResult.paypalPayoutBatchId);

      const count = db.prepare('SELECT COUNT(*) as c FROM paypal_payouts WHERE cycle_id = ?').get('cyc_pp_01') as { c: number };
      expect(count.c).toBe(1);
    });

    it('12. Finalizes item SUCCESS and extinguishes liability in double-entry subledger', () => {
      const senderItemId = 'cyc_pp_01_item_creditor_beta';
      PayPalPayoutsService.markItemSuccess(senderItemId, 'TXN-BETA-001', 25, db);

      const item = db.prepare('SELECT status, transaction_id, fee_cents FROM paypal_payout_items WHERE sender_item_id = ?').get(senderItemId) as {
        status: string;
        transaction_id: string;
        fee_cents: number;
      };
      expect(item.status).toBe('SUCCESS');
      expect(item.transaction_id).toBe('TXN-BETA-001');

      // Verify liability extinguished:
      // LIABILITY:CREDITOR_PAYABLE:creditor_beta debited $30.00
      // ASSET:PAYPAL_PAYOUTS_IN_FLIGHT credited $30.00
      const betaBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_beta', db);
      expect(betaBal.netDebitBalance).toBe(0); // Fully settled & extinguished

      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(2000); // Remaining in-flight for Gamma ($20.00)
    });
  });

  // =========================================================================
  // 4. WORKSTREAM L: PAYPAL WEBHOOK SIGNATURE VERIFICATION & INGESTION
  // =========================================================================
  describe('D. Workstream L: PayPal Webhooks Verification', () => {
    it('13. Rejects webhook with missing transmission headers with 400', async () => {
      await expect(
        PayPalWebhookService.processWebhook(
          {
            transmissionId: '',
            transmissionTime: '',
            certUrl: '',
            authAlgo: '',
            transmissionSig: '',
          },
          { id: 'WH-001', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} },
          db,
          mockClient
        )
      ).rejects.toThrow(/MISSING_WEBHOOK_HEADERS/);
    });

    it('14. Rejects webhook with forged signature with 401', async () => {
      await expect(
        PayPalWebhookService.processWebhook(
          {
            transmissionId: 'trans_bad_sig',
            transmissionTime: new Date().toISOString(),
            certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
            authAlgo: 'SHA256withRSA',
            transmissionSig: 'INVALID_FORGED_SIGNATURE', // Triggers mock failure
          },
          { id: 'WH-BAD-SIG', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} },
          db,
          mockClient
        )
      ).rejects.toThrow(/INVALID_WEBHOOK_SIGNATURE/);
    });

    it('15. Verifies and processes PAYMENT.PAYOUTS-ITEM.SUCCESS webhook, updating item status', async () => {
      const webhookPayload = {
        id: 'WH-ITEM-SUCCESS-01',
        event_type: 'PAYMENT.PAYOUTS-ITEM.SUCCESS',
        resource: {
          transaction_id: 'TXN-GAMMA-777',
          payout_item_fee: { value: '0.25' },
          payout_item: {
            sender_item_id: 'cyc_pp_01_item_creditor_gamma',
            amount: { value: '20.00' },
          },
        },
      };

      const result = await PayPalWebhookService.processWebhook(
        {
          transmissionId: 'trans_item_success_gamma',
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
      expect(result.status).toBe('PROCESSED');

      // Verify gamma payout item marked SUCCESS
      const gammaItem = db.prepare('SELECT status, transaction_id FROM paypal_payout_items WHERE sender_item_id = ?').get('cyc_pp_01_item_creditor_gamma') as {
        status: string;
        transaction_id: string;
      };
      expect(gammaItem.status).toBe('SUCCESS');
      expect(gammaItem.transaction_id).toBe('TXN-GAMMA-777');

      // Verify Gamma liability extinguished in subledger
      const gammaBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:creditor_gamma', db);
      expect(gammaBal.netDebitBalance).toBe(0);

      // Verify in-flight balance is now 0 (all creditors delivered)
      const inFlightBal = LedgerCore.getAccountBalance('ASSET:PAYPAL_PAYOUTS_IN_FLIGHT', db);
      expect(inFlightBal.netDebitBalance).toBe(0);
    });

    it('16. Anti-replay defense: Re-processing identical transmissionId exits idempotently', async () => {
      const duplicateRes = await PayPalWebhookService.processWebhook(
        {
          transmissionId: 'trans_item_success_gamma', // Replay of test 15!
          transmissionTime: new Date().toISOString(),
          certUrl: 'https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1',
          authAlgo: 'SHA256withRSA',
          transmissionSig: 'VALID_MOCK_SIGNATURE',
        },
        {
          id: 'WH-ITEM-SUCCESS-01',
          event_type: 'PAYMENT.PAYOUTS-ITEM.SUCCESS',
          resource: {},
        },
        db,
        mockClient
      );

      expect(duplicateRes.processed).toBe(false);
      expect(duplicateRes.status).toBe('DUPLICATE_REPLAY_IGNORED');
    });

    it('17. Handles terminal failure events (PAYMENT.PAYOUTS-ITEM.RETURNED)', async () => {
      // Create a test item to test return event
      db.exec(`
        INSERT INTO paypal_payout_items (item_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, receiver_email, status)
        VALUES ('item_test_ret', 'cyc_pp_01', 'creditor_beta', 'cyc_pp_01_item_returned', 1500, 'beta@test.local', 'PENDING');
      `);

      const webhookPayload = {
        id: 'WH-ITEM-RETURN-01',
        event_type: 'PAYMENT.PAYOUTS-ITEM.RETURNED',
        resource: {
          payout_item: {
            sender_item_id: 'cyc_pp_01_item_returned',
          },
        },
      };

      const result = await PayPalWebhookService.processWebhook(
        {
          transmissionId: 'trans_item_ret_01',
          transmissionTime: new Date().toISOString(),
          certUrl: 'https://api.sandbox.paypal.com/certs/1',
          authAlgo: 'SHA256withRSA',
          transmissionSig: 'VALID_MOCK_SIGNATURE',
        },
        webhookPayload,
        db,
        mockClient
      );

      expect(result.processed).toBe(true);
      const row = db.prepare('SELECT status, reissue_authorization_state FROM paypal_payout_items WHERE sender_item_id = ?').get('cyc_pp_01_item_returned') as {
        status: string;
        reissue_authorization_state: string;
      };
      expect(row.status).toBe('RETURNED');
      expect(row.reissue_authorization_state).toBe('PARENT_TERMINAL_CONFIRMED');
    });
  });

  // =========================================================================
  // 5. REST API END-TO-END INTEGRATION FOR SETTLEMENT & WEBHOOKS
  // =========================================================================
  describe('E. REST API Integration Endpoints', () => {
    it('18. POST /api/settlement/:cycleId/orders creates debtor order via operator endpoint', async () => {
      // Setup second cycle
      db.exec(`
        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_api_pp_02', 'FIREWALL_APPROVED');
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type)
        VALUES ('pos_deb_api', 'cyc_api_pp_02', 'debtor_alpha', 0, 4500, -4500, 'NET_DEBTOR');
      `);

      // Unauthenticated call rejected
      await request(app).post('/api/settlement/cyc_api_pp_02/orders').send({ debtorAgentId: 'debtor_alpha' }).expect(401);

      // Authenticated with operator key
      const res = await request(app)
        .post('/api/settlement/cyc_api_pp_02/orders')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ debtorAgentId: 'debtor_alpha' });

      expect(res.status).toBe(201);
      expect(res.body.paypalOrderId).toBeDefined();
      expect(res.body.amountCents).toBe(4500);
      expect(res.body.status).toBe('CREATED');
    });

    it('19. POST /api/settlement/:cycleId/capture captures order via operator endpoint', async () => {
      // Fetch paypal order id
      const order = db.prepare('SELECT paypal_order_id FROM paypal_orders WHERE cycle_id = ?').get('cyc_api_pp_02') as { paypal_order_id: string };

      const res = await request(app)
        .post('/api/settlement/cyc_api_pp_02/capture')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ paypalOrderId: order.paypal_order_id });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.paypalCaptureId).toBeDefined();
    });

    it('20. POST /api/webhooks/paypal verifies and processes incoming webhook via HTTP endpoint', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_http_webhook_01')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'https://api.sandbox.paypal.com/certs/1')
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'VALID_MOCK_SIGNATURE')
        .send({
          id: 'WH-HTTP-EVENT-01',
          event_type: 'PAYMENT.PAYOUTSBATCH.SUCCESS',
          resource: {
            batch_header: { payout_batch_id: 'MOCK-BATCH-API' },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.processed).toBe(true);
      expect(res.body.status).toBe('PROCESSED');
    });

    it('21. POST /api/webhooks/paypal rejects forged webhook with 401', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_http_bad_sig')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'https://api.sandbox.paypal.com/certs/1')
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'INVALID_FORGED_SIGNATURE')
        .send({
          id: 'WH-HTTP-FORGED',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {},
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });
  });
});
