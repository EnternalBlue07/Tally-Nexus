import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseManager } from '../../src/db/index.js';
import { MockPayPalClient } from '../../src/paypal/index.js';
import { runFlagshipDemo } from '../../src/demo/flagship-runner.js';
import request from 'supertest';
import { createApp } from '../../src/api/app.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const TEST_DB = './data/test_stage4_e2e.db';

function cleanup(f: string) {
  for (const path of [f, `${f}-wal`, `${f}-shm`]) {
    if (existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {
        // Ignored
      }
    }
  }
}

describe('Stage 4: Flagship End-to-End Sandbox Simulation Suite', () => {
  let db: DatabaseManager;
  let client: MockPayPalClient;

  beforeAll(() => {
    const dir = dirname(TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanup(TEST_DB);

    db = new DatabaseManager({ dbPath: TEST_DB });
    db.runMigrations();
    client = new MockPayPalClient();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    cleanup(TEST_DB);
  });

  it('1. Executes full 5-agent consortium flagship lifecycle successfully', async () => {
    const result = await runFlagshipDemo(db, client);

    expect(result.success).toBe(true);
    expect(result.grossVolumeCents).toBe(13000); // $130.00
    expect(result.netVolumeCents).toBe(4500);    // $45.00
    expect(result.eliminatedRailVolumeCents).toBe(8500); // $85.00
    expect(result.compressionRatio).toBeCloseTo(0.6538, 3); // 65.38%

    // SLA verification
    expect(result.slaSummary.totalEvaluated).toBe(7);
    expect(result.slaSummary.passed).toBe(6);
    expect(result.slaSummary.failed).toBe(1);
    expect(result.slaSummary.quarantinedIousCount).toBe(1);

    // Netting verification
    expect(result.nettingSummary.soleNetDebtor).toBe('agent_research');
    expect(result.nettingSummary.debtorAmountCents).toBe(4500);
    expect(result.nettingSummary.netCreditorsCount).toBe(4);
    expect(result.nettingSummary.zeroSumAsserted).toBe(true);

    // Rail settlement verification
    expect(result.railSettlement.debtorOrderId).toBeDefined();
    expect(result.railSettlement.debtorCaptureId).toBeDefined();
    expect(result.railSettlement.creditorsSettledCount).toBe(4);

    // Recovery & safety verification
    expect(result.recoveryProof.reinstatementStagesCompleted).toBe(5);
    expect(result.recoveryProof.childReissueId).toBeDefined();
    expect(result.recoveryProof.lateParentCollisionDefended).toBe(true);

    // Ledger balance invariant
    expect(result.ledgerProof.balanced).toBe(true);
    expect(result.ledgerProof.netVarianceCents).toBe(0);
    expect(result.merkleSeal).toMatch(/^[0-9a-f]{64}$/);
    expect(result.timeline.length).toBeGreaterThanOrEqual(10);
  });

  it('2. Exposes POST /api/demo/run endpoint to execute flagship scenario via REST', async () => {
    const app = createApp({ db, paypalClient: client });
    const res = await request(app).post('/api/demo/run');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.grossVolumeCents).toBe(13000);
    expect(res.body.netVolumeCents).toBe(4500);
    expect(res.body.compressionRatio).toBeCloseTo(0.6538, 3);
    expect(res.body.merkleSeal).toBeDefined();
  });
});
