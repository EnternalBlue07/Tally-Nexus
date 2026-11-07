import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';

export interface AgentNetPosition {
  positionId: string;
  cycleId: string;
  agentId: string;
  grossCreditCents: number;
  grossDebtCents: number;
  netAmountCents: number;
  positionType: 'NET_CREDITOR' | 'NET_DEBTOR' | 'NET_ZERO';
}

export interface NettingResult {
  cycleId: string;
  grossVolumeCents: number;
  netVolumeCents: number;
  compressionRatio: number;
  positions: AgentNetPosition[];
}

export class NettingEngine {
  /**
   * Executes deterministic multilateral netting over all recorded IOUs for a cycle.
   * Enforces mathematical conservation of value: Sum(Net Positions) == 0.
   */
  public static computeCycleNetting(cycleId: string, db: DatabaseManager): NettingResult {
    return db.withTransaction(() => {
      // 1. Verify settlement cycle status
      const cycle = db
        .prepare('SELECT cycle_id, status FROM settlement_cycles WHERE cycle_id = ?')
        .get(cycleId) as { cycle_id: string; status: string } | undefined;

      if (!cycle) {
        throw new Error(`CYCLE_NOT_FOUND: Settlement cycle '${cycleId}' does not exist.`);
      }
      if (cycle.status !== 'CREATED') {
        throw new Error(`CYCLE_INVALID_STATUS: Cannot propose netting for cycle in '${cycle.status}' status.`);
      }

      // 2. Fetch all IOUs for this cycle
      const ious = db
        .prepare('SELECT debtor_agent_id, creditor_agent_id, amount_cents FROM ious WHERE cycle_id = ?')
        .all(cycleId) as Array<{ debtor_agent_id: string; creditor_agent_id: string; amount_cents: number }>;

      if (ious.length === 0) {
        throw new Error(`NO_IOUS_FOUND: Cycle '${cycleId}' has no signed IOUs to net.`);
      }

      // 3. Aggregate gross debts and gross credits per participating agent
      const agentTotals: Map<string, { credit: number; debt: number }> = new Map();

      function ensureAgent(agentId: string) {
        if (!agentTotals.has(agentId)) {
          agentTotals.set(agentId, { credit: 0, debt: 0 });
        }
      }

      let grossVolumeCents = 0;
      for (const iou of ious) {
        ensureAgent(iou.debtor_agent_id);
        ensureAgent(iou.creditor_agent_id);

        agentTotals.get(iou.debtor_agent_id)!.debt += iou.amount_cents;
        agentTotals.get(iou.creditor_agent_id)!.credit += iou.amount_cents;
        grossVolumeCents += iou.amount_cents;
      }

      // 4. Calculate Net Positions
      const positions: AgentNetPosition[] = [];
      let totalNetCreditorCents = 0;
      let totalNetDebtorAbsCents = 0;
      let sumNetCheck = 0;

      for (const [agentId, totals] of agentTotals.entries()) {
        const netAmount = totals.credit - totals.debt;
        sumNetCheck += netAmount;

        let positionType: 'NET_CREDITOR' | 'NET_DEBTOR' | 'NET_ZERO';
        if (netAmount > 0) {
          positionType = 'NET_CREDITOR';
          totalNetCreditorCents += netAmount;
        } else if (netAmount < 0) {
          positionType = 'NET_DEBTOR';
          totalNetDebtorAbsCents += Math.abs(netAmount);
        } else {
          positionType = 'NET_ZERO';
        }

        positions.push({
          positionId: uuidv4(),
          cycleId,
          agentId,
          grossCreditCents: totals.credit,
          grossDebtCents: totals.debt,
          netAmountCents: netAmount,
          positionType,
        });
      }

      // 5. Mathematical Conservation Check: Sum(Creditors) MUST equal Sum(|Debtors|)
      if (sumNetCheck !== 0 || totalNetCreditorCents !== totalNetDebtorAbsCents) {
        throw new Error(
          `CONSERVATION_VIOLATION: Net positions do not sum to zero (NetSum=${sumNetCheck}, Creditors=${totalNetCreditorCents}, Debtors=${totalNetDebtorAbsCents}).`
        );
      }

      const netVolumeCents = totalNetCreditorCents;
      const compressionRatio =
        grossVolumeCents > 0
          ? Math.round((1.0 - netVolumeCents / grossVolumeCents) * 10000) / 10000
          : 0.0;

      // 6. Delete previous net positions for cycle if any exist (idempotent recompute)
      db.prepare('DELETE FROM net_positions WHERE cycle_id = ?').run(cycleId);

      // 7. Persist net_positions
      const insertStmt = db.prepare(`
        INSERT INTO net_positions (position_id, cycle_id, agent_id, gross_credit_cents, gross_debt_cents, net_amount_cents, position_type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const pos of positions) {
        insertStmt.run(
          pos.positionId,
          pos.cycleId,
          pos.agentId,
          pos.grossCreditCents,
          pos.grossDebtCents,
          pos.netAmountCents,
          pos.positionType
        );
      }

      // 8. Update settlement_cycles
      db.prepare(`
        UPDATE settlement_cycles
        SET gross_volume_cents = ?,
            net_volume_cents = ?,
            compression_ratio = ?,
            status = 'NETTING_PROPOSED'
        WHERE cycle_id = ?
      `).run(grossVolumeCents, netVolumeCents, compressionRatio, cycleId);

      // 9. Emit Transactional Outbox Event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'NETTING_PROPOSED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({ cycleId, grossVolumeCents, netVolumeCents, compressionRatio })
      );

      return {
        cycleId,
        grossVolumeCents,
        netVolumeCents,
        compressionRatio,
        positions,
      };
    });
  }
}
