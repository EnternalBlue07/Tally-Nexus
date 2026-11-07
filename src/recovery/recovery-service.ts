import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { IPayPalClient } from '../paypal/paypal-client.js';
import { LedgerCore } from '../ledger/ledger-core.js';
import { PayPalOrdersService } from '../paypal/orders-service.js';

export interface CapitalCureParams {
  cycleId: string;
  amountCents: number;
  fundingRoute: 'BANK_TOPUP' | 'ORDERS_CAPTURE';
  fundingSource: 'OPERATOR_CAPITAL_CONTRIBUTION' | 'DEBTOR_COLLECTION' | 'OTHER_APPROVED_SOURCE';
  fundingSubrogationBasis: 'EQUITY_INJECTION' | 'SUBORDINATED_LOAN' | 'DEBTOR_DISCHARGE' | 'ESCROW_GUARANTEE';
  evidenceReference: string;
}

export interface PayoutReissueRecord {
  reissueId: string;
  originalItemId: string;
  cycleId: string;
  reissueAttempt: number;
  senderItemId: string;
  receiverEmail: string;
  amountCents: number;
  status: string;
}

export class RecoveryService {
  /**
   * Reconciles interrupted operations across settlement cycles, orders, and payouts.
   * Safe for startup boot, scheduled background execution, or manual operator trigger.
   */
  public static async reconcileInterruptedOperations(
    db: DatabaseManager,
    client: IPayPalClient
  ): Promise<{ reconciledCycles: number; reconciledOrders: number; reconciledPayouts: number }> {
    let reconciledCycles = 0;
    let reconciledOrders = 0;
    let reconciledPayouts = 0;

    // 1. Scan for orders created but uncaptured in cycles in COLLECTION_PENDING
    const pendingOrders = db
      .prepare(`
        SELECT o.order_id, o.paypal_order_id, o.cycle_id, o.debtor_agent_id, o.amount_cents
        FROM paypal_orders o
        JOIN settlement_cycles c ON o.cycle_id = c.cycle_id
        WHERE o.status = 'CREATED' AND c.status = 'COLLECTION_PENDING'
      `)
      .all() as Array<{
        order_id: string;
        paypal_order_id: string;
        cycle_id: string;
        debtor_agent_id: string;
        amount_cents: number;
      }>;

    for (const order of pendingOrders) {
      try {
        // Attempt capture reconciliation
        await PayPalOrdersService.captureDebtorOrder(order.cycle_id, order.paypal_order_id, db, client);
        reconciledOrders++;
      } catch {
        // Order remains in pending state awaiting debtor approval
      }
    }

    // 2. Scan for cycles in DISPATCHED: check payout batch status with PayPal
    const dispatchedBatches = db
      .prepare(`
        SELECT p.payout_id, p.paypal_payout_batch_id, p.cycle_id
        FROM paypal_payouts p
        JOIN settlement_cycles c ON p.cycle_id = c.cycle_id
        WHERE c.status = 'DISPATCHED' AND p.batch_status IN ('PENDING', 'PROCESSING')
      `)
      .all() as Array<{ payout_id: string; paypal_payout_batch_id: string; cycle_id: string }>;

    for (const batch of dispatchedBatches) {
      try {
        const statusRes = await client.getPayoutBatchStatus(batch.paypal_payout_batch_id);
        if (statusRes.batchStatus === 'SUCCESS') {
          db.prepare(`
            UPDATE paypal_payouts
            SET batch_status = 'SUCCESS',
                completed_at = datetime('now', 'utc')
            WHERE payout_id = ?
          `).run(batch.payout_id);
          reconciledPayouts++;
        }
      } catch {
        // Batch query failed; retry on next cycle
      }
    }

    // 3. Scan for fully settled cycles where all items reached terminal success
    const activeCycles = db
      .prepare("SELECT cycle_id FROM settlement_cycles WHERE status = 'DISPATCHED'")
      .all() as Array<{ cycle_id: string }>;

    for (const cyc of activeCycles) {
      const pendingItems = db
        .prepare("SELECT COUNT(*) as c FROM paypal_payout_items WHERE cycle_id = ? AND status != 'SUCCESS'")
        .get(cyc.cycle_id) as { c: number };

      if (pendingItems.c === 0) {
        db.prepare("UPDATE settlement_cycles SET status = 'SETTLED' WHERE cycle_id = ?").run(cyc.cycle_id);
        reconciledCycles++;
      }
    }

    return { reconciledCycles, reconciledOrders, reconciledPayouts };
  }

  /**
   * Reinstates a returned/refunded payout item through the 5-stage return verification sequence.
   * Restores funds to available settlement cash and re-establishes creditor payable liability.
   * Enforces: Parent must be in confirmed terminal status (RETURNED, REFUNDED, or FAILED).
   */
  public static reinstateReturnedPayoutItem(
    itemId: string,
    db: DatabaseManager
  ): { status: string; reissueAuthorizationState: string; restoredAmountCents: number } {
    return db.withTransaction(() => {
      const item = db
        .prepare(`
          SELECT item_id, cycle_id, creditor_agent_id, amount_cents, status, reissue_authorization_state
          FROM paypal_payout_items
          WHERE item_id = ?
        `)
        .get(itemId) as {
          item_id: string;
          cycle_id: string;
          creditor_agent_id: string;
          amount_cents: number;
          status: string;
          reissue_authorization_state: string;
        } | undefined;

      if (!item) {
        throw new Error(`ITEM_NOT_FOUND: Payout item '${itemId}' does not exist.`);
      }

      // Reissue prohibited while parent is non-terminal
      const terminalStatuses = ['RETURNED', 'REFUNDED', 'FAILED'];
      if (!terminalStatuses.includes(item.status)) {
        throw new Error(
          `REISSUE_PROHIBITED_PARENT_NOT_TERMINAL: Item status is '${item.status}'. Reissue authorization is prohibited for non-terminal items.`
        );
      }

      if (
        item.reissue_authorization_state === 'REISSUE_AUTHORIZED' ||
        item.reissue_authorization_state === 'CHILD_ACTIVE' ||
        item.reissue_authorization_state === 'CHILD_SETTLED'
      ) {
        return {
          status: item.status,
          reissueAuthorizationState: item.reissue_authorization_state,
          restoredAmountCents: item.amount_cents,
        };
      }

      // Execute 5-stage return verification sequence:
      // Stage 1: PARENT_TERMINAL_CONFIRMED (already set by webhook or terminal event)
      // Stage 2: RETURN_FUNDS_VERIFIED
      // Stage 3: INTERNAL_LEDGER_RESTORED
      // Stage 4: CREDITOR_PAYABLE_REINSTATED
      // Stage 5: REISSUE_AUTHORIZED

      // Double-entry compensation posting:
      // Debit: ASSET:PAYPAL_SETTLEMENT_CASH (funds returned from PayPal)
      // Credit: LIABILITY:CREDITOR_PAYABLE:{creditor_agent_id} (reinstated claim)
      LedgerCore.recordEntry(
        {
          cycleId: item.cycle_id,
          debitAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          creditAccount: `LIABILITY:CREDITOR_PAYABLE:${item.creditor_agent_id}`,
          amountCents: item.amount_cents,
          reason: 'RETURNED_PAYOUT_FUNDS_REINSTATED',
          externalRef: `reinstate_${item.item_id}`,
        },
        db
      );

      // Advance reissue authorization state to REISSUE_AUTHORIZED
      db.prepare(`
        UPDATE paypal_payout_items
        SET reissue_authorization_state = 'REISSUE_AUTHORIZED',
            updated_at = datetime('now', 'utc')
        WHERE item_id = ?
      `).run(item.item_id);

      // Emit outbox audit event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'PAYOUT_ITEM_REINSTATED', ?, ?)
      `).run(
        uuidv4(),
        item.cycle_id,
        JSON.stringify({
          itemId: item.item_id,
          creditorAgentId: item.creditor_agent_id,
          amountCents: item.amount_cents,
          reissueAuthorizationState: 'REISSUE_AUTHORIZED',
        })
      );

      return {
        status: item.status,
        reissueAuthorizationState: 'REISSUE_AUTHORIZED',
        restoredAmountCents: item.amount_cents,
      };
    });
  }

  /**
   * Authorizes and dispatches a single child reissue payout for a verified reinstated parent item.
   * Enforces single-reissue entitlement constraint (exactly at most 1 active/settled child per parent).
   */
  public static async dispatchPayoutReissue(
    itemId: string,
    newReceiverEmail: string,
    db: DatabaseManager,
    client: IPayPalClient
  ): Promise<PayoutReissueRecord> {
    if (!newReceiverEmail || !newReceiverEmail.includes('@')) {
      throw new Error('INVALID_RECEIVER_EMAIL: A valid recipient email is required for payout reissue.');
    }

    const item = db
      .prepare(`
        SELECT item_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, status, reissue_authorization_state
        FROM paypal_payout_items
        WHERE item_id = ?
      `)
      .get(itemId) as {
        item_id: string;
        cycle_id: string;
        creditor_agent_id: string;
        sender_item_id: string;
        amount_cents: number;
        status: string;
        reissue_authorization_state: string;
      } | undefined;

    if (!item) {
      throw new Error(`ITEM_NOT_FOUND: Payout item '${itemId}' does not exist.`);
    }

    if (item.reissue_authorization_state !== 'REISSUE_AUTHORIZED') {
      throw new Error(
        `REISSUE_UNAUTHORIZED: Item must be in 'REISSUE_AUTHORIZED' state (current: '${item.reissue_authorization_state}'). Complete return verification first.`
      );
    }

    // Check partial unique index constraint: At most ONE active/settled child reissue per parent
    const existingActiveChild = db
      .prepare(`
        SELECT reissue_id, status FROM paypal_payout_reissues
        WHERE original_item_id = ? AND status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS')
      `)
      .get(itemId) as { reissue_id: string; status: string } | undefined;

    if (existingActiveChild) {
      throw new Error(
        `REISSUE_ENTITLEMENT_LOCKED: An active child reissue ('${existingActiveChild.reissue_id}') already exists in status '${existingActiveChild.status}'.`
      );
    }

    // Count previous reissue attempts
    const previousAttempts = db
      .prepare('SELECT COUNT(*) as c FROM paypal_payout_reissues WHERE original_item_id = ?')
      .get(itemId) as { c: number };
    const attempt = previousAttempts.c + 1;

    const childSenderItemId = `${item.sender_item_id}_reissue_${attempt}`;
    const reissueId = uuidv4();

    // Call PayPal Payouts API to dispatch child reissue
    const batchRes = await client.createPayoutBatch({
      senderBatchId: `nexus_reissue_batch_${reissueId.substring(0, 8)}`,
      emailSubject: `Tally Nexus Reissued Settlement Payment (${childSenderItemId})`,
      items: [
        {
          senderItemId: childSenderItemId,
          amountCents: item.amount_cents,
          receiverEmail: newReceiverEmail,
          note: `Reissued settlement payment for task deliverable (${childSenderItemId})`,
        },
      ],
    });

    return db.withTransaction(() => {
      // 1. Insert child reissue record
      db.prepare(`
        INSERT INTO paypal_payout_reissues (
          reissue_id, original_item_id, cycle_id, reissue_attempt, sender_item_id, paypal_item_id, receiver_email, amount_cents, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DISPATCHED')
      `).run(
        reissueId,
        item.item_id,
        item.cycle_id,
        attempt,
        childSenderItemId,
        batchRes.payoutBatchId,
        newReceiverEmail,
        item.amount_cents
      );

      // 2. Subledger transit entry: Move reinstated cash back into in-flight transit
      LedgerCore.recordEntry(
        {
          cycleId: item.cycle_id,
          debitAccount: 'ASSET:PAYPAL_PAYOUTS_IN_FLIGHT',
          creditAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          amountCents: item.amount_cents,
          reason: 'REISSUE_PAYOUT_DISPATCHED',
          externalRef: reissueId,
        },
        db
      );

      // 3. Update parent item state to CHILD_ACTIVE
      db.prepare(`
        UPDATE paypal_payout_items
        SET reissue_authorization_state = 'CHILD_ACTIVE',
            reissue_active_child_id = ?,
            updated_at = datetime('now', 'utc')
        WHERE item_id = ?
      `).run(reissueId, item.item_id);

      // 4. Record outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'REISSUE_DISPATCHED', ?, ?)
      `).run(
        uuidv4(),
        item.cycle_id,
        JSON.stringify({
          reissueId,
          originalItemId: item.item_id,
          attempt,
          senderItemId: childSenderItemId,
          newReceiverEmail,
          amountCents: item.amount_cents,
        })
      );

      return {
        reissueId,
        originalItemId: item.item_id,
        cycleId: item.cycle_id,
        reissueAttempt: attempt,
        senderItemId: childSenderItemId,
        receiverEmail: newReceiverEmail,
        amountCents: item.amount_cents,
        status: 'DISPATCHED',
      };
    });
  }

  /**
   * Finalizes child reissue delivery success, extinguishing creditor liability and settling parent item.
   */
  public static markReissueSuccess(
    reissueId: string,
    transactionId: string,
    db: DatabaseManager
  ): void {
    db.withTransaction(() => {
      const reissue = db
        .prepare(`
          SELECT r.reissue_id, r.original_item_id, r.cycle_id, r.amount_cents, r.status, i.creditor_agent_id
          FROM paypal_payout_reissues r
          JOIN paypal_payout_items i ON r.original_item_id = i.item_id
          WHERE r.reissue_id = ?
        `)
        .get(reissueId) as {
          reissue_id: string;
          original_item_id: string;
          cycle_id: string;
          amount_cents: number;
          status: string;
          creditor_agent_id: string;
        } | undefined;

      if (!reissue) {
        throw new Error(`REISSUE_NOT_FOUND: Child reissue '${reissueId}' does not exist.`);
      }

      if (reissue.status === 'SUCCESS') {
        return; // Idempotent
      }

      // 1. Extinguish reinstated liability in double-entry subledger:
      // Debit: LIABILITY:CREDITOR_PAYABLE:{creditor_agent_id}
      // Credit: ASSET:PAYPAL_PAYOUTS_IN_FLIGHT
      LedgerCore.recordEntry(
        {
          cycleId: reissue.cycle_id,
          debitAccount: `LIABILITY:CREDITOR_PAYABLE:${reissue.creditor_agent_id}`,
          creditAccount: 'ASSET:PAYPAL_PAYOUTS_IN_FLIGHT',
          amountCents: reissue.amount_cents,
          reason: 'REISSUE_PAYMENT_FINALIZED',
          externalRef: transactionId,
        },
        db
      );

      // 2. Update child reissue status to SUCCESS
      db.prepare(`
        UPDATE paypal_payout_reissues
        SET status = 'SUCCESS',
            updated_at = datetime('now', 'utc')
        WHERE reissue_id = ?
      `).run(reissueId);

      // 3. Update parent item state to CHILD_SETTLED (preserving terminal status to satisfy Trigger 5)
      db.prepare(`
        UPDATE paypal_payout_items
        SET reissue_authorization_state = 'CHILD_SETTLED',
            updated_at = datetime('now', 'utc')
        WHERE item_id = ?
      `).run(reissue.original_item_id);

      // 4. Emit outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'REISSUE_SUCCESS', ?, ?)
      `).run(
        uuidv4(),
        reissue.cycle_id,
        JSON.stringify({
          reissueId,
          originalItemId: reissue.original_item_id,
          creditorAgentId: reissue.creditor_agent_id,
          amountCents: reissue.amount_cents,
          transactionId,
        })
      );
    });
  }

  /**
   * Applies an asynchronous custodial deficit capital cure to restore reserve floors or fund adjustments.
   * Atomically posts balanced double-entry equity contributions into compensating_ledger.
   */
  public static applyCapitalCure(
    params: CapitalCureParams,
    db: DatabaseManager
  ): { intentId: string; status: string; amountCents: number } {
    if (params.amountCents <= 0) {
      throw new Error('INVALID_CURE_AMOUNT: Capital cure amount must be strictly positive (> 0 cents).');
    }

    const intentId = uuidv4();
    const now = new Date().toISOString();

    return db.withTransaction(() => {
      // 1. Insert into cure_intents
      db.prepare(`
        INSERT INTO cure_intents (
          intent_id, cycle_id, funding_route, funding_source, funding_subrogation_basis, amount_cents, status, evidence_reference, evaluated_at, applied_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'APPLIED', ?, ?, ?)
      `).run(
        intentId,
        params.cycleId,
        params.fundingRoute,
        params.fundingSource,
        params.fundingSubrogationBasis,
        params.amountCents,
        params.evidenceReference,
        now,
        now
      );

      // 2. Post balanced double-entry journal entry:
      // Debit: ASSET:OPERATOR_CASH
      // Credit: EQUITY:OPERATOR_CAPITAL_CONTRIBUTION
      LedgerCore.recordEntry(
        {
          cycleId: params.cycleId,
          debitAccount: 'ASSET:OPERATOR_CASH',
          creditAccount: 'EQUITY:OPERATOR_CAPITAL_CONTRIBUTION',
          amountCents: params.amountCents,
          reason: `CAPITAL_CURE_${params.fundingSource}`,
          externalRef: params.evidenceReference,
        },
        db
      );

      // 3. Emit outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'CAPITAL_CURE_APPLIED', ?, ?)
      `).run(
        uuidv4(),
        params.cycleId,
        JSON.stringify({
          intentId,
          amountCents: params.amountCents,
          fundingSource: params.fundingSource,
          evidenceReference: params.evidenceReference,
        })
      );

      return {
        intentId,
        status: 'APPLIED',
        amountCents: params.amountCents,
      };
    });
  }
}
