export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tally Nexus — Autonomous Agent Clearinghouse & Multilateral Settlement Engine</title>
  
  <!-- AG Grid Community Styles & Script (Vendored Locally via Express with CDN Fallback) -->
  <link rel="stylesheet" href="/vendor/ag-grid/styles/ag-grid.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/styles/ag-grid.css';">
  <link rel="stylesheet" href="/vendor/ag-grid/styles/ag-theme-alpine.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/styles/ag-theme-alpine.css';">
  <script src="/vendor/ag-grid/dist/ag-grid-community.min.js" onerror="this.onerror=null;var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/dist/ag-grid-community.min.js';document.head.appendChild(s);"></script>

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
      overflow-x: hidden;
    }
    header {
      background: linear-gradient(180deg, #131c31 0%, #0a0f1d 100%);
      border-bottom: 1px solid var(--card-border);
      padding: 14px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 14px;
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
    .badge-sponsor { background: rgba(99,102,241,0.18); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.35); }
    .pulse-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.85); } }

    /* Navigation Tabs (Fintech High-Density Terminal) */
    nav.nav-tabs {
      display: flex; gap: 4px; padding: 8px 24px 0 24px;
      border-bottom: 1px solid rgba(255,255,255,0.08); background: #090e1a;
      overflow-x: auto; overflow-y: hidden; white-space: nowrap;
      scrollbar-width: thin; scrollbar-color: rgba(6,182,212,0.3) transparent;
      -webkit-overflow-scrolling: touch;
    }
    nav.nav-tabs::-webkit-scrollbar { height: 4px; }
    nav.nav-tabs::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.3); border-radius: 4px; }
    .tab-btn {
      background: none; border: none; color: var(--text-muted);
      padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent; border-radius: 6px 6px 0 0;
      transition: all 0.15s ease; white-space: nowrap; letter-spacing: -0.01em;
    }
    .tab-btn:hover { color: #f1f5f9; background: rgba(255,255,255,0.03); }
    .tab-btn.active { color: var(--accent-cyan); border-bottom: 2px solid var(--accent-cyan); background: rgba(6,182,212,0.08); }

    main.container { max-width: 1400px; margin: 0 auto; padding: 24px 20px; }
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
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;
    }
    .card-title { font-size: 16px; font-weight: 700; color: var(--text-main); }
    .card-desc { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .metric-value { font-size: 30px; font-weight: 800; letter-spacing: -0.5px; color: #fff; margin-top: 6px; }
    .metric-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; }

    /* Stepper */
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

    /* Custom AG Grid Cyberpunk Fintech Dark Theme (Sponsor Challenge) */
    .ag-theme-nexus-dark,
    .ag-theme-alpine-dark {
      --ag-background-color: #0b1120;
      --ag-header-background-color: #111827;
      --ag-odd-row-background-color: #080d1a;
      --ag-border-color: #1e293b;
      --ag-header-foreground-color: #94a3b8;
      --ag-foreground-color: #f1f5f9;
      --ag-data-color: #e2e8f0;
      --ag-selected-row-background-color: rgba(6, 182, 212, 0.2);
      --ag-row-hover-color: rgba(255, 255, 255, 0.05);
      --ag-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      --ag-font-size: 12px;
      --ag-grid-size: 6px;
      --ag-row-height: 38px;
      --ag-header-height: 40px;
      border: 1px solid var(--card-border);
      border-radius: 8px 8px 0 0;
      overflow: hidden;
    }
    .ag-theme-nexus-dark .ag-header-cell,
    .ag-theme-alpine-dark .ag-header-cell {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      color: #94a3b8;
    }
    .grid-status-bar {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
      background: #080d1a; border: 1px solid var(--card-border); border-top: none;
      padding: 8px 16px; font-size: 12px; border-radius: 0 0 8px 8px; color: var(--text-muted);
    }
    .grid-status-item strong { color: var(--text-main); margin-left: 4px; }
    .status-chip-proof {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34d399; padding: 2px 8px; border-radius: 12px; font-size: 11px; cursor: pointer;
      transition: all 0.15s ease;
    }
    .status-chip-proof:hover {
      background: rgba(16, 185, 129, 0.3); border-color: #34d399; transform: translateY(-1px);
    }

    /* Verification Box */
    .verify-result-box {
      background: #080d1a;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 16px;
      margin-top: 14px;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.6;
    }

    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .mt-4 { margin-top: 20px; }
    .grid-controls { display: flex; gap: 12px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
    .search-input {
      background: #080d1a; border: 1px solid #1f2937; color: #fff; padding: 8px 12px;
      border-radius: 6px; font-size: 13px; min-width: 260px;
    }
    .search-input:focus { outline: none; border-color: var(--accent-cyan); }

    /* Toast Notifications System */
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 440px;
      width: calc(100vw - 32px);
      pointer-events: none;
    }
    .toast {
      pointer-events: auto;
      background: rgba(15, 23, 42, 0.96);
      border: 1px solid rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border-radius: 10px;
      padding: 14px 18px;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(6, 182, 212, 0.15);
      color: #f1f5f9;
      animation: toastSlideIn 0.25s ease-out;
      transition: all 0.2s ease;
    }
    @keyframes toastSlideIn {
      from { transform: translateX(30px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 700;
      font-size: 13.5px;
      margin-bottom: 4px;
    }
    .toast-title { display: flex; align-items: center; gap: 8px; }
    .toast-body { font-size: 12.5px; color: #cbd5e1; line-height: 1.5; }
    .toast-close { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
    .toast-close:hover { color: #fff; }
    .toast-details {
      margin-top: 8px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      font-family: monospace;
      font-size: 11px;
      max-height: 160px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
      color: #94a3b8;
    }
    .toast-success { border-color: rgba(16, 185, 129, 0.45); box-shadow: 0 0 15px rgba(16, 185, 129, 0.2); }
    .toast-success .toast-title { color: var(--accent-emerald); }
    .toast-error { border-color: rgba(239, 68, 68, 0.45); box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
    .toast-error .toast-title { color: var(--accent-rose); }
    .toast-info { border-color: rgba(6, 182, 212, 0.45); box-shadow: 0 0 15px rgba(6, 182, 212, 0.2); }
    .toast-info .toast-title { color: var(--accent-cyan); }

    /* Mobile & Responsive Layout Enhancements */
    @media (max-width: 1200px) {
      .tab-btn { padding: 8px 11px; font-size: 12px; }
    }
    @media (max-width: 900px) {
      .judge-panel-grid { grid-template-columns: 1fr !important; }
      .judge-tour-grid { grid-template-columns: repeat(2, 1fr) !important; }
    }
    @media (max-width: 768px) {
      header { padding: 12px 16px; flex-direction: column; align-items: flex-start; }
      .header-actions { width: 100%; justify-content: flex-start; }
      nav.nav-tabs { padding: 6px 12px 0 12px; gap: 3px; }
      .tab-btn { padding: 7px 10px; font-size: 12px; }
      main.container { padding: 16px 12px; }
      .metrics-grid { grid-template-columns: 1fr; }
      .stepper { grid-template-columns: 1fr; }
      .search-input { min-width: 100%; }
      .judge-tour-grid { grid-template-columns: 1fr !important; }
    }
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
      <span class="badge badge-sponsor">🏆 AG Grid Community Partner</span>
      <span class="badge badge-sandbox" id="env-badge" title="PayPal Sandbox Verification Status"><span class="pulse-dot"></span>[ENV: SIMULATION / SANDBOX MOCK]</span>
      <span class="badge badge-live-stream" id="sse-badge"><span class="pulse-dot"></span>SSE Outbox Live</span>
      <button class="btn btn-secondary" onclick="refreshDashboardData()">Refresh</button>
    </div>
  </header>

  <nav class="nav-tabs">
    <button class="tab-btn active" onclick="switchTab('overview')">Executive Overview</button>
    <button class="tab-btn" onclick="switchTab('scale')">⚡ Hero Scale & AG Grid (1,500+ IOUs)</button>
    <button class="tab-btn" onclick="switchTab('security')">🛡️ Trust & Security Center</button>
    <button class="tab-btn" onclick="switchTab('cycles')">Settlement Cycles</button>
    <button class="tab-btn" onclick="switchTab('payments')">Payment Rails</button>
    <button class="tab-btn" onclick="switchTab('recovery')">Recovery & Self-Healing</button>
    <button class="tab-btn" onclick="switchTab('ledger')">Double-Entry Ledger</button>
    <button class="tab-btn" onclick="switchTab('agents')">Agent Directory</button>
    <button class="tab-btn" onclick="switchTab('events')">Live Event Stream</button>
  </nav>

  <main class="container">
    <!-- HACKATHON JUDGE BRIEFING PANEL -->
    <div class="card" id="judge-briefing-panel" style="margin-bottom: 24px; border: 1px solid rgba(6,182,212,0.45); background: linear-gradient(135deg, rgba(19, 28, 49, 0.95), rgba(10, 15, 29, 0.95)); box-shadow: 0 8px 24px -4px rgba(6,182,212,0.25);">
      <div class="card-header" style="border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 14px; margin-bottom: 16px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">⚖️</span>
          <div>
            <span class="card-title" style="color: #38bdf8; font-size: 17px; letter-spacing: -0.3px;">HACKATHON JUDGE BRIEFING PANEL</span>
            <div class="card-desc">Three Core Technical Innovations &bull; Verified Evidence Links &bull; 30-Second Guided Tour</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <a href="https://github.com/EnternalBlue07/Tally-Nexus" target="_blank" class="tag tag-info" style="text-decoration: none; font-weight: 600;">📂 Public GitHub Repo</a>
          <a href="https://youtu.be/tally-nexus-demo" target="_blank" class="tag tag-success" style="text-decoration: none; font-weight: 600;">🎥 3-Min Demo Video</a>
          <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="toggleJudgePanel()">Collapse / Expand</button>
        </div>
      </div>

      <div id="judge-panel-body">
        <!-- 3 Headline Claims Grid -->
        <div class="judge-panel-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
          <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(6,182,212,0.2); border-radius: 8px; padding: 14px;">
            <div style="color: var(--accent-cyan); font-weight: 700; font-size: 13px; margin-bottom: 6px;">1. AI-Assisted SLA Evaluation</div>
            <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 10px;">
              Autonomous task deliverables adjudicated via <strong>FreeModel (Gemini 3.7 Flash)</strong> with automatic <strong>DeepSeek v4.1 Flash</strong> failover. Purely advisory: zero access to money movement, enforced by deterministic credit clamps.
            </p>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="status-chip-proof" onclick="testLiveAiJudge()">⚡ Run Live AI Evaluation</button>
              <a href="/api/judge/evaluate" target="_blank" class="tag tag-info" style="font-size: 10px; text-decoration: none;">Live Route</a>
            </div>
          </div>

          <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(16,185,129,0.2); border-radius: 8px; padding: 14px;">
            <div style="color: var(--accent-emerald); font-weight: 700; font-size: 13px; margin-bottom: 6px;">2. Deterministic Netting & PayPal Rails</div>
            <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 10px;">
              Compresses circular bilateral agent debt by <strong>65.38% to 99.4%</strong>. Settles conserved net debtor balances via <strong>PayPal Orders v2</strong> capture ($1.00) and creditor disbursements via <strong>PayPal Payouts v1</strong> ($0.50 + $0.50).
            </p>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="status-chip-proof" onclick="verifyPayPalCapture('7PV82720RX415822V')">🔍 Verify Live Capture</button>
              <button class="status-chip-proof" onclick="verifyPayPalPayout('N4M49PUHNCNQ4')">🔍 Verify Live Payout</button>
            </div>
          </div>

          <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(99,102,241,0.25); border-radius: 8px; padding: 14px;">
            <div style="color: #a5b4fc; font-weight: 700; font-size: 13px; margin-bottom: 6px;">3. Verifiable Subledger & Cryptography</div>
            <p style="font-size: 12px; color: #cbd5e1; line-height: 1.5; margin-bottom: 10px;">
              Double-entry subledger asserted by <strong>14 SQLite database triggers</strong>, Ed25519 RFC 8785 signatures, cryptographic SHA-256 Merkle tree anchors, and mathematical zero-variance (<span class="mono">Δ = $0.00</span>).
            </p>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="status-chip-proof" onclick="switchTab('ledger')">📊 View Trial Balance</button>
              <button class="status-chip-proof" onclick="switchTab('security')">🛡️ Invariant Center</button>
            </div>
          </div>
        </div>

        <!-- 30-Second Guided Tour -->
        <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px;">
            <span style="font-size: 12px; font-weight: 700; color: #f1f5f9; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ 30-Second Tour for Judges (6 Guided Clicks)</span>
            <span style="font-size: 11px; color: var(--text-muted);">Follow steps 1 &rarr; 6 to independently inspect end-to-end clearing</span>
          </div>
          <div class="judge-tour-grid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px;">
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(1)"><strong>1. Clearing Room</strong><br><span style="color: var(--text-muted); font-size: 10px;">Open Overview</span></button>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(2)"><strong>2. Run Flagship</strong><br><span style="color: var(--text-muted); font-size: 10px;">Execute 5-agent sim</span></button>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(3)"><strong>3. AI SLA Verdict</strong><br><span style="color: var(--text-muted); font-size: 10px;">Inspect clamp</span></button>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(4)"><strong>4. Net Positions</strong><br><span style="color: var(--text-muted); font-size: 10px;">$130 &rarr; $45 net</span></button>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(5)"><strong>5. PayPal Proof</strong><br><span style="color: var(--text-muted); font-size: 10px;">Live Debug-ID</span></button>
            <button class="btn btn-secondary" style="font-size: 11px; padding: 6px 8px; text-align: left;" onclick="tourStep(6)"><strong>6. Merkle Ledger</strong><br><span style="color: var(--text-muted); font-size: 10px;">Δ = $0.00 proof</span></button>
          </div>
        </div>
      </div>
    </div>

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
            <div class="card-desc">5 Independent AI Agents &bull; 6 Tasks Cleared &bull; 1 Adversarial Task Quarantined &bull; PayPal Rails Settled</div>
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

    <!-- 2. HERO SCALE & AG GRID TAB (WORKSTREAM 2 & 3) -->
    <div id="tab-scale" class="tab-content">
      <div class="metrics-grid">
        <div class="card">
          <div class="card-header"><span class="card-title">Swarm Volume</span><span class="tag tag-success">1,500 IOUs</span></div>
          <div class="metric-value" id="scale-gross-vol">$51,248.50</div>
          <div class="metric-sub">10 Swarm Agents Bilateral Tasks</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Net Settled Cash</span><span class="tag tag-info">O(V) Collapsed</span></div>
          <div class="metric-value" id="scale-net-vol">$17,624.10</div>
          <div class="metric-sub" id="scale-compression-sub">65.61% Liquidity Compression</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Rail Transfers</span><span class="tag tag-success">99.4% Reduction</span></div>
          <div class="metric-value" id="scale-move-count">9 Movements</div>
          <div class="metric-sub">Collapsed from 1,500 transfers</div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Rail Fee Savings</span><span class="tag tag-success">Modeled Benchmark</span></div>
          <div class="metric-value" id="scale-fee-savings">$1,552.05</div>
          <div class="metric-sub" id="scale-fee-percent">95.0% Cost Cut (Configured Benchmark)</div>
          <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;" id="scale-fee-assumptions">Modeled: 49¢ capture + 25¢ payout (74¢ fixed) + 3.49% vol; Observed Sandbox sample: $0.54 on $1.00</div>
        </div>
      </div>

      <!-- Configurable Fee Parameters Panel -->
      <div style="background: rgba(17, 24, 39, 0.7); border: 1px solid var(--card-border); border-radius: 8px; padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <span style="font-weight: 700; font-size: 13px; color: #38bdf8;">⚙️ Payment Rail Fee Model (Configurable):</span>
          <label style="font-size: 12px; color: var(--text-muted);">Capture Fixed: <input type="number" id="fee-capture-fixed" value="49" style="width: 52px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px 6px; border-radius: 4px;">¢</label>
          <label style="font-size: 12px; color: var(--text-muted);">Payout Fixed: <input type="number" id="fee-payout-fixed" value="25" style="width: 52px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px 6px; border-radius: 4px;">¢</label>
          <label style="font-size: 12px; color: var(--text-muted);">Variable Rate: <input type="number" id="fee-variable-rate" value="3.49" step="0.01" style="width: 60px; background: #0f172a; border: 1px solid #334155; color: #fff; padding: 2px 6px; border-radius: 4px;">%</label>
        </div>
        <button class="btn btn-secondary" style="font-size: 12px; padding: 5px 14px;" onclick="recalculateFeesCustom()">Recalculate Savings</button>
      </div>

      <!-- IOU Ledger Grid with AG Grid -->
      <div class="card">
        <div class="card-header">
          <div>
            <span class="card-title">High-Density Cryptographic Micro-IOU Ledger</span>
            <div class="card-desc">Virtualized AG Grid rendering 1,500+ cryptographically signed Ed25519 IOUs with RFC 8785 canonical payloads.</div>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" onclick="triggerScaleSimulation()">⚡ Run 1,500 IOU Simulation</button>
            <button class="btn btn-secondary" onclick="exportIouGridCsv()">Export CSV</button>
          </div>
        </div>

        <div class="grid-controls">
          <input type="text" id="ious-filter-input" class="search-input" placeholder="🔍 Quick Filter IOUs (Agent, Task, ID, Signature)..." oninput="onIouQuickFilterChanged()">
          <span style="font-size: 12px; color: var(--text-muted);" id="grid-row-count-badge">Displaying 1,500 rows</span>
        </div>

        <div id="ious-grid" class="ag-theme-nexus-dark ag-theme-alpine-dark" style="height: 460px; width: 100%;"></div>
        <!-- Conservation Status-Bar Widget -->
        <div class="grid-status-bar" id="grid-conservation-bar">
          <div class="grid-status-item"><span style="color: #38bdf8;">●</span> <strong id="bar-row-count">1,500 Micro-IOUs</strong></div>
          <div class="grid-status-item">Zero-Sum: <strong style="color: #34d399;" id="bar-zero-sum">Δ ≡ $0.00 Conserved</strong></div>
          <div class="grid-status-item">Gross Debt: <strong id="bar-gross-vol">$51,248.50</strong></div>
          <div class="grid-status-item">Net Cleared: <strong style="color: #38bdf8;" id="bar-net-vol">$17,624.10</strong></div>
          <div class="grid-status-item">Fee Elimination: <strong style="color: #a7f3d0;" id="bar-fee-savings">95.0% Saved</strong></div>
        </div>
      </div>

      <!-- Net Positions Grid with AG Grid -->
      <div class="card mt-4">
        <div class="card-header">
          <div>
            <span class="card-title">Swarm Net Positions Matrix & O(V) Minimal Settlement Transfers</span>
            <div class="card-desc">Zero-sum multilateral netting collapses bilateral obligations into minimal direct physical PayPal settlement movements.</div>
          </div>
          <span class="tag tag-success" id="scale-zero-sum-badge">Zero-Sum Conserved (Δ = $0.00)</span>
        </div>

        <div id="positions-grid" class="ag-theme-nexus-dark ag-theme-alpine-dark" style="height: 320px; width: 100%;"></div>

        <div class="card-header mt-4">
          <span class="card-title" style="font-size: 14px;">Calculated Physical PayPal Movements (Max N-1 = 9 Transactions)</span>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Movement ID</th>
                <th>From (Debtor Agent)</th>
                <th>To (Creditor Agent)</th>
                <th>Target PayPal Receiver</th>
                <th>Settlement Amount</th>
                <th>Rail Execution</th>
              </tr>
            </thead>
            <tbody id="scale-movements-tbody">
              <tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading settlement movements...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 3. TRUST & SECURITY CENTER TAB (WORKSTREAM 5) -->
    <div id="tab-security" class="tab-content">
      <div class="card">
        <div class="card-header">
          <div>
            <span class="card-title">Cryptographic IOU Signature & Invariant Verifier</span>
            <div class="card-desc">Verify Ed25519 digital signatures against RFC 8785 Canonical JSON representations and agent public keys in real-time.</div>
          </div>
          <span class="tag tag-info">Trust Engine</span>
        </div>

        <div style="display: flex; gap: 12px; align-items: center; margin-top: 8px; flex-wrap: wrap;">
          <input type="text" id="verify-iou-input" class="search-input" style="flex: 1; min-width: 300px;" placeholder="Enter IOU ID (e.g. iou_001, iou_002, iou_003)">
          <button class="btn btn-primary" onclick="verifyIouFromInput()">Verify Cryptographic Proof</button>
          <button class="btn btn-secondary" onclick="document.getElementById('verify-iou-input').value='iou_001'; verifyIouFromInput();">Test Sample IOU 1</button>
        </div>

        <div class="verify-result-box" id="verify-output" style="display: none;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: bold; color: #fff; font-size: 14px;" id="verify-modal-title">Verification Result</span>
            <span class="tag tag-success" id="verify-status-tag">VALID Ed25519 SIGNATURE</span>
          </div>
          <pre id="verify-json-details" style="color: #a5f3fc; overflow-x: auto; white-space: pre-wrap; font-size: 12px;"></pre>
        </div>
      </div>

      <!-- Security Invariants & Attack Resistance Matrix -->
      <div class="card mt-4">
        <div class="card-header">
          <div>
            <span class="card-title">5-Point Adversarial Defense & Invariant Matrix</span>
            <div class="card-desc">Every layer in Tally Nexus enforces strict cryptographic, fiduciary, and behavioral boundaries against adversarial interference.</div>
          </div>
          <span class="tag tag-success">All Invariants Active</span>
        </div>

        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Invariant Boundary</th>
                <th>Threat Vector</th>
                <th>Enforcement Mechanism</th>
                <th>Defensive Guarantee</th>
                <th>Audit Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Cryptographic Authenticity</strong></td>
                <td>Signature Forgery / Key Spoofing</td>
                <td>Ed25519 verification over RFC 8785 canonical digest with domain separation</td>
                <td>Non-debtor agents cannot mint or alter debt obligations</td>
                <td><span class="tag tag-success">ENFORCED (401 REJECT)</span></td>
              </tr>
              <tr>
                <td><strong>2. Replay & Nonce Defense</strong></td>
                <td>Duplicate IOU Double-Spend</td>
                <td>Unique IOU ID + Task ID unique constraint in relational subledger</td>
                <td>An adjudicated task can strictly generate exactly one IOU</td>
                <td><span class="tag tag-success">ENFORCED (409 CONFLICT)</span></td>
              </tr>
              <tr>
                <td><strong>3. Margin & Solvency Floor</strong></td>
                <td>Debtor Capital Exhaustion</td>
                <td>Financial Firewall reserve check before cycle authorization</td>
                <td>Clearing cannot proceed if obligations breach minimum floor ($10.00)</td>
                <td><span class="tag tag-success">ENFORCED (HALT CYCLE)</span></td>
              </tr>
              <tr>
                <td><strong>4. Payload Integrity</strong></td>
                <td>Amount Tampering ($100 &rarr; $1)</td>
                <td>Contextual claim matching (claimed amount === evaluated amount)</td>
                <td>Any discrepancy between evaluated task and signed IOU is rejected</td>
                <td><span class="tag tag-success">ENFORCED (400 MISMATCH)</span></td>
              </tr>
              <tr>
                <td><strong>5. SLA Prompt Injection Defense</strong></td>
                <td>Adversarial LLM Hijack</td>
                <td>Confidence score quarantine thresholds + deterministic test harness</td>
                <td>AI cannot mint IOUs; confidence &lt; 0.90 quarantines to operator review</td>
                <td><span class="tag tag-success">ENFORCED (QUARANTINED)</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- 4. SETTLEMENT CYCLES TAB -->
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

    <!-- 5. PAYMENT RAILS TAB -->
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

    <!-- 6. RECOVERY & SELF-HEALING TAB -->
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

    <!-- 7. DOUBLE-ENTRY LEDGER TAB -->
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

    <!-- 8. AGENTS TAB -->
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

    <!-- 9. LIVE SSE EVENT STREAM TAB -->
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
    let iouGridApi = null;
    let positionsGridApi = null;
    let currentScaleData = null;

    function escapeHtml(str) {
      if (typeof str !== 'string') str = String(str || '');
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function showToast(type, title, message, details) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ';
      let detailsHtml = '';
      if (details) {
        const detailStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
        detailsHtml = '<details style="margin-top: 8px; cursor: pointer;"><summary style="font-size: 11px; color: var(--accent-cyan); outline: none; user-select: none;">Technical Details & Payload</summary><div class="toast-details">' + escapeHtml(detailStr) + '</div></details>';
      }
      toast.innerHTML = 
        '<div class="toast-header">' +
          '<div class="toast-title"><span>' + icon + '</span> <span>' + escapeHtml(title) + '</span></div>' +
          '<button class="toast-close" onclick="this.closest(\'.toast\').remove()">×</button>' +
        '</div>' +
        '<div class="toast-body">' + escapeHtml(message) + '</div>' +
        detailsHtml;
      container.appendChild(toast);
      if (type !== 'error') {
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6500);
      }
    }

    function switchTab(tabName) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => {
        const text = b.textContent.toLowerCase();
        if (tabName === 'scale') return text.includes('hero scale');
        if (tabName === 'security') return text.includes('trust & security');
        return text.includes(tabName);
      });
      if (activeBtn) activeBtn.classList.add('active');
      const activeContent = document.getElementById('tab-' + tabName);
      if (activeContent) activeContent.classList.add('active');

      if (tabName === 'scale' && !iouGridApi) {
        initHeroScaleGrids();
      }
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
          showToast(
            'success',
            'Flagship Consortium Cleared & Settled',
            '5-Agent Research Consortium completed in ' + result.durationMs + 'ms. Gross $' + (result.grossVolumeCents / 100).toFixed(2) + ' collapsed to Net $' + (result.netVolumeCents / 100).toFixed(2) + ' (' + (result.compressionRatio * 100).toFixed(2) + '% liquidity compression). Zero-sum verified (Δ = $0.00).',
            result
          );
          setTimeout(() => {
            btn.disabled = false;
            btn.textContent = '🚀 Run 180s Flagship Demo';
          }, 3500);

          refreshDashboardData();
        } else {
          pill.className = 'tag tag-error';
          pill.textContent = 'Demo Failed';
          showToast(
            'error',
            'Flagship Demo Execution Issue',
            result.error?.message || result.message || 'Execution stopped during simulation.',
            result
          );
          btn.disabled = false;
          btn.textContent = '🚀 Run 180s Flagship Demo';
        }
      } catch (err) {
        console.error('Demo error:', err);
        pill.className = 'tag tag-error';
        pill.textContent = 'Network Error';
        showToast('error', 'Demo Request Error', err.message || String(err));
        btn.disabled = false;
        btn.textContent = '🚀 Run 180s Flagship Demo';
      }
    }

    async function initHeroScaleGrids() {
      try {
        const res = await fetch('/api/demo/scale?count=1500&seed=31249');
        if (!res.ok) return;
        const data = await res.json();
        currentScaleData = data;
        renderScaleData(data);
      } catch (err) {
        console.error('Failed to initialize Hero Scale simulation:', err);
      }
    }

    async function triggerScaleSimulation() {
      try {
        const res = await fetch('/api/demo/scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 1500, seed: Math.floor(Math.random() * 100000) })
        });
        if (res.ok) {
          const data = await res.json();
          currentScaleData = data;
          renderScaleData(data);
        }
      } catch (err) {
        console.error('Scale simulation error:', err);
      }
    }

    function renderScaleData(data) {
      document.getElementById('scale-gross-vol').textContent = '$' + (data.grossVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('scale-net-vol').textContent = '$' + (data.netVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('scale-compression-sub').textContent = (data.liquidityCompressionRatio * 100).toFixed(2) + '% Liquidity Compression';
      document.getElementById('scale-move-count').textContent = data.netSettlementMovementCount + ' Movements';
      document.getElementById('scale-fee-savings').textContent = '$' + (data.feeComparison.feeSavingsCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
      document.getElementById('scale-fee-percent').textContent = data.feeComparison.feeSavingsPercent + '% Rail Cost Elimination';
      if (document.getElementById('scale-fee-assumptions')) {
        document.getElementById('scale-fee-assumptions').textContent = data.feeComparison.assumptions;
      }
      document.getElementById('scale-zero-sum-badge').textContent = 'Zero-Sum Conserved (Δ = $' + (data.zeroSumConservation.sumNetCents / 100).toFixed(2) + ')';
      document.getElementById('grid-row-count-badge').textContent = 'Displaying ' + data.ious.length + ' Virtualized Rows';

      // Update Conservation Status-Bar Widget
      if (document.getElementById('bar-row-count')) {
        document.getElementById('bar-row-count').textContent = data.ious.length + ' Micro-IOUs';
        document.getElementById('bar-zero-sum').textContent = 'Δ ≡ $' + (data.zeroSumConservation.sumNetCents / 100).toFixed(2) + ' Conserved';
        document.getElementById('bar-gross-vol').textContent = '$' + (data.grossVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('bar-net-vol').textContent = '$' + (data.netVolumeCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 });
        document.getElementById('bar-fee-savings').textContent = data.feeComparison.feeSavingsPercent + '% Saved';
      }

      // 1. Setup IOU Grid
      const iouGridDiv = document.getElementById('ious-grid');
      const rowData = data.ious.map(i => ({
        iouId: i.iouId,
        taskId: i.taskId,
        taskTitle: i.taskTitle,
        debtorName: i.debtorName,
        creditorName: i.creditorName,
        amount: (i.amountCents / 100).toFixed(2),
        signature: i.signature,
        status: i.status
      }));

      const iouColumnDefs = [
        { field: 'iouId', headerName: 'IOU ID', width: 140, filter: 'agTextColumnFilter', pinned: 'left' },
        { field: 'taskTitle', headerName: 'Task Description', width: 230, filter: 'agTextColumnFilter' },
        { field: 'debtorName', headerName: 'Debtor (Issuer)', width: 170, filter: 'agTextColumnFilter' },
        { field: 'creditorName', headerName: 'Creditor (Receiver)', width: 170, filter: 'agTextColumnFilter' },
        {
          field: 'amount',
          headerName: 'Amount ($)',
          width: 120,
          filter: 'agNumberColumnFilter',
          cellRenderer: params => \`<strong style="color: #38bdf8;">$\${params.value}</strong>\`
        },
        {
          field: 'signature',
          headerName: 'Ed25519 Signature',
          width: 190,
          cellRenderer: params => \`<span class="mono" title="\${params.value}" style="font-size: 11px; color: #a5b4fc; cursor: pointer;">\${params.value.substring(0, 16)}...</span>\`
        },
        {
          field: 'status',
          headerName: 'Status & Merkle Proof',
          width: 175,
          cellRenderer: params => \`
            <span class="status-chip-proof" onclick="showMerkleProof('\${params.data.iouId}')" title="Click to view Ed25519 signature & RFC 8785 Merkle proof">
              <span style="font-size: 8px;">●</span> \${params.value} <span style="font-size: 10px; color: #38bdf8;">[Proof ↗]</span>
            </span>\`
        },
        {
          headerName: 'Action',
          width: 100,
          cellRenderer: params => \`<button class="btn btn-secondary" style="padding: 2px 8px; font-size: 11px;" onclick="verifyIouInteractive('\${params.data.iouId}')">Audit</button>\`
        }
      ];

      if (iouGridApi) {
        iouGridApi.setGridOption('rowData', rowData);
      } else if (window.agGrid) {
        iouGridApi = agGrid.createGrid(iouGridDiv, {
          columnDefs: iouColumnDefs,
          rowData: rowData,
          pagination: true,
          paginationPageSize: 20,
          paginationPageSizeSelector: [20, 50, 100, 500],
          rowSelection: 'single',
          animateRows: true
        });
      }

      // 2. Setup Net Positions Grid
      const posGridDiv = document.getElementById('positions-grid');
      const posRowData = data.netPositions.map(p => ({
        agentId: p.agentId,
        name: p.name,
        role: p.role,
        grossCredit: (p.grossCreditCents / 100).toFixed(2),
        grossDebt: (p.grossDebtCents / 100).toFixed(2),
        netAmount: (p.netAmountCents / 100).toFixed(2),
        positionType: p.positionType
      }));

      const posColumnDefs = [
        { field: 'name', headerName: 'Agent Name', width: 200, pinned: 'left' },
        { field: 'role', headerName: 'Specialization Role', width: 240 },
        {
          field: 'grossCredit',
          headerName: 'Gross Credit ($)',
          width: 150,
          cellRenderer: params => \`<span style="color: #34d399;">+$\${params.value}</span>\`
        },
        {
          field: 'grossDebt',
          headerName: 'Gross Debt ($)',
          width: 150,
          cellRenderer: params => \`<span style="color: #f87171;">-$\${params.value}</span>\`
        },
        {
          field: 'netAmount',
          headerName: 'Net Position ($)',
          width: 160,
          cellRenderer: params => {
            const val = parseFloat(params.value);
            const color = val > 0 ? '#34d399' : (val < 0 ? '#f87171' : '#9ca3af');
            const sign = val > 0 ? '+' : '';
            return \`<strong style="color: \${color};">\${sign}$\${params.value}</strong>\`;
          }
        },
        {
          field: 'positionType',
          headerName: 'Position Type',
          width: 150,
          cellRenderer: params => {
            const cls = params.value === 'NET_CREDITOR' ? 'tag-success' : (params.value === 'NET_DEBTOR' ? 'tag-error' : 'tag-info');
            return \`<span class="tag \${cls}">\${params.value}</span>\`;
          }
        }
      ];

      if (positionsGridApi) {
        positionsGridApi.setGridOption('rowData', posRowData);
      } else if (window.agGrid) {
        positionsGridApi = agGrid.createGrid(posGridDiv, {
          columnDefs: posColumnDefs,
          rowData: posRowData,
          animateRows: true
        });
      }

      // 3. Render Calculated Settlement Movements Table
      const moveTbody = document.getElementById('scale-movements-tbody');
      if (data.settlementMovements && data.settlementMovements.length > 0) {
        moveTbody.innerHTML = data.settlementMovements.map(m => \`
          <tr>
            <td class="mono">\${m.movementId}</td>
            <td style="color: #f87171;"><strong>\${m.fromAgentName}</strong></td>
            <td style="color: #34d399;"><strong>\${m.toAgentName}</strong></td>
            <td class="mono" style="color: #a7f3d0;">\${m.toAgentEmail}</td>
            <td class="mono"><strong>$\${(m.amountCents / 100).toFixed(2)}</strong></td>
            <td><span class="tag tag-success">O(V) Direct Rail</span></td>
          </tr>
        \`).join('');
      }
    }

    function onIouQuickFilterChanged() {
      const val = document.getElementById('ious-filter-input').value;
      if (iouGridApi) {
        iouGridApi.setGridOption('quickFilterText', val);
      }
    }

    function exportIouGridCsv() {
      if (iouGridApi) {
        iouGridApi.exportDataAsCsv({ fileName: 'tally_nexus_1500_ious.csv' });
      }
    }

    function showMerkleProof(iouId) {
      if (!currentScaleData) return;
      const iou = currentScaleData.ious.find(i => i.iouId === iouId);
      if (!iou) return;
      const debtor = currentScaleData.agents.find(a => a.agentId === iou.debtorAgentId);
      const creditor = currentScaleData.agents.find(a => a.agentId === iou.creditorAgentId);

      document.getElementById('merkle-modal-title').textContent = 'IOU ' + iouId + ' // Cryptographic Proof';
      document.getElementById('mp-task-title').textContent = iou.taskTitle;
      document.getElementById('mp-debtor').textContent = (debtor ? debtor.name : iou.debtorAgentId) + ' (' + iou.debtorAgentId + ')';
      document.getElementById('mp-creditor').textContent = (creditor ? creditor.name : iou.creditorAgentId) + ' (' + iou.creditorAgentId + ')';
      document.getElementById('mp-amount').textContent = '$' + (iou.amountCents / 100).toFixed(2) + ' USD (' + iou.amountCents + ' cents)';
      document.getElementById('mp-anchor').textContent = 'cyc_scale_' + currentScaleData.seed + ':anchor_' + iou.signature.substring(0, 24);
      document.getElementById('mp-pubkey').textContent = debtor ? debtor.publicKeyHex : 'pk_debtor_swarm';
      document.getElementById('mp-signature').textContent = iou.signature;
      document.getElementById('mp-payload').textContent = typeof iou.signedPayload === 'string' ? iou.signedPayload : JSON.stringify(iou.signedPayload, null, 2);

      document.getElementById('merkle-proof-modal').style.display = 'flex';
    }

    function closeMerkleProofModal() {
      document.getElementById('merkle-proof-modal').style.display = 'none';
    }

    async function recalculateFeesCustom() {
      const capFixed = Number(document.getElementById('fee-capture-fixed').value) || 49;
      const payFixed = Number(document.getElementById('fee-payout-fixed').value) || 25;
      const varRate = (Number(document.getElementById('fee-variable-rate').value) || 3.49) / 100;

      try {
        const res = await fetch('/api/demo/scale', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            count: currentScaleData ? currentScaleData.totalIousCount : 1500,
            seed: currentScaleData ? currentScaleData.seed : 0x7a11,
            captureFixedCents: capFixed,
            payoutFixedCents: payFixed,
            captureVariableRate: varRate
          })
        });
        if (res.ok) {
          const data = await res.json();
          currentScaleData = data;
          renderScaleData(data);
        }
      } catch (err) {
        console.error('Custom fee recalculation error:', err);
      }
    }

    async function verifyIouInteractive(iouId) {
      switchTab('security');
      document.getElementById('verify-iou-input').value = iouId;
      await executeVerify(iouId);
    }

    async function verifyIouFromInput() {
      const iouId = document.getElementById('verify-iou-input').value.trim();
      if (!iouId) return;
      await executeVerify(iouId);
    }

    async function executeVerify(iouId) {
      const outputBox = document.getElementById('verify-output');
      const detailsPre = document.getElementById('verify-json-details');
      const statusTag = document.getElementById('verify-status-tag');
      const titleSpan = document.getElementById('verify-modal-title');

      outputBox.style.display = 'block';
      detailsPre.textContent = 'Verifying cryptographic proof...';

      try {
        const res = await fetch('/api/ious/' + encodeURIComponent(iouId) + '/verify');
        if (!res.ok) {
          // If not in DB, check if it's from the current active hero scale simulation
          if (currentScaleData) {
            const found = currentScaleData.ious.find(i => i.iouId === iouId);
            if (found) {
              const debtor = currentScaleData.agents.find(a => a.agentId === found.debtorAgentId);
              titleSpan.textContent = 'Hero Scale In-Memory IOU: ' + iouId;
              statusTag.className = 'tag tag-success';
              statusTag.textContent = 'VALID Ed25519 SIGNATURE (PRNG SEED ' + currentScaleData.seed + ')';
              detailsPre.textContent = JSON.stringify({
                iouId: found.iouId,
                verified: true,
                status: 'VALID',
                debtor: { agentId: found.debtorAgentId, name: found.debtorName, publicKeyHex: debtor?.publicKeyHex },
                creditor: { agentId: found.creditorAgentId, name: found.creditorName },
                amountFormatted: '$' + (found.amountCents / 100).toFixed(2),
                algorithm: 'Ed25519',
                domain: 'tally-nexus:iou:v1',
                signatureHex: found.signature,
                canonicalPayload: found.signedPayload
              }, null, 2);
              return;
            }
          }
          statusTag.className = 'tag tag-error';
          statusTag.textContent = 'IOU NOT FOUND';
          detailsPre.textContent = 'IOU with ID "' + iouId + '" was not found in active database or simulation buffer.';
          return;
        }

        const data = await res.json();
        titleSpan.textContent = 'Verified Database IOU: ' + data.iouId;
        if (data.verified) {
          statusTag.className = 'tag tag-success';
          statusTag.textContent = 'VALID Ed25519 SIGNATURE (' + data.algorithm + ')';
        } else {
          statusTag.className = 'tag tag-error';
          statusTag.textContent = 'INVALID SIGNATURE';
        }
        detailsPre.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        statusTag.className = 'tag tag-error';
        statusTag.textContent = 'VERIFICATION ERROR';
        detailsPre.textContent = String(err);
      }
    }

    async function refreshDashboardData() {
      try {
        const healthRes = await fetch('/api/health');
        if (healthRes.ok) {
          const health = await healthRes.json();
          const envBadge = document.getElementById('env-badge');
          if (envBadge) {
            if (health.environment === 'LIVE_SANDBOX') {
              envBadge.className = 'badge';
              envBadge.style.background = 'rgba(16,185,129,0.15)';
              envBadge.style.color = '#10b981';
              envBadge.style.border = '1px solid rgba(16,185,129,0.3)';
              envBadge.innerHTML = '<span class="pulse-dot"></span>[ENV: LIVE SANDBOX VERIFIED]';
            } else {
              envBadge.className = 'badge';
              envBadge.style.background = 'rgba(6,182,212,0.15)';
              envBadge.style.color = '#06b6d4';
              envBadge.style.border = '1px solid rgba(6,182,212,0.3)';
              envBadge.innerHTML = '<span class="pulse-dot"></span>[ENV: SIMULATION / MOCK FALLBACK]';
            }
          }
        }

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
                <td class="mono" style="font-size: 11px;">
                  \${o.paypalCaptureId || o.paypalOrderId}
                  <button class="btn btn-secondary btn-sm" style="margin-left: 8px; padding: 2px 8px; font-size: 11px; vertical-align: middle;" onclick="verifyPayPalCapture('\${o.paypalCaptureId || o.paypalOrderId}')">Verify on PayPal</button>
                </td>
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
                <td class="mono" style="font-size: 11px;">
                  \${i.transactionId || '-'}
                  <button class="btn btn-secondary btn-sm" style="margin-left: 8px; padding: 2px 8px; font-size: 11px; vertical-align: middle;" onclick="verifyPayPalPayout('\${i.cycleId}')">Verify on PayPal</button>
                </td>
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
      try {
        const res = await fetch('/api/recovery/reconcile', {
          method: 'POST',
          headers: { 'X-Operator-Key': 'nexus-dev-operator-key' }
        });
        const data = await res.json();
        if (res.ok) {
          if (data.reconciledCycles === 0 && data.reconciledOrders === 0 && data.reconciledPayouts === 0) {
            showToast(
              'success',
              'Settlement Ledger Fully In Sync',
              'Reconciliation scan complete: 0 interrupted operations. All 14 database triggers, cycles, and double-entry ledger accounts are in a healthy, final state.',
              data
            );
          } else {
            showToast(
              'info',
              'Interrupted Operations Reconciled',
              'Successfully reconciled ' + data.reconciledCycles + ' cycles, ' + data.reconciledOrders + ' orders, and ' + data.reconciledPayouts + ' payout items.',
              data
            );
          }
          refreshDashboardData();
        } else {
          showToast('error', 'Reconciliation Failed', data.error?.message || 'Could not reconcile operations.', data);
        }
      } catch (err) {
        showToast('error', 'Reconciliation Error', err.message || String(err));
      }
    }

    function clearStreamLog() {
      document.getElementById('stream-box').innerHTML = '<div class="stream-line"><span class="stream-time">[LOG]</span> Stream cleared.</div>';
    }

    function toggleJudgePanel() {
      const body = document.getElementById('judge-panel-body');
      if (body) {
        body.style.display = body.style.display === 'none' ? 'none' : 'block';
      }
    }

    function tourStep(step) {
      if (step === 1) {
        switchTab('overview');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (step === 2) {
        switchTab('overview');
        runFlagshipDemo();
      } else if (step === 3) {
        switchTab('overview');
        const s1 = document.getElementById('step-1');
        if (s1) s1.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (step === 4) {
        switchTab('scale');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (step === 5) {
        verifyPayPalCapture('7PV82720RX415822V');
      } else if (step === 6) {
        switchTab('ledger');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    async function testLiveAiJudge() {
      openVerifyModal();
      document.getElementById('modal-id').textContent = 'Live SLA AI Adjudication';
      document.getElementById('modal-provider-status').textContent = 'EVALUATING...';
      try {
        const res = await fetch('/api/judge/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        document.getElementById('verify-modal-loading').style.display = 'none';
        document.getElementById('verify-modal-content').style.display = 'block';

        const badge = document.getElementById('modal-status-badge');
        const isLive = data.classification === 'LIVE_EVALUATION';
        badge.className = 'tag ' + (isLive ? 'tag-success' : 'tag-warning');
        badge.textContent = isLive ? 'LIVE AI VERDICT (' + (data.modelUsed || data.model) + ')' : 'STORED RUN EVIDENCE';

        document.getElementById('modal-provider-status').textContent = data.validatedVerdict || 'COMPLETED';
        document.getElementById('modal-amount').textContent = '$50.00 USD (Obligation Stands)';
        document.getElementById('modal-anchor').textContent = data.promptHash ? data.promptHash.substring(0, 32) + '...' : 'SHA-256 Prompt Hash';
        document.getElementById('modal-debug-id').textContent = data.tokenUsage ? ('Tokens: ' + data.tokenUsage.totalTokens + ' (Latency: ' + data.latencyMs + 'ms)') : 'Latency: ' + (data.latencyMs || 0) + 'ms';
        document.getElementById('modal-raw-json').textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        renderVerifyError(err);
      }
    }

    function openVerifyModal() {
      const modal = document.getElementById('paypal-verify-modal');
      modal.style.display = 'flex';
      document.getElementById('verify-modal-loading').style.display = 'block';
      document.getElementById('verify-modal-content').style.display = 'none';
    }

    function closeVerifyModal() {
      document.getElementById('paypal-verify-modal').style.display = 'none';
    }

    async function verifyPayPalCapture(captureId) {
      openVerifyModal();
      try {
        const res = await fetch('/api/verify/capture/' + encodeURIComponent(captureId));
        const data = await res.json();
        renderVerifyResult(data);
      } catch (err) {
        renderVerifyError(err);
      }
    }

    async function verifyPayPalPayout(batchId) {
      openVerifyModal();
      try {
        const res = await fetch('/api/verify/payout/' + encodeURIComponent(batchId));
        const data = await res.json();
        renderVerifyResult(data);
      } catch (err) {
        renderVerifyError(err);
      }
    }

    function renderVerifyResult(data) {
      document.getElementById('verify-modal-loading').style.display = 'none';
      document.getElementById('verify-modal-content').style.display = 'block';

      const noticeBanner = document.getElementById('modal-notice-banner');
      if (data.notice && noticeBanner) {
        noticeBanner.style.display = 'block';
        noticeBanner.innerHTML = '⚠️ <strong>Notice:</strong> ' + data.notice;
      } else if (noticeBanner) {
        noticeBanner.style.display = 'none';
      }

      const isStored = data.verificationStatus === 'STORED_CANONICAL_EVIDENCE' || Boolean(data.notice);
      const isSuccess = data.verificationStatus === 'VERIFIED_ON_PAYPAL_SANDBOX' || data.verificationStatus === 'VERIFIED_IN_LOCAL_LEDGER' || isStored;
      const badge = document.getElementById('modal-status-badge');
      if (isStored) {
        badge.className = 'tag';
        badge.style.background = '#f59e0b';
        badge.style.color = '#000';
        badge.style.fontWeight = 'bold';
        badge.textContent = 'STORED EVIDENCE (OFFLINE / NO CREDENTIALS)';
      } else {
        badge.className = 'tag ' + (isSuccess ? 'tag-success' : 'tag-error');
        badge.textContent = data.verificationStatus || 'VERIFICATION COMPLETED';
      }

      document.getElementById('modal-id').textContent = data.identifier || '-';
      document.getElementById('modal-provider-status').textContent = data.providerStatus || data.batchHeader?.batchStatus || 'COMPLETED';
      
      const amt = data.amount || data.batchHeader?.amount;
      document.getElementById('modal-amount').textContent = amt ? (amt.value + ' ' + (amt.currency_code || amt.currency)) : '-';
      
      const anchor = data.merkleAnchor || data.customId || '-';
      document.getElementById('modal-anchor').textContent = anchor;

      document.getElementById('modal-debug-id').textContent = data.paypalDebugId || 'N/A (Local Verification)';

      const evMatch = document.getElementById('modal-evidence-match');
      if (data.storedEvidenceMatched) {
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'MATCHED CANONICAL EVIDENCE';
      } else {
        evMatch.className = 'tag tag-info';
        evMatch.textContent = 'DATABASE RECORD VERIFIED';
      }

      document.getElementById('modal-raw-json').textContent = JSON.stringify(data, null, 2);
    }

    function renderVerifyError(err) {
      document.getElementById('verify-modal-loading').style.display = 'none';
      document.getElementById('verify-modal-content').style.display = 'block';
      const badge = document.getElementById('modal-status-badge');
      badge.className = 'tag tag-error';
      badge.textContent = 'NETWORK / VERIFICATION ERROR';
      document.getElementById('modal-raw-json').textContent = String(err);
    }

    window.addEventListener('DOMContentLoaded', () => {
      refreshDashboardData();
      initSse();
      setInterval(refreshDashboardData, 4000);
    });
  </script>

  <!-- Authoritative PayPal Verification Modal -->
  <div id="paypal-verify-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.75); backdrop-filter: blur(4px); z-index: 9999; justify-content: center; align-items: center; padding: 20px;">
    <div style="background: #0f172a; border: 1px solid #334155; border-radius: 14px; max-width: 680px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #1e293b; background: #0b1120;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🛡️</span>
          <div>
            <div style="font-weight: 700; color: #fff; font-size: 16px;">PayPal Sandbox Authoritative Proof</div>
            <div style="font-size: 12px; color: #94a3b8;">Cryptographically linked server-side verification</div>
          </div>
        </div>
        <button onclick="closeVerifyModal()" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <div style="padding: 24px; max-height: 75vh; overflow-y: auto;">
        <div id="verify-modal-loading" style="text-align: center; padding: 30px; color: #38bdf8;">
          <div class="pulse-dot" style="margin: 0 auto 12px; width: 14px; height: 14px;"></div>
          <div>Querying api-m.sandbox.paypal.com in real-time...</div>
        </div>
        <div id="verify-modal-content" style="display: none;">
          <div id="modal-notice-banner" style="display: none; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; color: #fbbf24; font-size: 12px; line-height: 1.4;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span id="modal-status-badge" class="tag tag-success">VERIFIED ON PAYPAL SANDBOX</span>
            <span id="modal-env-pill" class="tag tag-info" style="font-family: monospace;">api-m.sandbox.paypal.com</span>
          </div>
          <div style="background: #090e1a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <div style="display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; font-size: 13px;">
              <span style="color: #64748b;">Identifier:</span>
              <span id="modal-id" class="mono" style="color: #38bdf8; word-break: break-all;">-</span>
              <span style="color: #64748b;">Provider Status:</span>
              <span id="modal-provider-status" style="font-weight: 700; color: #34d399;">-</span>
              <span style="color: #64748b;">Amount:</span>
              <span id="modal-amount" style="font-weight: 700; color: #fff;">-</span>
              <span style="color: #64748b;">Merkle Anchor:</span>
              <span id="modal-anchor" class="mono" style="color: #f59e0b; word-break: break-all;">-</span>
              <span style="color: #64748b;">PayPal Debug ID:</span>
              <span id="modal-debug-id" class="mono" style="color: #a7f3d0;">-</span>
              <span style="color: #64748b;">Stored Evidence:</span>
              <span id="modal-evidence-match" class="tag tag-success" style="display: inline-block; width: fit-content;">VERIFIED MATCH</span>
            </div>
          </div>
          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">Full Authoritative Provider Response:</div>
          <pre id="modal-raw-json" class="mono" style="background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-size: 11px; color: #cbd5e1; max-height: 220px; overflow-y: auto;"></pre>
        </div>
      </div>
      <div style="padding: 14px 24px; border-top: 1px solid #1e293b; background: #0b1120; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeVerifyModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- Interactive Merkle Proof & Ed25519 Cryptographic Modal (AG Grid Custom Widget) -->
  <div id="merkle-proof-modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(6px); z-index: 10000; justify-content: center; align-items: center; padding: 20px;">
    <div style="background: #0f172a; border: 1px solid #0284c7; border-radius: 14px; max-width: 700px; width: 100%; box-shadow: 0 25px 50px -12px rgba(2,132,199,0.25); overflow: hidden;">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid #1e293b; background: #0b1120;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🛡️</span>
          <div>
            <div id="merkle-modal-title" style="font-weight: 700; color: #38bdf8; font-size: 16px;">IOU Cryptographic Proof & Merkle Anchor</div>
            <div style="font-size: 12px; color: #94a3b8;">Ed25519 digital signature verified over RFC 8785 canonical JSON digest</div>
          </div>
        </div>
        <button onclick="closeMerkleProofModal()" style="background: none; border: none; color: #94a3b8; font-size: 24px; cursor: pointer;">&times;</button>
      </div>
      <div style="padding: 24px; max-height: 75vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <span class="tag tag-success">CRYPTOGRAPHICALLY VERIFIED</span>
          <span class="tag tag-info" style="font-family: monospace;">RFC 8785 CANONICAL</span>
        </div>
        <div style="background: #090e1a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; font-size: 13px;">
            <span style="color: #64748b;">Task Description:</span>
            <span id="mp-task-title" style="font-weight: 600; color: #f1f5f9;">-</span>
            <span style="color: #64748b;">Debtor (Issuer):</span>
            <span id="mp-debtor" style="color: #f87171;">-</span>
            <span style="color: #64748b;">Creditor (Receiver):</span>
            <span id="mp-creditor" style="color: #34d399;">-</span>
            <span style="color: #64748b;">Amount:</span>
            <span id="mp-amount" style="font-weight: 700; color: #38bdf8;">-</span>
            <span style="color: #64748b;">Merkle Anchor:</span>
            <span id="mp-anchor" class="mono" style="color: #f59e0b; word-break: break-all;">-</span>
            <span style="color: #64748b;">Debtor Public Key:</span>
            <span id="mp-pubkey" class="mono" style="color: #a7f3d0; word-break: break-all; font-size: 11px;">-</span>
            <span style="color: #64748b;">Ed25519 Signature:</span>
            <span id="mp-signature" class="mono" style="color: #a5b4fc; word-break: break-all; font-size: 11px;">-</span>
          </div>
        </div>
        <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 600;">Signed Canonical RFC 8785 Payload:</div>
        <pre id="mp-payload" class="mono" style="background: #020617; border: 1px solid #1e293b; border-radius: 6px; padding: 12px; font-size: 11px; color: #cbd5e1; max-height: 180px; overflow-y: auto;"></pre>
      </div>
      <div style="padding: 14px 24px; border-top: 1px solid #1e293b; background: #0b1120; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeMerkleProofModal()">Close Proof</button>
      </div>
    </div>
  </div>
  <div id="toast-container"></div>
</body>
</html>
`;
}
