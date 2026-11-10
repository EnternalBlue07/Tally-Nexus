import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app.js';
import { DatabaseManager } from '../../src/db/index.js';
import { MockPayPalClient, IPayPalClient } from '../../src/paypal/index.js';
import { runFlagshipDemo } from '../../src/demo/flagship-runner.js';
import { LlmJudgeService, TaskEvaluationContext } from '../../src/judge/index.js';

describe('Cross-System Evidence Integrity & Authoritative Verification Suite', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: any;

  beforeEach(() => {
    db = new DatabaseManager({ dbPath: ':memory:' });
    db.runMigrations();

    // Register test debtor & creditor agents
    db.prepare(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
      VALUES 
        ('agent_debtor_test', 'Debtor Agent', 'Debtor', 'pk_debtor_ed25519_test_0000000000000000000000000000000000000000001', 'debtor@test.local'),
        ('agent_creditor_test', 'Creditor Agent', 'Creditor', 'pk_creditor_ed25519_test_000000000000000000000000000000000000000002', 'creditor@test.local')
    `).run();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });
  });

  afterEach(() => {
    db.close();
  });

  // 1. AI Provider Success + Foreign Key Resolution
  it('1. AI Provider Adjudication: Atomic parent-child record insertion creates required relations without FK failure', async () => {
    const context: TaskEvaluationContext = {
      taskId: 'task_fk_test_001',
      cycleId: 'cyc_fk_test_001',
      debtorAgentId: 'agent_debtor_test',
      creditorAgentId: 'agent_creditor_test',
      title: 'FK Verification Adjudication Task',
      amountCents: 5000,
      deliverableEvidence: {
        recordsProcessed: 1000,
        benchmarkScore: 0.99,
        latencyAverageMs: 85,
        schemaValidationPassed: true,
      },
      contractTerms: {
        contractRef: 'sla_contract_fk_v1',
        expectedDeliverableType: 'STRUCTURED_FINANCIAL_SENTIMENT',
        maxCreditBps: 10000,
      },
    };

    const result = await LlmJudgeService.evaluateTask(context, db);
    expect(result).toBeDefined();
    expect(result.taskId).toBe('task_fk_test_001');

    // Confirm settlement_cycle exists
    const cycle = db.prepare('SELECT cycle_id, status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_fk_test_001') as any;
    expect(cycle).toBeDefined();
    expect(cycle.cycle_id).toBe('cyc_fk_test_001');

    // Confirm task exists in tasks table
    const task = db.prepare('SELECT task_id, cycle_id, status FROM tasks WHERE task_id = ?').get('task_fk_test_001') as any;
    expect(task).toBeDefined();
    expect(task.status).toBe('SUBMITTED');

    // Confirm system_events outbox entry exists with valid cycle_id reference
    const ev = db.prepare("SELECT * FROM system_events WHERE event_type = 'AI_SLA_EVALUATED' AND cycle_id = ?").get('cyc_fk_test_001') as any;
    expect(ev).toBeDefined();
    const payload = JSON.parse(ev.payload_json);
    expect(payload.taskId).toBe('task_fk_test_001');
  });

  // 2. AI Provider Success + Formal Verdict Persistence via REST
  it('2. POST /api/judge/evaluate persists task and task_verdicts in strict FK order', async () => {
    const res = await request(app)
      .post('/api/judge/evaluate')
      .send({
        taskId: 'task_rest_ai_001',
        cycleId: 'cyc_rest_ai_001',
        debtorAgentId: 'agent_debtor_test',
        creditorAgentId: 'agent_creditor_test',
        amountCents: 5000,
      });

    expect(res.status).toBe(200);
    expect(res.body.validatedVerdict).toBeDefined();

    // Verify task_verdicts entry exists
    const verdict = db.prepare('SELECT * FROM task_verdicts WHERE task_id = ?').get('task_rest_ai_001') as any;
    expect(verdict).toBeDefined();
    expect(verdict.evaluator_type).toBe('LLM_JUDGE');

    // Verify task status transitioned
    const task = db.prepare('SELECT status FROM tasks WHERE task_id = ?').get('task_rest_ai_001') as any;
    expect(['VERIFIED', 'REJECTED', 'SUBMITTED']).toContain(task.status);
  });

  // 3. PayPal capture verified successfully
  it('3. Authoritative Verification: Successfully captures and verifies live transaction', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_ver_001', 'COLLECTION_PENDING')").run();

    const order = await mockClient.createOrder({
      idempotencyKey: 'idemp_cap_v3',
      amountCents: 4500,
      customId: 'cyc_ver_001:anchor_merkle_001',
      description: 'Clearing Settlement Capture',
    });
    const captured = await mockClient.captureOrder(order.id, 'cap_key_v3');

    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_v3', ?, 'cyc_ver_001', 'agent_debtor_test', 4500, 'COMPLETED', 'idemp_cap_v3', ?)
    `).run(order.id, captured.captureId);

    const res = await request(app).get(`/api/verify/capture/${captured.captureId}`);
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('VERIFIED_ON_PAYPAL_SANDBOX');
    expect(res.body.providerVerificationStatus).toBe('PROVIDER_VERIFIED');
    expect(res.body.localRecordStatus).toBe('LOCAL_RECORD_FOUND');
    expect(res.body.isSimulatedRecord).toBe(false);
    expect(res.body.amountMatched).toBe(true);
    expect(res.body.merkleAnchor).toBe('merkle_001');
  });

  // 4. PayPal RESOURCE_NOT_FOUND on simulated record
  it('4. Simulated Records: Returns LOCAL_RECORD_FOUND with NOT_FOUND provider status for simulated capture IDs', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_sim_001', 'COLLECTION_PENDING')").run();
    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_sim_01', 'ORD-SIM-999', 'cyc_sim_001', 'agent_debtor_test', 4500, 'COMPLETED', 'idemp_sim', 'CAP-33AD6CA3-911')
    `).run();

    const res = await request(app).get('/api/verify/capture/CAP-33AD6CA3-911');
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('LOCAL_RECORD_FOUND');
    expect(res.body.providerVerificationStatus).toBe('PROVIDER_NOT_FOUND');
    expect(res.body.providerStatus).toBe('NOT_FOUND');
    expect(res.body.localRecordStatus).toBe('LOCAL_RECORD_FOUND');
    expect(res.body.isSimulatedRecord).toBe(true);
    expect(res.body.notice).toContain('Simulated Record');
  });

  // 5. PayPal incorrect identifier type: Order ID passed to capture endpoint
  it('5. Identifier Type Detection: Accurately identifies when an Order ID is passed where a Capture ID was expected', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_ord_fallback', 'COLLECTION_PENDING')").run();

    const order = await mockClient.createOrder({
      idempotencyKey: 'idemp_ord_fallback',
      amountCents: 2000,
      customId: 'cyc_ord_fallback:anchor_ord_01',
    });

    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_fall_1', ?, 'cyc_ord_fallback', 'agent_debtor_test', 2000, 'CREATED', 'idemp_ord_fallback', NULL)
    `).run(order.id);

    const res = await request(app).get(`/api/verify/capture/${order.id}`);
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('ORDER');
    expect(res.body.notice).toContain('PayPal Order resource');
  });

  // 6. Capture ID vs Order ID distinction
  it('6. Resource Type Distinction: Confirms resourceType is CAPTURE for finalized captures', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_res_type', 'COLLECTION_PENDING')").run();

    const order = await mockClient.createOrder({
      idempotencyKey: 'idemp_res_type',
      amountCents: 3000,
      customId: 'cyc_res_type',
    });
    const captured = await mockClient.captureOrder(order.id, 'cap_res_type');

    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_res_1', ?, 'cyc_res_type', 'agent_debtor_test', 3000, 'COMPLETED', 'idemp_res_type', ?)
    `).run(order.id, captured.captureId);

    const res = await request(app).get(`/api/verify/capture/${captured.captureId}`);
    expect(res.status).toBe(200);
    expect(res.body.resourceType).toBe('CAPTURE');
  });

  // 7. Amount / currency mismatch detection
  it('7. Evidence Mismatch Detection: Detects discrepancy between local DB recorded amount and provider reported amount', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_mismatch', 'COLLECTION_PENDING')").run();

    // Client creates order for $10.00
    const order = await mockClient.createOrder({
      idempotencyKey: 'idemp_mismatch',
      amountCents: 1000,
      customId: 'cyc_mismatch',
    });
    const captured = await mockClient.captureOrder(order.id, 'cap_mismatch');

    // But local database records $50.00 (tampered/mismatched record)
    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_tampered', ?, 'cyc_mismatch', 'agent_debtor_test', 5000, 'COMPLETED', 'idemp_mismatch', ?)
    `).run(order.id, captured.captureId);

    const res = await request(app).get(`/api/verify/capture/${captured.captureId}`);
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('EVIDENCE_MISMATCH');
    expect(res.body.amountMatched).toBe(false);
    expect(res.body.notice).toContain('Amount mismatch detected');
  });

  // 8. Local DB record exists + provider resource missing returns LOCAL_RECORD_FOUND
  it('8. Local DB Existence Separation: Database record presence does NOT produce a false PROVIDER_VERIFIED status', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_sep_01', 'COLLECTION_PENDING')").run();
    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_sep_1', 'ORD-NON-EXISTENT', 'cyc_sep_01', 'agent_debtor_test', 1500, 'COMPLETED', 'idemp_sep', 'CAP-GHOST-RECORD-99')
    `).run();

    const res = await request(app).get('/api/verify/capture/CAP-GHOST-RECORD-99');
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).not.toBe('VERIFIED_ON_PAYPAL_SANDBOX');
    expect(res.body.verificationStatus).toBe('LOCAL_RECORD_FOUND');
    expect(res.body.providerStatus).toBe('NOT_FOUND');
  });

  // 9. Provider API unavailable / 500 returns PROVIDER_ERROR
  it('9. Provider Error Handling: Returns PROVIDER_ERROR when PayPal client returns 500 server error', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_err_01', 'COLLECTION_PENDING')").run();
    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_err_1', 'ORD-ERR-500', 'cyc_err_01', 'agent_debtor_test', 1000, 'COMPLETED', 'idemp_err', 'CAP-ERR-500')
    `).run();

    // Mock client returning 500
    const errClient: IPayPalClient = {
      createOrder: async () => ({ id: 'err', status: 'ERROR', approvalUrl: '' }),
      captureOrder: async () => ({ captureId: 'err', status: 'ERROR' }),
      createPayoutBatch: async () => ({ payoutBatchId: 'err', batchStatus: 'ERROR' }),
      getPayoutBatch: async () => ({ payoutBatchId: 'err', batchStatus: 'ERROR', items: [] }),
      verifyWebhookSignature: async () => ({ isValid: false }),
      getCapture: async () => ({ httpStatus: 500, status: 'INTERNAL_SERVER_ERROR', debugId: 'err_dbg', data: {} }),
      getOrder: async () => ({ httpStatus: 500, status: 'INTERNAL_SERVER_ERROR', debugId: 'err_dbg', data: {} }),
      getPayoutBatchRaw: async () => ({ httpStatus: 500, status: 'INTERNAL_SERVER_ERROR', debugId: 'err_dbg', data: {} }),
    };

    const errApp = createApp({ db, paypalClient: errClient });
    const res = await request(errApp).get('/api/verify/capture/CAP-ERR-500');

    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('PROVIDER_ERROR');
    expect(res.body.providerVerificationStatus).toBe('PROVIDER_ERROR');
  });

  // 10. Provider pending transaction returns PROVIDER_PENDING
  it('10. Pending State Resolution: Identifies pending payout batch status', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_pnd_01', 'DISPATCHED')").run();

    const payout = await mockClient.createPayoutBatch({
      senderBatchId: 'batch_pnd_01',
      emailSubject: 'Pending Settlement',
      items: [{ senderItemId: 'it_1', amountCents: 100, receiverEmail: 'ag@test.com' }],
    });

    db.prepare(`
      INSERT INTO paypal_payouts (payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents)
      VALUES ('po_pnd_1', ?, 'cyc_pnd_01', 'batch_pnd_01', 'PENDING', 100)
    `).run(payout.payoutBatchId);

    const res = await request(app).get(`/api/verify/payout/${payout.payoutBatchId}`);
    expect(res.status).toBe(200);
    expect(res.body.batchHeader.batchStatus).toBe('PENDING');
  });

  // 11. Invalid payout batch identifier format rejected with 400
  it('11. Input Validation: Rejects malformed or malicious identifiers with 400 INVALID_IDENTIFIER', async () => {
    const res1 = await request(app).get('/api/verify/capture/bad!id$');
    expect(res1.status).toBe(400);
    expect(res1.body.error.code).toBe('INVALID_IDENTIFIER');

    const res2 = await request(app).get('/api/verify/payout/bad!batch$');
    expect(res2.status).toBe(400);
    expect(res2.body.error.code).toBe('INVALID_IDENTIFIER');
  });

  // 12. Canonical verified evidence retrieval
  it('12. Stored Canonical Verification: Resolves verified capture 7PV82720RX415822V from canonical evidence', async () => {
    const res = await request(app).get('/api/verify/capture/7PV82720RX415822V');
    expect(res.status).toBe(200);
    expect(res.body.storedEvidenceMatched).toBe(true);
    expect(res.body.paypalDebugId).toBeDefined();
    expect(res.body.readOnlyProof).toBe(true);
  });

  // 13. Failed verification blocks unauthorized arbitrary identifiers
  it('13. Security Allowlist: Rejects arbitrary unrecorded identifiers with 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/verify/capture/RandomUnrecordedIdentifier123');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not authorized');
  });

  // 14. Existing flagship demo remains fully functional
  it('14. Flagship Preservation: Full 5-agent consortium flagship lifecycle executes successfully', async () => {
    const demoResult = await runFlagshipDemo(db, mockClient);
    expect(demoResult).toBeDefined();
    expect(demoResult.cycleId).toBeDefined();
    expect(demoResult.grossVolumeCents).toBe(13000);
    expect(demoResult.nettingSummary.zeroSumAsserted).toBe(true);
    expect(demoResult.ledgerProof.balanced).toBe(true);
    expect(demoResult.ledgerProof.netVarianceCents).toBe(0);
  });

  // 15. PRAGMA foreign_key_check returns 0 violations
  it('15. Cryptographic & Referential Integrity: PRAGMA foreign_key_check returns zero violations', async () => {
    // Run flagship demo and AI judge evaluations in the same database
    await runFlagshipDemo(db, mockClient);

    await LlmJudgeService.evaluateTask(
      {
        taskId: 'task_integrity_01',
        cycleId: 'cyc_integrity_01',
        debtorAgentId: 'agent_debtor_test',
        creditorAgentId: 'agent_creditor_test',
        title: 'Integrity Check Adjudication',
        amountCents: 1000,
        deliverableEvidence: { valid: true },
        contractTerms: { contractRef: 'sla_integrity' },
      },
      db
    );

    const fkCheck = db.prepare('PRAGMA foreign_key_check').all();
    expect(fkCheck).toEqual([]);
    expect(fkCheck.length).toBe(0);
  });
});
