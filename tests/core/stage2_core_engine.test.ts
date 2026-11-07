import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DatabaseManager } from '../../src/db/index.js';
import { generateAgentKeyPair, signPayload, verifySignature, canonicalizeJson } from '../../src/crypto/index.js';
import { IouService } from '../../src/ious/iou-service.js';
import { SlaJudge } from '../../src/judge/sla-judge.js';
import { NettingEngine } from '../../src/netting/netting-engine.js';
import { FinancialFirewall } from '../../src/firewall/financial-firewall.js';
import { LedgerCore } from '../../src/ledger/ledger-core.js';
import { EventBus } from '../../src/events/event-bus.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const STAGE2_TEST_DB = resolve(process.cwd(), './data/test_stage2_core.db');

function cleanupDbFiles(basePath: string): void {
  for (const ext of ['', '-wal', '-shm']) {
    const f = basePath + ext;
    if (existsSync(f)) {
      try {
        unlinkSync(f);
      } catch {
        // Ignored if temporarily held
      }
    }
  }
}

describe('Stage 2 Core Financial Engine Integration Suite (Workstreams C - H)', () => {
  let db: DatabaseManager;

  // Agent keypairs for testing
  let agentAKeys: { publicKeyHex: string; privateKeyHex: string };
  let agentBKeys: { publicKeyHex: string; privateKeyHex: string };
  let agentCKeys: { publicKeyHex: string; privateKeyHex: string };

  beforeAll(() => {
    const dir = dirname(STAGE2_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDbFiles(STAGE2_TEST_DB);

    db = new DatabaseManager({ dbPath: STAGE2_TEST_DB });
    db.runMigrations();

    // 1. Generate Ed25519 keypairs for 3 test agents
    agentAKeys = generateAgentKeyPair();
    agentBKeys = generateAgentKeyPair();
    agentCKeys = generateAgentKeyPair();

    // 2. Seed agents in database key registry
    db.exec(`
      INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email) VALUES
      ('agt_a', 'Research Agent A', 'Lead Researcher', '${agentAKeys.publicKeyHex}', 'agent_a@tally-nexus.local'),
      ('agt_b', 'Compute Agent B', 'GPU Cluster', '${agentBKeys.publicKeyHex}', 'agent_b@tally-nexus.local'),
      ('agt_c', 'Quality Agent C', 'Review Auditor', '${agentCKeys.publicKeyHex}', 'agent_c@tally-nexus.local');
    `);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
    cleanupDbFiles(STAGE2_TEST_DB);
  });

  // ==========================================================================
  // WORKSTREAM C: ED25519 CRYPTOGRAPHIC AGENT KEY GENERATION & SIGNATURES
  // ==========================================================================
  describe('Workstream C: Cryptographic Identity & Verification', () => {
    it('C1: Generates valid 32-byte Ed25519 keypairs', () => {
      const keys = generateAgentKeyPair();
      expect(keys.publicKeyHex).toMatch(/^[0-9a-f]{64}$/);
      expect(keys.privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
    });

    it('C2: Signs payload and verifies with author public key', () => {
      const payload = { cycleId: 'cyc_test', amountCents: 5000, recipient: 'agt_b' };
      const sig = signPayload(payload, agentAKeys.privateKeyHex);
      expect(sig).toMatch(/^[0-9a-f]{128}$/);

      const isValid = verifySignature(payload, sig, agentAKeys.publicKeyHex);
      expect(isValid).toBe(true);
    });

    it('C3: Detects payload tampering and signature corruption', () => {
      const payload = { amountCents: 1000 };
      const sig = signPayload(payload, agentAKeys.privateKeyHex);

      // Tampered payload
      const isTamperedValid = verifySignature({ amountCents: 1001 }, sig, agentAKeys.publicKeyHex);
      expect(isTamperedValid).toBe(false);

      // Wrong public key
      const isWrongKeyValid = verifySignature(payload, sig, agentBKeys.publicKeyHex);
      expect(isWrongKeyValid).toBe(false);

      // Corrupted signature
      const corruptedSig = '00'.repeat(64);
      expect(verifySignature(payload, corruptedSig, agentAKeys.publicKeyHex)).toBe(false);
    });

    it('C4: Canonical JSON guarantees deterministic signature across key permutations', () => {
      const obj1 = { beta: 2, alpha: 1, gamma: { nestedB: 'x', nestedA: 'y' } };
      const obj2 = { gamma: { nestedA: 'y', nestedB: 'x' }, alpha: 1, beta: 2 };

      const c1 = canonicalizeJson(obj1);
      const c2 = canonicalizeJson(obj2);
      expect(c1).toBe(c2);

      const sig1 = signPayload(obj1, agentAKeys.privateKeyHex);
      const sig2 = signPayload(obj2, agentAKeys.privateKeyHex);
      expect(sig1).toBe(sig2);
    });
  });

  // ==========================================================================
  // WORKSTREAM E: SLA CONTRACT JUDGE ENGINE
  // ==========================================================================
  describe('Workstream E: SLA Contract Judge Engine', () => {
    beforeAll(() => {
      db.exec(`
        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_stage2_01', 'CREATED');

        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
        ('task_e1', 'cyc_stage2_01', 'agt_a', 'agt_b', 'Market Model Analysis', 'sha256_sla_1', 3000, 'SUBMITTED'),
        ('task_e2', 'cyc_stage2_01', 'agt_b', 'agt_c', 'Quality Verification', 'sha256_sla_2', 3000, 'SUBMITTED'),
        ('task_e3', 'cyc_stage2_01', 'agt_c', 'agt_a', 'Data Synthesis', 'sha256_sla_3', 3000, 'SUBMITTED');
      `);
    });

    it('E1: High-confidence passing evaluation marks task VERIFIED', () => {
      const result = SlaJudge.evaluateTask(
        {
          taskId: 'task_e1',
          evaluatorType: 'PROGRAMMATIC_TEST',
          criteriaCheckPassed: true,
          confidenceScore: 0.98,
          evaluatorNotes: 'All programmatic SLA benchmarks satisfied in 142ms.',
        },
        db
      );

      expect(result.verdict).toBe('PASS');
      const task = db.prepare('SELECT status, completed_at FROM tasks WHERE task_id = ?').get('task_e1') as { status: string; completed_at: string };
      expect(task.status).toBe('VERIFIED');
      expect(task.completed_at).toBeDefined();

      const verdictRow = db.prepare('SELECT verdict, confidence_score FROM task_verdicts WHERE task_id = ?').get('task_e1') as { verdict: string; confidence_score: number };
      expect(verdictRow.verdict).toBe('PASS');
      expect(verdictRow.confidence_score).toBe(0.98);
    });

    it('E2: Failed criteria evaluation marks task REJECTED', () => {
      db.exec(`
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES ('task_e_fail', 'cyc_stage2_01', 'agt_a', 'agt_b', 'Faulty Deliverable', 'sha256_fail', 1500, 'SUBMITTED');
      `);

      const result = SlaJudge.evaluateTask(
        {
          taskId: 'task_e_fail',
          evaluatorType: 'PROGRAMMATIC_TEST',
          criteriaCheckPassed: false,
          confidenceScore: 0.95,
          evaluatorNotes: 'Failed latency threshold (expected < 200ms, actual 850ms).',
        },
        db
      );

      expect(result.verdict).toBe('FAIL');
      const task = db.prepare('SELECT status FROM tasks WHERE task_id = ?').get('task_e_fail') as { status: string };
      expect(task.status).toBe('REJECTED');
    });

    it('E3: Low-confidence evaluation flags REVIEW_REQUIRED without verifying task', () => {
      db.exec(`
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES ('task_e_ambig', 'cyc_stage2_01', 'agt_a', 'agt_b', 'Ambiguous Result', 'sha256_ambig', 2000, 'SUBMITTED');
      `);

      const result = SlaJudge.evaluateTask(
        {
          taskId: 'task_e_ambig',
          evaluatorType: 'LLM_JUDGE',
          criteriaCheckPassed: true,
          confidenceScore: 0.65, // Below 0.80 threshold
          evaluatorNotes: 'Marginal output requires human verification.',
        },
        db
      );

      expect(result.verdict).toBe('REVIEW_REQUIRED');
      const task = db.prepare('SELECT status FROM tasks WHERE task_id = ?').get('task_e_ambig') as { status: string };
      expect(task.status).toBe('SUBMITTED'); // Task remains unverified
    });
  });

  // ==========================================================================
  // WORKSTREAM D: SIGNED MICRO-IOUS
  // ==========================================================================
  describe('Workstream D: Signed Micro-IOUs', () => {
    beforeAll(() => {
      // Verify task_e2 and task_e3 for IOU signing
      SlaJudge.evaluateTask({ taskId: 'task_e2', evaluatorType: 'PROGRAMMATIC_TEST', criteriaCheckPassed: true, confidenceScore: 0.95 }, db);
      SlaJudge.evaluateTask({ taskId: 'task_e3', evaluatorType: 'PROGRAMMATIC_TEST', criteriaCheckPassed: true, confidenceScore: 0.95 }, db);
    });

    it('D1: Debtor signs and records Micro-IOU for verified task', () => {
      const signedIou = IouService.signIou(
        {
          taskId: 'task_e1',
          cycleId: 'cyc_stage2_01',
          debtorAgentId: 'agt_a',
          creditorAgentId: 'agt_b',
          amountCents: 3000,
        },
        agentAKeys.privateKeyHex
      );

      const recordRes = IouService.recordIou(signedIou, db);
      expect(recordRes.iouId).toBeDefined();

      const row = db.prepare('SELECT amount_cents, debtor_agent_id, creditor_agent_id FROM ious WHERE task_id = ?').get('task_e1') as { amount_cents: number; debtor_agent_id: string; creditor_agent_id: string };
      expect(row.amount_cents).toBe(3000);
      expect(row.debtor_agent_id).toBe('agt_a');
      expect(row.creditor_agent_id).toBe('agt_b');
    });

    it('D2: Rejects IOU when task is not in VERIFIED status', () => {
      const signedIou = IouService.signIou(
        {
          taskId: 'task_e_fail', // Task was REJECTED
          cycleId: 'cyc_stage2_01',
          debtorAgentId: 'agt_a',
          creditorAgentId: 'agt_b',
          amountCents: 1500,
        },
        agentAKeys.privateKeyHex
      );

      expect(() => {
        IouService.recordIou(signedIou, db);
      }).toThrow(/TASK_NOT_VERIFIED/);
    });

    it('D3: Rejects IOU when signature was forged or signed by wrong agent', () => {
      // Signed with Agent B key instead of Debtor Agent A key
      const forgedIou = IouService.signIou(
        {
          taskId: 'task_e2', // Debtor is agt_b
          cycleId: 'cyc_stage2_01',
          debtorAgentId: 'agt_b',
          creditorAgentId: 'agt_c',
          amountCents: 3000,
        },
        agentCKeys.privateKeyHex // FORGER KEY!
      );

      expect(() => {
        IouService.recordIou(forgedIou, db);
      }).toThrow(/INVALID_SIGNATURE/);
    });

    it('D4: Rejects IOU with amount mismatch against underlying task', () => {
      const signedIou = IouService.signIou(
        {
          taskId: 'task_e2', // Task amount is 3000
          cycleId: 'cyc_stage2_01',
          debtorAgentId: 'agt_b',
          creditorAgentId: 'agt_c',
          amountCents: 9999, // MISMATCH
        },
        agentBKeys.privateKeyHex
      );

      expect(() => {
        IouService.recordIou(signedIou, db);
      }).toThrow(/AMOUNT_MISMATCH/);
    });
  });

  // ==========================================================================
  // WORKSTREAM F: DETERMINISTIC MULTILATERAL NETTING ENGINE
  // ==========================================================================
  describe('Workstream F: Deterministic Multilateral Netting Engine', () => {
    it('F1: 3-Agent Circular Debt Netting (100% Compression Ratio)', () => {
      // Record remaining IOUs for circular cycle:
      // agt_a owes agt_b $30.00 (task_e1, already recorded)
      // agt_b owes agt_c $30.00 (task_e2)
      // agt_c owes agt_a $30.00 (task_e3)
      const iou2 = IouService.signIou({ taskId: 'task_e2', cycleId: 'cyc_stage2_01', debtorAgentId: 'agt_b', creditorAgentId: 'agt_c', amountCents: 3000 }, agentBKeys.privateKeyHex);
      IouService.recordIou(iou2, db);

      const iou3 = IouService.signIou({ taskId: 'task_e3', cycleId: 'cyc_stage2_01', debtorAgentId: 'agt_c', creditorAgentId: 'agt_a', amountCents: 3000 }, agentCKeys.privateKeyHex);
      IouService.recordIou(iou3, db);

      // Execute Netting
      const netting = NettingEngine.computeCycleNetting('cyc_stage2_01', db);

      expect(netting.grossVolumeCents).toBe(9000); // $90.00 gross
      expect(netting.netVolumeCents).toBe(0); // $0.00 net!
      expect(netting.compressionRatio).toBe(1.0); // 100% compression

      // Verify all positions are NET_ZERO
      for (const pos of netting.positions) {
        expect(pos.netAmountCents).toBe(0);
        expect(pos.positionType).toBe('NET_ZERO');
        expect(pos.grossCreditCents).toBe(3000);
        expect(pos.grossDebtCents).toBe(3000);
      }

      // Verify cycle status updated to NETTING_PROPOSED
      const cycle = db.prepare('SELECT status, compression_ratio FROM settlement_cycles WHERE cycle_id = ?').get('cyc_stage2_01') as { status: string; compression_ratio: number };
      expect(cycle.status).toBe('NETTING_PROPOSED');
      expect(cycle.compression_ratio).toBe(1.0);
    });

    it('F2: Asymmetric Netting with Real Net Creditor and Net Debtor Positions', () => {
      // Setup second cycle:
      // Agent A owes Agent B $50.00 (5000c)
      // Agent B owes Agent C $30.00 (3000c)
      // Agent C owes Agent A $10.00 (1000c)
      // Result:
      // Agent A: Net -$40.00 (NET_DEBTOR)
      // Agent B: Net +$20.00 (NET_CREDITOR)
      // Agent C: Net +$20.00 (NET_CREDITOR)
      // Net Volume: $40.00 (4000c)
      // Compression: 1 - 40/90 = 55.56%
      db.exec(`
        INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_asym_02', 'CREATED');

        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status) VALUES
        ('t_asym_1', 'cyc_asym_02', 'agt_a', 'agt_b', 'Deep Analytics', 'sha_sla_a', 5000, 'VERIFIED'),
        ('t_asym_2', 'cyc_asym_02', 'agt_b', 'agt_c', 'Quality Gate', 'sha_sla_b', 3000, 'VERIFIED'),
        ('t_asym_3', 'cyc_asym_02', 'agt_c', 'agt_a', 'Telemetry', 'sha_sla_c', 1000, 'VERIFIED');
      `);

      const iou1 = IouService.signIou({ taskId: 't_asym_1', cycleId: 'cyc_asym_02', debtorAgentId: 'agt_a', creditorAgentId: 'agt_b', amountCents: 5000 }, agentAKeys.privateKeyHex);
      IouService.recordIou(iou1, db);

      const iou2 = IouService.signIou({ taskId: 't_asym_2', cycleId: 'cyc_asym_02', debtorAgentId: 'agt_b', creditorAgentId: 'agt_c', amountCents: 3000 }, agentBKeys.privateKeyHex);
      IouService.recordIou(iou2, db);

      const iou3 = IouService.signIou({ taskId: 't_asym_3', cycleId: 'cyc_asym_02', debtorAgentId: 'agt_c', creditorAgentId: 'agt_a', amountCents: 1000 }, agentCKeys.privateKeyHex);
      IouService.recordIou(iou3, db);

      const netting = NettingEngine.computeCycleNetting('cyc_asym_02', db);

      expect(netting.grossVolumeCents).toBe(9000);
      expect(netting.netVolumeCents).toBe(4000);
      expect(netting.compressionRatio).toBe(0.5556);

      const posMap = new Map(netting.positions.map((p) => [p.agentId, p]));
      expect(posMap.get('agt_a')?.netAmountCents).toBe(-4000);
      expect(posMap.get('agt_a')?.positionType).toBe('NET_DEBTOR');

      expect(posMap.get('agt_b')?.netAmountCents).toBe(2000);
      expect(posMap.get('agt_b')?.positionType).toBe('NET_CREDITOR');

      expect(posMap.get('agt_c')?.netAmountCents).toBe(2000);
      expect(posMap.get('agt_c')?.positionType).toBe('NET_CREDITOR');

      // Conservation check
      const sum = netting.positions.reduce((acc, p) => acc + p.netAmountCents, 0);
      expect(sum).toBe(0);
    });
  });

  // ==========================================================================
  // WORKSTREAM G: FIDUCIARY FINANCIAL FIREWALL & BALANCE GUARD
  // ==========================================================================
  describe('Workstream G: Fiduciary Financial Firewall', () => {
    it('G1: Approves compliant netting proposal and advances cycle to FIREWALL_APPROVED', () => {
      const firewallRes = FinancialFirewall.evaluateAndApproveCycle('cyc_asym_02', db, 10000);

      expect(firewallRes.approved).toBe(true);
      expect(firewallRes.netDebtorCount).toBe(1);
      expect(firewallRes.netCreditorCount).toBe(2);
      expect(firewallRes.totalNetVolumeCents).toBe(4000);
      expect(firewallRes.checks.conservationPassed).toBe(true);
      expect(firewallRes.checks.thresholdPassed).toBe(true);
      expect(firewallRes.checks.reserveFloorPassed).toBe(true);
      expect(firewallRes.checks.receiverEmailsVerified).toBe(true);

      const cycle = db.prepare('SELECT status FROM settlement_cycles WHERE cycle_id = ?').get('cyc_asym_02') as { status: string };
      expect(cycle.status).toBe('FIREWALL_APPROVED');
    });

    it('G2: Rejects cycle when operator cash falls below $10.00 liquidity reserve floor', () => {
      db.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_underfunded', 'NETTING_PROPOSED');");
      db.exec(`
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type) VALUES
        ('p_un_1', 'cyc_underfunded', 'agt_a', 0, 2000, -2000, 'NET_DEBTOR'),
        ('p_un_2', 'cyc_underfunded', 'agt_b', 2000, 0, 2000, 'NET_CREDITOR');
      `);

      // Operator cash is $8.50 (850 cents), below the $10.00 (1000 cents) reserve floor
      expect(() => {
        FinancialFirewall.evaluateAndApproveCycle('cyc_underfunded', db, 850);
      }).toThrow(/FIREWALL_REJECTION: Operator cash \(850c\) below mandatory reserve floor/);
    });

    it('G3: Rejects cycle when net position is below $1.00 PayPal minimum threshold', () => {
      db.exec("INSERT INTO settlement_cycles (cycle_id, status) VALUES ('cyc_sub_thresh', 'NETTING_PROPOSED');");
      db.exec(`
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type) VALUES
        ('p_sub_1', 'cyc_sub_thresh', 'agt_a', 0, 50, -50, 'NET_DEBTOR'),
        ('p_sub_2', 'cyc_sub_thresh', 'agt_b', 50, 0, 50, 'NET_CREDITOR');
      `);

      expect(() => {
        FinancialFirewall.evaluateAndApproveCycle('cyc_sub_thresh', db, 10000);
      }).toThrow(/FIREWALL_REJECTION: Position for agent 'agt_a' is 50c \(< 100c PayPal minimum\)/);
    });
  });

  // ==========================================================================
  // WORKSTREAM H: DOUBLE-ENTRY LEDGER CORE & TRANSACTIONAL OUTBOX STREAM
  // ==========================================================================
  describe('Workstream H: Double-Entry Subledger & Transactional Outbox', () => {
    it('H1: Records balanced double-entry compensating ledger posting', () => {
      const entry = LedgerCore.recordEntry(
        {
          cycleId: 'cyc_asym_02',
          debitAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          creditAccount: 'LIABILITY:CREDITOR_PAYABLE:agt_b',
          amountCents: 2000,
          reason: 'NET_CREDITOR_SETTLEMENT_ALLOCATION',
        },
        db
      );

      expect(entry.entryId).toBeDefined();
      expect(entry.journalEntryRef).toMatch(/^JRN-/);

      const bal = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
      expect(bal.totalDebits).toBe(2000);
      expect(bal.totalCredits).toBe(0);
      expect(bal.netDebitBalance).toBe(2000);

      const credBal = LedgerCore.getAccountBalance('LIABILITY:CREDITOR_PAYABLE:agt_b', db);
      expect(credBal.totalCredits).toBe(2000);
    });

    it('H2: Rejects circular double-entry posting to identical account', () => {
      expect(() => {
        LedgerCore.recordEntry(
          {
            cycleId: 'cyc_asym_02',
            debitAccount: 'ASSET:OPERATOR_CASH',
            creditAccount: 'ASSET:OPERATOR_CASH',
            amountCents: 1000,
            reason: 'CIRCULAR_TEST',
          },
          db
        );
      }).toThrow(/CIRCULAR_POSTING_PROHIBITED/);
    });

    it('H3: Verifies global trial balance equality (Sum Debits == Sum Credits)', () => {
      // Add second posting to agt_c
      LedgerCore.recordEntry(
        {
          cycleId: 'cyc_asym_02',
          debitAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          creditAccount: 'LIABILITY:CREDITOR_PAYABLE:agt_c',
          amountCents: 2000,
          reason: 'NET_CREDITOR_SETTLEMENT_ALLOCATION',
        },
        db
      );

      const trial = LedgerCore.verifyTrialBalance(db);
      expect(trial.balanced).toBe(true);
      expect(trial.totalVolumeCents).toBe(4000);
    });

    it('H4: Transactional Outbox emits strictly monotonic events', () => {
      const seq1 = EventBus.getLatestSequenceId(db);

      const ev1 = EventBus.emit('SETTLEMENT_INVOICE_GENERATED', 'cyc_asym_02', { debtor: 'agt_a', amount: 4000 }, db);
      expect(ev1.sequenceId).toBe(seq1 + 1);

      const ev2 = EventBus.emit('SETTLEMENT_DISPATCH_INITIATED', 'cyc_asym_02', { recipient: 'agt_b', amount: 2000 }, db);
      expect(ev2.sequenceId).toBe(seq1 + 2);

      // Read event stream from cursor
      const stream = EventBus.readStream(seq1, 10, db);
      expect(stream.length).toBe(2);
      expect(stream[0].eventType).toBe('SETTLEMENT_INVOICE_GENERATED');
      expect(stream[1].eventType).toBe('SETTLEMENT_DISPATCH_INITIATED');
      expect(stream[0].sequenceId).toBeLessThan(stream[1].sequenceId);
    });
  });
});
