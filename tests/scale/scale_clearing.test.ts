import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { runScaleClearingSimulation } from '../../src/simulation/scale-clearing-engine.js';
import { verifySignature } from '../../src/crypto/index.js';
import { createApp } from '../../src/api/app.js';
import { DatabaseManager } from '../../src/db/index.js';
import { MockPayPalClient } from '../../src/paypal/index.js';

describe('Workstream 2: Hero Scale Multilateral Clearinghouse (1,500+ IOUs)', () => {
  it('generates exactly 1,500 cryptographically signed micro-IOUs across 10 agents', () => {
    const result = runScaleClearingSimulation(1500, 0x7a11);

    expect(result.totalIousCount).toBe(1500);
    expect(result.totalAgentsCount).toBe(10);
    expect(result.agents.length).toBe(10);
    expect(result.ious.length).toBe(1500);
    expect(result.netPositions.length).toBe(10);
  });

  it('proves zero-sum conservation: sum of all net positions is strictly zero cents', () => {
    const result = runScaleClearingSimulation(1500, 0x7a11);

    expect(result.zeroSumConservation.isZeroSum).toBe(true);
    expect(result.zeroSumConservation.sumNetCents).toBe(0);

    const totalDebts = result.netPositions
      .filter((p) => p.netAmountCents < 0)
      .reduce((acc, p) => acc + Math.abs(p.netAmountCents), 0);

    const totalCredits = result.netPositions
      .filter((p) => p.netAmountCents > 0)
      .reduce((acc, p) => acc + p.netAmountCents, 0);

    expect(totalDebts).toBe(totalCredits);
    expect(totalDebts).toBe(result.netVolumeCents);
  });

  it('achieves > 99% transaction reduction collapsing 1,500 bilateral transfers into minimal settlement movements', () => {
    const result = runScaleClearingSimulation(1500, 0x7a11);

    // With 10 agents, maximum possible settlement transfers is N - 1 = 9
    expect(result.netSettlementMovementCount).toBeLessThanOrEqual(9);
    expect(result.settlementMovements.length).toBe(result.netSettlementMovementCount);

    // Reduction ratio: (1500 - <=9) / 1500 > 99%
    expect(result.transactionReductionRatio).toBeGreaterThan(0.99);

    // Gross volume must exceed net settled volume (liquidity compression > 0)
    expect(result.grossVolumeCents).toBeGreaterThan(result.netVolumeCents);
    expect(result.liquidityCompressionRatio).toBeGreaterThan(0.5);
  });

  it('validates Ed25519 signatures of a random sample of generated IOUs', () => {
    const result = runScaleClearingSimulation(1500, 0x7a11);
    const agentMap = new Map(result.agents.map((a) => [a.agentId, a.publicKeyHex]));

    // Sample 50 IOUs across the set
    for (let i = 0; i < 50; i++) {
      const idx = (i * 29) % result.ious.length;
      const iou = result.ious[idx];
      const debtorPublicKey = agentMap.get(iou.debtorAgentId);
      expect(debtorPublicKey).toBeDefined();

      const isValid = verifySignature(iou.signedPayload, iou.signature, debtorPublicKey!);
      expect(isValid).toBe(true);
    }
  });

  it('proves deterministic reproducibility with fixed PRNG seed', () => {
    const run1 = runScaleClearingSimulation(1500, 0x7a11);
    const run2 = runScaleClearingSimulation(1500, 0x7a11);

    expect(run1.grossVolumeCents).toBe(run2.grossVolumeCents);
    expect(run1.netVolumeCents).toBe(run2.netVolumeCents);
    expect(run1.settlementMovements.length).toBe(run2.settlementMovements.length);
    expect(run1.ious[0].amountCents).toBe(run2.ious[0].amountCents);
    expect(run1.ious[1499].amountCents).toBe(run2.ious[1499].amountCents);
  });

  it('accurately models fee savings versus traditional bilateral payment rails with configurable rates', () => {
    const result = runScaleClearingSimulation(1500, 0x7a11);

    const { feeComparison } = result;
    expect(feeComparison.traditionalRailFeeCents).toBeGreaterThan(feeComparison.tallyNexusRailFeeCents);
    expect(feeComparison.feeSavingsCents).toBe(
      feeComparison.traditionalRailFeeCents - feeComparison.tallyNexusRailFeeCents
    );
    expect(feeComparison.feeSavingsPercent).toBeGreaterThan(70);
    expect(feeComparison.observedSandboxSample).toBeDefined();
    expect(feeComparison.observedSandboxSample.explanation).toContain('cross-border');

    // Test with custom configurable fee rates (e.g. standard card rail $0.30 fixed + 2.9%)
    const customResult = runScaleClearingSimulation(1500, 0x7a11, {
      captureFixedCents: 30,
      captureVariableRate: 0.029,
      payoutFixedCents: 25,
    });
    expect(customResult.feeComparison.configuredRates.captureFixedCents).toBe(30);
    expect(customResult.feeComparison.configuredRates.captureVariableRate).toBe(0.029);
    expect(customResult.feeComparison.feeSavingsPercent).toBeGreaterThan(70);
  });

  it('serves scale simulation results via HTTP endpoints (GET & POST /api/demo/scale)', async () => {
    const db = new DatabaseManager(':memory:');
    const app = createApp(db, new MockPayPalClient());

    const getRes = await request(app).get('/api/demo/scale?count=100&seed=123');
    expect(getRes.status).toBe(200);
    expect(getRes.body.totalIousCount).toBe(100);
    expect(getRes.body.zeroSumConservation.isZeroSum).toBe(true);

    const postRes = await request(app).post('/api/demo/scale').send({ count: 50, seed: 456 });
    expect(postRes.status).toBe(200);
    expect(postRes.body.totalIousCount).toBe(50);
    expect(postRes.body.zeroSumConservation.isZeroSum).toBe(true);

    db.close();
  });
});

