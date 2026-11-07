import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import { MockPayPalClient, assertSandboxEnvironment } from '../../src/paypal/index.js';
import { isTimingSafeEqual } from '../../src/api/auth.js';
import { generateAgentKeyPair } from '../../src/crypto/agent-keys.js';
import { IouService } from '../../src/ious/iou-service.js';
import { LedgerCore } from '../../src/ledger/ledger-core.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const SECURITY_TEST_DB = resolve(process.cwd(), './data/test_stage3c_security.db');
const VALID_OPERATOR_KEY = 'real-secret-operator-key-xyz-123';

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

describe('Stage 3C: Adversarial Security & Penetration Hardening Suite', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: Express;

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = VALID_OPERATOR_KEY;
    process.env.PAYPAL_ENV = 'sandbox';

    const dir = dirname(SECURITY_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(SECURITY_TEST_DB);

    db = new DatabaseManager({ dbPath: SECURITY_TEST_DB });
    db.runMigrations();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(SECURITY_TEST_DB);
  });

  // =========================================================================
  // 1. TIMING-SAFE AUTHENTICATION & SIDE-CHANNEL HARDENING
  // =========================================================================
  describe('A. Timing-Safe Operator Authentication', () => {
    it('1. Correctly validates identical keys in constant time', () => {
      expect(isTimingSafeEqual('secret_key_123', 'secret_key_123')).toBe(true);
    });

    it('2. Correctly rejects mismatched keys of identical length', () => {
      expect(isTimingSafeEqual('secret_key_123', 'secret_key_124')).toBe(false);
    });

    it('3. Correctly rejects mismatched keys of different lengths without leaking length', () => {
      expect(isTimingSafeEqual('short', 'much_longer_secret_key_string')).toBe(false);
    });

    it('4. Rejects unauthenticated request to operator endpoint with 401 UNAUTHORIZED', async () => {
      const res = await request(app).post('/api/recovery/reconcile');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('5. Rejects forged operator key with 403 FORBIDDEN', async () => {
      const res = await request(app)
        .post('/api/recovery/reconcile')
        .set('X-Operator-Key', 'forged-operator-key-attacker');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  // =========================================================================
  // 2. CRYPTOGRAPHIC IOU SIGNATURE TAMPERING & REPLAY
  // =========================================================================
  describe('B. Cryptographic IOU Signature Tampering Defense', () => {
    it('6. Rejects IOU signed by unauthorized private key (attacker impersonating debtor)', () => {
      const realDebtor = generateAgentKeyPair();
      const attacker = generateAgentKeyPair();

      db.exec(`
        INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
        ('agt_real_deb', 'Real Debtor', 'Debtor', '${realDebtor.publicKeyHex}', 'debtor@test.local'),
        ('agt_real_crd', 'Real Creditor', 'Creditor', 'creditor_pub_key_hex', 'creditor@test.local');

        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_sec_01', 'CREATED');
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES ('t_forged_1', 'cyc_sec_01', 'agt_real_deb', 'agt_real_crd', 'Task Forged', 'sha_ref', 10000, 'VERIFIED');
      `);

      // Attacker creates IOU referencing real debtor but signs with attacker's private key
      const forgedIou = IouService.signIou(
        {
          taskId: 't_forged_1',
          cycleId: 'cyc_sec_01',
          debtorAgentId: 'agt_real_deb',
          creditorAgentId: 'agt_real_crd',
          amountCents: 10000,
        },
        attacker.privateKeyHex // Attacker's private key!
      );

      // Verification against debtor's registered public key must FAIL
      expect(() => IouService.recordIou(forgedIou, db)).toThrow(/INVALID_SIGNATURE/);
    });

    it('7. Rejects IOU when payload amount has been tampered with after signing', () => {
      const debtor = generateAgentKeyPair();
      db.exec(`
        INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
        ('agt_tamper_deb', 'Tamper Test Debtor', 'Debtor', '${debtor.publicKeyHex}', 'tamper@test.local');

        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_sec_02', 'CREATED');
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES ('t_tamper_1', 'cyc_sec_02', 'agt_tamper_deb', 'agt_real_crd', 'Task Tamper', 'sha_ref', 500, 'VERIFIED');
      `);

      const validIou = IouService.signIou(
        {
          taskId: 't_tamper_1',
          cycleId: 'cyc_sec_02',
          debtorAgentId: 'agt_tamper_deb',
          creditorAgentId: 'agt_real_crd',
          amountCents: 500, // Debtor signed for $5.00
        },
        debtor.privateKeyHex
      );

      // Tamper amount to $500.00
      (validIou as any).amountCents = 50000;

      expect(() => IouService.recordIou(validIou, db)).toThrow(/CONTEXT_MISMATCH|INVALID_SIGNATURE/);
    });
  });

  // =========================================================================
  // 3. SANDBOX BOUNDARY & WEBHOOK INJECTION DEFENSES
  // =========================================================================
  describe('C. Sandbox Guard & Webhook Injection Defenses', () => {
    it('8. Fails closed against all production URL spoofing attempts', () => {
      expect(() => assertSandboxEnvironment({ environment: 'production' as any })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api.paypal.com' })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://api-m.paypal.com' })).toThrow(/FATAL_SAFETY_VIOLATION/);
      expect(() => assertSandboxEnvironment({ apiBase: 'https://attacker.paypal.com.evil.org' })).toThrow(/FATAL_SAFETY_VIOLATION/);
    });

    it('9. Rejects forged webhook with missing or malicious signature headers', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_sec_01')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'https://api.sandbox.paypal.com/certs/1')
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'INVALID_FORGED_SIGNATURE')
        .send({
          id: 'WH-INJECT-01',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {},
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('10. Rejects webhook targeting malicious external certificate URL (SSRF prevention)', async () => {
      const res = await request(app)
        .post('/api/webhooks/paypal')
        .set('paypal-transmission-id', 'trans_sec_02')
        .set('paypal-transmission-time', new Date().toISOString())
        .set('paypal-cert-url', 'https://169.254.169.254/latest/meta-data') // Cloud metadata endpoint
        .set('paypal-auth-algo', 'SHA256withRSA')
        .set('paypal-transmission-sig', 'VALID_MOCK_SIGNATURE')
        .send({
          id: 'WH-SSRF-01',
          event_type: 'PAYMENT.CAPTURE.COMPLETED',
          resource: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('INVALID_CERT_URL');
    });
  });

  // =========================================================================
  // 4. LEDGER MATHEMATICAL INVARIANTS UNDER ADVERSARIAL ACTIONS
  // =========================================================================
  describe('D. Mathematical Accounting Invariants', () => {
    it('11. Rejects negative capital cure amount with HTTP 400', async () => {
      const res = await request(app)
        .post('/api/recovery/cure')
        .set('X-Operator-Key', VALID_OPERATOR_KEY)
        .send({
          cycleId: 'cyc_sec_cure',
          amountCents: -5000, // Negative amount attack!
        });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toContain('INVALID_CURE_AMOUNT');
    });

    it('12. Subledger trial balance remains strictly balanced (Debits === Credits)', () => {
      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
      expect(trial.totalVolumeCents).toBeGreaterThanOrEqual(0);
    });
  });
});
