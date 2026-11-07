export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  apiBase: string;
  environment: 'sandbox';
  webhookId: string;
}

export function assertSandboxEnvironment(config?: Partial<PayPalConfig>): void {
  const env = (config?.environment || process.env.PAYPAL_ENV || 'sandbox').toLowerCase().trim();
  const base = (config?.apiBase || process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com').toLowerCase().trim();

  // Strict allowlist: Only 'sandbox' environment is authorized
  if (env !== 'sandbox') {
    throw new Error(
      `FATAL_SAFETY_VIOLATION: Environment '${env}' is prohibited. Only 'sandbox' mode is authorized for Tally Nexus settlement.`
    );
  }

  // Strict endpoint validation: If targeting paypal.com, only sandbox.paypal.com hosts are permitted
  if (base.includes('paypal.com')) {
    const isSandboxDomain = /^https:\/\/(?:api|api-m)\.sandbox\.paypal\.com(?:\/.*)?$/i.test(base);
    if (!isSandboxDomain) {
      throw new Error(
        `FATAL_SAFETY_VIOLATION: Production PayPal API endpoint detected ('${base}'). Only https://api-m.sandbox.paypal.com or https://api.sandbox.paypal.com are permitted.`
      );
    }
  }
}

export function getPayPalConfig(): PayPalConfig {
  assertSandboxEnvironment();

  return {
    clientId: process.env.PAYPAL_CLIENT_ID || 'sandbox_client_id_placeholder',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'sandbox_client_secret_placeholder',
    apiBase: process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com',
    environment: 'sandbox',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || 'sandbox_webhook_id_placeholder',
  };
}
