import { v4 as uuidv4 } from 'uuid';
import { DatabaseManager } from '../db/index.js';
import { IPayPalClient } from './paypal-client.js';
import { PayPalOrdersService } from './orders-service.js';
import { PayPalPayoutsService } from './payouts-service.js';
import { getPayPalConfig } from './paypal-config.js';

export interface WebhookHeaders {
  transmissionId: string;
  transmissionTime: string;
  certUrl: string;
  authAlgo: string;
  transmissionSig: string;
}

export interface WebhookEventPayload {
  id: string; // e.g. "WH-..."
  event_type: string;
  resource_type?: string;
  resource: Record<string, any>;
  create_time?: string;
}

export class PayPalWebhookService {
  /**
   * Verifies and processes an incoming PayPal webhook event.
   * Guarantees anti-replay idempotency via processed_webhooks tracking.
   */
  public static async processWebhook(
    headers: WebhookHeaders,
    rawBody: WebhookEventPayload,
    db: DatabaseManager,
    client: IPayPalClient
  ): Promise<{ processed: boolean; eventType: string; status: string }> {
    // 1. Mandatory Header Verification
    if (
      !headers.transmissionId ||
      !headers.transmissionTime ||
      !headers.certUrl ||
      !headers.authAlgo ||
      !headers.transmissionSig
    ) {
      throw new Error('MISSING_WEBHOOK_HEADERS: PayPal transmission signature headers are required.');
    }

    const eventId = rawBody.id;
    if (!eventId || !rawBody.event_type) {
      throw new Error('MALFORMED_WEBHOOK_BODY: Webhook payload missing authoritative id or event_type.');
    }

    // 2. Anti-Replay Idempotency Check in processed_webhooks
    const existing = db
      .prepare('SELECT webhook_id, status FROM processed_webhooks WHERE paypal_event_id = ? OR transmission_id = ?')
      .get(eventId, headers.transmissionId) as { webhook_id: string; status: string } | undefined;

    if (existing) {
      return {
        processed: false,
        eventType: rawBody.event_type,
        status: 'DUPLICATE_REPLAY_IGNORED',
      };
    }

    // 3. Cryptographic Signature Verification via PayPal API
    const config = getPayPalConfig();
    const verifyRes = await client.verifyWebhookSignature({
      authAlgo: headers.authAlgo,
      certUrl: headers.certUrl,
      transmissionId: headers.transmissionId,
      transmissionSig: headers.transmissionSig,
      transmissionTime: headers.transmissionTime,
      webhookId: config.webhookId,
      webhookEvent: rawBody,
    });

    if (verifyRes.verification_status !== 'SUCCESS') {
      throw new Error('INVALID_WEBHOOK_SIGNATURE: PayPal webhook signature verification failed.');
    }

    // 4. Route and Process Supported Webhook Events
    const eventType = rawBody.event_type;

    db.withTransaction(() => {
      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const customId = rawBody.resource?.custom_id;
        const supplementaryData = rawBody.resource?.supplementary_data?.related_ids;
        const paypalOrderId = supplementaryData?.order_id || rawBody.resource?.id;

        if (customId && paypalOrderId) {
          // Idempotent capture reconciliation
          try {
            PayPalOrdersService.captureDebtorOrder(customId, paypalOrderId, db, client);
          } catch {
            // Already captured or order not found; keep webhook recorded
          }
        }
      } else if (eventType === 'PAYMENT.PAYOUTS-ITEM.SUCCESS') {
        const senderItemId = rawBody.resource?.payout_item?.sender_item_id;
        const transactionId = rawBody.resource?.transaction_id || `TXN-${uuidv4()}`;
        const feeVal = rawBody.resource?.payout_item_fee?.value || '0.25';
        const feeCents = Math.round(parseFloat(feeVal) * 100);

        if (senderItemId) {
          PayPalPayoutsService.markItemSuccess(senderItemId, transactionId, feeCents, db);
        }
      } else if (
        eventType === 'PAYMENT.PAYOUTS-ITEM.FAILED' ||
        eventType === 'PAYMENT.PAYOUTS-ITEM.UNCLAIMED' ||
        eventType === 'PAYMENT.PAYOUTS-ITEM.RETURNED'
      ) {
        const senderItemId = rawBody.resource?.payout_item?.sender_item_id;
        const statusMap: Record<string, string> = {
          'PAYMENT.PAYOUTS-ITEM.FAILED': 'FAILED',
          'PAYMENT.PAYOUTS-ITEM.UNCLAIMED': 'UNCLAIMED',
          'PAYMENT.PAYOUTS-ITEM.RETURNED': 'RETURNED',
        };
        const newStatus = statusMap[eventType] || 'FAILED';

        if (senderItemId) {
          db.prepare(`
            UPDATE paypal_payout_items
            SET status = ?,
                reissue_authorization_state = 'PARENT_TERMINAL_CONFIRMED',
                updated_at = datetime('now', 'utc')
            WHERE sender_item_id = ?
          `).run(newStatus, senderItemId);
        }
      } else if (eventType === 'PAYMENT.PAYOUTSBATCH.SUCCESS') {
        const batchId = rawBody.resource?.batch_header?.payout_batch_id;
        if (batchId) {
          db.prepare(`
            UPDATE paypal_payouts
            SET batch_status = 'SUCCESS',
                completed_at = datetime('now', 'utc')
            WHERE paypal_payout_batch_id = ?
          `).run(batchId);
        }
      } else if (eventType === 'PAYMENT.PAYOUTSBATCH.DENIED') {
        const batchId = rawBody.resource?.batch_header?.payout_batch_id;
        if (batchId) {
          db.prepare(`
            UPDATE paypal_payouts
            SET batch_status = 'DENIED'
            WHERE paypal_payout_batch_id = ?
          `).run(batchId);
        }
      }

      // 5. Persist to processed_webhooks log
      db.prepare(`
        INSERT INTO processed_webhooks (
          webhook_id, paypal_event_id, transmission_id, event_type, transmission_time, cert_url, auth_algo, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSED')
      `).run(
        uuidv4(),
        eventId,
        headers.transmissionId,
        eventType,
        headers.transmissionTime,
        headers.certUrl,
        headers.authAlgo
      );
    });

    return {
      processed: true,
      eventType,
      status: 'PROCESSED',
    };
  }
}
