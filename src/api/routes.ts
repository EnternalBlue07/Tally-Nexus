import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/index.js';
import { IouService, SignedIou } from '../ious/iou-service.js';
import { SlaJudge, EvaluationInput } from '../judge/sla-judge.js';
import { NettingEngine } from '../netting/netting-engine.js';
import { FinancialFirewall } from '../firewall/financial-firewall.js';
import { LedgerCore } from '../ledger/ledger-core.js';
import { EventBus } from '../events/event-bus.js';
import {
  RegisterAgentSchema,
  CreateCycleSchema,
  CreateTaskSchema,
  EvaluateTaskSchema,
  RecordIouSchema,
  FirewallApproveSchema,
} from './schemas.js';
import { requireOperatorAuth, requireAgentOrOperatorAuth, sendError } from './auth.js';
import {
  IPayPalClient,
  MockPayPalClient,
  PayPalOrdersService,
  PayPalPayoutsService,
  PayPalWebhookService,
} from '../paypal/index.js';

export function createApiRouter(
  db: DatabaseManager,
  paypalClient: IPayPalClient = new MockPayPalClient()
): Router {
  const router = Router();

  // =========================================================================
  // 1. SYSTEM HEALTH
  // =========================================================================
  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'OK',
      system: 'TALLY NEXUS Clearinghouse',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // =========================================================================
  // 2. AGENT REGISTRY
  // =========================================================================
  router.post('/agents', (req: Request, res: Response) => {
    const parse = RegisterAgentSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid agent registration payload', parse.error.issues);
      return;
    }

    const { agentId, name, role, publicKey, paypalReceiverEmail } = parse.data;

    try {
      db.prepare(`
        INSERT INTO agents (agent_id, name, role, public_key, paypal_receiver_email)
        VALUES (?, ?, ?, ?, ?)
      `).run(agentId, name, role, publicKey.toLowerCase(), paypalReceiverEmail);

      res.status(201).json({
        agentId,
        name,
        role,
        publicKey: publicKey.toLowerCase(),
        paypalReceiverEmail,
        registeredAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        sendError(res, 409, 'AGENT_EXISTS', `Agent with ID '${agentId}' is already registered.`);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.get('/agents', (_req: Request, res: Response) => {
    const agents = db.prepare('SELECT agent_id, name, role, public_key, paypal_receiver_email, created_at FROM agents').all();
    res.json({ agents });
  });

  router.get('/agents/:agentId', (req: Request, res: Response) => {
    const agentId = String(req.params.agentId);
    const agent = db
      .prepare('SELECT agent_id, name, role, public_key, paypal_receiver_email, created_at FROM agents WHERE agent_id = ?')
      .get(agentId);

    if (!agent) {
      sendError(res, 404, 'NOT_FOUND', `Agent '${agentId}' was not found.`);
      return;
    }
    res.json(agent);
  });

  // =========================================================================
  // 3. SETTLEMENT CYCLES
  // =========================================================================
  router.post('/cycles', (req: Request, res: Response) => {
    const parse = CreateCycleSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid cycle payload', parse.error.issues);
      return;
    }

    try {
      db.prepare('INSERT INTO settlement_cycles (cycle_id, status) VALUES (?, ?)').run(parse.data.cycleId, 'CREATED');
      res.status(201).json({ cycleId: parse.data.cycleId, status: 'CREATED' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('UNIQUE constraint failed')) {
        sendError(res, 409, 'CYCLE_EXISTS', `Cycle '${parse.data.cycleId}' already exists.`);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.get('/cycles/:cycleId', (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const cycle = db
      .prepare('SELECT cycle_id, status, gross_volume_cents, net_volume_cents, compression_ratio, created_at FROM settlement_cycles WHERE cycle_id = ?')
      .get(cycleId);

    if (!cycle) {
      sendError(res, 404, 'NOT_FOUND', `Cycle '${cycleId}' was not found.`);
      return;
    }

    const positions = db
      .prepare('SELECT position_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type FROM net_positions WHERE cycle_id = ?')
      .all(cycleId);

    res.json({ cycle, positions });
  });

  // =========================================================================
  // 4. TASKS & SLA JUDGING
  // =========================================================================
  router.post('/tasks', requireAgentOrOperatorAuth, (req: Request, res: Response) => {
    const parse = CreateTaskSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid task creation payload', parse.error.issues);
      return;
    }

    const { taskId, cycleId, debtorAgentId, creditorAgentId, title, slaContractRef, amountCents } = parse.data;

    try {
      db.prepare(`
        INSERT INTO tasks (task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED')
      `).run(taskId, cycleId, debtorAgentId, creditorAgentId, title, slaContractRef, amountCents);

      res.status(201).json({
        taskId,
        cycleId,
        debtorAgentId,
        creditorAgentId,
        title,
        slaContractRef,
        amountCents,
        status: 'SUBMITTED',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('FOREIGN KEY constraint failed')) {
        sendError(res, 400, 'FOREIGN_KEY_VIOLATION', 'Referenced cycle or agent does not exist.');
        return;
      }
      if (msg.includes('UNIQUE constraint failed')) {
        sendError(res, 409, 'TASK_EXISTS', `Task '${taskId}' already exists.`);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.get('/tasks/:taskId', (req: Request, res: Response) => {
    const taskId = String(req.params.taskId);
    const task = db
      .prepare('SELECT task_id, cycle_id, debtor_agent_id, creditor_agent_id, title, sla_contract_ref, amount_cents, status, created_at, completed_at FROM tasks WHERE task_id = ?')
      .get(taskId);

    if (!task) {
      sendError(res, 404, 'NOT_FOUND', `Task '${taskId}' was not found.`);
      return;
    }

    const verdict = db
      .prepare('SELECT verdict_id, evaluator_type, verdict, confidence_score, evaluator_notes, evaluated_at FROM task_verdicts WHERE task_id = ?')
      .get(taskId);

    res.json({ task, verdict: verdict || null });
  });

  router.post('/tasks/:taskId/evaluate', requireOperatorAuth, (req: Request, res: Response) => {
    const taskId = String(req.params.taskId);
    const parse = EvaluateTaskSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid evaluation payload', parse.error.issues);
      return;
    }

    const input: EvaluationInput = {
      taskId,
      evaluatorType: parse.data.evaluatorType,
      criteriaCheckPassed: parse.data.criteriaCheckPassed,
      confidenceScore: parse.data.confidenceScore,
      evaluatorNotes: parse.data.evaluatorNotes,
    };

    try {
      const verdict = SlaJudge.evaluateTask(input, db);
      res.json(verdict);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('TASK_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      if (msg.includes('TASK_INVALID_STATE')) {
        sendError(res, 400, 'INVALID_STATE', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  // =========================================================================
  // 5. MICRO-IOUS
  // =========================================================================
  router.post('/ious', (req: Request, res: Response) => {
    const parse = RecordIouSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid IOU payload', parse.error.issues);
      return;
    }

    const signedIou: SignedIou = {
      iouId: parse.data.iouId,
      taskId: parse.data.taskId,
      cycleId: parse.data.cycleId,
      debtorAgentId: parse.data.debtorAgentId,
      creditorAgentId: parse.data.creditorAgentId,
      amountCents: parse.data.amountCents,
      signature: parse.data.signature.toLowerCase(),
      signedPayload: parse.data.signedPayload,
      createdAt: parse.data.createdAt,
      expiresAt: parse.data.expiresAt,
    };

    try {
      const result = IouService.recordIou(signedIou, db);
      res.status(201).json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('TASK_NOT_VERIFIED') ||
        msg.includes('INVALID_DOMAIN') ||
        msg.includes('IOU_EXPIRED') ||
        msg.includes('CONTEXT_MISMATCH') ||
        msg.includes('AMOUNT_MISMATCH')
      ) {
        sendError(res, 400, 'INVALID_IOU', msg);
        return;
      }
      if (msg.includes('INVALID_SIGNATURE')) {
        sendError(res, 401, 'INVALID_SIGNATURE', msg);
        return;
      }
      if (msg.includes('TASK_NOT_FOUND') || msg.includes('DEBTOR_NOT_FOUND') || msg.includes('CREDITOR_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      if (msg.includes('UNIQUE constraint failed')) {
        sendError(res, 409, 'DUPLICATE_IOU', 'An IOU has already been issued for this task.');
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.get('/ious/:iouId', (req: Request, res: Response) => {
    const iouId = String(req.params.iouId);
    const iou = db
      .prepare('SELECT iou_id, task_id, cycle_id, debtor_agent_id, creditor_agent_id, amount_cents, signature, signed_payload, created_at FROM ious WHERE iou_id = ?')
      .get(iouId);

    if (!iou) {
      sendError(res, 404, 'NOT_FOUND', `IOU '${iouId}' was not found.`);
      return;
    }
    res.json(iou);
  });

  router.get('/cycles/:cycleId/ious', (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const ious = db
      .prepare('SELECT iou_id, task_id, cycle_id, debtor_agent_id, creditor_agent_id, amount_cents, signature, signed_payload, created_at FROM ious WHERE cycle_id = ?')
      .all(cycleId);

    res.json({ cycleId, ious });
  });

  // =========================================================================
  // 6. CLEARING & FINANCIAL FIREWALL (OPERATOR ONLY)
  // =========================================================================
  router.post('/cycles/:cycleId/net', requireOperatorAuth, (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    try {
      const netting = NettingEngine.computeCycleNetting(cycleId, db);
      res.json(netting);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('CYCLE_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      if (msg.includes('CYCLE_INVALID_STATUS') || msg.includes('NO_IOUS_FOUND')) {
        sendError(res, 400, 'BAD_REQUEST', msg);
        return;
      }
      if (msg.includes('CONSERVATION_VIOLATION')) {
        sendError(res, 500, 'CONSERVATION_VIOLATION', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.post('/cycles/:cycleId/firewall-approve', requireOperatorAuth, (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const parse = FirewallApproveSchema.safeParse(req.body);
    if (!parse.success) {
      sendError(res, 400, 'VALIDATION_ERROR', 'Invalid firewall approval payload', parse.error.issues);
      return;
    }

    const operatorCashCents = parse.data.operatorCashCents ?? 10000;

    try {
      const result = FinancialFirewall.evaluateAndApproveCycle(cycleId, db, operatorCashCents);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('FIREWALL_REJECTION')) {
        sendError(res, 422, 'FIREWALL_REJECTED', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  // =========================================================================
  // 7. DOUBLE-ENTRY SUBLEDGER (OPERATOR ONLY)
  // =========================================================================
  router.get('/ledger/trial-balance', requireOperatorAuth, (_req: Request, res: Response) => {
    const trial = LedgerCore.verifyTrialBalance(db);
    res.json(trial);
  });

  router.get('/ledger/accounts/:accountName', requireOperatorAuth, (req: Request, res: Response) => {
    const accountName = String(req.params.accountName);
    const balance = LedgerCore.getAccountBalance(accountName, db);
    res.json({ accountName, ...balance });
  });

  // =========================================================================
  // 8. SERVER-SENT EVENTS (SSE) MONOTONIC STREAM (WORKSTREAM N)
  // =========================================================================
  router.get('/events/stream', (req: Request, res: Response) => {
    const afterSeq = parseInt(String(req.query.afterSequenceId || '0'), 10);
    const cursor = Number.isNaN(afterSeq) ? 0 : afterSeq;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.flushHeaders?.();

    // 1. Replay historical events from afterSequenceId
    const events = EventBus.readStream(cursor, 500, db);
    let lastEmittedSeq = cursor;

    for (const ev of events) {
      res.write(`id: ${ev.sequenceId}\nevent: ${ev.eventType}\ndata: ${JSON.stringify(ev)}\n\n`);
      lastEmittedSeq = ev.sequenceId;
    }

    const closeAfterReplay = req.query.live === 'false' || req.query.closeAfterReplay === 'true';
    if (closeAfterReplay) {
      res.end();
      return;
    }

    // 2. Set interval to poll and stream newly committed outbox events
    const pollInterval = setInterval(() => {
      try {
        const nextEvents = EventBus.readStream(lastEmittedSeq, 100, db);
        for (const ev of nextEvents) {
          res.write(`id: ${ev.sequenceId}\nevent: ${ev.eventType}\ndata: ${JSON.stringify(ev)}\n\n`);
          lastEmittedSeq = ev.sequenceId;
        }
      } catch {
        // Stream write or read error; ignore on active socket
      }
    }, 500);

    // 3. Heartbeat comment to keep connection alive
    const heartbeatInterval = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 15000);

    req.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      res.end();
    });
  });

  // =========================================================================
  // 9. PAYPAL DEBTOR COLLECTION & CREDITOR DISBURSEMENT (OPERATOR ONLY)
  // =========================================================================
  router.post('/settlement/:cycleId/orders', requireOperatorAuth, async (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const debtorAgentId = String(req.body.debtorAgentId || '');

    if (!debtorAgentId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'debtorAgentId is required in request body.');
      return;
    }

    try {
      const order = await PayPalOrdersService.createDebtorOrder(cycleId, debtorAgentId, db, paypalClient, {
        returnUrl: req.body.returnUrl,
        cancelUrl: req.body.cancelUrl,
      });
      res.status(201).json(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('CYCLE_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      if (msg.includes('INVALID_CYCLE_STATE') || msg.includes('INVALID_DEBTOR')) {
        sendError(res, 400, 'BAD_REQUEST', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.post('/settlement/:cycleId/capture', requireOperatorAuth, async (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const paypalOrderId = String(req.body.paypalOrderId || req.query.paypalOrderId || '');

    if (!paypalOrderId) {
      sendError(res, 400, 'VALIDATION_ERROR', 'paypalOrderId is required.');
      return;
    }

    try {
      const captured = await PayPalOrdersService.captureDebtorOrder(cycleId, paypalOrderId, db, paypalClient);
      res.json(captured);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('ORDER_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.post('/settlement/:cycleId/payouts', requireOperatorAuth, async (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);

    try {
      const batch = await PayPalPayoutsService.dispatchCreditorPayouts(cycleId, db, paypalClient);
      res.status(201).json(batch);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('CYCLE_NOT_FOUND')) {
        sendError(res, 404, 'NOT_FOUND', msg);
        return;
      }
      if (msg.includes('PRECONDITION_FAILED') || msg.includes('INSUFFICIENT_COLLECTED_FUNDS') || msg.includes('NO_NET_CREDITORS')) {
        sendError(res, 400, 'BAD_REQUEST', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  router.get('/settlement/:cycleId/payouts', (req: Request, res: Response) => {
    const cycleId = String(req.params.cycleId);
    const payout = db
      .prepare('SELECT payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents, total_fee_cents, created_at FROM paypal_payouts WHERE cycle_id = ?')
      .get(cycleId);

    if (!payout) {
      sendError(res, 404, 'NOT_FOUND', `Payout batch for cycle '${cycleId}' was not found.`);
      return;
    }

    const items = db
      .prepare('SELECT item_id, creditor_agent_id, sender_item_id, paypal_item_id, amount_cents, fee_cents, receiver_email, status, transaction_id FROM paypal_payout_items WHERE cycle_id = ?')
      .all(cycleId);

    res.json({ payout, items });
  });

  // =========================================================================
  // 10. PAYPAL WEBHOOK INGESTION (WORKSTREAM L)
  // =========================================================================
  router.post('/webhooks/paypal', async (req: Request, res: Response) => {
    const transmissionId = req.header('paypal-transmission-id') || req.header('PAYPAL-TRANSMISSION-ID') || '';
    const transmissionTime = req.header('paypal-transmission-time') || req.header('PAYPAL-TRANSMISSION-TIME') || '';
    const certUrl = req.header('paypal-cert-url') || req.header('PAYPAL-CERT-URL') || '';
    const authAlgo = req.header('paypal-auth-algo') || req.header('PAYPAL-AUTH-ALGO') || '';
    const transmissionSig = req.header('paypal-transmission-sig') || req.header('PAYPAL-TRANSMISSION-SIG') || '';

    try {
      const result = await PayPalWebhookService.processWebhook(
        {
          transmissionId,
          transmissionTime,
          certUrl,
          authAlgo,
          transmissionSig,
        },
        req.body,
        db,
        paypalClient
      );
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('MISSING_WEBHOOK_HEADERS') ||
        msg.includes('MALFORMED_WEBHOOK_BODY') ||
        msg.includes('INVALID_CERT_URL')
      ) {
        sendError(res, 400, 'BAD_REQUEST', msg);
        return;
      }
      if (msg.includes('INVALID_WEBHOOK_SIGNATURE')) {
        sendError(res, 401, 'INVALID_SIGNATURE', msg);
        return;
      }
      sendError(res, 500, 'INTERNAL_ERROR', msg);
    }
  });

  return router;
}
