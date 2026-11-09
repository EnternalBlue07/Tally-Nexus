import { createApp } from '../../src/api/app.js';
import { DatabaseManager } from '../../src/db/index.js';
import { PayPalSandboxClient } from '../../src/paypal/index.js';
import request from 'supertest';
import dotenv from 'dotenv';

dotenv.config();

async function testLiveVerifyEndpoints() {
  const db = new DatabaseManager({ dbPath: ':memory:' });
  db.runMigrations();
  const client = new PayPalSandboxClient();
  const app = createApp({ db, paypalClient: client });

  console.log('Testing GET /api/verify/capture/7PV82720RX415822V...');
  const capRes = await request(app).get('/api/verify/capture/7PV82720RX415822V');
  console.log('Capture Verify Status:', capRes.status);
  console.log('Capture Payload:', JSON.stringify(capRes.body, null, 2));

  console.log('\nTesting GET /api/verify/payout/N4M49PUHNCNQ4...');
  const payoutRes = await request(app).get('/api/verify/payout/N4M49PUHNCNQ4');
  console.log('Payout Verify Status:', payoutRes.status);
  console.log('Payout Payload:', JSON.stringify(payoutRes.body, null, 2));

  db.close();
}

testLiveVerifyEndpoints().catch(console.error);

