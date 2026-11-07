import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { IPayPalClient, CaptureOrderResponse } from './paypal-client.js';
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
   * Enforces: Cycle must be 'FIREWALL_APPROVED' or 'COLLECTION_PENDING', debtor must have an active net debtor position,
   * amount must match the approved net deficit.
   * Concurrency-safe: If concurrent requests attempt creation for the same debtor, returns the existing record without 500 error.
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

    const checkExistingOrder = (): DebtorOrderRecord | null => {
      const row = db
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

      if (!row) return null;
      return {
        orderId: row.order_id,
        paypalOrderId: row.paypal_order_id,
        cycleId: row.cycle_id,
        debtorAgentId: row.debtor_agent_id,
        amountCents: row.amount_cents,
        status: row.status,
        approvalUrl: row.approval_url,
        paypalCaptureId: row.paypal_capture_id,
      };
    };

    // 3. Check if an order already exists for this idempotency key
    const existing = checkExistingOrder();
    if (existing) {
      return existing;
    }

    // 4. Call PayPal Orders v2 API outside of any database transaction
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

    // 5. Persist inside atomic database transaction with concurrent idempotency handling
    return db.withTransaction(() => {
      // Re-verify inside lock in case a concurrent worker inserted it while calling PayPal
      const concurrentExisting = checkExistingOrder();
      if (concurrentExisting) {
        return concurrentExisting;
      }

      try {
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('UNIQUE constraint failed') || msg.includes('constraint failed')) {
          const insertedByRace = checkExistingOrder();
          if (insertedByRace) {
            return insertedByRace;
          }
        }
        throw err;
      }

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
   * Concurrency-safe: Prevents check-then-act race conditions and duplicate ledger postings.
   * Multi-debtor compliant: Maintains per-debtor collections and advances cycle to CAPTURED
   * only when all net debtors have fulfilled their obligations.
   */
  public static async captureDebtorOrder(
    cycleId: string,
    paypalOrderId: string,
    db: DatabaseManager,
    client: IPayPalClient,
    options?: { knownCaptureId?: string }
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

    // Fast-path idempotency: If already completed in local DB, exit immediately
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

    // 2. Resolve external capture outcome
    let captureRes: CaptureOrderResponse;
    const captureIdempotencyKey = `nexus_cap_${cycleId}_${order.order_id}`;

    if (options?.knownCaptureId) {
      captureRes = {
        id: paypalOrderId,
        status: 'COMPLETED',
        captureId: options.knownCaptureId,
      };
    } else {
      try {
        captureRes = await client.captureOrder(paypalOrderId, captureIdempotencyKey);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('ORDER_ALREADY_CAPTURED')) {
          // Authoritative reconciliation: Order was already captured on PayPal
          captureRes = {
            id: paypalOrderId,
            status: 'COMPLETED',
            captureId: `CAP-${paypalOrderId}`,
          };
        } else {
          throw err;
        }
      }
    }

    const now = new Date().toISOString();

    // 3. Atomic Database Update & Double-Entry Invariant Enforcement
    return db.withTransaction(() => {
      // P1-02 CONCURRENCY FIX: Re-read order inside transaction lock!
      const freshOrder = db
        .prepare('SELECT order_id, paypal_order_id, cycle_id, debtor_agent_id, amount_cents, status, approval_url, paypal_capture_id FROM paypal_orders WHERE order_id = ?')
        .get(order.order_id) as {
          order_id: string;
          paypal_order_id: string;
          cycle_id: string;
          debtor_agent_id: string;
          amount_cents: number;
          status: string;
          approval_url?: string;
          paypal_capture_id?: string;
        };

      if (freshOrder.status === 'COMPLETED' && freshOrder.paypal_capture_id) {
        // A concurrent capture execution already finalized the ledger postings!
        return {
          orderId: freshOrder.order_id,
          paypalOrderId: freshOrder.paypal_order_id,
          cycleId: freshOrder.cycle_id,
          debtorAgentId: freshOrder.debtor_agent_id,
          amountCents: freshOrder.amount_cents,
          status: 'COMPLETED',
          approvalUrl: freshOrder.approval_url,
          paypalCaptureId: freshOrder.paypal_capture_id,
        };
      }

      // Finalize this debtor's order
      db.prepare(`
        UPDATE paypal_orders
        SET status = 'COMPLETED',
            captured_at = ?,
            paypal_capture_id = ?
        WHERE order_id = ?
      `).run(now, captureRes.captureId, order.order_id);

      // Double-entry accounting: Record cash collection into intermediate clearing account
      // Debit: ASSET:PAYPAL_SETTLEMENT_CASH (exact debtor collected amount)
      // Credit: LIABILITY:COLLECTION_IN_CLEARING (exact debtor collected amount)
      LedgerCore.recordEntry(
        {
          cycleId,
          debitAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          creditAccount: 'LIABILITY:COLLECTION_IN_CLEARING',
          amountCents: order.amount_cents,
          reason: 'DEBTOR_COLLECTION_CAPTURED',
          externalRef: captureRes.captureId,
        },
        db
      );

      // Emit ORDER_CAPTURED outbox event
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
          debtorAgentId: order.debtor_agent_id,
        })
      );

      // P1-01 MULTI-DEBTOR ACCOUNTING FIX:
      // Verify whether ALL net debtors in this settlement cycle have completed collection
      const netDebtors = db
        .prepare('SELECT agent_id, net_amount_cents FROM net_positions WHERE cycle_id = ? AND position_type = ?')
        .all(cycleId, 'NET_DEBTOR') as Array<{ agent_id: string; net_amount_cents: number }>;

      const totalRequiredDebtorCents = netDebtors.reduce((sum, d) => sum + Math.abs(d.net_amount_cents), 0);

      const completedOrders = db
        .prepare("SELECT debtor_agent_id, amount_cents FROM paypal_orders WHERE cycle_id = ? AND status = 'COMPLETED'")
        .all(cycleId) as Array<{ debtor_agent_id: string; amount_cents: number }>;

      const totalCollectedCents = completedOrders.reduce((sum, o) => sum + o.amount_cents, 0);

      // Every debtor must have their required net deficit satisfied
      const allDebtorsSatisfied = netDebtors.every((debtor) => {
        const collectedForDebtor = completedOrders
          .filter((o) => o.debtor_agent_id === debtor.agent_id)
          .reduce((sum, o) => sum + o.amount_cents, 0);
        return collectedForDebtor >= Math.abs(debtor.net_amount_cents);
      });

      if (allDebtorsSatisfied && totalCollectedCents >= totalRequiredDebtorCents) {
        // ALL DEBTORS COLLECTED: Authoritatively transition cycle to CAPTURED
        db.prepare(`
          UPDATE settlement_cycles
          SET status = 'CAPTURED'
          WHERE cycle_id = ?
        `).run(cycleId);

        // Allocate clearing funds to net creditors:
        // Debit: LIABILITY:COLLECTION_IN_CLEARING (exact amount owed)
        // Credit: LIABILITY:CREDITOR_PAYABLE:{creditor.agent_id} (exact creditor entitlement)
        const creditors = db
          .prepare('SELECT agent_id, net_amount_cents FROM net_positions WHERE cycle_id = ? AND position_type = ?')
          .all(cycleId, 'NET_CREDITOR') as Array<{ agent_id: string; net_amount_cents: number }>;

        for (const creditor of creditors) {
          LedgerCore.recordEntry(
            {
              cycleId,
              debitAccount: 'LIABILITY:COLLECTION_IN_CLEARING',
              creditAccount: `LIABILITY:CREDITOR_PAYABLE:${creditor.agent_id}`,
              amountCents: creditor.net_amount_cents,
              reason: 'CREDITOR_ALLOCATION_AUTHORIZED',
              externalRef: `cycle_alloc_${cycleId}_${creditor.agent_id}`,
            },
            db
          );
        }

        db.prepare(`
          INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
          VALUES (?, 'CYCLE_CAPTURED', ?, ?)
        `).run(
          uuidv4(),
          cycleId,
          JSON.stringify({
            cycleId,
            totalCollectedCents,
            debtorCount: netDebtors.length,
            creditorCount: creditors.length,
          })
        );
      } else {
        // Partial collection: Cycle remains COLLECTION_PENDING
        // Payouts remain locked until all debtors satisfy obligations
        db.prepare(`
          INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
          VALUES (?, 'CYCLE_PARTIALLY_COLLECTED', ?, ?)
        `).run(
          uuidv4(),
          cycleId,
          JSON.stringify({
            cycleId,
            collectedCents: totalCollectedCents,
            requiredCents: totalRequiredDebtorCents,
            completedDebtors: completedOrders.length,
            totalDebtors: netDebtors.length,
          })
        );
      }

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
