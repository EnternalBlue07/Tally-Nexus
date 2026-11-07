import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';

export interface FirewallCheckResult {
  approved: boolean;
  cycleId: string;
  netCreditorCount: number;
  netDebtorCount: number;
  totalNetVolumeCents: number;
  operatorReserveAdequacyCents: number;
  checks: {
    conservationPassed: boolean;
    thresholdPassed: boolean;
    reserveFloorPassed: boolean;
    receiverEmailsVerified: boolean;
  };
}

export class FinancialFirewall {
  public static readonly OPERATOR_RESERVE_FLOOR_CENTS = 1000; // $10.00 Minimum Operator Liquidity Floor
  public static readonly MINIMUM_PAYPAL_SETTLEMENT_CENTS = 100; // $1.00 Minimum PayPal Micro-settlement Unit

  /**
   * Evaluates netting proposal against all fiduciary constraints.
   * If all safety invariants hold, transitions cycle to 'FIREWALL_APPROVED'.
   */
  public static evaluateAndApproveCycle(
    cycleId: string,
    db: DatabaseManager,
    currentOperatorCashCents: number = 10000 // Defaults to $100.00 initial capital
  ): FirewallCheckResult {
    return db.withTransaction(() => {
      // 1. Fetch cycle
      const cycle = db
        .prepare('SELECT cycle_id, status, net_volume_cents FROM settlement_cycles WHERE cycle_id = ?')
        .get(cycleId) as { cycle_id: string; status: string; net_volume_cents: number } | undefined;

      if (!cycle) {
        throw new Error(`FIREWALL_REJECTION: Settlement cycle '${cycleId}' does not exist.`);
      }
      if (cycle.status !== 'NETTING_PROPOSED') {
        throw new Error(
          `FIREWALL_REJECTION: Cycle must be in 'NETTING_PROPOSED' state (current: '${cycle.status}').`
        );
      }

      // 2. Fetch all net positions
      const positions = db
        .prepare('SELECT agent_id, net_amount_cents, position_type FROM net_positions WHERE cycle_id = ?')
        .all(cycleId) as Array<{ agent_id: string; net_amount_cents: number; position_type: string }>;

      if (positions.length === 0) {
        throw new Error('FIREWALL_REJECTION: No net positions found for settlement cycle.');
      }

      // 3. Invariant 1: Conservation Check
      let sumNetCents = 0;
      let netCreditorCount = 0;
      let netDebtorCount = 0;
      let totalCreditorCents = 0;

      for (const pos of positions) {
        sumNetCents += pos.net_amount_cents;
        if (pos.position_type === 'NET_CREDITOR') {
          netCreditorCount++;
          totalCreditorCents += pos.net_amount_cents;
        } else if (pos.position_type === 'NET_DEBTOR') {
          netDebtorCount++;
        }
      }

      const conservationPassed = sumNetCents === 0;
      if (!conservationPassed) {
        throw new Error(`FIREWALL_REJECTION: Non-zero sum balance (${sumNetCents}c). Conservation violated.`);
      }

      // 4. Invariant 2: Threshold Check ($1.00 Minimum on Active Positions)
      let thresholdPassed = true;
      for (const pos of positions) {
        if (pos.position_type !== 'NET_ZERO' && Math.abs(pos.net_amount_cents) < FinancialFirewall.MINIMUM_PAYPAL_SETTLEMENT_CENTS) {
          thresholdPassed = false;
          throw new Error(
            `FIREWALL_REJECTION: Position for agent '${pos.agent_id}' is ${Math.abs(pos.net_amount_cents)}c (< 100c PayPal minimum).`
          );
        }
      }

      // 5. Invariant 3: Operator Reserve Adequacy
      const reserveFloorPassed = currentOperatorCashCents >= FinancialFirewall.OPERATOR_RESERVE_FLOOR_CENTS;
      if (!reserveFloorPassed) {
        throw new Error(
          `FIREWALL_REJECTION: Operator cash (${currentOperatorCashCents}c) below mandatory reserve floor (${FinancialFirewall.OPERATOR_RESERVE_FLOOR_CENTS}c).`
        );
      }

      // 6. Invariant 4: Receiver Emails Verified for Net Creditors
      let receiverEmailsVerified = true;
      for (const pos of positions) {
        if (pos.position_type === 'NET_CREDITOR') {
          const agent = db
            .prepare('SELECT paypal_receiver_email FROM agents WHERE agent_id = ?')
            .get(pos.agent_id) as { paypal_receiver_email: string } | undefined;

          if (!agent || !agent.paypal_receiver_email || !agent.paypal_receiver_email.includes('@')) {
            receiverEmailsVerified = false;
            throw new Error(`FIREWALL_REJECTION: Net creditor '${pos.agent_id}' lacks verified PayPal email.`);
          }
        }
      }

      // 7. Transition cycle to FIREWALL_APPROVED
      db.prepare(`
        UPDATE settlement_cycles
        SET status = 'FIREWALL_APPROVED'
        WHERE cycle_id = ?
      `).run(cycleId);

      // 8. Emit Event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'CYCLE_FIREWALL_APPROVED', ?, ?)
      `).run(
        uuidv4(),
        cycleId,
        JSON.stringify({
          cycleId,
          totalNetVolumeCents: totalCreditorCents,
          netCreditorCount,
          netDebtorCount,
        })
      );

      return {
        approved: true,
        cycleId,
        netCreditorCount,
        netDebtorCount,
        totalNetVolumeCents: totalCreditorCents,
        operatorReserveAdequacyCents: currentOperatorCashCents,
        checks: {
          conservationPassed,
          thresholdPassed,
          reserveFloorPassed,
          receiverEmailsVerified,
        },
      };
    });
  }
}
