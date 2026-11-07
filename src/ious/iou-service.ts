import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { canonicalizeJson } from '../crypto/canonical-json.js';
import { signPayload, verifySignature } from '../crypto/agent-keys.js';

export const IOU_DOMAIN_V1 = 'tally-nexus:iou:v1' as const;

export interface IouPayload {
  domain: typeof IOU_DOMAIN_V1;
  iouId: string;
  taskId: string;
  cycleId: string;
  debtorAgentId: string;
  creditorAgentId: string;
  amountCents: number;
  createdAt: string;
  expiresAt: string;
}

export interface SignedIou {
  iouId: string;
  taskId: string;
  cycleId: string;
  debtorAgentId: string;
  creditorAgentId: string;
  amountCents: number;
  signature: string;
  signedPayload: string;
  createdAt: string;
  expiresAt: string;
}

export class IouService {
  /**
   * Constructs the canonical payload with versioned domain separation,
   * validity expiration, and signs it using the debtor's private key.
   */
  public static signIou(
    params: {
      iouId?: string;
      taskId: string;
      cycleId: string;
      debtorAgentId: string;
      creditorAgentId: string;
      amountCents: number;
      validityDurationMs?: number; // Default: 7 days
    },
    debtorPrivateKeyHex: string
  ): SignedIou {
    if (params.amountCents <= 0) {
      throw new Error('INVALID_AMOUNT: IOU amount must be strictly positive.');
    }
    if (params.debtorAgentId === params.creditorAgentId) {
      throw new Error('SELF_DEALING_PROHIBITED: Debtor and creditor cannot be the same agent.');
    }

    const iouId = params.iouId || uuidv4();
    const createdAt = new Date().toISOString();
    const validityMs = params.validityDurationMs ?? 7 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + validityMs).toISOString();

    const payload: IouPayload = {
      domain: IOU_DOMAIN_V1,
      iouId,
      taskId: params.taskId,
      cycleId: params.cycleId,
      debtorAgentId: params.debtorAgentId,
      creditorAgentId: params.creditorAgentId,
      amountCents: params.amountCents,
      createdAt,
      expiresAt,
    };

    const canonicalString = canonicalizeJson(payload);
    const signature = signPayload(canonicalString, debtorPrivateKeyHex);

    return {
      iouId,
      taskId: params.taskId,
      cycleId: params.cycleId,
      debtorAgentId: params.debtorAgentId,
      creditorAgentId: params.creditorAgentId,
      amountCents: params.amountCents,
      signature,
      signedPayload: canonicalString,
      createdAt,
      expiresAt,
    };
  }

  /**
   * Verifies an IOU's cryptographic signature and full context against the debtor's
   * public key registered in the database, validates task status, and records the IOU.
   */
  public static recordIou(signedIou: SignedIou, db: DatabaseManager): { iouId: string } {
    return db.withTransaction(() => {
      // 1. Context validation: Parse and verify signed canonical payload
      let parsedPayload: IouPayload;
      try {
        parsedPayload = JSON.parse(signedIou.signedPayload) as IouPayload;
      } catch {
        throw new Error('MALFORMED_PAYLOAD: Signed payload is not valid JSON.');
      }

      if (parsedPayload.domain !== IOU_DOMAIN_V1) {
        throw new Error(`INVALID_DOMAIN: Expected '${IOU_DOMAIN_V1}', received '${parsedPayload.domain}'.`);
      }
      if (parsedPayload.iouId !== signedIou.iouId) {
        throw new Error(`CONTEXT_MISMATCH: Payload iouId '${parsedPayload.iouId}' does not match '${signedIou.iouId}'.`);
      }
      if (parsedPayload.taskId !== signedIou.taskId) {
        throw new Error(`CONTEXT_MISMATCH: Payload taskId '${parsedPayload.taskId}' does not match '${signedIou.taskId}'.`);
      }
      if (parsedPayload.cycleId !== signedIou.cycleId) {
        throw new Error(`CONTEXT_MISMATCH: Payload cycleId '${parsedPayload.cycleId}' does not match '${signedIou.cycleId}'.`);
      }
      if (parsedPayload.debtorAgentId !== signedIou.debtorAgentId) {
        throw new Error(`CONTEXT_MISMATCH: Payload debtorAgentId '${parsedPayload.debtorAgentId}' does not match '${signedIou.debtorAgentId}'.`);
      }
      if (parsedPayload.creditorAgentId !== signedIou.creditorAgentId) {
        throw new Error(`CONTEXT_MISMATCH: Payload creditorAgentId '${parsedPayload.creditorAgentId}' does not match '${signedIou.creditorAgentId}'.`);
      }
      if (parsedPayload.amountCents !== signedIou.amountCents) {
        throw new Error(`CONTEXT_MISMATCH: Payload amountCents '${parsedPayload.amountCents}' does not match '${signedIou.amountCents}'.`);
      }

      // Check Expiration
      const expiryTimestamp = new Date(parsedPayload.expiresAt).getTime();
      if (Number.isNaN(expiryTimestamp) || expiryTimestamp < Date.now()) {
        throw new Error(`IOU_EXPIRED: IOU validity expired at ${parsedPayload.expiresAt}.`);
      }

      // 2. Fetch debtor agent and public key
      const debtor = db
        .prepare('SELECT agent_id, public_key FROM agents WHERE agent_id = ?')
        .get(signedIou.debtorAgentId) as { agent_id: string; public_key: string } | undefined;

      if (!debtor) {
        throw new Error(`DEBTOR_NOT_FOUND: Agent '${signedIou.debtorAgentId}' is not registered in the key registry.`);
      }

      // 3. Fetch creditor agent
      const creditor = db
        .prepare('SELECT agent_id FROM agents WHERE agent_id = ?')
        .get(signedIou.creditorAgentId) as { agent_id: string } | undefined;

      if (!creditor) {
        throw new Error(`CREDITOR_NOT_FOUND: Agent '${signedIou.creditorAgentId}' is not registered.`);
      }

      // 4. Verify task exists, matches amount, and is in VERIFIED state
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

      // 5. Verify cryptographic Ed25519 signature against registered debtor public key
      const isValidSig = verifySignature(signedIou.signedPayload, signedIou.signature, debtor.public_key);
      if (!isValidSig) {
        throw new Error(`INVALID_SIGNATURE: Ed25519 signature verification failed for debtor '${signedIou.debtorAgentId}'.`);
      }

      // 6. Insert into ious table
      db.prepare(`
        INSERT INTO ious (iou_id, task_id, cycle_id, debtor_agent_id, creditor_agent_id, amount_cents, signature, signed_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        signedIou.iouId,
        signedIou.taskId,
        signedIou.cycleId,
        signedIou.debtorAgentId,
        signedIou.creditorAgentId,
        signedIou.amountCents,
        signedIou.signature,
        signedIou.signedPayload
      );

      // 7. Record outbox system event
      db.prepare(`
        INSERT INTO system_events (event_id, event_type, cycle_id, payload_json)
        VALUES (?, 'IOU_SIGNED', ?, ?)
      `).run(
        uuidv4(),
        signedIou.cycleId,
        JSON.stringify({
          iouId: signedIou.iouId,
          taskId: signedIou.taskId,
          amountCents: signedIou.amountCents,
          domain: IOU_DOMAIN_V1,
        })
      );

      return { iouId: signedIou.iouId };
    });
  }
}
