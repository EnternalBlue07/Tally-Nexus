import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PayPalSandboxClient } from '../../src/paypal/paypal-client.js';

describe('PayPalSandboxClient HTTP Protocol Unit Suite (Mocked Fetch)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('1. Caches OAuth2 access token and reuses it before expiration', async () => {
    let fetchCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCount++;
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_bearer_token_123', expires_in: 3600 }),
        } as any;
      }
      if (url.includes('/v2/checkout/orders')) {
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: 'ORDER-123', status: 'CREATED', links: [{ rel: 'approve', href: 'https://paypal.local/approve' }] }),
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'test_client',
      clientSecret: 'test_secret',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    // First call -> fetches token + creates order
    await client.createOrder({
      idempotencyKey: 'idemp_1',
      amountCents: 5000,
      customId: 'cyc_1',
      description: 'Order 1',
    });
    expect(fetchCount).toBe(2); // Token + Order

    // Second call -> reuses cached token
    await client.createOrder({
      idempotencyKey: 'idemp_2',
      amountCents: 3000,
      customId: 'cyc_1',
      description: 'Order 2',
    });
    expect(fetchCount).toBe(3); // Only Order (Token cached!)
  });

  it('2. Captures order via POST /v2/checkout/orders/{id}/capture', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_token', expires_in: 3600 }),
        } as any;
      }
      if (url.includes('/capture')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'ORDER-CAP-1',
            status: 'COMPLETED',
            purchase_units: [{ payments: { captures: [{ id: 'CAP-REAL-123', status: 'COMPLETED' }] } }],
          }),
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'c',
      clientSecret: 's',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    const res = await client.captureOrder('ORDER-CAP-1', 'cap_idemp_key');
    expect(res.status).toBe('COMPLETED');
    expect(res.captureId).toBe('CAP-REAL-123');
  });

  it('3. Creates Payout Batch and formats amount as decimal string', async () => {
    let capturedBody: any;

    globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_token', expires_in: 3600 }),
        } as any;
      }
      if (url.includes('/v1/payments/payouts')) {
        capturedBody = JSON.parse(init?.body as string);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            batch_header: {
              payout_batch_id: 'PAYOUT-BATCH-777',
              batch_status: 'PENDING',
              sender_batch_header: { sender_batch_id: 'batch_idemp_1' },
            },
          }),
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'c',
      clientSecret: 's',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    const res = await client.createPayoutBatch({
      senderBatchId: 'batch_idemp_1',
      emailSubject: 'Nexus Payout',
      items: [{ senderItemId: 'item_1', amountCents: 2550, receiverEmail: 'rec@test.local' }],
    });

    expect(res.payoutBatchId).toBe('PAYOUT-BATCH-777');
    expect(res.batchStatus).toBe('PENDING');
    expect(capturedBody.items[0].amount.value).toBe('25.50'); // 2550c -> "25.50"
  });

  it('4. Queries Payout Batch and Item status', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_token', expires_in: 3600 }),
        } as any;
      }
      if (url.includes('/v1/payments/payouts-item/ITEM-01')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            payout_item_id: 'ITEM-01',
            payout_item: { sender_item_id: 's_item_1', amount: { value: '25.50' } },
            transaction_status: 'SUCCESS',
            payout_item_fee: { value: '0.25' },
            transaction_id: 'TXN-999',
          }),
        } as any;
      }
      if (url.includes('/v1/payments/payouts/BATCH-01')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            batch_header: { payout_batch_id: 'BATCH-01', batch_status: 'SUCCESS' },
            items: [{ payout_item_id: 'ITEM-01', sender_item_id: 's_item_1', transaction_status: 'SUCCESS' }],
          }),
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'c',
      clientSecret: 's',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    const batchRes = await client.getPayoutBatchStatus('BATCH-01');
    expect(batchRes.batchStatus).toBe('SUCCESS');
    expect(batchRes.items?.length).toBe(1);

    const itemRes = await client.getPayoutItemStatus('ITEM-01');
    expect(itemRes.status).toBe('SUCCESS');
    expect(itemRes.amountCents).toBe(2550);
    expect(itemRes.feeCents).toBe(25);
    expect(itemRes.transactionId).toBe('TXN-999');
  });

  it('5. Verifies webhook signature against official PayPal verification endpoint', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ access_token: 'mock_token', expires_in: 3600 }),
        } as any;
      }
      if (url.includes('/verify-webhook-signature')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ verification_status: 'SUCCESS' }),
        } as any;
      }
      return { ok: false, status: 404, text: async () => 'Not found' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'c',
      clientSecret: 's',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    const res = await client.verifyWebhookSignature({
      authAlgo: 'SHA256withRSA',
      certUrl: 'https://api.sandbox.paypal.com/certs/1',
      transmissionId: 'trans_1',
      transmissionSig: 'sig_1',
      transmissionTime: 'time_1',
      webhookId: 'wh_1',
      webhookEvent: { event_type: 'PAYMENT.CAPTURE.COMPLETED' },
    });

    expect(res.verification_status).toBe('SUCCESS');
  });

  it('6. Throws descriptive error when PayPal API returns error status', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/v1/oauth2/token')) {
        return {
          ok: false,
          status: 401,
          text: async () => '{"error":"invalid_client"}',
        } as any;
      }
      return { ok: false, status: 500, text: async () => 'Server error' } as any;
    });

    const client = new PayPalSandboxClient({
      clientId: 'bad_c',
      clientSecret: 'bad_s',
      apiBase: 'https://api-m.sandbox.paypal.com',
      environment: 'sandbox',
    });

    await expect(
      client.createOrder({
        idempotencyKey: 'idemp',
        amountCents: 1000,
        customId: 'cyc',
        description: 'test',
      })
    ).rejects.toThrow(/PAYPAL_AUTH_FAILED/);
  });
});
