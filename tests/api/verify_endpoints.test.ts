import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/api/app.js';
import { DatabaseManager } from '../../src/db/index.js';
import { MockPayPalClient } from '../../src/paypal/index.js';

describe('Authoritative PayPal Verification Endpoints (Read-Only, Rate-Limited)', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: any;

  beforeEach(async () => {
    db = new DatabaseManager({ dbPath: ':memory:' });
    db.runMigrations();
    db.prepare(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
      VALUES ('agent_debtor', 'Debtor Agent', 'Consortium Debtor', 'ed25519_pk_test_debtor', 'debtor@test.com')
    `).run();
    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });
  });

  afterEach(() => {
    db.close();
  });

  it('1. GET /api/health exposes environment classification and target endpoint', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
    expect(res.body.environment).toBeDefined();
    expect(res.body.targetEndpoint).toContain('paypal.com');
  });

  it('2. GET /api/verify/capture/:id rejects invalid ID format with 400', async () => {
    const res = await request(app).get('/api/verify/capture/bad!id$');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
  });

  it('3. GET /api/verify/capture/:id returns authoritative verification for created order/capture', async () => {
    // Record cycle and order in DB
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_test_001', 'COLLECTION_PENDING')").run();

    const order = await mockClient.createOrder({
      idempotencyKey: 'idemp_test_cap',
      amountCents: 100,
      customId: 'cyc_test_001:anchor_abc123',
      description: 'Test Verification',
    });
    const captured = await mockClient.captureOrder(order.id, 'cap_key_1');

    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_int_1', ?, 'cyc_test_001', 'agent_debtor', 100, 'COMPLETED', 'idemp_test_cap', ?)
    `).run(order.id, captured.captureId);

    const res = await request(app).get(`/api/verify/capture/${captured.captureId}`);
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('VERIFIED_ON_PAYPAL_SANDBOX');
    expect(res.body.classification).toBe('SIMULATION_MOCK');
    expect(res.body.providerStatus).toBe('COMPLETED');
    expect(res.body.customId).toBe('cyc_test_001:anchor_abc123');
    expect(res.body.merkleAnchor).toBe('abc123');
    expect(res.body.readOnlyProof).toBe(true);
  });

  it('4. GET /api/verify/payout/:batchId returns batch status and item array', async () => {
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_test_002', 'DISPATCHED')").run();

    const payout = await mockClient.createPayoutBatch({
      senderBatchId: 'batch_test_001',
      emailSubject: 'Test Settlement',
      items: [
        { senderItemId: 'item_1', amountCents: 50, receiverEmail: 'user1@test.com' },
        { senderItemId: 'item_2', amountCents: 50, receiverEmail: 'user2@test.com' },
      ],
    });

    db.prepare(`
      INSERT INTO paypal_payouts (payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents)
      VALUES ('payout_int_1', ?, 'cyc_test_002', 'batch_test_001', 'PENDING', 100)
    `).run(payout.payoutBatchId);

    const res = await request(app).get(`/api/verify/payout/${payout.payoutBatchId}`);
    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('VERIFIED_ON_PAYPAL_SANDBOX');
    expect(res.body.batchHeader).toBeDefined();
    expect(res.body.batchHeader.batchStatus).toBe('PENDING');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.readOnlyProof).toBe(true);
  });

  it('5. GET /api/verify/capture/:id blocks arbitrary unauthorized IDs with 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/verify/capture/unauthorizedRandomCaptureId123');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not authorized');
  });

  it('6. GET /api/verify/payout/:batchId blocks arbitrary unauthorized batch IDs with 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/verify/payout/unauthorizedRandomBatchId123');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('not authorized');
  });

  it('7. GET /api/verify/capture/:id enforces rate limiting when request limit is exceeded', async () => {
    // Insert a valid order so it doesn't fail at allowlist check
    db.prepare("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_rate_limit', 'CAPTURED')").run();
    db.prepare(`
      INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, paypal_capture_id)
      VALUES ('ord_rate_1', 'orderRate123', 'cyc_rate_limit', 'agent_debtor', 100, 'COMPLETED', 'idemp_rate', 'validCapture123')
    `).run();

    // Send 31 requests quickly from the same client IP
    let lastStatus = 200;
    for (let i = 0; i < 32; i++) {
      const res = await request(app).get('/api/verify/capture/validCapture123');
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect(lastStatus).toBe(429);
  });
});

