import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { IPayPalClient } from './paypal-client.js';
import { LedgerCore } from '../ledger/ledger-core.js';

export interface DebtorOrderRecord {
  orderId: string;
  paypalOrderId: string;
  cycleId: string;
  debtorAgentId: string;
  amountCents: number;
  status: string;
  approvalUrl?: string;
  paypalCaptureId?: string;
}

export class PayPalOrdersService {
  /**
   * Prepares and creates a PayPal v2 checkout order for net debtor collection.
   * Enforces: Cycle must be 'FIREWALL_APPROVED', debtor must have an active net debtor position,
   * amount must match the approved net deficit.
   */
  public static async createDebtorOrder(
    cycleId: string,
    debtorAgentId: string,
    db: DatabaseManager,
    client: IPayPalClient,
    options?: { returnUrl?: string; cancelUrl?: string }
  ): Promise<DebtorOrderRecord> {
    // 1. Verify settlement cycle status
    const cycle = db
      .prepare('SELECT cycle_id, status FROM settlement_cycles WHERE cycle_id = ?')
      .get(cycleId) as { cycle_id: string; status: string } | undefined;

    if (!cycle) {
      throw new Error(`CYCLE_NOT_FOUND: Settlement cycle '${cycleId}' does not exist.`);
    }
    if (cycle.status !== 'FIREWALL_APPROVED' && cycle.status !== 'COLLECTION_PENDING') {
      throw new Error(
        `INVALID_CYCLE_STATE: Debtor collection order requires 'FIREWALL_APPROVED' (current: '${cycle.status}').`
      );
    }

    // 2. Fetch debtor net position
    const pos = db
      .prepare('SELECT net_amount_cents, position_type FROM net_positions WHERE cycle_id = ? AND agent_id = ?')
      .get(cycleId, debtorAgentId) as { net_amount_cents: number; position_type: string } | undefined;

    if (!pos || pos.position_type !== 'NET_DEBTOR' || pos.net_amount_cents >= 0) {
      throw new Error(`INVALID_DEBTOR: Agent '${debtorAgentId}' is not an active net debtor in cycle '${cycleId}'.`);
    }

    const collectionAmountCents = Math.abs(pos.net_amount_cents);
    const idempotencyKey = `nexus_order_${cycleId}_${debtorAgentId}`;

    // 3. Check if an order already exists for this idempotency key
    const existingOrder = db
      .prepare('SELECT order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, approval_url, paypal_capture_id FROM paypal_orders WHERE idempotency_key = ?')
      .get(idempotencyKey) as {
        order_id: string;
        paypal_order_id: string;
        cycle_id: string;
        debtor_agent_id: string;
        amount_cents: number;
        status: string;
        approval_url?: string;
        paypal_capture_id?: string;
      } | undefined;

    if (existingOrder) {
      return {
        orderId: existingOrder.order_id,
        paypalOrderId: existingOrder.paypal_order_id,
        cycleId: existingOrder.cycle_id,
        debtorAgentId: existingOrder.debtor_agent_id,
        amountCents: existingOrder.amount_cents,
        status: existingOrder.status,
        approvalUrl: existingOrder.approval_url,
        paypalCaptureId: existingOrder.paypal_capture_id,
      };
    }

    // 4. Call PayPal Orders v2 API
    const response = await client.createOrder({
      idempotencyKey,
      amountCents: collectionAmountCents,
      currency: 'USD',
      customId: cycleId,
      description: `Tally Nexus Settlement Collection for Cycle ${cycleId}`,
      returnUrl: options?.returnUrl,
      cancelUrl: options?.cancelUrl,
    });

    const internalOrderId = uuidv4();

    // 5. Persist inside atomic database transaction
    return db.withTransaction(() => {
      db.prepare(`
        INSERT INTO paypal_orders (order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, idempotency_key, approval_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        internalOrderId,
        response.id,
        cycleId,
        debtorAgentId,
        collectionAmountCents,
        response.status,
        idempotencyKey,
        response.approvalUrl || null
      );

      db.prepare(`
        UPDATE settlement_cycles
        SET status = 'COLLECTION_PENDING'
        WHERE cycle_id = ?
      `).run(cycleId);

      // Record outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'ORDER_CREATED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({
          orderId: internalOrderId,
          paypalOrderId: response.id,
          debtorAgentId,
          amountCents: collectionAmountCents,
          approvalUrl: response.approvalUrl,
        })
      );

      return {
        orderId: internalOrderId,
        paypalOrderId: response.id,
        cycleId,
        debtorAgentId,
        amountCents: collectionAmountCents,
        status: response.status,
        approvalUrl: response.approvalUrl,
      };
    });
  }

  /**
   * Executes authoritative capture of a PayPal checkout order.
   * Dual-path idempotent: can be triggered by operator return redirect or webhook.
   */
  public static async captureDebtorOrder(
    cycleId: string,
    paypalOrderId: string,
    db: DatabaseManager,
    client: IPayPalClient
  ): Promise<DebtorOrderRecord> {
    // 1. Fetch existing order from database
    const order = db
      .prepare('SELECT order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, approval_url, paypal_capture_id FROM paypal_orders WHERE paypal_order_id = ? AND cycle_id = ?')
      .get(paypalOrderId, cycleId) as {
        order_id: string;
        paypal_order_id: string;
        cycle_id: string;
        debtor_agent_id: string;
        amount_cents: number;
        status: string;
        approval_url?: string;
        paypal_capture_id?: string;
      } | undefined;

    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: PayPal order '${paypalOrderId}' not found for cycle '${cycleId}'.`);
    }

    // Idempotency: If already completed, exit cleanly
    if (order.status === 'COMPLETED' && order.paypal_capture_id) {
      return {
        orderId: order.order_id,
        paypalOrderId: order.paypal_order_id,
        cycleId: order.cycle_id,
        debtorAgentId: order.debtor_agent_id,
        amountCents: order.amount_cents,
        status: 'COMPLETED',
        approvalUrl: order.approval_url,
        paypalCaptureId: order.paypal_capture_id,
      };
    }

    // 2. Call PayPal Capture API with capture idempotency key
    const captureIdempotencyKey = `nexus_cap_${cycleId}_${order.order_id}`;
    const captureRes = await client.captureOrder(paypalOrderId, captureIdempotencyKey);

    const now = new Date().toISOString();

    // 3. Atomic Database Update & Double-Entry Ledger Allocation
    return db.withTransaction(() => {
      db.prepare(`
        UPDATE paypal_orders
        SET status = 'COMPLETED',
            captured_at = ?,
            paypal_capture_id = ?
        WHERE order_id = ?
      `).run(now, captureRes.captureId, order.order_id);

      db.prepare(`
        UPDATE settlement_cycles
        SET status = 'CAPTURED'
        WHERE cycle_id = ?
      `).run(cycleId);

      // 4. Double-Entry Subledger Allocation:
      // Allocate custodial funds to net creditor liability accounts
      const creditors = db
        .prepare('SELECT agent_id, net_amount_cents FROM net_positions WHERE cycle_id = ? AND position_type = ?')
        .all(cycleId, 'NET_CREDITOR') as Array<{ agent_id: string; net_amount_cents: number }>;

      for (const creditor of creditors) {
        LedgerCore.recordEntry(
          {
            cycleId,
            debitAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
            creditAccount: `LIABILITY:CREDITOR_PAYABLE:${creditor.agent_id}`,
            amountCents: creditor.net_amount_cents,
            reason: 'DEBTOR_COLLECTION_CAPTURED',
            externalRef: captureRes.captureId,
          },
          db
        );
      }

      // Record outbox events
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'ORDER_CAPTURED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({
          orderId: order.order_id,
          paypalOrderId,
          captureId: captureRes.captureId,
          amountCents: order.amount_cents,
        })
      );

      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'CYCLE_CAPTURED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({
          cycleId,
          totalCollectedCents: order.amount_cents,
          captureId: captureRes.captureId,
        })
      );

      return {
        orderId: order.order_id,
        paypalOrderId,
        cycleId,
        debtorAgentId: order.debtor_agent_id,
        amountCents: order.amount_cents,
        status: 'COMPLETED',
        approvalUrl: order.approval_url,
        paypalCaptureId: captureRes.captureId,
      };
    });
  }
}
