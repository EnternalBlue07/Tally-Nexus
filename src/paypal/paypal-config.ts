export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  apiBase: string;
  environment: 'sandbox';
  webhookId: string;
}

export function assertSandboxEnvironment(config?: Partial<PayPalConfig>): void {
  const env = (config?.environment || process.env.PAYPAL_ENV || 'sandbox').toLowerCase();
  const base = (config?.apiBase || process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com').toLowerCase();

  if (env === 'live' || env === 'production') {
    throw new Error('FATAL_SAFETY_VIOLATION: Live PayPal production mode is prohibited in Tally Nexus Sandbox stage.');
  }

  if (base.includes('api-m.paypal.com') && !base.includes('sandbox')) {
    throw new Error('FATAL_SAFETY_VIOLATION: Production PayPal API endpoint detected. Only sandbox.paypal.com is allowed.');
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
