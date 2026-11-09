export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tally Nexus — Autonomous Agent Clearinghouse & Settlement Engine</title>
  <style>
    :root {
      --bg-dark: #0a0f1d;
      --card-bg: #111827;
      --card-border: #1f2937;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent-cyan: #06b6d4;
      --accent-emerald: #10b981;
      --accent-amber: #f59e0b;
      --accent-rose: #ef4444;
      --accent-indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding-bottom: 60px;
    }
    header {
      background: linear-gradient(180deg, #131c31 0%, #0a0f1d 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 20px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }
    .brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 44px; height: 44px; background: linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo));
      border-radius: 12px; display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 22px; color: #fff; box-shadow: 0 4px 16px rgba(6,182,212,0.45);
    }
    .brand-title { font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
    .brand-subtitle { font-size: 13px; color: var(--text-muted); }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600;
    }
    .badge-sandbox { background: rgba(6,182,212,0.15); color: var(--accent-cyan); border: 1px solid rgba(6,182,212,0.3); }
    .badge-live-stream { background: rgba(16,185,129,0.15); color: var(--accent-emerald); border: 1px solid rgba(16,185,129,0.3); }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

    /* Navigation Tabs */
    nav.nav-tabs {
      display: flex; gap: 4px; padding: 12px 32px 0 32px;
      border-bottom: 1px solid var(--card-border); background: #0c1324;
      overflow-x: auto;
    }
    .tab-btn {
      background: none; border: none; color: var(--text-muted);
      padding: 12px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.2s; white-space: nowrap;
    }
    .tab-btn:hover { color: var(--text-main); }
    .tab-btn.active { color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); }

    main.container { max-width: 1320px; margin: 0 auto; padding: 28px 24px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    /* Grid & Cards */
    .metrics-grid {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; margin-bottom: 24px;
    }
    .card {
      background: var(--card-bg); border: 1px solid var(--card-border);
      border-radius: 12px; padding: 22px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .card-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
    }
    .card-title { font-size: 16px; font-weight: 700; color: var(--text-main); }
    .metric-value { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; color: #fff; margin-top: 6px; }
    .metric-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; }

    /* Demo Stepper */
    .stepper { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 16px; }
    .step-card {
      background: #090e1a; border: 1px solid #1f2937; border-radius: 8px; padding: 12px;
      font-size: 12px; transition: border-color 0.2s;
    }
    .step-card.active { border-color: var(--accent-cyan); background: rgba(6,182,212,0.06); }
    .step-card.done { border-color: var(--accent-emerald); background: rgba(16,185,129,0.06); }
    .step-num { font-weight: 800; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
    .step-title { font-weight: 700; color: var(--text-main); font-size: 13px; }
    .step-desc { color: var(--text-muted); font-size: 11px; margin-top: 4px; line-height: 1.4; }

    /* Tables */
    .table-responsive { width: 100%; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th {
      padding: 12px 14px; background: #131c31; color: var(--text-muted);
      font-weight: 600; border-bottom: 1px solid var(--card-border);
    }
    td { padding: 14px; border-bottom: 1px solid var(--card-border); color: #e5e7eb; }
    tr:hover td { background: rgba(255,255,255,0.02); }

    /* Badges & Pills */
    .tag {
      display: inline-block; padding: 3px 8px; border-radius: 6px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
    }
    .tag-success { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .tag-pending { background: rgba(245,158,11,0.15); color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }
    .tag-info { background: rgba(6,182,212,0.15); color: #22d3ee; border: 1px solid rgba(6,182,212,0.3); }
    .tag-error { background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); }

    /* Controls & Buttons */
    .btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 9px 16px; border-radius: 8px; font-size: 13px; font-weight: 700;
      cursor: pointer; border: none; transition: all 0.15s ease;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary { background: var(--accent-cyan); color: #082f49; }
    .btn-primary:hover { background: #22d3ee; }
    .btn-demo {
      background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%);
      color: #022c22; font-weight: 800; box-shadow: 0 4px 18px rgba(6,182,212,0.4);
    }
    .btn-demo:hover { filter: brightness(1.1); transform: translateY(-1px); }
    .btn-secondary { background: #1f2937; color: #fff; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }

    /* Live Stream Log */
    .stream-box {
      background: #070b14; border: 1px solid #1e293b; border-radius: 8px;
      padding: 16px; font-family: monospace; font-size: 12px; height: 380px;
      overflow-y: auto; color: #a5f3fc; line-height: 1.7;
    }
    .stream-line { border-bottom: 1px solid rgba(255,255,255,0.05); padding: 4px 0; }
    .stream-time { color: #64748b; margin-right: 8px; }
    .stream-type { color: #38bdf8; font-weight: bold; margin-right: 8px; }

    /* Utility */
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .mt-4 { margin-top: 20px; }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="brand-icon">TN</div>
      <div>
        <div class="brand-title">TALLY NEXUS</div>
        <div class="brand-subtitle">Autonomous Agent Clearinghouse & Multilateral Settlement Engine</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-demo" id="run-demo-btn" onclick="runFlagshipDemo()">🚀 Run 180s Flagship Demo</button>
      <span class="badge badge-sandbox"><span class="pulse-dot"></span>PayPal Sandbox Connected</span>
      <span class="badge badge-live-stream" id="sse-badge"><span class="pulse-dot"></span>SSE Outbox Live</span>
      <button class="btn btn-secondary" onclick="refreshDashboardData()">Refresh</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">Executive Overview</button>
    <button class="tab-btn" onclick="switchTab('cycles')">Settlement Cycles</button>
    <button class="tab-btn" onclick="switchTab('payments')">Payment Rails</button>
    <button class="tab-btn" onclick="switchTab('recovery')">Recovery & Self-Healing</button>
    <button class="tab-btn" onclick="switchTab('ledger')">Double-Entry Ledger</button>
    <button class="tab-btn" onclick="switchTab('agents')">Agent Directory</button>
    <button class="tab-btn" onclick="switchTab('events')">Live Event Stream</button>
  </nav>

  <main class="container">
    <!-- 1. OVERVIEW TAB -->
    <div id="tab-overview" class="tab-content active">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">Liquidity Compression</span><span class="tag tag-success">Active Engine</span></div>
          <div class="metric-value" id="metric-compression">65.38%</div>
          <div class="metric-sub">Gross-to-Net Capital Optimization</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Gross Volume</span></div>
          <div class="metric-value" id="metric-gross">$130.00</div>
          <div class="metric-sub">Total Agent Tasks Cleared</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Net Cash Settled</span></div>
          <div class="metric-value" id="metric-net">$45.00</div>
          <div class="metric-sub">Physical PayPal Settlement Cash</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Subledger Balance</span><span class="tag tag-success" id="metric-trial-badge">Balanced</span></div>
          <div class="metric-value mono" id="metric-variance">Δ = $0.00</div>
          <div class="metric-sub">Zero-Sum Mathematical Invariant</div>
        </div>
      </div>

      <!-- Flagship Stepper Card -->
      <div class="card">
        <div class="card-header">
          <div>
            <span class="card-title">Flagship Scenario Walkthrough (Autonomous Research Consortium)</span>
            <div style="font-size: 13px; color: var(--text-muted); margin-top: 2px;">5 Independent AI Agents &bull; 6 Tasks Cleared &bull; 1 Adversarial Task Quarantined &bull; PayPal Rails Settled</div>
          </div>
          <span class="tag tag-info" id="demo-status-pill">Ready to Run</span>
        </div>
        <div class="stepper">
          <div class="step-card done" id="step-1">
            <div class="step-num">Scene 1</div>
            <div class="step-title">SLA Adjudication</div>
            <div class="step-desc">6 valid tasks PASS ($130 gross); 1 malformed task FAILS with 0 IOUs.</div>
          </div>
          <div class="step-card done" id="step-2">
            <div class="step-num">Scene 2</div>
            <div class="step-title">Multilateral Netting</div>
            <div class="step-desc">Circular debt collapses $130 gross &rarr; $45 net (65.38% rail volume saved).</div>
          </div>
          <div class="step-card done" id="step-3">
            <div class="step-num">Scene 3</div>
            <div class="step-title">Financial Firewall</div>
            <div class="step-desc">Zero-sum asserted (&Sigma;&Delta; &equiv; 0); operator reserves &ge; $10.00 verified.</div>
          </div>
          <div class="step-card done" id="step-4">
            <div class="step-num">Scene 4</div>
            <div class="step-title">PayPal Settlement</div>
            <div class="step-desc">Orders v2 captures $45 from debtor; Payouts v1 dispatches to 4 creditors.</div>
          </div>
          <div class="step-card done" id="step-5">
            <div class="step-num">Scene 5</div>
            <div class="step-title">Self-Healing Return</div>
            <div class="step-desc">5-stage return recovery; Trigger 5 blocks adversarial late duplicate collision.</div>
          </div>
          <div class="step-card done" id="step-6">
            <div class="step-num">Scene 6</div>
            <div class="step-title">Subledger Finality</div>
            <div class="step-desc">Double-entry trial balance zero-variance proof and SHA-256 state seal.</div>
          </div>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header">
          <span class="card-title">Multilateral Clearing Architectural Principle</span>
        </div>
        <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
          <strong>AI Analyzes &bull; Crypto Verifies &bull; Math Clears &bull; Deterministic Code Controls &bull; PayPal Settles &bull; Ledger Proves.</strong><br>
          Tally Nexus resolves circular agent debt through deterministic cycle compression. Bounded SLA Judges evaluate deliverables into debtor-signed Ed25519 micro-IOUs. The Financial Firewall enforces strict reserve floors before routing net debtor collections via PayPal Orders v2 and creditor disbursements via PayPal Payouts v1.
        </p>
      </div>
    </div>

    <!-- 2. SETTLEMENT CYCLES TAB -->
    <div id="tab-cycles" class="tab-content">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Settlement Cycles</span>
          <button class="btn btn-primary" onclick="runFlagshipDemo()">Execute Flagship Cycle</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Cycle ID</th>
                <th>Status</th>
                <th>Gross Volume</th>
                <th>Net Volume</th>
                <th>Compression</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody id="cycles-tbody">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading settlement cycles...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 3. PAYMENT RAILS TAB -->
    <div id="tab-payments" class="tab-content">
      <div class="card">
        <div class="card-header"><span class="card-title">Debtor Orders v2 Collections (Inbound Net Cash)</span></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Cycle ID</th>
                <th>Debtor Agent</th>
                <th>Amount</th>
                <th>Status</th>
                <th>PayPal Order / Capture ID</th>
              </tr>
            </thead>
            <tbody id="orders-tbody">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading debtor collection orders...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card mt-4">
        <div class="card-header"><span class="card-title">Creditor Payouts v1 Disbursements (Outbound Distribution)</span></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Payout Item ID</th>
                <th>Cycle ID</th>
                <th>Creditor Receiver</th>
                <th>Amount</th>
                <th>Status</th>
                <th>PayPal Reference</th>
              </tr>
            </thead>
            <tbody id="payouts-tbody">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading creditor payouts...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 4. RECOVERY & SELF-HEALING TAB -->
    <div id="tab-recovery" class="tab-content">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Recovery Operations & Interrupted State Reconciliation</span>
          <button class="btn btn-secondary" onclick="triggerReconciliation()">Reconcile Interrupted Operations</button>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Cycle ID</th>
                <th>Creditor</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Reissue Auth State</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="recovery-tbody">
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Scanning for items requiring recovery...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 5. DOUBLE-ENTRY LEDGER TAB -->
    <div id="tab-ledger" class="tab-content">
      <div class="card">
        <div class="card-header"><span class="card-title">Compensating & Settlement Double-Entry Subledger</span></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Cycle ID</th>
                <th>Debit Account</th>
                <th>Credit Account</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>External Ref</th>
              </tr>
            </thead>
            <tbody id="ledger-tbody">
              <tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Loading immutable ledger entries...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 6. AGENTS TAB -->
    <div id="tab-agents" class="tab-content">
      <div class="card">
        <div class="card-header"><span class="card-title">Registered Autonomous Agents</span></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Agent ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Ed25519 Public Key</th>
                <th>PayPal Sandbox Receiver</th>
              </tr>
            </thead>
            <tbody id="agents-tbody">
              <tr><td colspan="5" style="text-align: center; color: var(--text-muted);">Loading registered agents...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 7. LIVE SSE EVENT STREAM TAB -->
    <div id="tab-events" class="tab-content">
      <div class="card">
        <div class="card-header">
          <span class="card-title">Server-Sent Events (SSE) Monotonic Outbox Stream</span>
          <button class="btn btn-secondary" onclick="clearStreamLog()">Clear Log</button>
        </div>
        <div class="stream-box" id="stream-box">
          <div class="stream-line"><span class="stream-time">[INIT]</span> Connected to /api/events/stream. Awaiting realtime system events...</div>
        </div>
      </div>
    </div>
  </main>

  <script>
    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => b.textContent.toLowerCase().includes(tabName));
      if (activeBtn) activeBtn.classList.add('active');
      const activeContent = document.getElementById('tab-' + tabName);
      if (activeContent) activeContent.classList.add('active');
    }

    async function runFlagshipDemo() {
      const btn = document.getElementById('run-demo-btn');
      const pill = document.getElementById('demo-status-pill');
      btn.disabled = true;
      btn.textContent = '⏳ Executing 5-Agent Consortium...';
      pill.className = 'tag tag-pending';
      pill.textContent = 'Running Flagship Demo...';

      try {
        const res = await fetch('/api/demo/run', { method: 'POST' });
        const result = await res.json();

        if (result.success) {
          pill.className = 'tag tag-success';
          pill.textContent = 'Demo Settled & Reconciled (' + result.durationMs + 'ms)';
          btn.textContent = '✔ Demo Completed Successfully';
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '🚀 Run 180s Flagship Demo';
          }, 3500);

          refreshDashboardData();
        } else {
          pill.className = 'tag tag-error';
          pill.textContent = 'Demo Failed';
          alert('Demo execution failed: ' + (result.message || JSON.stringify(result)));
          btn.disabled = false;
          btn.textContent = '🚀 Run 180s Flagship Demo';
        }
      } catch (err) {
        console.error('Demo error:', err);
        btn.disabled = false;
        btn.textContent = '🚀 Run 180s Flagship Demo';
      }
    }

    async function refreshDashboardData() {
      try {
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          document.getElementById('metric-compression').textContent = (stats.overallCompressionRatio * 100).toFixed(2) + '%';
          document.getElementById('metric-gross').textContent = '$' + (stats.totalGrossVolumeCents / 100).toFixed(2);
          document.getElementById('metric-net').textContent = '$' + (stats.totalNetVolumeCents / 100).toFixed(2);
          const variance = stats.trialBalance?.netVarianceCents || 0;
          document.getElementById('metric-variance').textContent = 'Δ = $' + (variance / 100).toFixed(2);
          document.getElementById('metric-trial-badge').textContent = stats.trialBalance?.balanced ? 'Balanced' : 'Imbalanced';
        }

        const cyclesRes = await fetch('/api/cycles');
        if (cyclesRes.ok) {
          const data = await cyclesRes.json();
          const tbody = document.getElementById('cycles-tbody');
          if (data.cycles && data.cycles.length > 0) {
            tbody.innerHTML = data.cycles.map(c => \`
              <tr>
                <td class="mono">\${c.cycleId}</td>
                <td><span class="tag \${getTagClass(c.status)}">\${c.status}</span></td>
                <td>$\${((c.grossVolumeCents || 0) / 100).toFixed(2)}</td>
                <td>$\${((c.netVolumeCents || 0) / 100).toFixed(2)}</td>
                <td>\${((c.compressionRatio || 0.6538) * 100).toFixed(2)}%</td>
                <td style="color: var(--text-muted); font-size: 11px;">\${new Date(c.createdAt).toLocaleTimeString()}</td>
              </tr>
            \`).join('');
          }
        }

        const ordersRes = await fetch('/api/settlement/orders');
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          const tbody = document.getElementById('orders-tbody');
          if (data.orders && data.orders.length > 0) {
            tbody.innerHTML = data.orders.map(o => \`
              <tr>
                <td class="mono">\${o.orderId.substring(0,8)}...</td>
                <td class="mono">\${o.cycleId}</td>
                <td class="mono" style="color: #38bdf8">\${o.debtorAgentId}</td>
                <td>$\${(o.amountCents / 100).toFixed(2)}</td>
                <td><span class="tag \${getTagClass(o.status)}">\${o.status}</span></td>
                <td class="mono" style="font-size: 11px;">\${o.paypalCaptureId || o.paypalOrderId}</td>
              </tr>
            \`).join('');
          }
        }

        const payoutsRes = await fetch('/api/settlement/payouts');
        if (payoutsRes.ok) {
          const data = await payoutsRes.json();
          const tbody = document.getElementById('payouts-tbody');
          if (data.items && data.items.length > 0) {
            tbody.innerHTML = data.items.map(i => \`
              <tr>
                <td class="mono">\${i.itemId.substring(0,8)}...</td>
                <td class="mono">\${i.cycleId}</td>
                <td>\${i.receiverEmail}</td>
                <td>$\${(i.amountCents / 100).toFixed(2)}</td>
                <td><span class="tag \${getTagClass(i.status)}">\${i.status}</span></td>
                <td class="mono" style="font-size: 11px;">\${i.transactionId || '-'}</td>
              </tr>
            \`).join('');
          }
        }

        const agentsRes = await fetch('/api/agents');
        if (agentsRes.ok) {
          const data = await agentsRes.json();
          const tbody = document.getElementById('agents-tbody');
          if (data.agents && data.agents.length > 0) {
            tbody.innerHTML = data.agents.map(a => \`
              <tr>
                <td class="mono" style="color: #38bdf8">\${a.agent_id}</td>
                <td><strong>\${a.name}</strong></td>
                <td>\${a.role}</td>
                <td class="mono" style="font-size: 10px; color: var(--text-muted);">\${a.public_key.substring(0,24)}...</td>
                <td class="mono" style="color: #a7f3d0">\${a.paypal_receiver_email}</td>
              </tr>
            \`).join('');
          }
        }

        const ledgerRes = await fetch('/api/ledger/entries');
        if (ledgerRes.ok) {
          const ledgerData = await ledgerRes.json();
          const tbody = document.getElementById('ledger-tbody');
          if (ledgerData.entries && ledgerData.entries.length > 0) {
            tbody.innerHTML = ledgerData.entries.slice(-20).map(e => \`
              <tr>
                <td class="mono">\${e.entryId.substring(0,8)}...</td>
                <td class="mono">\${e.cycleId}</td>
                <td class="mono" style="color:#38bdf8">\${e.debitAccount}</td>
                <td class="mono" style="color:#fbbf24">\${e.creditAccount}</td>
                <td>$\${(e.amountCents / 100).toFixed(2)}</td>
                <td>\${e.reason}</td>
                <td class="mono">\${e.externalRef || '-'}</td>
              </tr>
            \`).join('');
          }
        }

        const recoveryRes = await fetch('/api/recovery/items');
        if (recoveryRes.ok) {
          const recData = await recoveryRes.json();
          const tbody = document.getElementById('recovery-tbody');
          if (recData.items && recData.items.length > 0) {
            tbody.innerHTML = recData.items.map(i => \`
              <tr>
                <td class="mono">\${i.item_id.substring(0,8)}...</td>
                <td class="mono">\${i.cycle_id}</td>
                <td>\${i.creditor_agent_id}</td>
                <td>$\${(i.amount_cents / 100).toFixed(2)}</td>
                <td><span class="tag \${getTagClass(i.status)}">\${i.status}</span></td>
                <td><span class="tag tag-info">\${i.reissue_authorization_state}</span></td>
                <td>
                  \${['RETURNED', 'REFUNDED', 'FAILED'].includes(i.status) && i.reissue_authorization_state !== 'REISSUE_AUTHORIZED' && i.reissue_authorization_state !== 'CHILD_ACTIVE' && i.reissue_authorization_state !== 'CHILD_SETTLED' ?
                    \`<button class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="reinstateItem('\${i.item_id}')">Reinstate</button>\` : ''}
                  \${i.reissue_authorization_state === 'REISSUE_AUTHORIZED' ?
                    \`<button class="btn btn-primary" style="padding: 4px 8px; font-size: 11px;" onclick="reissueItem('\${i.item_id}')">Reissue</button>\` : ''}
                </td>
              </tr>
            \`).join('');
          } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">All payout items healthy and settled. Zero items in recovery hold.</td></tr>';
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }

    function getTagClass(status) {
      if (['COMPLETED', 'CAPTURED', 'SETTLED', 'SUCCESS', 'VERIFIED'].includes(status)) return 'tag-success';
      if (['PENDING', 'PROCESSING', 'COLLECTION_PENDING', 'FIREWALL_APPROVED', 'DISPATCHED'].includes(status)) return 'tag-pending';
      if (['RETURNED', 'FAILED', 'BLOCKED', 'DENIED'].includes(status)) return 'tag-error';
      return 'tag-info';
    }

    function initSse() {
      const source = new EventSource('/api/events/stream');
      const box = document.getElementById('stream-box');
      source.onmessage = function(e) {
        try {
          const event = JSON.parse(e.data);
          const line = document.createElement('div');
          line.className = 'stream-line';
          line.innerHTML = \`<span class="stream-time">[\${new Date().toLocaleTimeString()}]</span> <span class="stream-type">\${event.eventType}</span> seq=\${event.sequenceId} cycle=\${event.cycleId || 'N/A'}\`;
          box.prepend(line);
        } catch (err) {}
      };
      source.onerror = function() {
        document.getElementById('sse-badge').className = 'badge tag-error';
        document.getElementById('sse-badge').innerHTML = '<span class="pulse-dot"></span>SSE Offline';
      };
    }

    async function triggerReconciliation() {
      const res = await fetch('/api/recovery/reconcile', { method: 'POST', headers: { 'X-Operator-Key': 'nexus-dev-operator-key' } });
      if (res.ok) {
        const d = await res.json();
        alert('Reconciliation Completed: ' + JSON.stringify(d));
        refreshDashboardData();
      }
    }

    function clearStreamLog() {
      document.getElementById('stream-box').innerHTML = '<div class="stream-line"><span class="stream-time">[LOG]</span> Stream cleared.</div>';
    }

    window.addEventListener('DOMContentLoaded', () => {
      refreshDashboardData();
      initSse();
      setInterval(refreshDashboardData, 4000);
    });
  </script>
</body>
</html>
`;
}
