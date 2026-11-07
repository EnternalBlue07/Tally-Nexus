import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { canonicalizeJson } from '../crypto/canonical-json.js';
import { signPayload, verifySignature } from '../crypto/agent-keys.js';

export interface IouPayload {
  taskId: string;
  cycleId: string;
  debtorAgentId: string;
  creditorAgentId: string;
  amountCents: number;
  createdAt: string;
}

export interface SignedIou {
  iouId?: string;
  taskId: string;
  cycleId: string;
  debtorAgentId: string;
  creditorAgentId: string;
  amountCents: number;
  signature: string;
  signedPayload: string;
  createdAt?: string;
}

export class IouService {
  /**
   * Constructs the canonical payload and signs it using the debtor's private key.
   */
  public static signIou(
    params: {
      taskId: string;
      cycleId: string;
      debtorAgentId: string;
      creditorAgentId: string;
      amountCents: number;
    },
    debtorPrivateKeyHex: string
  ): SignedIou {
    if (params.amountCents <= 0) {
      throw new Error('INVALID_AMOUNT: IOU amount must be strictly positive.');
    }
    if (params.debtorAgentId === params.creditorAgentId) {
      throw new Error('SELF_DEALING_PROHIBITED: Debtor and creditor cannot be the same agent.');
    }

    const payload: IouPayload = {
      taskId: params.taskId,
      cycleId: params.cycleId,
      debtorAgentId: params.debtorAgentId,
      creditorAgentId: params.creditorAgentId,
      amountCents: params.amountCents,
      createdAt: new Date().toISOString(),
    };

    const canonicalString = canonicalizeJson(payload);
    const signature = signPayload(canonicalString, debtorPrivateKeyHex);

    return {
      iouId: uuidv4(),
      taskId: params.taskId,
      cycleId: params.cycleId,
      debtorAgentId: params.debtorAgentId,
      creditorAgentId: params.creditorAgentId,
      amountCents: params.amountCents,
      signature,
      signedPayload: canonicalString,
      createdAt: payload.createdAt,
    };
  }

  /**
   * Verifies an IOU's cryptographic signature against the debtor's public key registered in the database,
   * validates underlying task status, and records the IOU in the database.
   */
  public static recordIou(signedIou: SignedIou, db: DatabaseManager): { iouId: string } {
    return db.withTransaction(() => {
      // 1. Fetch debtor agent and public key
      const debtor = db
        .prepare('SELECT agent_id, public_key FROM agents WHERE agent_id = ?')
        .get(signedIou.debtorAgentId) as { agent_id: string; public_key: string } | undefined;

      if (!debtor) {
        throw new Error(`DEBTOR_NOT_FOUND: Agent '${signedIou.debtorAgentId}' is not registered in the key registry.`);
      }

      // 2. Fetch creditor agent
      const creditor = db
        .prepare('SELECT agent_id FROM agents WHERE agent_id = ?')
        .get(signedIou.creditorAgentId) as { agent_id: string } | undefined;

      if (!creditor) {
        throw new Error(`CREDITOR_NOT_FOUND: Agent '${signedIou.creditorAgentId}' is not registered.`);
      }

      // 3. Verify task exists, matches amount, and is in VERIFIED state
      const task = db
        .prepare('SELECT task_id, amount_cents, status, cycle_id, debtor_agent_id, creditor_agent_id FROM tasks WHERE task_id = ?')
        .get(signedIou.taskId) as {
          task_id: string;
          amount_cents: number;
          status: string;
          cycle_id: string;
          debtor_agent_id: string;
          creditor_agent_id: string;
        } | undefined;

      if (!task) {
        throw new Error(`TASK_NOT_FOUND: Task '${signedIou.taskId}' does not exist.`);
      }
      if (task.status !== 'VERIFIED') {
        throw new Error(`TASK_NOT_VERIFIED: Cannot issue IOU for unverified task with status '${task.status}'.`);
      }
      if (task.amount_cents !== signedIou.amountCents) {
        throw new Error(`AMOUNT_MISMATCH: Task amount (${task.amount_cents}c) does not match IOU amount (${signedIou.amountCents}c).`);
      }

      // 4. Verify cryptographic Ed25519 signature against registered debtor public key
      const isValidSig = verifySignature(signedIou.signedPayload, signedIou.signature, debtor.public_key);
      if (!isValidSig) {
        throw new Error(`INVALID_SIGNATURE: Ed25519 signature verification failed for debtor '${signedIou.debtorAgentId}'.`);
      }

      // 5. Insert into ious table
      const iouId = signedIou.iouId || uuidv4();
      db.prepare(`
        INSERT INTO ious (iou_id, task_id, cycle_id, debtor_agent_id, creditor_agent_id, amount_cents, signature, signed_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        iouId,
        signedIou.taskId,
        signedIou.cycleId,
        signedIou.debtorAgentId,
        signedIou.creditorAgentId,
        signedIou.amountCents,
        signedIou.signature,
        signedIou.signedPayload
      );

      // 6. Record outbox system event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'IOU_SIGNED', ?, ?)
      `).run(
        uuidv4(),
        signedIou.cycleId,
        JSON.stringify({ iouId, taskId: signedIou.taskId, amountCents: signedIou.amountCents })
      );

      return { iouId };
    });
  }
}
