import { createApp } from './api/app.js';
import { DatabaseManager } from './db/index.js';
import {
  IPayPalClient,
  PayPalSandboxClient,
  MockPayPalClient,
} from './paypal/index.js';
import dotenv from 'dotenv';

dotenv.config();

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const dbPath = process.env.DATABASE_PATH || './data/tally_nexus.db';
const paypalMode = (process.env.PAYPAL_MODE || 'auto').toLowerCase();

console.log('='.repeat(72));
console.log('  TALLY NEXUS // Autonomous Agent Multilateral Clearinghouse');
console.log('='.repeat(72));
console.log(`Database Path : ${dbPath}`);
console.log(`HTTP Port     : ${port}`);

// Initialize native SQLite database
const db = new DatabaseManager({ dbPath });
console.log('Database initialized with WAL mode and 14 safety triggers.');
db.runMigrations();

// Determine PayPal Client
let paypalClient: IPayPalClient;
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
const isConfigured =
  clientId &&
  clientSecret &&
  !clientId.includes('placeholder') &&
  !clientSecret.includes('placeholder');

if (paypalMode === 'sandbox' || (paypalMode === 'auto' && isConfigured)) {
  console.log('PayPal Rails  : LIVE SANDBOX (api-m.sandbox.paypal.com)');
  paypalClient = new PayPalSandboxClient();
} else {
  console.log('PayPal Rails  : VERIFIED MOCK CLIENT (Local deterministic adapter)');
  paypalClient = new MockPayPalClient();
}

const app = createApp({ db, paypalClient });

const server = app.listen(port, () => {
  console.log(`\nServer online and ready for traffic:`);
  console.log(`- Web Dashboard   : http://localhost:${port}/`);
  console.log(`- Operator View   : http://localhost:${port}/dashboard`);
  console.log(`- API Health      : http://localhost:${port}/api/health`);
  console.log(`- SSE Live Stream : http://localhost:${port}/api/events/stream`);
  console.log('='.repeat(72));
});

function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Shutting down Tally Nexus gracefully...`);
  server.close(() => {
    try {
      db.close();
      console.log('Database closed cleanly.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export { app, server, db, paypalClient };
