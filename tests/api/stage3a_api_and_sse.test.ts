import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import http from 'node:http';
import { Express } from 'express';
import { DatabaseManager } from '../../src/db/index.js';
import { createApp } from '../../src/api/app.js';
import { generateAgentKeyPair } from '../../src/crypto/agent-keys.js';
import { IouService, IOU_DOMAIN_V1 } from '../../src/ious/iou-service.js';
import { canonicalizeJson } from '../../src/crypto/canonical-json.js';
import { EventBus } from '../../src/events/event-bus.js';
import { existsSync, unlinkSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const API_TEST_DB = resolve(process.cwd(), './data/test_stage3a_api.db');
const OPERATOR_KEY = 'test-operator-secret-key';

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

describe('Stage 3A: Express REST API & SSE Event Stream Suite (Workstreams I & N)', () => {
  let db: DatabaseManager;
  let app: Express;

  let agentAKeys: { publicKeyHex: string; privateKeyHex: string };
  let agentBKeys: { publicKeyHex: string; privateKeyHex: string };
  let agentCKeys: { publicKeyHex: string; privateKeyHex: string };

  beforeAll(() => {
    process.env.OPERATOR_API_KEY = OPERATOR_KEY;

    const dir = dirname(API_TEST_DB);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    cleanupDb(API_TEST_DB);

    db = new DatabaseManager({ dbPath: API_TEST_DB });
    db.runMigrations();

    app = createApp({ db });

    // Generate keys for agents
    agentAKeys = generateAgentKeyPair();
    agentBKeys = generateAgentKeyPair();
    agentCKeys = generateAgentKeyPair();
  });

  afterAll(() => {
    if (db) db.close();
    cleanupDb(API_TEST_DB);
  });

  // =========================================================================
  // 1. HEALTH & SECURITY HEADERS
  // =========================================================================
  describe('System Health & Security Headers', () => {
    it('1. GET /api/health returns 200 with system metadata and security headers', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
      expect(res.body.system).toContain('TALLY NEXUS');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it('2. GET /api/nonexistent returns 404 with structured error schema', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // =========================================================================
  // 2. AGENT REGISTRY ENDPOINTS
  // =========================================================================
  describe('Agent Registry Endpoints', () => {
    it('3. POST /api/agents registers new agent with valid schema', async () => {
      const res = await request(app)
        .post('/api/agents')
        .send({
          agentId: 'agt_api_a',
          name: 'Research Agent Alpha',
          role: 'Researcher',
          publicKey: agentAKeys.publicKeyHex,
          paypalReceiverEmail: 'agent_alpha@nexus.local',
        });

      expect(res.status).toBe(201);
      expect(res.body.agentId).toBe('agt_api_a');
      expect(res.body.publicKey).toBe(agentAKeys.publicKeyHex.toLowerCase());

      // Register Agent B and Agent C
      await request(app)
        .post('/api/agents')
        .send({
          agentId: 'agt_api_b',
          name: 'Compute Agent Beta',
          role: 'GPU Provider',
          publicKey: agentBKeys.publicKeyHex,
          paypalReceiverEmail: 'agent_beta@nexus.local',
        })
        .expect(201);

      await request(app)
        .post('/api/agents')
        .send({
          agentId: 'agt_api_c',
          name: 'Audit Agent Gamma',
          role: 'Verifier',
          publicKey: agentCKeys.publicKeyHex,
          paypalReceiverEmail: 'agent_gamma@nexus.local',
        })
        .expect(201);
    });

    it('4. POST /api/agents rejects duplicate registration with 409', async () => {
      const res = await request(app).post('/api/agents').send({
        agentId: 'agt_api_a',
        name: 'Duplicate Alpha',
        role: 'Researcher',
        publicKey: agentAKeys.publicKeyHex,
        paypalReceiverEmail: 'dup@nexus.local',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('AGENT_EXISTS');
    });

    it('5. POST /api/agents rejects invalid public key format with 400', async () => {
      const res = await request(app).post('/api/agents').send({
        agentId: 'agt_invalid_key',
        name: 'Bad Key Agent',
        role: 'Attacker',
        publicKey: 'invalid_non_hex_too_short',
        paypalReceiverEmail: 'bad@nexus.local',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('6. GET /api/agents & /api/agents/:agentId returns registered agent data', async () => {
      const listRes = await request(app).get('/api/agents');
      expect(listRes.status).toBe(200);
      expect(listRes.body.agents.length).toBeGreaterThanOrEqual(3);

      const getRes = await request(app).get('/api/agents/agt_api_a');
      expect(getRes.status).toBe(200);
      expect(getRes.body.agent_id).toBe('agt_api_a');
      expect(getRes.body.public_key).toBe(agentAKeys.publicKeyHex.toLowerCase());
    });
  });

  // =========================================================================
  // 3. SETTLEMENT CYCLES & TASKS
  // =========================================================================
  describe('Settlement Cycles & Tasks', () => {
    it('7. POST /api/cycles creates a settlement cycle', async () => {
      const res = await request(app).post('/api/cycles').send({ cycleId: 'cyc_api_01' });
      expect(res.status).toBe(201);
      expect(res.body.cycleId).toBe('cyc_api_01');
      expect(res.body.status).toBe('CREATED');
    });

    it('8. POST /api/tasks rejects unauthenticated caller with 401', async () => {
      const res = await request(app).post('/api/tasks').send({
        taskId: 't_unauth',
        cycleId: 'cyc_api_01',
        debtorAgentId: 'agt_api_a',
        creditorAgentId: 'agt_api_b',
        title: 'Unauthorized Task',
        slaContractRef: 'sha_unauth',
        amountCents: 2000,
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('9. POST /api/tasks accepts authenticated agent header and creates task', async () => {
      // Create 3 tasks forming a circular cycle:
      // agt_api_a -> agt_api_b ($30.00)
      // agt_api_b -> agt_api_c ($30.00)
      // agt_api_c -> agt_api_a ($30.00)
      const res1 = await request(app)
        .post('/api/tasks')
        .set('X-Agent-ID', 'agt_api_a')
        .send({
          taskId: 't_api_1',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_a',
          creditorAgentId: 'agt_api_b',
          title: 'Compute Run 1',
          slaContractRef: 'sha_sla_1',
          amountCents: 3000,
        });

      expect(res1.status).toBe(201);
      expect(res1.body.status).toBe('SUBMITTED');

      await request(app)
        .post('/api/tasks')
        .set('X-Agent-ID', 'agt_api_b')
        .send({
          taskId: 't_api_2',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_b',
          creditorAgentId: 'agt_api_c',
          title: 'Audit Run 2',
          slaContractRef: 'sha_sla_2',
          amountCents: 3000,
        })
        .expect(201);

      await request(app)
        .post('/api/tasks')
        .set('X-Agent-ID', 'agt_api_c')
        .send({
          taskId: 't_api_3',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_c',
          creditorAgentId: 'agt_api_a',
          title: 'Synthesis Run 3',
          slaContractRef: 'sha_sla_3',
          amountCents: 3000,
        })
        .expect(201);
    });

    it('10. POST /api/tasks rejects self-dealing task (debtor == creditor) with 400', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('X-Agent-ID', 'agt_api_a')
        .send({
          taskId: 't_self_deal',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_a',
          creditorAgentId: 'agt_api_a', // Self-dealing
          title: 'Self Deal Task',
          slaContractRef: 'sha_self',
          amountCents: 1000,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // =========================================================================
  // 4. SLA JUDGE EVALUATION & AUTH
  // =========================================================================
  describe('SLA Judge Endpoints & Role Authentication', () => {
    it('11. POST /api/tasks/:id/evaluate enforces operator authorization', async () => {
      // Unauthenticated
      await request(app)
        .post('/api/tasks/t_api_1/evaluate')
        .send({
          evaluatorType: 'PROGRAMMATIC_TEST',
          criteriaCheckPassed: true,
          confidenceScore: 0.95,
        })
        .expect(401);

      // Wrong key
      await request(app)
        .post('/api/tasks/t_api_1/evaluate')
        .set('X-Operator-Key', 'wrong-operator-key')
        .send({
          evaluatorType: 'PROGRAMMATIC_TEST',
          criteriaCheckPassed: true,
          confidenceScore: 0.95,
        })
        .expect(403);
    });

    it('12. POST /api/tasks/:id/evaluate evaluates task and marks VERIFIED with valid operator key', async () => {
      const res1 = await request(app)
        .post('/api/tasks/t_api_1/evaluate')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({
          evaluatorType: 'PROGRAMMATIC_TEST',
          criteriaCheckPassed: true,
          confidenceScore: 0.95,
          evaluatorNotes: 'SLA criteria passed.',
        });

      expect(res1.status).toBe(200);
      expect(res1.body.verdict).toBe('PASS');

      // Evaluate t_api_2 and t_api_3
      await request(app)
        .post('/api/tasks/t_api_2/evaluate')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ evaluatorType: 'PROGRAMMATIC_TEST', criteriaCheckPassed: true, confidenceScore: 0.95 })
        .expect(200);

      await request(app)
        .post('/api/tasks/t_api_3/evaluate')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ evaluatorType: 'PROGRAMMATIC_TEST', criteriaCheckPassed: true, confidenceScore: 0.95 })
        .expect(200);

      // Verify task status via GET
      const taskRes = await request(app).get('/api/tasks/t_api_1');
      expect(taskRes.body.task.status).toBe('VERIFIED');
      expect(taskRes.body.verdict.verdict).toBe('PASS');
    });
  });

  // =========================================================================
  // 5. SIGNED MICRO-IOUS ENDPOINTS
  // =========================================================================
  describe('Signed Micro-IOUs Endpoints', () => {
    it('13. POST /api/ious records signed IOU with domain separation and Ed25519 signature', async () => {
      const signedIou1 = IouService.signIou(
        {
          taskId: 't_api_1',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_a',
          creditorAgentId: 'agt_api_b',
          amountCents: 3000,
        },
        agentAKeys.privateKeyHex
      );

      const res = await request(app).post('/api/ious').send(signedIou1);
      expect(res.status).toBe(201);
      expect(res.body.iouId).toBe(signedIou1.iouId);

      // Sign remaining two IOUs for circular cycle
      const signedIou2 = IouService.signIou(
        {
          taskId: 't_api_2',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_b',
          creditorAgentId: 'agt_api_c',
          amountCents: 3000,
        },
        agentBKeys.privateKeyHex
      );
      await request(app).post('/api/ious').send(signedIou2).expect(201);

      const signedIou3 = IouService.signIou(
        {
          taskId: 't_api_3',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_c',
          creditorAgentId: 'agt_api_a',
          amountCents: 3000,
        },
        agentCKeys.privateKeyHex
      );
      await request(app).post('/api/ious').send(signedIou3).expect(201);
    });

    it('14. POST /api/ious rejects duplicate IOU submission for same task with 409', async () => {
      const duplicateIou = IouService.signIou(
        {
          taskId: 't_api_1', // Already recorded
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_a',
          creditorAgentId: 'agt_api_b',
          amountCents: 3000,
        },
        agentAKeys.privateKeyHex
      );

      const res = await request(app).post('/api/ious').send(duplicateIou);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_IOU');
    });

    it('15. POST /api/ious rejects invalid or forged signature with 401', async () => {
      // Create fresh unverified task for testing
      db.exec(`
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES ('t_forged', 'cyc_api_01', 'agt_api_a', 'agt_api_b', 'Forged Task', 'sha_f', 2000, 'VERIFIED');
      `);

      // Signed with Agent C's key instead of Debtor Agent A's key
      const forgedIou = IouService.signIou(
        {
          taskId: 't_forged',
          cycleId: 'cyc_api_01',
          debtorAgentId: 'agt_api_a',
          creditorAgentId: 'agt_api_b',
          amountCents: 2000,
        },
        agentCKeys.privateKeyHex // Forger!
      );

      const res = await request(app).post('/api/ious').send(forgedIou);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    });

    it('16. GET /api/cycles/:cycleId/ious returns all recorded IOUs', async () => {
      const res = await request(app).get('/api/cycles/cyc_api_01/ious');
      expect(res.status).toBe(200);
      expect(res.body.ious.length).toBe(3);
    });
  });

  // =========================================================================
  // 6. CLEARING & FINANCIAL FIREWALL ENDPOINTS
  // =========================================================================
  describe('Clearing & Financial Firewall Endpoints', () => {
    it('17. POST /api/cycles/:cycleId/net computes multilateral netting (Operator only)', async () => {
      // Rejects without operator auth
      await request(app).post('/api/cycles/cyc_api_01/net').expect(401);

      // Computes with valid operator auth
      const res = await request(app)
        .post('/api/cycles/cyc_api_01/net')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(200);
      expect(res.body.grossVolumeCents).toBe(9000);
      expect(res.body.netVolumeCents).toBe(0);
      expect(res.body.compressionRatio).toBe(1.0); // 100% compression circular
    });

    it('18. POST /api/cycles/:cycleId/firewall-approve approves compliant netting cycle', async () => {
      const res = await request(app)
        .post('/api/cycles/cyc_api_01/firewall-approve')
        .set('X-Operator-Key', OPERATOR_KEY)
        .send({ operatorCashCents: 15000 });

      expect(res.status).toBe(200);
      expect(res.body.approved).toBe(true);

      const cycleRes = await request(app).get('/api/cycles/cyc_api_01');
      expect(cycleRes.body.cycle.status).toBe('FIREWALL_APPROVED');
    });
  });

  // =========================================================================
  // 7. SUBLEDGER TRIAL BALANCE ENDPOINTS
  // =========================================================================
  describe('Subledger Trial Balance Endpoints', () => {
    it('19. GET /api/ledger/trial-balance returns global ledger status', async () => {
      const res = await request(app)
        .get('/api/ledger/trial-balance')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(200);
      expect(res.body.balanced).toBe(true);
    });

    it('20. GET /api/ledger/accounts/:accountName returns specific account balance', async () => {
      const res = await request(app)
        .get('/api/ledger/accounts/ASSET:PAYPAL_SETTLEMENT_CASH')
        .set('X-Operator-Key', OPERATOR_KEY);

      expect(res.status).toBe(200);
      expect(res.body.accountName).toBe('ASSET:PAYPAL_SETTLEMENT_CASH');
      expect(res.body.totalDebits).toBeDefined();
    });

    it('21. Negative test: GET 404s for non-existent cycle, task, and IOU', async () => {
      await request(app).get('/api/cycles/non_existent_cycle').expect(404);
      await request(app).get('/api/tasks/non_existent_task').expect(404);
      await request(app).get('/api/ious/non_existent_iou').expect(404);
    });
  });

  // =========================================================================
  // 8. SERVER-SENT EVENTS (SSE) STREAM (WORKSTREAM N)
  // =========================================================================
  describe('Workstream N: Server-Sent Events (SSE) Stream', () => {
    it('22. GET /api/events/stream connects with text/event-stream headers and replays monotonic events', async () => {
      const res = await request(app).get('/api/events/stream?afterSequenceId=0&closeAfterReplay=true');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/event-stream');
      expect(res.headers['cache-control']).toBe('no-cache');

      // Verify stream body contains events
      const body = res.text;
      expect(body).toContain('event: TASK_VERIFIED');
      expect(body).toContain('event: IOU_SIGNED');
      expect(body).toContain('event: NETTING_PROPOSED');
      expect(body).toContain('event: CYCLE_FIREWALL_APPROVED');

      // Verify sequence ordering
      const seqMatches = [...body.matchAll(/id:\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
      expect(seqMatches.length).toBeGreaterThanOrEqual(4);

      // Monotonically ascending
      for (let i = 1; i < seqMatches.length; i++) {
        expect(seqMatches[i]).toBeGreaterThan(seqMatches[i - 1]);
      }
    });

    it('23. GET /api/events/stream?afterSequenceId=<cursor> replays only events after cursor', async () => {
      const lastSeq = db
        .prepare('SELECT MAX(sequence_id) as max_seq FROM system_events')
        .get() as { max_seq: number };

      const cursor = Math.max(0, lastSeq.max_seq - 1);
      const res = await request(app).get(`/api/events/stream?afterSequenceId=${cursor}&closeAfterReplay=true`);

      expect(res.status).toBe(200);
      const seqMatches = [...res.text.matchAll(/id:\s*(\d+)/g)].map((m) => parseInt(m[1], 10));

      for (const seq of seqMatches) {
        expect(seq).toBeGreaterThan(cursor);
      }
    });

    it('24. Live SSE connection streams newly emitted outbox events in real-time', async () => {
      const server = app.listen(0);
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;

      try {
        const receivedData: string[] = [];
        await new Promise<void>((resolvePromise, reject) => {
          const clientReq = http.get(`http://127.0.0.1:${port}/api/events/stream?afterSequenceId=0`, (clientRes) => {
            expect(clientRes.statusCode).toBe(200);
            expect(clientRes.headers['content-type']).toContain('text/event-stream');

            clientRes.on('data', (chunk) => {
              const text = chunk.toString();
              receivedData.push(text);

              // Once initial events are flowing, emit a live event
              if (text.includes('event: CYCLE_FIREWALL_APPROVED')) {
                EventBus.emit('LIVE_TEST_EVENT', 'cyc_api_01', { message: 'hello live stream' }, db);
              }

              if (text.includes('event: LIVE_TEST_EVENT')) {
                clientReq.destroy();
                resolvePromise();
              }
            });

            clientRes.on('error', () => {
              resolvePromise();
            });
          });

          clientReq.on('error', (err: any) => {
            if (err.code === 'ECONNRESET') {
              resolvePromise();
            } else {
              reject(err);
            }
          });
        });

        const allText = receivedData.join('');
        expect(allText).toContain('event: LIVE_TEST_EVENT');
      } finally {
        server.close();
      }
    });
  });
});
