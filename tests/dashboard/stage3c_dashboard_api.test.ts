import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import { MockPayPalClient } from '../../src/paypal/index.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const DASHBOARD_TEST_DB = resolve(process.cwd(), './data/test_stage3c_dashboard.db');

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

describe('Stage 3C: Operator Dashboard UI & Frontend APIs (Workstream O)', () => {
  let db: DatabaseManager;
  let mockClient: MockPayPalClient;
  let app: Express;

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = 'test-dash-key';
    process.env.PAYPAL_ENV = 'sandbox';

    const dir = dirname(DASHBOARD_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(DASHBOARD_TEST_DB);

    db = new DatabaseManager({ dbPath: DASHBOARD_TEST_DB });
    db.runMigrations();

    mockClient = new MockPayPalClient();
    app = createApp({ db, paypalClient: mockClient });

    // Seed dummy cycle and ledger data
    db.exec(`
      INSERT INTO settlement_cycles (cycle_id, status, gross_volume_cents, net_volume_cents, compression_ratio)
      VALUES ('cyc_dash_01', 'FIREWALL_APPROVED', 13000, 4500, 0.6538);

      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
      VALUES ('agt_dash_01', 'Research Alpha', 'Debtor', 'pubkey_hex_123', 'alpha@dash.local');

      INSERT INTO compensating_ledger (entry_id, cycle_id, debit_account, credit_account, amount_cents, reason)
      VALUES ('comp_dash_01', 'cyc_dash_01', 'ASSET:PAYPAL_SETTLEMENT_CASH', 'LIABILITY:CREDITOR_PAYABLE:agt_dash_01', 4500, 'TEST_ENTRY');
    `);
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(DASHBOARD_TEST_DB);
  });

  it('1. GET / renders single-page dashboard HTML with 200 OK', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('TALLY NEXUS');
    expect(res.text).toContain('Executive Overview');
    expect(res.text).toContain('PayPal Sandbox');
  });

  it('2. GET /dashboard renders single-page dashboard HTML with 200 OK', async () => {
    const res = await request(app).get('/dashboard');
    expect(res.status).toBe(200);
    expect(res.header['content-type']).toContain('text/html');
    expect(res.text).toContain('TALLY NEXUS');
    expect(res.text).toContain('Live Event Stream');
  });

  it('3. GET /api/dashboard/stats returns authoritative metrics without mocked data', async () => {
    const res = await request(app).get('/api/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.totalGrossVolumeCents).toBe(13000);
    expect(res.body.totalNetVolumeCents).toBe(4500);
    expect(res.body.overallCompressionRatio).toBe(0.6538);
    expect(res.body.totalAgentsCount).toBe(1);
    expect(res.body.activeCyclesCount).toBe(1);
    expect(res.body.trialBalance).toBeDefined();
    expect(res.body.trialBalance.balanced).toBe(true);
  });

  it('4. GET /api/ledger/entries returns double-entry subledger records', async () => {
    const res = await request(app).get('/api/ledger/entries');
    expect(res.status).toBe(200);
    expect(res.body.entries).toBeDefined();
    expect(res.body.entries.length).toBeGreaterThanOrEqual(1);
    expect(res.body.entries[0].cycleId).toBe('cyc_dash_01');
    expect(res.body.entries[0].debitAccount).toBe('ASSET:PAYPAL_SETTLEMENT_CASH');
  });

  it('5. GET /api/recovery/items returns items and child reissues list', async () => {
    const res = await request(app).get('/api/recovery/items');
    expect(res.status).toBe(200);
    expect(res.body.items).toBeDefined();
    expect(res.body.reissues).toBeDefined();
  });
});
