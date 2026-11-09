import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import { AiJudgeQuotaManager } from '../../src/api/security.js';

describe('Priority 2: Public Demo Mode & System Security Matrix', () => {
  let db: DatabaseManager;
  let app: ReturnType<typeof createApp>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    db = new DatabaseManager({ dbPath: ':memory:' });
    db.runMigrations();
    app = createApp(db);
    AiJudgeQuotaManager.resetForTesting();
  });

  afterEach(() => {
    process.env = originalEnv;
    db.close();
  });

  describe('1. Money-Moving Route Protection under PUBLIC_DEMO_MODE', () => {
    const mockAuthKey = ['test', 'operator', 'mock', 'auth', 'val'].join('_');

    beforeEach(() => {
      process.env.PUBLIC_DEMO_MODE = 'true';
      process.env.OPERATOR_API_KEY = mockAuthKey;
    });

    it('blocks anonymous access to order creation with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/settlement/cyc_demo_01/orders')
        .send({ debtorAgentId: 'agent_debtor' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Missing operator authentication key');
    });

    it('blocks anonymous access to order capture with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/settlement/cyc_demo_01/capture')
        .send({ paypalOrderId: 'order_123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks anonymous access to payouts dispatch with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/settlement/cyc_demo_01/payouts');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks anonymous access to recovery reissue with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/recovery/items/item_demo_01/reissue')
        .send({ receiverEmail: 'creditor@test.com' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('blocks anonymous access to recovery cure with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/recovery/cure')
        .send({ cycleId: 'cyc_01', amountCents: 5000 });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects invalid operator credentials with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/settlement/cyc_demo_01/orders')
        .set('X-Operator-Key', 'invalid-attacker-key')
        .send({ debtorAgentId: 'agent_debtor' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('locks financial routes in PUBLIC_DEMO_MODE if server only has default dev key', async () => {
      delete process.env.OPERATOR_API_KEY; // Only default dev key remains
      const res = await request(app)
        .post('/api/settlement/cyc_demo_01/orders')
        .set('X-Operator-Key', 'nexus-dev-operator-key')
        .send({ debtorAgentId: 'agent_debtor' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PUBLIC_DEMO_MODE_LOCKED');
    });

    it('allows financial execution when valid operator token is presented', async () => {
      // Valid operator key passes the authentication middleware
      const res = await request(app)
        .post('/api/settlement/cyc_nonexistent/orders')
        .set('X-Operator-Key', mockAuthKey)
        .send({ debtorAgentId: 'agent_debtor' });

      // Reaches service logic (returns 404 because cycle doesn't exist, proving auth passed)
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('2. AI Judge Rate Limiting, Concurrency & Stored Evidence Fallback', () => {
    it('serves stored canonical evidence when AI request quota per IP is exceeded', async () => {
      // Consume up to per-IP limit (5 allowed)
      for (let i = 0; i < AiJudgeQuotaManager.MAX_PER_IP_PER_MIN; i++) {
        AiJudgeQuotaManager.checkQuota('127.0.0.1');
      }

      // Next call exceeds IP rate limit
      const res = await request(app).post('/api/judge/evaluate').send({});

      expect(res.status).toBe(200);
      expect(res.body.classification).toBe('STORED_RUN');
      expect(res.body.rateLimited).toBe(true);
      expect(res.body.notice).toContain('quota or rate limit reached');
      expect(res.body.data).toBeDefined();
    });

    it('serves stored canonical evidence when global daily cap is reached', async () => {
      // Simulate exhausting daily cap
      for (let i = 0; i < AiJudgeQuotaManager.MAX_DAILY_LIVE_CALLS; i++) {
        AiJudgeQuotaManager.incrementActive();
      }

      const res = await request(app).post('/api/judge/evaluate').send({});

      expect(res.status).toBe(200);
      expect(res.body.classification).toBe('STORED_RUN');
      expect(res.body.rateLimited).toBe(true);
      expect(res.body.reason).toBe('DAILY_CAP_EXCEEDED');
    });
  });

  describe('3. Verification Endpoint Allowlist & Path Traversal Guards', () => {
    it('rejects unauthorized capture IDs with 404 NOT_FOUND', async () => {
      const res = await request(app).get('/api/verify/capture/UNAUTHORIZED_ID_123456');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('not authorized');
    });

    it('blocks path traversal attempts with 400 INVALID_IDENTIFIER', async () => {
      const res = await request(app).get('/api/verify/capture/..%2F..%2Fetc%2Fpasswd');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    it('blocks path traversal attempts in payout batch lookups', async () => {
      const res = await request(app).get('/api/verify/payout/..%2F..%2Fsecrets.json');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_IDENTIFIER');
    });

    it('verifies known canonical capture ID successfully from stored evidence', async () => {
      // Known capture ID from canonical evidence
      const res = await request(app).get('/api/verify/capture/7PV82720RX415822V');
      expect(res.status).toBe(200);
      expect(res.body.identifier).toBe('7PV82720RX415822V');
      expect(res.body.readOnlyProof).toBe(true);
    });
  });

  describe('4. Secret Hygiene & Information Disclosure Resistance', () => {
    it('never exposes API keys or secrets in /health and /api/health responses', async () => {
      process.env.OPERATOR_API_KEY = 'super-secret-operator-key-999';
      process.env.PAYPAL_CLIENT_SECRET = 'super-secret-paypal-secret-999';
      process.env.FREEMODEL_API_KEY = 'fm_super_secret_freemodel_key_999';

      const resRoot = await request(app).get('/health');
      const resApi = await request(app).get('/api/health');

      const bodyRoot = JSON.stringify(resRoot.body);
      const bodyApi = JSON.stringify(resApi.body);

      expect(bodyRoot).not.toContain('super-secret-operator-key-999');
      expect(bodyRoot).not.toContain('super-secret-paypal-secret-999');
      expect(bodyRoot).not.toContain('fm_super_secret_freemodel_key_999');

      expect(bodyApi).not.toContain('super-secret-operator-key-999');
      expect(bodyApi).not.toContain('super-secret-paypal-secret-999');
      expect(bodyApi).not.toContain('fm_super_secret_freemodel_key_999');
    });
  });
});
