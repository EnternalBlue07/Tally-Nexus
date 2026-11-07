import { v4 as uuidv4 } from 'uuid';
import {
  IPayPalClient,
  CreateOrderParams,
  CreateOrderResponse,
  CaptureOrderResponse,
  CreatePayoutBatchParams,
  CreatePayoutBatchResponse,
  PayoutBatchStatusResponse,
  PayoutItemStatusResponse,
  VerifyWebhookSignatureParams,
} from './paypal-client.js';

export class MockPayPalClient implements IPayPalClient {
  public orders: Map<string, { params: CreateOrderParams; status: CreateOrderResponse['status']; captureId?: string }> = new Map();
  public idempotencyOrders: Map<string, string> = new Map(); // idempotencyKey -> orderId

  public payoutBatches: Map<string, { params: CreatePayoutBatchParams; batchStatus: CreatePayoutBatchResponse['batchStatus']; items: Map<string, PayoutItemStatusResponse> }> = new Map();
  public idempotencyPayouts: Map<string, string> = new Map(); // senderBatchId -> payoutBatchId

  public forceWebhookVerificationResult: 'SUCCESS' | 'FAILURE' | null = null;
  public forcePayoutBatchStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' | null = null;
  public forceOrderAlreadyCapturedOrderId: string | null = null;

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    if (this.idempotencyOrders.has(params.idempotencyKey)) {
      const existingOrderId = this.idempotencyOrders.get(params.idempotencyKey)!;
      const order = this.orders.get(existingOrderId)!;
      return {
        id: existingOrderId,
        status: order.status,
        approvalUrl: `https://www.sandbox.paypal.com/checkoutnow?token=${existingOrderId}`,
      };
    }

    const orderId = `MOCK-ORDER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const approvalUrl = `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}`;

    this.orders.set(orderId, { params, status: 'CREATED' });
    this.idempotencyOrders.set(params.idempotencyKey, orderId);

    return {
      id: orderId,
      status: 'CREATED',
      approvalUrl,
    };
  }

  public async captureOrder(paypalOrderId: string, _idempotencyKey: string): Promise<CaptureOrderResponse> {
    const order = this.orders.get(paypalOrderId);
    if (!order) {
      throw new Error(`ORDER_NOT_FOUND: PayPal order '${paypalOrderId}' does not exist.`);
    }

    // Support testing 422 ORDER_ALREADY_CAPTURED failure & reconciliation
    if (this.forceOrderAlreadyCapturedOrderId === paypalOrderId) {
      throw new Error(`PAYPAL_CAPTURE_ORDER_FAILED: 422 ORDER_ALREADY_CAPTURED: Order '${paypalOrderId}' has already been captured.`);
    }

    if (order.status === 'COMPLETED' && order.captureId) {
      return {
        id: paypalOrderId,
        status: 'COMPLETED',
        captureId: order.captureId,
      };
    }

    const captureId = `CAP-${uuidv4().substring(0, 12).toUpperCase()}`;
    order.status = 'COMPLETED';
    order.captureId = captureId;

    return {
      id: paypalOrderId,
      status: 'COMPLETED',
      captureId,
    };
  }

  public async createPayoutBatch(params: CreatePayoutBatchParams): Promise<CreatePayoutBatchResponse> {
    if (this.idempotencyPayouts.has(params.senderBatchId)) {
      const existingBatchId = this.idempotencyPayouts.get(params.senderBatchId)!;
      const batch = this.payoutBatches.get(existingBatchId)!;
      return {
        payoutBatchId: existingBatchId,
        batchStatus: batch.batchStatus,
        senderBatchId: params.senderBatchId,
      };
    }

    const payoutBatchId = `MOCK-BATCH-${uuidv4().substring(0, 8).toUpperCase()}`;
    const initialStatus = this.forcePayoutBatchStatus || 'PENDING';

    const itemsMap = new Map<string, PayoutItemStatusResponse>();
    for (const item of params.items) {
      const payoutItemId = `MOCK-ITEM-${uuidv4().substring(0, 8).toUpperCase()}`;
      itemsMap.set(payoutItemId, {
        payoutItemId,
        senderItemId: item.senderItemId,
        status: 'PENDING',
        amountCents: item.amountCents,
        feeCents: 25, // Default 25c PayPal fee
      });
    }

    this.payoutBatches.set(payoutBatchId, {
      params,
      batchStatus: initialStatus,
      items: itemsMap,
    });
    this.idempotencyPayouts.set(params.senderBatchId, payoutBatchId);

    return {
      payoutBatchId,
      batchStatus: initialStatus,
      senderBatchId: params.senderBatchId,
    };
  }

  public async getPayoutBatchStatus(payoutBatchId: string): Promise<PayoutBatchStatusResponse> {
    const batch = this.payoutBatches.get(payoutBatchId);
    if (!batch) {
      throw new Error(`PAYOUT_BATCH_NOT_FOUND: Payout batch '${payoutBatchId}' does not exist.`);
    }

    const items = Array.from(batch.items.values()).map((i) => ({
      payoutItemId: i.payoutItemId,
      senderItemId: i.senderItemId,
      status: i.status,
      feeCents: i.feeCents,
    }));

    return {
      payoutBatchId,
      batchStatus: batch.batchStatus,
      items,
    };
  }

  public async getPayoutItemStatus(payoutItemId: string): Promise<PayoutItemStatusResponse> {
    for (const batch of this.payoutBatches.values()) {
      if (batch.items.has(payoutItemId)) {
        return batch.items.get(payoutItemId)!;
      }
    }
    throw new Error(`PAYOUT_ITEM_NOT_FOUND: Payout item '${payoutItemId}' was not found.`);
  }

  public async verifyWebhookSignature(params: VerifyWebhookSignatureParams): Promise<{ verification_status: 'SUCCESS' | 'FAILURE' }> {
    if (this.forceWebhookVerificationResult) {
      return { verification_status: this.forceWebhookVerificationResult };
    }

    // 1. Mandatory transmission headers
    if (!params.transmissionId || !params.transmissionSig || !params.certUrl || !params.transmissionTime) {
      return { verification_status: 'FAILURE' };
    }

    // 2. Validate certificate URL format and domain
    try {
      const parsed = new URL(params.certUrl);
      if (parsed.protocol !== 'https:' || !parsed.hostname.toLowerCase().endsWith('paypal.com')) {
        return { verification_status: 'FAILURE' };
      }
    } catch {
      return { verification_status: 'FAILURE' };
    }

    // 3. Supported algorithms check
    if (params.authAlgo !== 'SHA256withRSA' && params.authAlgo !== 'SHA256withECDSA') {
      return { verification_status: 'FAILURE' };
    }

    // 4. Simulated rejection for forged or invalid signature tokens
    if (
      params.transmissionSig === 'INVALID_FORGED_SIGNATURE' ||
      params.transmissionSig.startsWith('INVALID_') ||
      params.transmissionSig.startsWith('FORGED_')
    ) {
      return { verification_status: 'FAILURE' };
    }

    return { verification_status: 'SUCCESS' };
  }
}
