import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { IPayPalClient, PayoutItemParam } from './paypal-client.js';
import { LedgerCore } from '../ledger/ledger-core.js';

export interface PayoutBatchRecord {
  payoutId: string;
  paypalPayoutBatchId: string;
  cycleId: string;
  senderBatchId: string;
  batchStatus: string;
  totalAmountCents: number;
  itemCount: number;
}

export class PayPalPayoutsService {
  /**
   * Dispatches a single atomic batch payout to all net creditors in a settlement cycle.
   * Preconditions:
   * 1. settlement_cycles.status === 'CAPTURED'
   * 2. Confirmed collected funds >= sum of net creditor entitlements
   * 3. Batch acceptance is treated strictly as PENDING/SUBMITTED, never PAID.
   */
  public static async dispatchCreditorPayouts(
    cycleId: string,
    db: DatabaseManager,
    client: IPayPalClient
  ): Promise<PayoutBatchRecord> {
    // 1. Check if payout batch already exists (Idempotency Guard)
    const existingPayout = db
      .prepare('SELECT payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents FROM paypal_payouts WHERE cycle_id = ?')
      .get(cycleId) as {
        payout_id: string;
        paypal_payout_batch_id: string;
        cycle_id: string;
        sender_batch_id: string;
        batch_status: string;
        total_amount_cents: number;
      } | undefined;

    if (existingPayout) {
      const itemCountRow = db.prepare('SELECT COUNT(*) as c FROM paypal_payout_items WHERE cycle_id = ?').get(cycleId) as { c: number };
      return {
        payoutId: existingPayout.payout_id,
        paypalPayoutBatchId: existingPayout.paypal_payout_batch_id,
        cycleId: existingPayout.cycle_id,
        senderBatchId: existingPayout.sender_batch_id,
        batchStatus: existingPayout.batch_status,
        totalAmountCents: existingPayout.total_amount_cents,
        itemCount: itemCountRow.c,
      };
    }

    // 2. Verify cycle state
    const cycle = db
      .prepare('SELECT cycle_id, status FROM settlement_cycles WHERE cycle_id = ?')
      .get(cycleId) as { cycle_id: string; status: string } | undefined;

    if (!cycle) {
      throw new Error(`CYCLE_NOT_FOUND: Settlement cycle '${cycleId}' does not exist.`);
    }
    if (cycle.status !== 'CAPTURED') {
      throw new Error(
        `PRECONDITION_FAILED: Payouts require cycle in 'CAPTURED' status (current: '${cycle.status}').`
      );
    }

    // 2. Fetch all net creditors with verified receiver emails
    const creditors = db
      .prepare(`
        SELECT p.agent_id, p.net_amount_cents, a.paypal_receiver_email
        FROM net_positions p
        JOIN agents a ON p.agent_id = a.agent_id
        WHERE p.cycle_id = ? AND p.position_type = 'NET_CREDITOR'
      `)
      .all(cycleId) as Array<{ agent_id: string; net_amount_cents: number; paypal_receiver_email: string }>;

    if (creditors.length === 0) {
      throw new Error(`NO_NET_CREDITORS: Settlement cycle '${cycleId}' has zero net creditors to disburse to.`);
    }

    const totalCreditorCents = creditors.reduce((sum, c) => sum + c.net_amount_cents, 0);

    // Verify debtor collected cash in subledger matches or exceeds entitlement
    const settlementCash = LedgerCore.getAccountBalance('ASSET:PAYPAL_SETTLEMENT_CASH', db);
    if (settlementCash.netDebitBalance < totalCreditorCents) {
      throw new Error(
        `INSUFFICIENT_COLLECTED_FUNDS: Available settlement cash (${settlementCash.netDebitBalance}c) < required creditor total (${totalCreditorCents}c).`
      );
    }

    // 3. Stable idempotency key per cycle
    const senderBatchId = `nexus_payout_batch_${cycleId}`;

    // 4. Construct items
    const payoutItems: PayoutItemParam[] = creditors.map((c) => ({
      senderItemId: `${cycleId}_item_${c.agent_id}`,
      amountCents: c.net_amount_cents,
      receiverEmail: c.paypal_receiver_email,
      note: `Tally Nexus Multilateral Clearing settlement for Cycle ${cycleId}`,
    }));

    // 5. Call PayPal Payouts API
    const response = await client.createPayoutBatch({
      senderBatchId,
      emailSubject: `Tally Nexus Settlement Disbursement: Cycle ${cycleId}`,
      items: payoutItems,
    });

    const payoutId = uuidv4();

    // 6. Atomic Database Transaction: Record batch, items, subledger transit, and advance state
    return db.withTransaction(() => {
      db.prepare(`
        INSERT INTO paypal_payouts (payout_id, paypal_payout_batch_id, cycle_id, sender_batch_id, batch_status, total_amount_cents)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        payoutId,
        response.payoutBatchId,
        cycleId,
        senderBatchId,
        response.batchStatus, // Strictly 'PENDING' / 'SUBMITTED'
        totalCreditorCents
      );

      const insertItemStmt = db.prepare(`
        INSERT INTO paypal_payout_items (item_id, payout_id, cycle_id, creditor_agent_id, sender_item_id, amount_cents, receiver_email, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')
      `);

      for (const item of payoutItems) {
        const creditor = creditors.find((c) => `${cycleId}_item_${c.agent_id}` === item.senderItemId)!;
        insertItemStmt.run(
          uuidv4(),
          payoutId,
          cycleId,
          creditor.agent_id,
          item.senderItemId,
          item.amountCents,
          item.receiverEmail
        );
      }

      // Subledger transit entry: Move custodial funds from available cash to in-flight transit
      LedgerCore.recordEntry(
        {
          cycleId,
          debitAccount: 'ASSET:PAYPAL_PAYOUTS_IN_FLIGHT',
          creditAccount: 'ASSET:PAYPAL_SETTLEMENT_CASH',
          amountCents: totalCreditorCents,
          reason: 'CREDITOR_PAYOUT_BATCH_DISPATCHED',
          externalRef: response.payoutBatchId,
        },
        db
      );

      // Cycle status -> DISPATCHED
      db.prepare(`
        UPDATE settlement_cycles
        SET status = 'DISPATCHED'
        WHERE cycle_id = ?
      `).run(cycleId);

      // Outbox event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'PAYOUT_DISPATCHED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({
          payoutId,
          paypalPayoutBatchId: response.payoutBatchId,
          totalAmountCents: totalCreditorCents,
          itemCount: creditors.length,
          batchStatus: response.batchStatus,
        })
      );

      return {
        payoutId,
        paypalPayoutBatchId: response.payoutBatchId,
        cycleId,
        senderBatchId,
        batchStatus: response.batchStatus,
        totalAmountCents: totalCreditorCents,
        itemCount: creditors.length,
      };
    });
  }

  /**
   * Finalizes an individual payout item upon delivery success, extinguishing clearinghouse liability.
   */
  public static markItemSuccess(
    senderItemId: string,
    transactionId: string,
    feeCents: number,
    db: DatabaseManager
  ): void {
    db.withTransaction(() => {
      const item = db
        .prepare('SELECT item_id, cycle_id, creditor_agent_id, amount_cents, status FROM paypal_payout_items WHERE sender_item_id = ?')
        .get(senderItemId) as {
          item_id: string;
          cycle_id: string;
          creditor_agent_id: string;
          amount_cents: number;
          status: string;
        } | undefined;

      if (!item) {
        throw new Error(`ITEM_NOT_FOUND: Payout item with sender_item_id '${senderItemId}' does not exist.`);
      }

      // Idempotent: If already SUCCESS, no-op
      if (item.status === 'SUCCESS') {
        return;
      }

      // 1. Extinguish liability in double-entry subledger:
      // Debit LIABILITY:CREDITOR_PAYABLE:{agent_id}
      // Credit ASSET:PAYPAL_PAYOUTS_IN_FLIGHT
      LedgerCore.recordEntry(
        {
          cycleId: item.cycle_id,
          debitAccount: `LIABILITY:CREDITOR_PAYABLE:${item.creditor_agent_id}`,
          creditAccount: 'ASSET:PAYPAL_PAYOUTS_IN_FLIGHT',
          amountCents: item.amount_cents,
          reason: 'CREDITOR_PAYMENT_FINALIZED',
          externalRef: transactionId,
        },
        db
      );

      // 2. Update item status to SUCCESS
      db.prepare(`
        UPDATE paypal_payout_items
        SET status = 'SUCCESS',
            transaction_id = ?,
            fee_cents = ?,
            updated_at = datetime('now', 'utc')
        WHERE item_id = ?
      `).run(transactionId, feeCents, item.item_id);

      // 3. Emit item success event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'PAYOUT_ITEM_SUCCESS', ?, ?)
      `).run(
        uuidv4(),
        item.cycle_id,
        JSON.stringify({
          itemId: item.item_id,
          senderItemId,
          creditorAgentId: item.creditor_agent_id,
          amountCents: item.amount_cents,
          transactionId,
        })
      );
    });
  }
}
