import { getPayPalConfig, assertSandboxEnvironment, PayPalConfig } from './paypal-config.js';

export interface CreateOrderParams {
  idempotencyKey: string;
  amountCents: number;
  currency?: string;
  customId: string;
  description: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateOrderResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  approvalUrl?: string;
}

export interface CaptureOrderResponse {
  id: string;
  status: 'COMPLETED';
  captureId: string;
}

export interface PayoutItemParam {
  senderItemId: string;
  amountCents: number;
  receiverEmail: string;
  note?: string;
}

export interface CreatePayoutBatchParams {
  senderBatchId: string;
  emailSubject: string;
  items: PayoutItemParam[];
}

export interface CreatePayoutBatchResponse {
  payoutBatchId: string;
  batchStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED';
  senderBatchId: string;
}

export interface PayoutBatchStatusResponse {
  payoutBatchId: string;
  batchStatus: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED';
  items?: Array<{
    payoutItemId: string;
    senderItemId: string;
    status: string;
    feeCents: number;
  }>;
}

export interface PayoutItemStatusResponse {
  payoutItemId: string;
  senderItemId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNCLAIMED' | 'RETURNED' | 'ONHOLD' | 'BLOCKED' | 'REFUNDED' | 'REVERSED';
  amountCents: number;
  feeCents: number;
  transactionId?: string;
}

export interface VerifyWebhookSignatureParams {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}

export interface IPayPalClient {
  createOrder(params: CreateOrderParams): Promise<CreateOrderResponse>;
  captureOrder(paypalOrderId: string, idempotencyKey: string): Promise<CaptureOrderResponse>;
  createPayoutBatch(params: CreatePayoutBatchParams): Promise<CreatePayoutBatchResponse>;
  getPayoutBatchStatus(payoutBatchId: string): Promise<PayoutBatchStatusResponse>;
  getPayoutItemStatus(payoutItemId: string): Promise<PayoutItemStatusResponse>;
  verifyWebhookSignature(params: VerifyWebhookSignatureParams): Promise<{ verification_status: 'SUCCESS' | 'FAILURE' }>;
}

export class PayPalSandboxClient implements IPayPalClient {
  private config: PayPalConfig;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(config?: Partial<PayPalConfig>) {
    assertSandboxEnvironment(config);
    this.config = { ...getPayPalConfig(), ...config };
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 300000) {
      return this.cachedToken.token;
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
    const res = await fetch(`${this.config.apiBase}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_AUTH_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    this.cachedToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };

    return this.cachedToken.token;
  }

  public async createOrder(params: CreateOrderParams): Promise<CreateOrderResponse> {
    const token = await this.getAccessToken();
    const amountStr = (params.amountCents / 100).toFixed(2);

    const body = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: params.customId,
          custom_id: params.customId,
          description: params.description,
          amount: {
            currency_code: params.currency || 'USD',
            value: amountStr,
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl || 'https://localhost/return',
        cancel_url: params.cancelUrl || 'https://localhost/cancel',
        user_action: 'PAY_NOW',
      },
    };

    const res = await fetch(`${this.config.apiBase}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': params.idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_CREATE_ORDER_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      id: string;
      status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
      links?: Array<{ href: string; rel: string }>;
    };

    const approveLink = data.links?.find((l) => l.rel === 'approve' || l.rel === 'payer-action');
    return {
      id: data.id,
      status: data.status,
      approvalUrl: approveLink?.href,
    };
  }

  public async captureOrder(paypalOrderId: string, idempotencyKey: string): Promise<CaptureOrderResponse> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.config.apiBase}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': idempotencyKey,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_CAPTURE_ORDER_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      id: string;
      status: 'COMPLETED';
      purchase_units?: Array<{
        payments?: {
          captures?: Array<{ id: string; status: string }>;
        };
      }>;
    };

    const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id || `CAP-${data.id}`;
    return {
      id: data.id,
      status: 'COMPLETED',
      captureId,
    };
  }

  public async createPayoutBatch(params: CreatePayoutBatchParams): Promise<CreatePayoutBatchResponse> {
    const token = await this.getAccessToken();

    const items = params.items.map((item) => ({
      recipient_type: 'EMAIL',
      amount: {
        value: (item.amountCents / 100).toFixed(2),
        currency: 'USD',
      },
      note: item.note || 'Tally Nexus Multilateral Clearing Settlement',
      sender_item_id: item.senderItemId,
      receiver: item.receiverEmail,
    }));

    const body = {
      sender_batch_header: {
        sender_batch_id: params.senderBatchId,
        email_subject: params.emailSubject,
      },
      items,
    };

    const res = await fetch(`${this.config.apiBase}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_PAYOUT_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      batch_header: {
        payout_batch_id: string;
        batch_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED';
        sender_batch_header: { sender_batch_id: string };
      };
    };

    return {
      payoutBatchId: data.batch_header.payout_batch_id,
      batchStatus: data.batch_header.batch_status,
      senderBatchId: data.batch_header.sender_batch_header.sender_batch_id,
    };
  }

  public async getPayoutBatchStatus(payoutBatchId: string): Promise<PayoutBatchStatusResponse> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.config.apiBase}/v1/payments/payouts/${payoutBatchId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_GET_PAYOUT_BATCH_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      batch_header: { payout_batch_id: string; batch_status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'DENIED' };
      items?: Array<{
        payout_item_id: string;
        sender_item_id: string;
        transaction_status: string;
        payout_item_fee?: { value: string };
      }>;
    };

    const items = data.items?.map((item) => ({
      payoutItemId: item.payout_item_id,
      senderItemId: item.sender_item_id,
      status: item.transaction_status,
      feeCents: Math.round(parseFloat(item.payout_item_fee?.value || '0.25') * 100),
    }));

    return {
      payoutBatchId: data.batch_header.payout_batch_id,
      batchStatus: data.batch_header.batch_status,
      items,
    };
  }

  public async getPayoutItemStatus(payoutItemId: string): Promise<PayoutItemStatusResponse> {
    const token = await this.getAccessToken();

    const res = await fetch(`${this.config.apiBase}/v1/payments/payouts-item/${payoutItemId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_GET_PAYOUT_ITEM_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as {
      payout_item_id: string;
      payout_item: { sender_item_id: string; amount: { value: string } };
      transaction_status: PayoutItemStatusResponse['status'];
      payout_item_fee?: { value: string };
      transaction_id?: string;
    };

    return {
      payoutItemId: data.payout_item_id,
      senderItemId: data.payout_item.sender_item_id,
      status: data.transaction_status,
      amountCents: Math.round(parseFloat(data.payout_item.amount.value) * 100),
      feeCents: Math.round(parseFloat(data.payout_item_fee?.value || '0.25') * 100),
      transactionId: data.transaction_id,
    };
  }

  public async verifyWebhookSignature(params: VerifyWebhookSignatureParams): Promise<{ verification_status: 'SUCCESS' | 'FAILURE' }> {
    const token = await this.getAccessToken();

    const body = {
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent,
    };

    const res = await fetch(`${this.config.apiBase}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`PAYPAL_VERIFY_WEBHOOK_FAILED: ${res.status} ${text}`);
    }

    const data = (await res.json()) as { verification_status: 'SUCCESS' | 'FAILURE' };
    return { verification_status: data.verification_status };
  }
}
