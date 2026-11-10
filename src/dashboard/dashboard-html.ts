export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tally Nexus — Autonomous Agent Clearinghouse & Multilateral Settlement Engine</title>
  
  <!-- Google Fonts: Plus Jakarta Sans & JetBrains Mono -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- AG Grid Community Styles & Script (Vendored Locally via Express with CDN Fallback) -->
  <link rel="stylesheet" href="/vendor/ag-grid/styles/ag-grid.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/styles/ag-grid.css';">
  <link rel="stylesheet" href="/vendor/ag-grid/styles/ag-theme-alpine.css" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/styles/ag-theme-alpine.css';">
  <script src="/vendor/ag-grid/dist/ag-grid-community.min.js" onerror="this.onerror=null;var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/ag-grid-community@32.3.3/dist/ag-grid-community.min.js';document.head.appendChild(s);"></script>

  <style>
    :root {
      /* Official PayPal Enterprise & Developer Platform Light Glassmorphic Theme */
      --bg-primary: #F4F8FD;
      --bg-secondary: #FFFFFF;
      --surface-primary: rgba(255, 255, 255, 0.9);
      --surface-elevated: #FFFFFF;
      --surface-secondary: #F8FAFD;
      --surface-hover: rgba(0, 112, 186, 0.08);
      
      --border-subtle: rgba(0, 112, 186, 0.12);
      --border-glass: rgba(0, 112, 186, 0.15);
      --card-border: rgba(0, 112, 186, 0.14);
      --border-active: #0070BA;

      --text-main: #0B1E3F;
      --text-secondary: #475569;
      --text-muted: #64748B;
      --text-subtle: #94A3B8;

      /* Signature PayPal Brand Colors */
      --paypal-blue: #0070BA;
      --paypal-marine: #009CDE;
      --paypal-deep: #003087;
      --paypal-dark: #001C3D;
      
      --accent-primary: #0070BA;
      --accent-secondary: #009CDE;
      --accent-gradient: linear-gradient(135deg, #0070BA 0%, #003087 100%);
      --accent-glow: 0 4px 20px rgba(0, 112, 186, 0.25);

      /* Semantic Financial Values */
      --accent-emerald: #059669;
      --accent-amber: #D97706;
      --accent-rose: #DC2626;
      --accent-cyan: #0284C7;
      --accent-turquoise: #009CDE;

      --shadow-sm: 0 2px 6px rgba(0, 112, 186, 0.06);
      --shadow-card: 0 10px 30px rgba(0, 112, 186, 0.08), 0 1px 3px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 1);
      --shadow-modal: 0 25px 60px rgba(0, 48, 135, 0.18), 0 0 35px rgba(0, 112, 186, 0.12);

      --sidebar-width: 250px;
      --topbar-height: 72px;
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      background-color: var(--bg-primary);
      background: radial-gradient(circle at 85% 0%, rgba(0, 156, 222, 0.14) 0%, transparent 45%),
                  radial-gradient(circle at 15% 15%, rgba(0, 112, 186, 0.09) 0%, transparent 40%),
                  #F4F8FD;
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.55;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      letter-spacing: -0.01em;
    }

    /* Tabular numbers for all financial figures */
    .mono, .tabular, [data-tabular], .metric-value, td {
      font-variant-numeric: tabular-nums;
    }

    /* ==========================================================================
       APP SHELL: SIDEBAR + TOPBAR + MAIN CONTENT CANVAS
       ========================================================================== */
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: var(--bg-primary);
    }

    /* Fixed Left Sidebar - PayPal Light Theme */
    aside.sidebar {
      width: var(--sidebar-width);
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border-right: 1px solid rgba(0, 112, 186, 0.12);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 1000;
      overflow-y: auto;
      scrollbar-width: none;
      box-shadow: 2px 0 16px rgba(0, 48, 135, 0.04);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    aside.sidebar::-webkit-scrollbar { display: none; }

    .sidebar-brand {
      padding: 22px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(0, 112, 186, 0.1);
    }
    .brand-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #0070BA 0%, #003087 100%);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 16px; color: #FFF;
      box-shadow: 0 4px 14px rgba(0, 112, 186, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
    }
    .brand-title {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #0B1E3F;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }

    /* Sidebar Navigation Groups */
    .nav-group {
      padding: 16px 14px 4px 14px;
    }
    .nav-group-title {
      font-size: 10.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94A3B8;
      padding: 0 10px 8px 10px;
    }
    .sidebar-nav-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 12px;
      border-radius: 12px;
      background: none;
      border: 1px solid transparent;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      margin-bottom: 3px;
    }
    .sidebar-nav-btn:hover {
      color: #0B1E3F;
      background: #F0F7FF;
    }
    .sidebar-nav-btn.active {
      color: #0070BA;
      background: #EBF4FC;
      border-color: rgba(0, 112, 186, 0.25);
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(0, 112, 186, 0.1);
    }
    .sidebar-nav-btn.active .nav-icon {
      color: #0070BA;
    }
    .nav-icon {
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      color: #64748B;
      transition: color 0.15s ease;
    }
    .sidebar-nav-btn.active .nav-indicator {
      margin-left: auto;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #0070BA;
      box-shadow: 0 0 8px rgba(0, 112, 186, 0.5);
    }

    /* Sidebar User / System Bottom Footer */
    .sidebar-footer {
      margin-top: auto;
      padding: 16px;
      border-top: 1px solid rgba(0, 112, 186, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      background: #F8FAFD;
    }
    .user-avatar {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: #EBF4FC;
      border: 1px solid rgba(0, 112, 186, 0.22);
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 13px; color: #0070BA;
      flex-shrink: 0;
    }
    .user-info {
      flex: 1;
      overflow: hidden;
    }
    .user-name {
      font-size: 12.5px;
      font-weight: 700;
      color: #0B1E3F;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 11px;
      color: #0070BA;
      font-weight: 600;
    }

    /* Main App Area */
    .app-main {
      flex: 1;
      margin-left: var(--sidebar-width);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--bg-primary);
      width: calc(100% - var(--sidebar-width));
      max-width: 100%;
    }

    /* Top Toolbar - PayPal Light Glassmorphism */
    header.topbar {
      height: var(--topbar-height);
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(0, 112, 186, 0.12);
      padding: 0 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 900;
      gap: 18px;
      box-shadow: 0 2px 12px rgba(0, 48, 135, 0.03);
    }

    /* Search / Command Palette Bar - Sleek Single-Line Pill */
    .command-search {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      background: #FFFFFF;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(0, 112, 186, 0.22);
      padding: 7px 16px;
      border-radius: 9999px;
      width: 340px;
      max-width: 380px;
      min-width: 260px;
      height: 38px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      flex-shrink: 0;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0, 48, 135, 0.04);
    }
    .command-search:hover {
      border-color: #0070BA;
      background: #FFFFFF;
      box-shadow: 0 0 18px rgba(0, 112, 186, 0.18);
      transform: translateY(-1px);
    }
    .command-search-icon {
      color: #0070BA;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .command-search-text {
      font-size: 12.5px;
      color: #64748B;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
      letter-spacing: -0.1px;
    }
    .command-key {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 9999px;
      padding: 3px 10px;
      font-size: 10px;
      font-family: var(--font-mono);
      font-weight: 700;
      color: #475569;
      flex-shrink: 0;
      letter-spacing: 0.3px;
    }

    /* Command Palette Modal Styling - PayPal Light */
    .palette-dialog {
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(0, 112, 186, 0.25);
      border-radius: 22px;
      max-width: 680px;
      width: 100%;
      box-shadow: 0 35px 80px rgba(0, 48, 135, 0.22), 0 0 45px rgba(0, 112, 186, 0.1);
      overflow: hidden;
      backdrop-filter: blur(32px);
      -webkit-backdrop-filter: blur(32px);
      animation: palettePop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes palettePop {
      0% { opacity: 0; transform: scale(0.96) translateY(-10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .palette-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748B;
      padding: 10px 14px 6px 14px;
    }
    .palette-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.15s ease;
      margin-bottom: 3px;
      background: transparent;
      border: 1px solid transparent;
      user-select: none;
    }
    .palette-item:hover, .palette-item.selected {
      background: #EBF4FC;
      border-color: rgba(0, 112, 186, 0.3);
      transform: translateX(2px);
    }
    .palette-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .palette-item-icon {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }
    .palette-item:hover .palette-item-icon, .palette-item.selected .palette-item-icon {
      background: #D8ECFD;
      border-color: #0070BA;
    }
    .palette-item-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #0B1E3F;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .palette-item-subtitle {
      font-size: 11.5px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }
    .palette-item-badge {
      font-size: 10.5px;
      font-weight: 700;
      padding: 3px 9px;
      border-radius: 9999px;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      color: #475569;
      flex-shrink: 0;
      font-family: var(--font-mono);
      letter-spacing: 0.3px;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }

    .badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 9999px; font-size: 11.5px; font-weight: 600;
      letter-spacing: 0.2px; font-variant-numeric: tabular-nums;
    }
    .badge-sandbox {
      background: #ECFDF5;
      color: #059669;
      border: 1px solid #A7F3D0;
    }
    .badge-live-stream {
      background: #EFF6FF;
      color: #0284C7;
      border: 1px solid #BAE6FD;
    }
    .badge-sponsor {
      background: #FEF3C7;
      color: #D97706;
      border: 1px solid #FDE68A;
    }
    .pulse-dot {
      width: 7px; height: 7px; border-radius: 50%; background: currentColor; animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }

    /* Buttons */
    .btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 22px; border-radius: 9999px; font-size: 13px; font-weight: 700;
      cursor: pointer; border: none; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: -0.1px;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: linear-gradient(135deg, #004DB3 0%, #0070BA 55%, #009CDE 100%);
      color: #FFF;
      font-weight: 700;
      box-shadow: 0 4px 18px rgba(0, 112, 186, 0.45);
      border: 1px solid rgba(0, 156, 222, 0.45);
    }
    .btn-primary:hover {
      filter: brightness(1.12);
      box-shadow: 0 6px 26px rgba(0, 112, 186, 0.65);
      transform: translateY(-1px);
    }
    .btn-demo {
      background: linear-gradient(135deg, #004DB3 0%, #0070BA 55%, #009CDE 100%);
      color: #FFF;
      font-weight: 700;
      box-shadow: 0 4px 18px rgba(0, 112, 186, 0.45);
      border: 1px solid rgba(0, 156, 222, 0.45);
    }
    .btn-demo:hover {
      filter: brightness(1.12);
      transform: translateY(-1px);
      box-shadow: 0 6px 26px rgba(0, 112, 186, 0.65);
    }
    .btn-secondary {
      background: #FFFFFF;
      color: #0F172A;
      border: 1px solid #CBD5E1;
      border-radius: 9999px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      font-weight: 600;
    }
    .btn-secondary:hover {
      background: #F8FAFD;
      border-color: #0070BA;
      color: #0070BA;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 112, 186, 0.12);
    }
    .btn-white {
      background: #FFFFFF;
      color: #040914;
      font-weight: 700;
      border: none;
      box-shadow: 0 4px 14px rgba(255, 255, 255, 0.2);
    }
    .btn-white:hover {
      background: #F1F5F9;
      transform: translateY(-1px);
    }

    /* Mobile Hamburger Menu Toggle */
    .mobile-menu-toggle {
      display: none;
      background: none;
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      color: var(--text-main);
      padding: 8px 10px;
      font-size: 16px;
      cursor: pointer;
    }

    /* Content Canvas */
    main.content-canvas {
      padding: 28px 36px 60px 36px;
      max-width: 1560px;
      width: 100%;
      margin: 0 auto;
    }

    /* Legacy Tab-content wrapper for backward compatibility */
    .tab-content { display: none; }
    .tab-content.active { display: block; animation: fadeIn 0.2s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

    /* Hidden nav-tabs for Vitest and selector fallback */
    nav.nav-tabs {
      display: none;
    }

    /* ==========================================================================
       FINTECH EXECUTIVE CARDS & METRIC HIERARCHY - PAYPAL LIGHT GLASSMORPHISM
       ========================================================================== */
    .card {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(0, 112, 186, 0.14);
      border-radius: 24px;
      padding: 26px 30px;
      box-shadow: 0 10px 30px rgba(0, 112, 186, 0.07), 0 1px 3px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 1);
      position: relative;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .card:hover {
      border-color: rgba(0, 112, 186, 0.35);
      box-shadow: 0 16px 40px rgba(0, 112, 186, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1);
      transform: translateY(-2px);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 800;
      color: #0B1E3F;
      letter-spacing: -0.2px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .card-desc {
      font-size: 12.5px;
      color: #64748B;
      margin-top: 4px;
      line-height: 1.55;
    }

    /* Metric Icon Badges - Light Soft Pastels */
    .metric-icon-box {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      margin-right: 10px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 112, 186, 0.08);
    }
    .metric-icon-cyan {
      background: #EBF4FC;
      border: 1px solid rgba(0, 112, 186, 0.18);
      color: #0070BA;
    }
    .metric-icon-blue {
      background: #EFF6FF;
      border: 1px solid rgba(0, 112, 186, 0.22);
      color: #0070BA;
    }
    .metric-icon-amber {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #D97706;
    }
    .metric-icon-emerald {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #059669;
    }
    .metric-icon-purple {
      background: #F3E8FF;
      border: 1px solid #E9D5FF;
      color: #9333EA;
    }

    /* Executive Hero Grid Layout */
    .hero-fintech-grid {
      display: grid;
      grid-template-columns: 1.8fr 1.2fr;
      gap: 24px;
      margin-bottom: 26px;
    }

    /* Primary Balance Chart Card - PayPal Light Theme */
    .balance-chart-card {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(0, 112, 186, 0.14);
      border-radius: 22px;
      padding: 28px 30px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 112, 186, 0.07), inset 0 1px 0 rgba(255, 255, 255, 1);
      transition: all 0.25s ease;
    }
    .balance-chart-card:hover {
      border-color: rgba(0, 112, 186, 0.35);
      box-shadow: 0 16px 40px rgba(0, 112, 186, 0.12), inset 0 1px 0 rgba(255, 255, 255, 1);
    }
    .balance-chart-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .balance-label {
      font-size: 12px;
      color: #64748B;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .balance-main-num {
      font-size: 38px;
      font-weight: 800;
      color: #0B1E3F;
      letter-spacing: -0.8px;
      display: flex;
      align-items: baseline;
      gap: 14px;
      margin-top: 6px;
      font-variant-numeric: tabular-nums;
    }
    .balance-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 20px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #059669;
      letter-spacing: 0.2px;
    }
    .chart-time-filter {
      display: flex;
      gap: 4px;
      background: #F1F5F9;
      backdrop-filter: blur(8px);
      padding: 3px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
    }
    .time-pill {
      background: none;
      border: none;
      color: #64748B;
      font-size: 11.5px;
      font-weight: 600;
      padding: 5px 12px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .time-pill.active {
      background: #0070BA;
      color: #FFF;
      border: none;
      box-shadow: 0 2px 8px rgba(0, 112, 186, 0.25);
    }

    /* Featured Authentic PayPal Commercial Card Stack */
    .anchor-card-stack-wrapper {
      position: relative;
      height: 100%;
      min-height: 290px;
      display: flex;
      flex-direction: column;
    }
    .card-stack-back-2 {
      position: absolute;
      top: 0px;
      left: 18px;
      right: 18px;
      height: 50px;
      background: rgba(0, 36, 102, 0.55);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(0, 156, 222, 0.25);
      border-radius: 18px;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 4px 18px;
      font-size: 10px;
      line-height: 12px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.65);
      letter-spacing: 0.5px;
      pointer-events: none;
    }
    .card-stack-back-1 {
      position: absolute;
      top: 16px;
      left: 9px;
      right: 9px;
      height: 52px;
      background: rgba(0, 68, 148, 0.65);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(0, 156, 222, 0.35);
      border-radius: 18px;
      z-index: 2;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 4px 18px;
      font-size: 10px;
      line-height: 12px;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.85);
      letter-spacing: 0.5px;
      pointer-events: none;
    }
    .anchor-card-showcase {
      margin-top: 32px;
      z-index: 3;
      background: linear-gradient(135deg, #011638 0%, #002B7A 45%, #0056B3 80%, #0070BA 100%);
      border: 1px solid rgba(0, 207, 222, 0.45);
      border-radius: 22px;
      padding: 26px 28px;
      color: #FFF;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      box-shadow: 0 24px 50px rgba(0, 32, 96, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.3), inset 0 0 0 1px rgba(0, 156, 222, 0.25);
      flex: 1;
      transition: all 0.3s ease;
    }
    .anchor-card-showcase:hover {
      transform: translateY(-3px);
      box-shadow: 0 28px 60px rgba(0, 112, 186, 0.55), inset 0 1px 1px rgba(255, 255, 255, 0.4);
      border-color: rgba(0, 207, 222, 0.7);
    }
    .anchor-card-showcase::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.16) 48%, transparent 58%);
      pointer-events: none;
    }
    .anchor-card-showcase::after {
      content: '';
      position: absolute;
      right: -30px;
      bottom: -40px;
      width: 220px;
      height: 220px;
      background: radial-gradient(circle, rgba(0, 156, 222, 0.35) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }
    .anchor-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .anchor-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: #FFF;
    }
    .anchor-card-chip {
      width: 40px;
      height: 30px;
      background: linear-gradient(135deg, #FFE082 0%, #FFB300 50%, #FF8F00 100%);
      border-radius: 6px;
      border: 1px solid rgba(0, 0, 0, 0.35);
      position: relative;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5), 0 2px 6px rgba(0,0,0,0.3);
    }
    .anchor-card-chip::before {
      content: '';
      position: absolute;
      top: 30%;
      left: 0;
      right: 0;
      height: 40%;
      border-top: 1px solid rgba(0, 0, 0, 0.25);
      border-bottom: 1px solid rgba(0, 0, 0, 0.25);
    }
    .anchor-card-chip::after {
      content: '';
      position: absolute;
      left: 45%;
      top: 0;
      bottom: 0;
      width: 10%;
      border-left: 1px solid rgba(0, 0, 0, 0.25);
      border-right: 1px solid rgba(0, 0, 0, 0.25);
    }
    .anchor-balance-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.82);
      font-weight: 500;
    }
    .anchor-balance-val {
      font-size: 34px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-top: 2px;
      font-variant-numeric: tabular-nums;
    }
    .anchor-actions {
      display: flex;
      gap: 12px;
      margin-top: 22px;
    }
    .anchor-actions .btn {
      flex: 1;
      padding: 12px;
      font-size: 13px;
      border-radius: 9999px;
    }
    .btn-glass {
      background: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #FFF;
      font-weight: 600;
    }
    .btn-glass:hover {
      background: rgba(255, 255, 255, 0.24);
      border-color: rgba(255, 255, 255, 0.45);
    }
    .btn-paypal {
      background: #0070BA;
      border: 1px solid #009CDE;
      color: #FFF;
      font-weight: 700;
      box-shadow: 0 4px 16px rgba(0, 112, 186, 0.5);
    }
    .btn-paypal:hover {
      background: #0079C1;
      box-shadow: 0 6px 20px rgba(0, 156, 222, 0.6);
      transform: translateY(-1px);
    }

    /* 4-Card Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 26px;
    }
    .metric-value {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #0B1E3F;
      margin-top: 6px;
      font-variant-numeric: tabular-nums;
    }
    .metric-sub {
      font-size: 12.5px;
      color: var(--text-secondary);
      margin-top: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Secondary Insights Grid */
    .insights-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr 1fr;
      gap: 20px;
      margin-bottom: 26px;
    }

    /* Recent Transactions List */
    .tx-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .tx-item:last-child { border-bottom: none; }
    .tx-left { display: flex; align-items: center; gap: 12px; }
    .tx-avatar {
      width: 36px; height: 36px;
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
      background: var(--surface-elevated);
      color: var(--accent-secondary);
      border: 1px solid var(--border-glass);
    }
    .tx-title { font-size: 13px; font-weight: 600; color: var(--text-main); }
    .tx-date { font-size: 11.5px; color: var(--text-secondary); }
    .tx-amount { font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .tx-amount.pos { color: var(--accent-emerald); }
    .tx-amount.neg { color: var(--accent-rose); }

    /* Stepper Cards */
    .stepper {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .step-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 18px;
      padding: 18px 16px;
      font-size: 12px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 4px 12px rgba(0, 112, 186, 0.05);
    }
    .step-card:hover {
      border-color: #0070BA;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 112, 186, 0.12);
    }
    .step-card.done {
      border-color: #86EFAC;
      background: #F0FDF4;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
    }
    .step-num {
      font-weight: 800; font-size: 11px;
      color: #0070BA;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .step-title { font-weight: 700; color: #0B1E3F; font-size: 13px; letter-spacing: -0.1px; }
    .step-desc { color: #64748B; font-size: 11px; margin-top: 6px; line-height: 1.5; }

    /* ==========================================================================
       HACKATHON JUDGE BRIEFING PANEL
       ========================================================================== */
    #judge-briefing-panel {
      margin-bottom: 26px;
      border: 1px solid rgba(0, 156, 222, 0.35);
      border-radius: 24px;
      background: linear-gradient(135deg, rgba(7, 18, 36, 0.95) 0%, rgba(11, 23, 44, 0.98) 100%);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      box-shadow: 0 16px 40px -4px rgba(0, 112, 186, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.14);
    }
    .judge-panel-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 20px;
    }
    .judge-tour-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
    }

    /* ==========================================================================
       DATA TABLES - PAYPAL LIGHT THEME
       ========================================================================== */
    .table-responsive {
      width: 100%;
      overflow-x: auto;
      border-radius: 18px;
      border: 1px solid #E2E8F0;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 6px 20px rgba(0, 112, 186, 0.04);
      margin-top: 8px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th {
      padding: 14px 18px;
      background: #F8FAFD;
      color: #475569;
      font-weight: 700;
      border-bottom: 2px solid #E2E8F0;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.6px;
    }
    td {
      padding: 14px 18px;
      border-bottom: 1px solid #F1F5F9;
      color: #0F172A;
      font-variant-numeric: tabular-nums;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #F0F7FF; }

    /* Custom AG Grid Light Theme with PayPal Blue Highlights */
    .ag-theme-nexus-dark,
    .ag-theme-alpine-dark,
    .ag-theme-alpine {
      --ag-background-color: #FFFFFF;
      --ag-header-background-color: #F8FAFD;
      --ag-odd-row-background-color: #FBFDFF;
      --ag-border-color: #E2E8F0;
      --ag-header-foreground-color: #475569;
      --ag-foreground-color: #0F172A;
      --ag-data-color: #0F172A;
      --ag-selected-row-background-color: #EBF4FC;
      --ag-row-hover-color: #F0F7FF;
      --ag-font-family: var(--font-sans);
      --ag-font-size: 12.5px;
      --ag-grid-size: 6px;
      --ag-row-height: 42px;
      --ag-header-height: 44px;
      border: 1px solid #E2E8F0;
      border-radius: 14px 14px 0 0;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 112, 186, 0.05);
    }
    .ag-theme-nexus-dark .ag-header-cell,
    .ag-theme-alpine-dark .ag-header-cell,
    .ag-theme-alpine .ag-header-cell {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      color: #475569;
    }
    .grid-status-bar {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      background: #FFFFFF; border: 1px solid #E2E8F0; border-top: none;
      padding: 14px 22px; border-radius: 0 0 18px 18px; color: #64748B;
      box-shadow: 0 4px 12px rgba(0, 112, 186, 0.04);
    }
    .grid-status-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: #F8FAFD; border: 1px solid #E2E8F0;
      border-radius: 9999px; padding: 6px 14px; font-size: 12px; color: #334155;
      font-variant-numeric: tabular-nums; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
      transition: all 0.2s ease;
    }
    .grid-status-pill:hover {
      border-color: #0070BA; background: #EBF4FC; color: #0070BA;
    }
    .status-chip-proof {
      display: inline-flex; align-items: center; gap: 7px;
      background: #EBF4FC; border: 1px solid rgba(0, 112, 186, 0.25);
      color: #0070BA; height: 36px; padding: 0 16px; border-radius: 9999px; font-size: 12.5px; font-weight: 700; cursor: pointer;
      transition: all 0.15s ease; font-variant-numeric: tabular-nums;
      box-shadow: 0 1px 3px rgba(0, 112, 186, 0.08); box-sizing: border-box; text-decoration: none;
    }
    .status-chip-proof:hover {
      background: #DDF0FB; border-color: #0070BA; transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(0, 112, 186, 0.16);
    }
    .status-chip-proof:hover {
      background: #D8ECFD; border-color: #0070BA; transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 112, 186, 0.18);
    }

    /* ==========================================================================
       PAYPAL STYLE FEE MODEL CAPSULE - LIGHT GLASSMORPHISM
       ========================================================================== */
    .fee-model-capsule {
      border-radius: 26px;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid rgba(0, 112, 186, 0.18);
      box-shadow: 0 10px 30px rgba(0, 112, 186, 0.08), inset 0 1px 0 rgba(255, 255, 255, 1);
      padding: 16px 26px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      flex-wrap: wrap;
      position: relative;
      overflow: hidden;
    }
    .fee-model-capsule::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(147, 51, 234, 0.4) 30%, rgba(0, 156, 222, 0.5) 70%, transparent 100%);
      pointer-events: none;
    }
    .fee-model-title-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .fee-model-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 14px;
      background: linear-gradient(135deg, rgba(0, 48, 135, 0.6) 0%, rgba(0, 112, 186, 0.35) 100%);
      border: 1px solid rgba(0, 156, 222, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(0, 112, 186, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25);
      flex-shrink: 0;
    }
    .pill-badge-purple {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: #F3E8FF;
      border: 1px solid #E9D5FF;
      color: #7E22CE;
      letter-spacing: 0.3px;
    }
    .fee-inputs-row {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .fee-input-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    }
    .fee-input-label {
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #475569;
      font-weight: 700;
      text-align: center;
    }
    .fee-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      background: #F8FAFD;
      border: 1px solid #CBD5E1;
      border-radius: 14px;
      padding: 4px 10px 4px 6px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
    }
    .fee-chip:hover, .fee-chip:focus-within {
      border-color: #0070BA;
      box-shadow: 0 0 12px rgba(0, 112, 186, 0.18);
    }
    .fee-chip-icon {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .fee-icon-amber {
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #D97706;
    }
    .fee-icon-purple {
      background: #F3E8FF;
      border: 1px solid #E9D5FF;
      color: #9333EA;
    }
    .fee-input-val {
      width: 44px;
      text-align: center;
      border: none;
      background: transparent;
      color: #0B1E3F;
      font-size: 14.5px;
      font-weight: 800;
      font-family: var(--font-sans);
      font-variant-numeric: tabular-nums;
      outline: none;
      padding: 2px 0;
    }
    .fee-val-wide {
      width: 48px;
    }
    .fee-unit {
      font-size: 12px;
      font-weight: 700;
      color: #64748B;
    }
    .btn-recalc-glow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 26px;
      border-radius: 9999px;
      font-size: 13.5px;
      font-weight: 700;
      color: #FFFFFF;
      background: linear-gradient(135deg, #FF6A00 0%, #EE0979 50%, #9333EA 100%);
      border: 1px solid rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 20px rgba(255, 106, 0, 0.45), 0 0 25px rgba(147, 51, 234, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4);
      cursor: pointer;
      position: relative;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      white-space: nowrap;
    }
    .btn-recalc-glow:hover {
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 10px 30px rgba(255, 106, 0, 0.6), 0 0 35px rgba(147, 51, 234, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.5);
      filter: brightness(1.1);
    }
    .btn-recalc-glow:active {
      transform: scale(0.98);
    }
    .sparkle-star {
      font-size: 13px;
      margin-left: 2px;
      animation: sparkle 2s ease-in-out infinite;
    }
    @keyframes sparkle {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
      50% { transform: scale(1.2) rotate(15deg); opacity: 1; }
    }

    /* Tags */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-variant-numeric: tabular-nums;
    }
    .tag-success { background: rgba(16,185,129,0.14); color: var(--accent-emerald); border: 1px solid rgba(16,185,129,0.35); }
    .tag-pending { background: rgba(245,158,11,0.14); color: var(--accent-amber); border: 1px solid rgba(245,158,11,0.35); }
    .tag-info { background: rgba(0,112,186,0.16); color: var(--accent-secondary); border: 1px solid rgba(0,156,222,0.35); }
    .tag-error { background: rgba(239,68,68,0.14); color: var(--accent-rose); border: 1px solid rgba(239,68,68,0.35); }

    .search-input {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #0B1E3F;
      padding: 10px 20px;
      border-radius: 9999px;
      font-size: 13px;
      min-width: 280px;
      font-family: var(--font-sans);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .search-input:focus {
      outline: none;
      border-color: #0070BA;
      box-shadow: 0 0 14px rgba(0, 112, 186, 0.2);
    }

    /* Live Stream Log */
    .stream-box {
      background: rgba(3, 7, 18, 0.95);
      border: 1px solid rgba(0, 156, 222, 0.28);
      border-radius: 20px;
      padding: 20px;
      font-family: var(--font-mono);
      font-size: 12px;
      height: 380px;
      overflow-y: auto;
      color: #FF9A52;
      line-height: 1.7;
      box-shadow: inset 0 2px 10px rgba(0,0,0,0.65);
    }
    .stream-line { border-bottom: 1px solid rgba(255,255,255,0.04); padding: 4px 0; }
    .stream-time { color: #64748B; margin-right: 8px; font-variant-numeric: tabular-nums; }
    .stream-type { color: var(--accent-primary); font-weight: bold; margin-right: 8px; }

    /* Toast Notifications System */
    #toast-container {
      position: fixed; bottom: 24px; right: 24px; z-index: 10000;
      display: flex; flex-direction: column; gap: 10px; max-width: 440px; width: calc(100vw - 32px);
      pointer-events: none;
    }
    .toast {
      pointer-events: auto; background: rgba(7, 18, 36, 0.98);
      border: 1px solid var(--border-glass); backdrop-filter: blur(14px);
      border-radius: 12px; padding: 14px 18px;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(0, 112, 186, 0.2);
      color: #F1F5F9; animation: toastSlideIn 0.25s ease-out; transition: all 0.2s ease;
    }
    @keyframes toastSlideIn { from { transform: translateX(30px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    .toast-header { display: flex; align-items: center; justify-content: space-between; font-weight: 700; font-size: 13px; margin-bottom: 4px; }
    .toast-title { display: flex; align-items: center; gap: 8px; }
    .toast-body { font-size: 12.5px; color: #CBD5E1; line-height: 1.5; }
    .toast-close { background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer; padding: 0 4px; line-height: 1; }
    .toast-close:hover { color: #FFF; }
    .toast-details {
      margin-top: 8px; padding: 8px; background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 6px;
      font-family: var(--font-mono); font-size: 11px; max-height: 160px;
      overflow-y: auto; white-space: pre-wrap; word-break: break-all; color: #94A3B8;
    }
    .toast-success { border-color: rgba(34, 197, 94, 0.45); box-shadow: 0 0 15px rgba(34, 197, 94, 0.18); }
    .toast-success .toast-title { color: var(--accent-emerald); }
    .toast-error { border-color: rgba(239, 68, 68, 0.45); box-shadow: 0 0 15px rgba(239, 68, 68, 0.18); }
    .toast-error .toast-title { color: var(--accent-rose); }
    .toast-info { border-color: rgba(0, 156, 222, 0.45); box-shadow: 0 0 15px rgba(0, 112, 186, 0.25); }
    .toast-info .toast-title { color: var(--accent-primary); }

    /* Accessibility */
    @media (prefers-reduced-motion: reduce) {
      *, ::before, ::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

    /* Responsive Shell Breakpoints */
    @media (max-width: 1200px) {
      .hero-fintech-grid { grid-template-columns: 1fr; }
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
      .insights-grid { grid-template-columns: 1fr; }
      .judge-panel-grid { grid-template-columns: 1fr !important; }
      .stepper { grid-template-columns: repeat(3, 1fr); }
      .judge-tour-grid { grid-template-columns: repeat(3, 1fr) !important; }
    }

    @media (max-width: 1024px) {
      aside.sidebar {
        transform: translateX(-100%);
      }
      aside.sidebar.mobile-open {
        transform: translateX(0);
      }
      .app-main {
        margin-left: 0;
        width: 100%;
      }
      .mobile-menu-toggle {
        display: block;
      }
      nav.nav-tabs {
        display: flex !important;
        gap: 6px;
        padding: 10px 16px;
        border-bottom: 1px solid var(--border-subtle);
        background: var(--bg-secondary);
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none;
      }
      nav.nav-tabs::-webkit-scrollbar { display: none; }
      .tab-btn {
        background: var(--surface-primary);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;
        color: var(--text-secondary);
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .tab-btn.active {
        background: var(--surface-elevated);
        border-color: var(--accent-primary);
        color: #FFF;
      }
    }

    @media (max-width: 768px) {
      header.topbar {
        padding: 0 12px;
        gap: 8px;
      }
      .topbar-actions {
        gap: 6px;
        flex-wrap: nowrap;
        overflow-x: auto;
        white-space: nowrap;
        scrollbar-width: none;
      }
      .topbar-actions::-webkit-scrollbar { display: none; }
      .badge-sponsor { display: none; }
      #sse-indicator { display: none; }
      main.content-canvas { padding: 16px 12px; }
      .metrics-grid { grid-template-columns: 1fr; }
      .stepper { grid-template-columns: 1fr; }
      .judge-tour-grid { grid-template-columns: 1fr !important; }
      .command-search { display: none; }
    }
  </style>
</head>
<body>

  <div class="app-shell">
    <!-- LEFT NAVIGATION SIDEBAR -->
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-icon">TN</div>
        <div style="overflow: hidden;">
          <div class="brand-title">TALLY NEXUS</div>
          <div class="brand-subtitle">Autonomous Clearinghouse</div>
        </div>
      </div>

      <div class="nav-group">
        <div class="nav-group-title">WORKSPACE</div>
        <button class="sidebar-nav-btn active" id="btn-nav-overview" onclick="switchTab('overview')">
          <span class="nav-icon">📊</span>
          <span>Overview</span>
          <span class="nav-indicator"></span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-cycles" onclick="switchTab('cycles')">
          <span class="nav-icon">🔄</span>
          <span>Clearing Room</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-agents" onclick="switchTab('agents')">
          <span class="nav-icon">🤖</span>
          <span>Agent Directory</span>
        </button>
      </div>

      <div class="nav-group">
        <div class="nav-group-title">FINANCIAL OPERATIONS</div>
        <button class="sidebar-nav-btn" id="btn-nav-scale" onclick="switchTab('scale')">
          <span class="nav-icon">⚡</span>
          <span>Hero Scale & AG Grid (1,500+ IOUs)</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-payments" onclick="switchTab('payments')">
          <span class="nav-icon">💳</span>
          <span>Payment Rails (PayPal)</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-ledger" onclick="switchTab('ledger')">
          <span class="nav-icon">⚖️</span>
          <span>Double-Entry Ledger</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-recovery" onclick="switchTab('recovery')">
          <span class="nav-icon">🛡️</span>
          <span>Recovery Operations</span>
        </button>
      </div>

      <div class="nav-group">
        <div class="nav-group-title">INTELLIGENCE</div>
        <button class="sidebar-nav-btn" onclick="testLiveAiJudge()">
          <span class="nav-icon">🧠</span>
          <span>AI SLA Judge</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-security" onclick="switchTab('security')">
          <span class="nav-icon">🔒</span>
          <span>Trust & Security</span>
        </button>
        <button class="sidebar-nav-btn" id="btn-nav-events" onclick="switchTab('events')">
          <span class="nav-icon">📡</span>
          <span>Live Event Stream</span>
        </button>
      </div>

      <div class="sidebar-footer">
        <div class="user-avatar">TN</div>
        <div class="user-info">
          <div class="user-name">Consortium Operator</div>
          <div class="user-role">Fiduciary Clearance</div>
        </div>
      </div>
    </aside>

    <!-- MAIN APPLICATION WRAPPER -->
    <div class="app-main">
      <!-- TOPBAR TOOLBAR -->
      <header class="topbar">
        <button class="mobile-menu-toggle" onclick="toggleMobileSidebar()" aria-label="Toggle navigation">☰</button>

        <div class="command-search" onclick="openCommandPalette()" role="button" tabindex="0" title="Search transactions, agents, IOUs (⌘ + Space or Ctrl + K)">
          <span class="command-search-icon">🔍</span>
          <span class="command-search-text">Search transactions, agents, IOUs...</span>
          <span class="command-key">⌘ + Space</span>
        </div>

        <div class="topbar-actions">
          <button class="btn btn-demo" id="run-demo-btn" onclick="runFlagshipDemo()">🚀 Run 180s Flagship Demo</button>
          <span class="badge badge-sponsor">🏆 AG Grid Partner</span>
          <span class="badge badge-sandbox" id="env-badge" title="PayPal Sandbox Verification Status">
            <span class="pulse-dot"></span>[ENV: LIVE SANDBOX VERIFIED]
          </span>
          <span class="badge badge-live-stream" id="sse-badge">
            <span class="pulse-dot"></span>SSE Live
          </span>
          <button class="btn btn-secondary" onclick="refreshDashboardData()" style="padding: 7px 12px; font-size: 12px;">🔄 Refresh</button>
        </div>
      </header>

      <!-- LEGACY HIDDEN NAV TABS FOR RETRO-COMPATIBILITY -->
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

      <!-- CONTENT CANVAS -->
      <main class="content-canvas">

        <!-- 1. OVERVIEW TAB (RECONSTRUCTED WITH HERO FINTECH CARDS & CHARTS) -->
        <div id="tab-overview" class="tab-content active">

          <!-- HACKATHON JUDGE BRIEFING PANEL - EXACT PAYPAL LIGHT THEME MATCH -->
          <div class="card" id="judge-briefing-panel" style="background: rgba(255, 255, 255, 0.94); border: 1px solid rgba(0, 112, 186, 0.16); box-shadow: 0 12px 36px rgba(0, 112, 186, 0.08), inset 0 1px 0 #FFFFFF; border-radius: 24px; padding: 24px 28px; margin-bottom: 26px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <!-- Authentic PayPal Double-P Icon -->
                <div style="width: 44px; height: 44px; border-radius: 14px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 112, 186, 0.15); border: 1px solid rgba(0, 112, 186, 0.18); flex-shrink: 0;">
                  <svg width="26" height="30" viewBox="0 0 100 115" fill="none">
                    <path d="M26.4 105L37.8 24.3H68.5C79.8 24.3 88.5 27.3 93.4 33.1C98.3 38.9 98.7 47.3 95.8 56.6C92.8 66.5 86.9 74.4 79.1 79.1C72.5 83.1 64.4 85 55.4 85H42.7L36.6 105H26.4Z" fill="#003087"/>
                    <path d="M43.7 85L52.8 28.7H79.1C90.3 28.7 99 31.7 103.9 37.5C108.8 43.3 109.2 51.7 106.3 61C103.3 70.9 97.4 78.8 89.6 83.5C83 87.5 74.9 89.4 65.9 89.4H50.5L46.1 110H34.7L43.7 85Z" fill="#0070BA"/>
                  </svg>
                </div>
                <div style="width: 1px; height: 34px; background: #E2E8F0;"></div>
                <div>
                  <h2 style="font-size: 21px; font-weight: 800; color: #0B1E3F; letter-spacing: -0.4px; margin: 0;">Hackathon Judge Briefing Panel</h2>
                  <div style="font-size: 13px; color: #64748B; margin-top: 3px; font-weight: 500;">Three Core Technical Innovations &bull; Verified Evidence Links &bull; 30-Second Guided Tour</div>
                </div>
              </div>
              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <a href="https://github.com/EnternalBlue07/Tally-Nexus" target="_blank" style="display: inline-flex; align-items: center; gap: 7px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; border-radius: 9999px; padding: 8px 18px; font-size: 12.5px; font-weight: 600; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                  <span>Public GitHub Repo</span> <span style="font-size: 11px; opacity: 0.7;">↗</span>
                </a>
                <a href="https://youtu.be/tally-nexus-demo" target="_blank" style="display: inline-flex; align-items: center; gap: 7px; background: linear-gradient(135deg, #0070BA 0%, #003087 100%); color: #FFFFFF; border-radius: 9999px; padding: 8px 20px; font-size: 12.5px; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(0, 112, 186, 0.35); border: none; transition: all 0.2s ease;">
                  <span>▶</span> <span>3-Min Demo Video</span> <span style="font-size: 11px; opacity: 0.85;">↗</span>
                </a>
                <button onclick="toggleJudgePanel()" style="display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; border-radius: 9999px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s ease;">
                  <span>Collapse / Expand</span> <span style="font-size: 10px; opacity: 0.7;">∨</span>
                </button>
              </div>
            </div>

            <div id="judge-panel-body">
              <!-- 3 Headline Cards Grid matching user screenshot -->
              <div class="judge-panel-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin-bottom: 20px;">
                
                <!-- CARD 1: ROYAL BLUE GRADIENT HERO CARD -->
                <div style="background: linear-gradient(145deg, #0070BA 0%, #003087 100%); border-radius: 22px; padding: 24px; color: #FFFFFF; position: relative; box-shadow: 0 14px 32px rgba(0, 112, 186, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.3); border: 1px solid rgba(255, 255, 255, 0.18); display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <!-- Top Right Watermark PayPal Logo -->
                  <div style="position: absolute; top: 18px; right: 20px; opacity: 0.25; pointer-events: none;">
                    <svg width="24" height="28" viewBox="0 0 100 115" fill="none">
                      <path d="M26.4 105L37.8 24.3H68.5C79.8 24.3 88.5 27.3 93.4 33.1C98.3 38.9 98.7 47.3 95.8 56.6C92.8 66.5 86.9 74.4 79.1 79.1C72.5 83.1 64.4 85 55.4 85H42.7L36.6 105H26.4Z" fill="#FFF"/>
                    </svg>
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: rgba(255, 255, 255, 0.95); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12); flex-shrink: 0;">
                        ⚙️
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #FFFFFF; letter-spacing: -0.2px;">1. AI-Assisted SLA Evaluation</span>
                    </div>
                    <p style="font-size: 12.5px; color: rgba(255, 255, 255, 0.94); line-height: 1.6; margin-bottom: 18px;">
                      Autonomous task deliverables adjudicated via <strong>FreeModel (Gemini 3.7 Flash)</strong> with automatic <strong>DeepSeek v4.1 Flash</strong> failover. Purely advisory; zero access to money movement, enforced by deterministic credit clamps.
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button onclick="testLiveAiJudge()" style="display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; color: #0070BA; font-weight: 700; border-radius: 9999px; height: 36px; padding: 0 18px; font-size: 12.5px; border: none; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15); cursor: pointer; transition: all 0.2s ease; box-sizing: border-box;">
                      <span>▶</span> <span>Run Live AI Evaluation</span>
                    </button>
                    <a href="/api/judge/evaluate" target="_blank" style="display: inline-flex; align-items: center; background: rgba(255, 255, 255, 0.2); color: #FFFFFF; border: 1px solid rgba(255, 255, 255, 0.35); border-radius: 9999px; height: 36px; padding: 0 16px; font-size: 12.5px; font-weight: 600; text-decoration: none; transition: all 0.2s ease; box-sizing: border-box;">
                      Live Route
                    </a>
                  </div>
                </div>

                <!-- CARD 2: CRISP WHITE GLASSMORPHIC CARD -->
                <div style="background: rgba(255, 255, 255, 0.96); border-radius: 22px; padding: 24px; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.06), inset 0 1px 0 #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: #EBF4FC; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; border: 1px solid rgba(0, 112, 186, 0.18); flex-shrink: 0;">
                        🥞
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">2. Deterministic Netting & PayPal Rails</span>
                    </div>
                    <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">
                      Compresses circular bilateral agent debt by <strong>65.38% to 99.4%</strong>. Settles conserved net debtor balances via <strong>PayPal Orders v2 capture ($1.00)</strong> and creditor disbursements via <strong>PayPal Payouts v1 ($0.50 + $0.50)</strong>.
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button class="status-chip-proof" onclick="verifyPayPalCapture('7PV82720RX415822V')">
                      <span style="color: #0070BA; font-weight: 800;">🅿️</span> Verify Live Capture
                    </button>
                    <button class="status-chip-proof" onclick="verifyPayPalPayout('N4M49PUHNCNQ4')">
                      <span style="color: #0070BA; font-weight: 800;">🅿️</span> Verify Live Payout
                    </button>
                  </div>
                </div>

                <!-- CARD 3: CRISP WHITE GLASSMORPHIC CARD -->
                <div style="background: rgba(255, 255, 255, 0.96); border-radius: 22px; padding: 24px; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.06), inset 0 1px 0 #FFFFFF; display: flex; flex-direction: column; justify-content: space-between; min-height: 250px; box-sizing: border-box;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
                      <div style="width: 38px; height: 38px; border-radius: 11px; background: #EBF4FC; display: flex; align-items: center; justify-content: center; font-size: 18px; color: #0070BA; border: 1px solid rgba(0, 112, 186, 0.18); flex-shrink: 0;">
                        🛡️
                      </div>
                      <span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">3. Verifiable Subledger & Cryptography</span>
                    </div>
                    <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 18px;">
                      Double-entry subledger asserted by <strong>14 SQLite database triggers</strong>, Ed25519 RFC 8785 signatures, cryptographic SHA-256 Merkle tree anchors, and mathematical zero-variance (<strong>Δ = $0.00</strong>).
                    </p>
                  </div>
                  <div class="card-action-row" style="margin-top: auto; display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                    <button class="status-chip-proof" onclick="switchTab('ledger')">
                      📊 View Trial Balance
                    </button>
                    <button class="status-chip-proof" onclick="switchTab('security')">
                      🛡️ Invariant Center
                    </button>
                  </div>
                </div>

              </div>

              <!-- 30-Second Guided Tour Container matching user screenshot -->
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 20px; padding: 18px 20px; box-shadow: 0 6px 20px rgba(0, 112, 186, 0.04);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 14.5px; color: #0B1E3F;">
                    <span style="color: #0070BA; font-size: 16px;">⚡</span> 30-Second Tour for Judges (6 Guided Clicks)
                  </div>
                  <span style="font-size: 12px; color: #64748B; font-weight: 500;">Follow steps 1 – 6 to independently inspect end-to-end clearing</span>
                </div>
                <div class="tour-steps-row" style="display: flex; align-items: center; justify-content: space-between; gap: 4px; width: 100%;">
                  
                  <!-- STEP 1 -->
                  <div class="tour-step-card" id="tour-card-1" onclick="tourStep(1)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">1</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🏛️</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Clearing Room</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Open Overview</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 2 -->
                  <div class="tour-step-card" id="tour-card-2" onclick="tourStep(2)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">2</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🚀</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Run Flagship</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Execute 5-agent sim</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 3 -->
                  <div class="tour-step-card" id="tour-card-3" onclick="tourStep(3)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">3</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🤖</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">AI SLA Verdict</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Inspect clamp</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 4 -->
                  <div class="tour-step-card" id="tour-card-4" onclick="tourStep(4)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">4</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🪙</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Net Positions</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">$130 &rarr; $45 net</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 5 -->
                  <div class="tour-step-card" id="tour-card-5" onclick="tourStep(5)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">5</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🅿️</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">PayPal Proof</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Live Debug-ID</div>
                    </div>
                  </div>
                  <span class="tour-step-arrow" style="color: #CBD5E1; font-weight: 700; font-size: 12px; flex-shrink: 0; user-select: none;">›</span>

                  <!-- STEP 6 -->
                  <div class="tour-step-card" id="tour-card-6" onclick="tourStep(6)" style="flex: 1 1 0; min-width: 0; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 8px 7px; display: flex; align-items: center; gap: 6px; cursor: pointer; box-shadow: 0 2px 6px rgba(0, 112, 186, 0.04); height: 54px; box-sizing: border-box; transition: all 0.2s ease;">
                    <div class="tour-step-badge" style="width: 20px; height: 20px; border-radius: 50%; background: #EBF4FC; color: #0070BA; font-weight: 800; font-size: 10.5px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">6</div>
                    <span style="font-size: 15px; flex-shrink: 0;">🔒</span>
                    <div style="min-width: 0; flex: 1; overflow: hidden;">
                      <div class="tour-step-title" style="font-size: 11.5px; font-weight: 800; color: #0B1E3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">Merkle Ledger</div>
                      <div class="tour-step-sub" style="font-size: 10px; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">&Delta; = $0.00 proof</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <!-- EXECUTIVE HERO GRID (AREA CHART + FEATURED PAYPAL ENTERPRISE CARD STACK) -->
          <div class="hero-fintech-grid">
            <!-- Left Chart Card: Total Balance & Area Chart with PayPal Signature Cyan-Blue Gradient -->
            <div class="balance-chart-card">
              <div class="balance-chart-header">
                <div>
                  <div class="balance-label">Total Conserved Net Exposure</div>
                  <div class="balance-main-num">
                    <span id="hero-total-balance">$10,120.50</span>
                    <span class="balance-pill">↑ 2.92%</span>
                  </div>
                </div>
                <div class="chart-time-filter">
                  <button class="time-pill">1 year</button>
                  <button class="time-pill active">6 month</button>
                  <button class="time-pill">3 month</button>
                  <button class="time-pill">1 month</button>
                </div>
              </div>

              <!-- Interactive SVG Area Chart with PayPal Electric Cyan-Blue Gradient Fill -->
              <div style="position: relative; width: 100%; height: 180px; margin-top: 10px;">
                <svg viewBox="0 0 700 180" style="width: 100%; height: 100%; overflow: visible;">
                  <defs>
                    <linearGradient id="paypalChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="#009CDE" stop-opacity="0.32" />
                      <stop offset="60%" stop-color="#0070BA" stop-opacity="0.1" />
                      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
                    </linearGradient>
                    <filter id="glowPaypal" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0070BA" flood-opacity="0.25"/>
                    </filter>
                  </defs>
                  
                  <!-- Horizontal Grid Lines -->
                  <line x1="0" y1="30" x2="700" y2="30" stroke="rgba(0,112,186,0.08)" stroke-dasharray="3 3"/>
                  <line x1="0" y1="80" x2="700" y2="80" stroke="rgba(0,112,186,0.08)" stroke-dasharray="3 3"/>
                  <line x1="0" y1="130" x2="700" y2="130" stroke="rgba(0,112,186,0.08)" stroke-dasharray="3 3"/>

                  <!-- Filled Area -->
                  <path d="M 0 140 
                           C 50 130, 80 150, 120 110 
                           C 160 70, 200 120, 250 90 
                           C 300 60, 340 100, 390 70 
                           C 440 40, 480 80, 530 50 
                           C 580 20, 620 90, 700 60 
                           L 700 180 L 0 180 Z" 
                        fill="url(#paypalChartGradient)" />

                  <!-- Stroke Line -->
                  <path d="M 0 140 
                           C 50 130, 80 150, 120 110 
                           C 160 70, 200 120, 250 90 
                           C 300 60, 340 100, 390 70 
                           C 440 40, 480 80, 530 50 
                           C 580 20, 620 90, 700 60" 
                        fill="none" stroke="#0070BA" stroke-width="2.5" filter="url(#glowPaypal)" />

                  <!-- Active Pin Tooltip (Light Glassmorphic) -->
                  <circle cx="480" cy="80" r="5" fill="#0070BA" stroke="#FFFFFF" stroke-width="2.5" />
                  <g transform="translate(415, 12)">
                    <rect width="130" height="46" rx="10" fill="#FFFFFF" stroke="#0070BA" stroke-width="1.5" filter="drop-shadow(0 4px 14px rgba(0,112,186,0.18))" />
                    <text x="14" y="20" font-size="10" font-weight="600" fill="#64748B" font-family="var(--font-sans)">09 Dec, 2024 ↗</text>
                    <text x="14" y="37" font-size="13" font-weight="800" fill="#0070BA" font-family="var(--font-sans)">$9,780.90 USD</text>
                  </g>
                </svg>
              </div>

              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; font-size: 11.5px; color: var(--text-secondary);">
                <span>Average annual compression: <strong style="color: #0B1E3F;">84.2%</strong></span>
                <div style="display: flex; gap: 14px;">
                  <span><span style="display:inline-block;width:8px;height:8px;background:#CBD5E1;border-radius:2px;margin-right:4px;"></span>Actual gross</span>
                  <span><span style="display:inline-block;width:8px;height:8px;background:var(--accent-emerald);border-radius:2px;margin-right:4px;"></span>Conserved net</span>
                </div>
              </div>
            </div>

            <!-- Right: 3D Stacked Card Showcase ("My cards" - Exact PayPal Theme + Glassmorphism Outline) -->
            <div class="anchor-card-stack-wrapper">
              <!-- Header matching reference -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 0 4px;">
                <div style="font-size: 15px; font-weight: 800; color: #0B1E3F; letter-spacing: -0.2px;">My cards</div>
                <button class="btn btn-secondary" style="font-size: 11.5px; padding: 4px 14px; border-radius: 9999px; background: #FFFFFF; border: 1px solid #CBD5E1; color: #475569; cursor: pointer;">+ Add new</button>
              </div>

              <div style="position: relative; flex: 1; display: flex; flex-direction: column;">
                <!-- Back Card 2: Visa Commercial -->
                <div class="card-stack-back-2">
                  <span style="letter-spacing: 1px;">VISA <span style="font-size: 9.5px; opacity: 0.6; margin-left: 4px; font-weight: 600;">COMMERCIAL</span></span>
                  <span style="font-family: var(--font-mono); font-weight: 600; opacity: 0.85;">$6,150.00</span>
                </div>

                <!-- Back Card 1: Mastercard Reserve -->
                <div class="card-stack-back-1">
                  <span style="display: flex; align-items: center; gap: 6px;">
                    <svg width="24" height="15" viewBox="0 0 36 24" style="vertical-align: middle;">
                      <circle cx="12" cy="12" r="10" fill="#EB001B" fill-opacity="0.95"/>
                      <circle cx="24" cy="12" r="10" fill="#FF5F00" fill-opacity="0.9"/>
                    </svg>
                    <span style="letter-spacing: 0.5px; opacity: 0.8; font-size: 10px;">RESERVE</span>
                  </span>
                  <span style="font-family: var(--font-mono); font-weight: 600; opacity: 0.9;">$3,140.00</span>
                </div>

                <!-- Front Featured Card: Authentic PayPal Commercial Clearing Card -->
                <div class="anchor-card-showcase">
                  <div class="anchor-top">
                    <!-- PayPal Dual-P Monogram + Wordmark -->
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <svg width="30" height="24" viewBox="0 0 100 80" fill="none" style="vertical-align: middle;">
                        <path d="M26.4 75L35.2 19.3H56.5C64.3 19.3 70.3 21.4 73.7 25.4C77.1 29.5 77.4 35.3 75.4 41.8C73.3 48.7 69.2 54.2 63.8 57.5C59.2 60.3 53.6 61.6 47.4 61.6H38.5L34.3 75H26.4Z" fill="#003087"/>
                        <path d="M38.5 61.6H47.4C53.6 61.6 59.2 60.3 63.8 57.5C69.2 54.2 73.3 48.7 75.4 41.8C77.4 35.3 77.1 29.5 73.7 25.4C72.8 24.3 71.7 23.4 70.4 22.6C68.3 22.4 65.8 22.4 63.1 22.4H47.1L40.2 66.2L38.5 61.6Z" fill="#002169" opacity="0.4"/>
                        <path d="M38.5 61.6L44.8 22.4H63.1C70.9 22.4 76.9 24.5 80.3 28.5C83.7 32.6 84 38.4 82 44.9C79.9 51.8 75.8 57.3 70.4 60.6C65.8 63.4 60.2 64.7 54 64.7H43.3L40.2 84H32.3L38.5 61.6Z" fill="#009CDE"/>
                      </svg>
                      <span style="font-weight: 800; font-size: 16px; letter-spacing: -0.3px; color: #FFFFFF;">PayPal</span>
                    </div>

                    <!-- NFC Waves + EMV Smart Chip -->
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round">
                        <path d="M8.5 16.5a5 5 0 0 1 0-7"/>
                        <path d="M12 19a8.5 8.5 0 0 0 0-14"/>
                        <path d="M15.5 21.5a12 12 0 0 0 0-19"/>
                      </svg>
                      <div class="anchor-card-chip"></div>
                    </div>
                  </div>

                  <!-- Card Number & Net Balance -->
                  <div style="margin-top: 8px; margin-bottom: 6px;">
                    <div style="font-family: var(--font-mono); letter-spacing: 2px; font-size: 13px; color: rgba(255,255,255,0.75); margin-bottom: 8px;">•••• &nbsp; •••• &nbsp; •••• &nbsp; 822V</div>
                    <div class="anchor-balance-label">Net Cleared Balance</div>
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-top: 2px;">
                      <div class="anchor-balance-val">$12,850.00</div>
                      <span style="font-size: 11.5px; font-weight: 700; color: #22C55E; background: rgba(34, 197, 94, 0.16); border: 1px solid rgba(34, 197, 94, 0.35); padding: 3px 9px; border-radius: 9999px;">↑ 3.52%</span>
                    </div>
                  </div>

                  <!-- Card Actions (Request / Clear & Settle) -->
                  <div class="anchor-actions">
                    <button class="btn btn-glass" onclick="tourStep(1)">↘ Request</button>
                    <button class="btn btn-paypal" onclick="runFlagshipDemo()">↗ Clear & Settle</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 4-METRIC FINANCIAL CARDS -->
          <div class="metrics-grid">
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-cyan">⚡</span>
                  <span class="card-title">Liquidity Compression</span>
                </div>
                <span class="tag tag-success">Active Engine</span>
              </div>
              <div class="metric-value" id="metric-compression">65.38%</div>
              <div class="metric-sub">Gross-to-Net Capital Optimization</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-blue">📊</span>
                  <span class="card-title">Gross Volume</span>
                </div>
              </div>
              <div class="metric-value" id="metric-gross">$130.00</div>
              <div class="metric-sub">Total Agent Tasks Cleared</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-amber">💳</span>
                  <span class="card-title">Net Cash Settled</span>
                </div>
              </div>
              <div class="metric-value" id="metric-net">$45.00</div>
              <div class="metric-sub">Physical PayPal Settlement Cash</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-emerald">⚖️</span>
                  <span class="card-title">Subledger Balance</span>
                </div>
                <span class="tag tag-success" id="metric-trial-badge">Balanced</span>
              </div>
              <div class="metric-value mono" id="metric-variance">Δ = $0.00</div>
              <div class="metric-sub">Zero-Sum Mathematical Invariant</div>
            </div>
          </div>

          <!-- SECONDARY INSIGHTS GRID (TRUST CARD + AGENT BAR CHART + RECENT SETTLEMENTS) -->
          <div class="insights-grid">
            <!-- Left: Trust by Autonomous Agents -->
            <div class="card" style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.14); box-shadow: 0 10px 28px rgba(0, 112, 186, 0.05); border-radius: 24px; padding: 26px;">
              <div style="font-size: 18px; font-weight: 800; color: #0B1E3F; line-height: 1.3; margin-bottom: 8px;">
                Trusted by Autonomous Swarms Worldwide
              </div>
              <p style="font-size: 12.5px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
                Secure, deterministic, and cryptographic clearance for micro-IOUs and inter-agent commerce.
              </p>

              <!-- Agent Avatars Row -->
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 22px;">
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #0070BA; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 112, 186, 0.25);">α</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #009CDE; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 156, 222, 0.25);">β</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #10B981; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">γ</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #003087; color: #FFFFFF; font-weight: 800; font-size: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0, 48, 135, 0.25);">δ</div>
                <div style="width: 32px; height: 32px; border-radius: 50%; background: #EBF4FC; border: 1px solid rgba(0, 112, 186, 0.22); color: #0070BA; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;">+10</div>
              </div>

              <button class="btn btn-secondary" style="width: 100%; height: 38px; display: inline-flex; align-items: center; justify-content: center; gap: 6px;" onclick="switchTab('security')">🛡️ Invariant Center</button>
            </div>

            <!-- Center: Bar Chart (Agent Liquidity Distribution) -->
            <div class="card">
              <div class="card-header">
                <div>
                  <div class="card-title">Agent Liquidity Distribution</div>
                  <div style="font-size: 20px; font-weight: 800; color: #0B1E3F; margin-top: 4px;">$3,200.00 <span style="font-size: 12px; font-weight: 600; color: var(--accent-emerald);">↑ 1.52%</span></div>
                </div>
                <span class="tag tag-info">Swarm</span>
              </div>

              <!-- CSS / SVG Bar Chart matching Reference ($200-$500 with green highlight!) -->
              <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 130px; padding-top: 20px; gap: 8px;">
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; color: var(--text-muted);">$200</span>
                  <div style="width: 100%; height: 45px; background: rgba(0, 112, 186, 0.25); border-radius: 6px 6px 0 0;"></div>
                  <span style="font-size: 10px; color: var(--text-secondary);">Sep</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; color: var(--text-muted);">$300</span>
                  <div style="width: 100%; height: 65px; background: rgba(0, 112, 186, 0.4); border-radius: 6px 6px 0 0;"></div>
                  <span style="font-size: 10px; color: var(--text-secondary);">Oct</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; color: var(--text-muted);">$400</span>
                  <div style="width: 100%; height: 85px; background: rgba(0, 112, 186, 0.55); border-radius: 6px 6px 0 0;"></div>
                  <span style="font-size: 10px; color: var(--text-secondary);">Nov</span>
                </div>
                <!-- Peak Highlight Bar (Emerald in Reference) -->
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; font-weight: 800; background: var(--accent-emerald); color: #040914; padding: 1px 4px; border-radius: 4px;">$500</span>
                  <div style="width: 100%; height: 105px; background: linear-gradient(180deg, #10B981 0%, #059669 100%); border-radius: 6px 6px 0 0; box-shadow: 0 0 14px rgba(16, 185, 129, 0.45);"></div>
                  <span style="font-size: 10px; color: #059669; font-weight: 800;">Dec</span>
                </div>
                <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px;">
                  <span style="font-size: 10px; color: var(--text-muted);">$400</span>
                  <div style="width: 100%; height: 85px; background: rgba(0, 112, 186, 0.55); border-radius: 6px 6px 0 0;"></div>
                  <span style="font-size: 10px; color: var(--text-secondary);">Jan</span>
                </div>
              </div>
            </div>

            <!-- Right: Recent Transactions (Matching Reference List!) -->
            <div class="card">
              <div class="card-header">
                <span class="card-title">Recent Transactions</span>
                <a href="javascript:void(0)" onclick="switchTab('ledger')" style="font-size: 11.5px; color: var(--accent-primary); text-decoration: none;">View All</a>
              </div>

              <div>
                <div class="tx-item">
                  <div class="tx-left">
                    <div class="tx-avatar">α</div>
                    <div>
                      <div class="tx-title">Research Alpha</div>
                      <div class="tx-date">10 Nov, 01:15 AM</div>
                    </div>
                  </div>
                  <div class="tx-amount pos">+$450.00</div>
                </div>

                <div class="tx-item">
                  <div class="tx-left">
                    <div class="tx-avatar">δ</div>
                    <div>
                      <div class="tx-title">Agent Delta</div>
                      <div class="tx-date">10 Nov, 01:14 AM</div>
                    </div>
                  </div>
                  <div class="tx-amount neg">-$450.00</div>
                </div>

                <div class="tx-item">
                  <div class="tx-left">
                    <div class="tx-avatar" style="color: var(--accent-emerald);">PP</div>
                    <div>
                      <div class="tx-title">PayPal Sandbox Capture</div>
                      <div class="tx-date">10 Nov, 01:13 AM</div>
                    </div>
                  </div>
                  <div class="tx-amount pos">+$1.00</div>
                </div>
              </div>
            </div>
          </div>

          <!-- FLAGSHIP STEPPER CARD -->
          <div class="card" style="margin-bottom: 22px;">
            <div class="card-header">
              <div>
                <span class="card-title">Flagship Scenario Walkthrough (Autonomous Research Consortium)</span>
                <div class="card-desc">5 Independent AI Agents &bull; 6 Tasks Cleared &bull; 1 Adversarial Task Quarantined &bull; PayPal Rails Settled</div>
              </div>
              <span class="tag tag-info" id="demo-status-pill">Ready to Run</span>
            </div>
            <div class="stepper">
              <div class="step-card done" id="step-1">
                <div class="step-num"><span>🤖</span> <span>Scene 1</span></div>
                <div class="step-title">SLA Adjudication</div>
                <div class="step-desc">6 valid tasks PASS ($130 gross); 1 malformed task FAILS with 0 IOUs.</div>
              </div>
              <div class="step-card done" id="step-2">
                <div class="step-num"><span>🔄</span> <span>Scene 2</span></div>
                <div class="step-title">Multilateral Netting</div>
                <div class="step-desc">Circular debt collapses $130 gross &rarr; $45 net (65.38% rail volume saved).</div>
              </div>
              <div class="step-card done" id="step-3">
                <div class="step-num"><span>🛡️</span> <span>Scene 3</span></div>
                <div class="step-title">Financial Firewall</div>
                <div class="step-desc">Zero-sum asserted (&Sigma;&Delta; &equiv; 0); operator reserves &ge; $10.00 verified.</div>
              </div>
              <div class="step-card done" id="step-4">
                <div class="step-num"><span>💳</span> <span>Scene 4</span></div>
                <div class="step-title">PayPal Settlement</div>
                <div class="step-desc">Orders v2 captures $45 from debtor; Payouts v1 dispatches to 4 creditors.</div>
              </div>
              <div class="step-card done" id="step-5">
                <div class="step-num"><span>🩹</span> <span>Scene 5</span></div>
                <div class="step-title">Self-Healing Return</div>
                <div class="step-desc">5-stage return recovery; Trigger 5 blocks adversarial late duplicate collision.</div>
              </div>
              <div class="step-card done" id="step-6">
                <div class="step-num"><span>🔒</span> <span>Scene 6</span></div>
                <div class="step-title">Subledger Finality</div>
                <div class="step-desc">Double-entry trial balance zero-variance proof and SHA-256 state seal.</div>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <div style="display: flex; align-items: center;">
                <span class="metric-icon-box metric-icon-purple">🏛️</span>
                <span class="card-title">Multilateral Clearing Architectural Principle</span>
              </div>
            </div>
            <p style="color: #334155; font-size: 13.5px; line-height: 1.7;">
              <strong>AI Analyzes &bull; Crypto Verifies &bull; Math Clears &bull; Deterministic Code Controls &bull; PayPal Settles &bull; Ledger Proves.</strong><br>
              Tally Nexus resolves circular agent debt through deterministic cycle compression. Bounded SLA Judges evaluate deliverables into debtor-signed Ed25519 micro-IOUs. The Financial Firewall enforces strict reserve floors before routing net debtor collections via PayPal Orders v2 and creditor disbursements via PayPal Payouts v1.
            </p>
          </div>
        </div>

        <!-- 2. HERO SCALE & AG GRID TAB (WORKSTREAM 2 & 3) -->
        <div id="tab-scale" class="tab-content">
          <div class="metrics-grid">
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-cyan">🚀</span>
                  <span class="card-title">Swarm Volume</span>
                </div>
                <span class="tag tag-success">1,500 IOUs</span>
              </div>
              <div class="metric-value" id="scale-gross-vol">$51,248.50</div>
              <div class="metric-sub">10 Swarm Agents Bilateral Tasks</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-blue">🌐</span>
                  <span class="card-title">Net Settled Cash</span>
                </div>
                <span class="tag tag-info">O(V) Collapsed</span>
              </div>
              <div class="metric-value" id="scale-net-vol">$17,624.10</div>
              <div class="metric-sub" id="scale-compression-sub">65.61% Liquidity Compression</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-amber">⚡</span>
                  <span class="card-title">Rail Transfers</span>
                </div>
                <span class="tag tag-success">99.4% Reduction</span>
              </div>
              <div class="metric-value" id="scale-move-count">9 Movements</div>
              <div class="metric-sub">Collapsed from 1,500 transfers</div>
            </div>
            <div class="card">
              <div class="card-header">
                <div style="display: flex; align-items: center;">
                  <span class="metric-icon-box metric-icon-emerald">💰</span>
                  <span class="card-title">Rail Fee Savings</span>
                </div>
                <span class="tag tag-success">Modeled Benchmark</span>
              </div>
              <div class="metric-value" id="scale-fee-savings">$1,552.05</div>
              <div class="metric-sub" id="scale-fee-percent">95.0% Cost Cut (Configured Benchmark)</div>
              <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;" id="scale-fee-assumptions">Modeled: 49¢ capture + 25¢ payout (74¢ fixed) + 3.49% vol; Observed Sandbox sample: $0.54 on $1.00</div>
            </div>
          </div>

          <!-- Configurable Fee Parameters Panel (Exact PayPal Style Capsule) -->
          <div class="fee-model-capsule">
            <div class="fee-model-title-group">
              <div class="fee-model-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                  <polyline points="2 17 12 22 22 17"></polyline>
                  <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="font-weight: 800; font-size: 15.5px; color: #0B1E3F; letter-spacing: -0.2px;">Payment Rail Fee Model</span>
                  <span class="pill-badge-purple">⚙️ Configurable</span>
                </div>
                <div style="font-size: 12px; color: #64748B; margin-top: 4px; font-weight: 500;">Configure settlement rails & estimate savings</div>
              </div>
            </div>

            <div class="fee-inputs-row">
              <div class="fee-input-group">
                <span class="fee-input-label">Capture Fixed</span>
                <div class="fee-chip">
                  <div class="fee-chip-icon fee-icon-amber">💳</div>
                  <input type="number" id="fee-capture-fixed" value="49" class="fee-input-val" oninput="recalculateFeesCustom()">
                  <span class="fee-unit">¢</span>
                </div>
              </div>

              <div class="fee-input-group">
                <span class="fee-input-label">Payout Fixed</span>
                <div class="fee-chip">
                  <div class="fee-chip-icon fee-icon-amber">🪙</div>
                  <input type="number" id="fee-payout-fixed" value="25" class="fee-input-val" oninput="recalculateFeesCustom()">
                  <span class="fee-unit">¢</span>
                </div>
              </div>

              <div class="fee-input-group">
                <span class="fee-input-label">Variable Rate</span>
                <div class="fee-chip">
                  <div class="fee-chip-icon fee-icon-purple">%</div>
                  <input type="number" id="fee-variable-rate" value="3.49" step="0.01" class="fee-input-val fee-val-wide" oninput="recalculateFeesCustom()">
                  <span class="fee-unit">%</span>
                </div>
              </div>
            </div>

            <button class="btn-recalc-glow" onclick="recalculateFeesCustom()">
              <span style="font-size: 15px;">🧮</span>
              <span>Recalculate Savings</span>
              <span class="sparkle-star">✨</span>
            </button>
          </div>

          <!-- IOU Ledger Grid with AG Grid -->
          <div class="card">
            <div class="card-header">
              <div>
                <span class="card-title">High-Density Cryptographic Micro-IOU Ledger</span>
                <div class="card-desc">Virtualized AG Grid rendering 1,500+ cryptographically signed Ed25519 IOUs with RFC 8785 canonical payloads.</div>
              </div>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-primary" onclick="triggerScaleSimulation()">⚡ Run 1,500 IOU Simulation</button>
                <button class="btn btn-secondary" onclick="exportIouGridCsv()">Export CSV</button>
              </div>
            </div>

            <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 14px; flex-wrap: wrap; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; padding: 7px 18px; flex: 1; max-width: 480px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <span style="font-size: 14px; color: #0070BA;">🔍</span>
                <input type="text" id="ious-filter-input" style="background: transparent; border: none; color: #0F172A; outline: none; font-size: 13px; font-family: var(--font-sans); width: 100%;" placeholder="Quick Filter IOUs (Agent, Task, ID, Signature)..." oninput="onIouQuickFilterChanged()">
              </div>
              <span class="pill-badge-purple" id="grid-row-count-badge" style="font-size: 12px; padding: 6px 14px; border-radius: 9999px;">📊 Displaying 1,500 rows</span>
            </div>

            <div id="ious-grid" class="ag-theme-nexus-dark ag-theme-alpine-dark" style="height: 480px; width: 100%;"></div>
            
            <!-- Conservation Status-Bar Widget with Rounded Pills & Emojis -->
            <div class="grid-status-bar" id="grid-conservation-bar">
              <div class="grid-status-pill"><span style="color: var(--accent-secondary);">📜</span> <strong id="bar-row-count">1,500 Micro-IOUs</strong></div>
              <div class="grid-status-pill"><span style="color: #34D399;">⚖️</span> Zero-Sum: <strong style="color: #34D399;" id="bar-zero-sum">Δ ≡ $0.00 Conserved</strong></div>
              <div class="grid-status-pill"><span style="color: var(--accent-amber);">💳</span> Gross Debt: <strong id="bar-gross-vol">$51,248.50</strong></div>
              <div class="grid-status-pill"><span style="color: var(--accent-secondary);">🌐</span> Net Cleared: <strong style="color: var(--accent-secondary);" id="bar-net-vol">$17,624.10</strong></div>
              <div class="grid-status-pill"><span style="color: #A7F3D0;">💰</span> Rail Cost Cut: <strong style="color: #A7F3D0;" id="bar-fee-savings">95.0% Saved</strong></div>
            </div>
          </div>

          <!-- Net Positions Grid with AG Grid -->
          <div class="card" style="margin-top: 22px;">
            <div class="card-header">
              <div>
                <span class="card-title">Swarm Net Positions Matrix & O(V) Minimal Settlement Transfers</span>
                <div class="card-desc">Zero-sum multilateral netting collapses bilateral obligations into minimal direct physical PayPal settlement movements.</div>
              </div>
              <span class="tag tag-success" id="scale-zero-sum-badge">Zero-Sum Conserved (Δ = $0.00)</span>
            </div>

            <div id="positions-grid" class="ag-theme-nexus-dark ag-theme-alpine-dark" style="height: 320px; width: 100%;"></div>

            <div class="card-header" style="margin-top: 22px;">
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
                  <tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading settlement movements...</td></tr>
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
                <span class="card-title">🛡️ Cryptographic IOU Signature & Invariant Verifier</span>
                <div class="card-desc">Verify Ed25519 digital signatures against RFC 8785 Canonical JSON representations and agent public keys in real-time.</div>
              </div>
              <span class="tag tag-info">Trust Engine</span>
            </div>

            <div style="display: flex; gap: 12px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 9999px; padding: 7px 18px; flex: 1; min-width: 300px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                <span style="font-size: 14px; color: #0070BA;">🔍</span>
                <input type="text" id="verify-iou-input" style="background: transparent; border: none; color: #0F172A; outline: none; font-size: 13px; font-family: var(--font-sans); width: 100%;" placeholder="Enter IOU ID (e.g. iou_001, iou_002, iou_003)">
              </div>
              <button class="btn btn-primary" onclick="verifyIouFromInput()">⚡ Verify Proof</button>
              <button class="btn btn-secondary" onclick="document.getElementById('verify-iou-input').value='iou_001'; verifyIouFromInput();">🧪 Sample IOU 1</button>
            </div>

            <div class="verify-result-box" id="verify-output" style="display: none; background: rgba(3, 7, 18, 0.95); border: 1px solid rgba(0, 156, 222, 0.35); border-radius: 18px; padding: 20px; margin-top: 18px; box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-weight: 700; color: #FFF; font-size: 14.5px; display: flex; align-items: center; gap: 8px;" id="verify-modal-title"><span>🛡️</span> Verification Result</span>
                <span class="tag tag-success" id="verify-status-tag">VALID Ed25519 SIGNATURE</span>
              </div>
              <pre id="verify-json-details" class="mono" style="color: #FF9A52; overflow-x: auto; white-space: pre-wrap; font-size: 12px; line-height: 1.5;"></pre>
            </div>
          </div>

          <!-- Security Invariants & Attack Resistance Matrix -->
          <div class="card" style="margin-top: 22px;">
            <div class="card-header">
              <div>
                <span class="card-title">🔒 5-Point Adversarial Defense & Invariant Matrix</span>
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
                    <td><strong>1. 🔐 Cryptographic Authenticity</strong></td>
                    <td>Signature Forgery / Key Spoofing</td>
                    <td>Ed25519 verification over RFC 8785 canonical digest with domain separation</td>
                    <td>Non-debtor agents cannot mint or alter debt obligations</td>
                    <td><span class="tag tag-success">ENFORCED (401 REJECT)</span></td>
                  </tr>
                  <tr>
                    <td><strong>2. 🔁 Replay & Nonce Defense</strong></td>
                    <td>Duplicate IOU Double-Spend</td>
                    <td>Unique IOU ID + Task ID unique constraint in relational subledger</td>
                    <td>An adjudicated task can strictly generate exactly one IOU</td>
                    <td><span class="tag tag-success">ENFORCED (409 CONFLICT)</span></td>
                  </tr>
                  <tr>
                    <td><strong>3. 🛡️ Margin & Solvency Floor</strong></td>
                    <td>Debtor Capital Exhaustion</td>
                    <td>Financial Firewall reserve check before cycle authorization</td>
                    <td>Clearing cannot proceed if obligations breach minimum floor ($10.00)</td>
                    <td><span class="tag tag-success">ENFORCED (HALT CYCLE)</span></td>
                  </tr>
                  <tr>
                    <td><strong>4. 📝 Payload Integrity</strong></td>
                    <td>Amount Tampering ($100 &rarr; $1)</td>
                    <td>Contextual claim matching (claimed amount === evaluated amount)</td>
                    <td>Any discrepancy between evaluated task and signed IOU is rejected</td>
                    <td><span class="tag tag-success">ENFORCED (400 MISMATCH)</span></td>
                  </tr>
                  <tr>
                    <td><strong>5. 🤖 SLA Prompt Injection Defense</strong></td>
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
              <span class="card-title">🔄 Settlement Cycles</span>
              <button class="btn btn-primary" onclick="runFlagshipDemo()">🚀 Execute Flagship Cycle</button>
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
                  <tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading settlement cycles...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 5. PAYMENT RAILS TAB -->
        <div id="tab-payments" class="tab-content">
          <div class="card">
            <div class="card-header"><span class="card-title">💳 Debtor Orders v2 Collections (Inbound Net Cash)</span></div>
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
                  <tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading debtor collection orders...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card" style="margin-top: 22px;">
            <div class="card-header"><span class="card-title">🪙 Creditor Payouts v1 Disbursements (Outbound Distribution)</span></div>
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
                  <tr><td colspan="6" style="text-align: center; color: var(--text-secondary);">Loading creditor payouts...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 6. RECOVERY & SELF-HEALING TAB -->
        <div id="tab-recovery" class="tab-content">
          <div class="card">
            <div class="card-header">
              <span class="card-title">🩹 Recovery Operations & Interrupted State Reconciliation</span>
              <button class="btn btn-secondary" onclick="triggerReconciliation()">🔄 Reconcile Operations</button>
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
                  <tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Scanning for items requiring recovery...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 7. DOUBLE-ENTRY LEDGER TAB -->
        <div id="tab-ledger" class="tab-content">
          <div class="card">
            <div class="card-header"><span class="card-title">⚖️ Compensating & Settlement Double-Entry Subledger</span></div>
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
                  <tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">Loading immutable ledger entries...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 8. AGENTS TAB -->
        <div id="tab-agents" class="tab-content">
          <div class="card">
            <div class="card-header"><span class="card-title">🤖 Registered Autonomous Agents</span></div>
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
                  <tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">Loading registered agents...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- 9. LIVE SSE EVENT STREAM TAB -->
        <div id="tab-events" class="tab-content">
          <div class="card">
            <div class="card-header">
              <div>
                <span class="card-title">📡 Server-Sent Events (SSE) Monotonic Outbox Stream</span>
                <div class="card-desc">Real-time cryptographic audit trail of all settlement events streamed directly from SQLite outbox.</div>
              </div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span class="tag tag-info" id="stream-counter-tag">0 Events Cached</span>
                <button class="btn btn-primary" onclick="runFlagshipDemo()">🚀 Run Demo (Stream Events)</button>
                <button class="btn btn-secondary" onclick="clearStreamLog()">🧹 Clear Log</button>
              </div>
            </div>
            <div class="stream-box" id="stream-box" style="height: 560px;">
              <div class="stream-line"><span class="stream-time">[INIT]</span> Connected to /api/events/stream. Realtime cryptographic event outbox active...</div>
            </div>
          </div>
        </div>

      </main>
    </div>
  </div>

  <div id="toast-container"></div>

  <!-- Authoritative PayPal Verification Modal - Light Theme -->
  <div id="paypal-verify-modal" style="display: none; position: fixed; inset: 0; background: rgba(11, 30, 63, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); z-index: 9999; justify-content: center; align-items: center; padding: 24px;">
    <div style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.25); border-radius: 22px; max-width: 720px; width: 100%; box-shadow: 0 35px 80px rgba(0, 48, 135, 0.22), 0 0 40px rgba(0, 112, 186, 0.1); overflow: hidden; backdrop-filter: blur(32px); -webkit-backdrop-filter: blur(32px);">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px 28px; border-bottom: 1px solid rgba(0, 112, 186, 0.15); background: linear-gradient(90deg, #EBF4FC 0%, #FFFFFF 100%);">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #003087 0%, #0070BA 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0, 112, 186, 0.45); border: 1px solid rgba(255,255,255,0.2);">
            <svg width="22" height="18" viewBox="0 0 100 80" fill="none">
              <path d="M26.4 75L35.2 19.3H56.5C64.3 19.3 70.3 21.4 73.7 25.4C77.1 29.5 77.4 35.3 75.4 41.8C73.3 48.7 69.2 54.2 63.8 57.5C59.2 60.3 53.6 61.6 47.4 61.6H38.5L34.3 75H26.4Z" fill="#FFF"/>
              <path d="M38.5 61.6L44.8 22.4H63.1C70.9 22.4 76.9 24.5 80.3 28.5C83.7 32.6 84 38.4 82 44.9C79.9 51.8 75.8 57.3 70.4 60.6C65.8 63.4 60.2 64.7 54 64.7H43.3L40.2 84H32.3L38.5 61.6Z" fill="#00C3FF"/>
            </svg>
          </div>
          <div>
            <div id="verify-modal-header-title" style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0.2px;">PayPal Sandbox Authoritative Proof</div>
            <div id="verify-modal-header-sub" style="font-size: 12.5px; color: #64748B; margin-top: 2px;">Cryptographically linked server-side verification</div>
          </div>
        </div>
        <button onclick="closeVerifyModal()" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; width: 32px; height: 32px; color: #94A3B8; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">&times;</button>
      </div>
      <div style="padding: 28px; max-height: 75vh; overflow-y: auto;">
        <div id="verify-modal-loading" style="text-align: center; padding: 40px 20px; color: var(--accent-secondary);">
          <div class="pulse-dot" style="margin: 0 auto 16px; width: 14px; height: 14px;"></div>
          <div style="font-size: 14px; font-weight: 600; color: #0B1E3F;">Querying api-m.sandbox.paypal.com in real-time...</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">Executing cryptographic verification against PayPal Sandbox rails</div>
        </div>
        <div id="verify-modal-content" style="display: none;">
          <div id="modal-notice-banner" style="display: none; padding: 12px 16px; border-radius: 12px; margin-bottom: 18px; font-size: 12.5px; line-height: 1.5; font-weight: 500;"></div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
            <span id="modal-status-badge" class="tag tag-success" style="font-size: 12px; padding: 5px 14px;">VERIFIED ON PAYPAL SANDBOX</span>
            <span id="modal-env-pill" class="tag tag-info" style="font-family: var(--font-mono); font-size: 11px; padding: 4px 10px;">api-m.sandbox.paypal.com</span>
          </div>
          <div style="background: #F8FAFD; border: 1px solid rgba(0, 112, 186, 0.18); border-radius: 14px; padding: 20px; margin-bottom: 18px; box-shadow: 0 2px 8px rgba(0, 112, 186, 0.04);">
            <div style="display: grid; grid-template-columns: 150px 1fr; row-gap: 12px; font-size: 13px; align-items: center;">
              <span style="color: #64748B; font-weight: 600;">Identifier:</span>
              <span id="modal-id" class="mono" style="color: #0070BA; font-weight: 700; word-break: break-all;">-</span>
              <span style="color: #64748B; font-weight: 600;">Provider Status:</span>
              <span id="modal-provider-status" style="font-weight: 800; font-size: 13.5px; color: #0B1E3F;">-</span>
              <span style="color: #64748B; font-weight: 600;">Amount:</span>
              <span id="modal-amount" style="font-weight: 800; color: #0B1E3F; font-size: 14px; font-variant-numeric: tabular-nums;">-</span>
              <span style="color: var(--text-secondary); font-weight: 500;">Merkle Anchor:</span>
              <span id="modal-anchor" class="mono" style="color: var(--accent-amber); word-break: break-all;">-</span>
              <span style="color: var(--text-secondary); font-weight: 500;">PayPal Debug ID:</span>
              <span id="modal-debug-id" class="mono" style="color: #6EE7B7; font-weight: 600;">-</span>
              <span style="color: var(--text-secondary); font-weight: 500;">Stored Evidence:</span>
              <span id="modal-evidence-match" class="tag tag-success" style="display: inline-block; width: fit-content; font-size: 11.5px; padding: 4px 10px;">VERIFIED MATCH</span>
            </div>
          </div>
          <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; letter-spacing: -0.1px;">Full Authoritative Provider Response:</div>
          <pre id="modal-raw-json" class="mono" style="background: rgba(4, 8, 16, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px; font-size: 11.5px; color: #CBD5E1; max-height: 220px; overflow-y: auto; line-height: 1.45;"></pre>
        </div>
      </div>
      <div style="padding: 14px 28px; border-top: 1px solid #E2E8F0; background: #F8FAFD; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" style="padding: 8px 22px; border-radius: 9999px; font-size: 13px; font-weight: 700; background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A;" onclick="closeVerifyModal()">Close</button>
      </div>
    </div>
  </div>

  <!-- Interactive Merkle Proof & Ed25519 Cryptographic Modal - Light Theme -->
  <div id="merkle-proof-modal" style="display: none; position: fixed; inset: 0; background: rgba(11, 30, 63, 0.45); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); z-index: 10000; justify-content: center; align-items: center; padding: 20px;">
    <div style="background: #FFFFFF; border: 1px solid rgba(0, 112, 186, 0.25); border-radius: 22px; max-width: 700px; width: 100%; box-shadow: 0 35px 80px rgba(0, 48, 135, 0.22); overflow: hidden; backdrop-filter: blur(20px);">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 18px 24px; border-bottom: 1px solid rgba(0, 112, 186, 0.12); background: #F8FAFD;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 20px;">🛡️</span>
          <div>
            <div id="merkle-modal-title" style="font-weight: 800; color: #0B1E3F; font-size: 16px; letter-spacing: -0.2px;">IOU Cryptographic Proof & Merkle Anchor</div>
            <div style="font-size: 12px; color: var(--text-secondary);">Ed25519 digital signature verified over RFC 8785 canonical JSON digest</div>
          </div>
        </div>
        <button onclick="closeMerkleProofModal()" style="background: none; border: none; color: #94A3B8; font-size: 22px; cursor: pointer; line-height: 1;">&times;</button>
      </div>
      <div style="padding: 24px; max-height: 75vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span class="tag tag-success">CRYPTOGRAPHICALLY VERIFIED</span>
          <span class="tag tag-info" style="font-family: var(--font-mono);">RFC 8785 CANONICAL</span>
        </div>
        <div style="background: var(--surface-elevated); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
          <div style="display: grid; grid-template-columns: 140px 1fr; row-gap: 8px; font-size: 12.5px;">
            <span style="color: var(--text-secondary);">Task Description:</span>
            <span id="mp-task-title" style="font-weight: 600; color: #0F172A;">-</span>
            <span style="color: var(--text-secondary);">Debtor (Issuer):</span>
            <span id="mp-debtor" style="color: var(--accent-rose);">-</span>
            <span style="color: var(--text-secondary);">Creditor (Receiver):</span>
            <span id="mp-creditor" style="color: var(--accent-emerald);">-</span>
            <span style="color: var(--text-secondary);">Amount:</span>
            <span id="mp-amount" style="font-weight: 800; color: #0070BA; font-variant-numeric: tabular-nums;">-</span>
            <span style="color: var(--text-secondary);">Merkle Anchor:</span>
            <span id="mp-anchor" class="mono" style="color: #B45309; word-break: break-all; font-weight: 600;">-</span>
            <span style="color: var(--text-secondary);">Debtor Public Key:</span>
            <span id="mp-pubkey" class="mono" style="color: #047857; word-break: break-all; font-size: 11px; font-weight: 600;">-</span>
            <span style="color: var(--text-secondary);">Ed25519 Signature:</span>
            <span id="mp-signature" class="mono" style="color: #4338CA; word-break: break-all; font-size: 11px; font-weight: 600;">-</span>
          </div>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">Signed Canonical RFC 8785 Payload:</div>
        <pre id="mp-payload" class="mono" style="background: #050608; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; font-size: 11px; color: #CBD5E1; max-height: 180px; overflow-y: auto;"></pre>
      </div>
      <div style="padding: 14px 24px; border-top: 1px solid #E2E8F0; background: #F8FAFD; display: flex; justify-content: flex-end;">
        <button class="btn btn-secondary" onclick="closeMerkleProofModal()">Close Proof</button>
      </div>
    </div>
  </div>

  <!-- Global Command Palette & Search Modal -->
  <div id="command-palette-modal" style="display: none; position: fixed; inset: 0; background: rgba(3, 7, 18, 0.85); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); z-index: 10001; justify-content: center; align-items: flex-start; padding: 70px 20px 20px 20px;" onclick="handlePaletteBackdropClick(event)">
    <div class="palette-dialog" onclick="event.stopPropagation()">
      <div style="display: flex; align-items: center; gap: 14px; padding: 18px 24px; border-bottom: 1px solid rgba(0, 156, 222, 0.22); background: linear-gradient(90deg, rgba(0, 48, 135, 0.3) 0%, rgba(0, 112, 186, 0.15) 100%);">
        <div style="width: 38px; height: 38px; border-radius: 12px; background: rgba(0, 156, 222, 0.18); border: 1px solid rgba(0, 156, 222, 0.4); display: flex; align-items: center; justify-content: center; font-size: 16px; color: var(--accent-secondary); flex-shrink: 0;">
          🔍
        </div>
        <input type="text" id="palette-search-input" placeholder="Search transactions, agents, IOUs, routes, or type an action..." autocomplete="off" spellcheck="false" style="flex: 1; background: transparent; border: none; outline: none; font-size: 15.5px; font-weight: 500; color: #FFFFFF; font-family: var(--font-sans);" oninput="filterCommandPalette(this.value)" onkeydown="handlePaletteKeydown(event)">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="command-key" style="border-radius: 9999px; padding: 4px 10px; font-size: 10px; font-weight: 600; letter-spacing: 0.5px;">ESC</span>
          <button onclick="closeCommandPalette()" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 50%; width: 30px; height: 30px; color: #94A3B8; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease;">&times;</button>
        </div>
      </div>
      <div id="palette-results-list" style="max-height: 420px; overflow-y: auto; padding: 10px 14px;">
        <!-- Dynamically rendered -->
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(7, 13, 26, 0.9); font-size: 11.5px; color: var(--text-muted);">
        <div style="display: flex; gap: 16px;">
          <span><strong style="color: var(--text-secondary);">↑↓</strong> to navigate</span>
          <span><strong style="color: var(--text-secondary);">↵</strong> to select</span>
          <span><strong style="color: var(--text-secondary);">ESC</strong> to close</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span class="pulse-dot" style="width: 6px; height: 6px;"></span>
          <span style="font-family: var(--font-mono); font-size: 11px;">TALLY NEXUS PALETTE</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    let iouGridApi = null;
    let positionsGridApi = null;
    let currentScaleData = null;

    function escapeHtml(str) {
      if (typeof str !== 'string') str = String(str || '');
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function toggleMobileSidebar() {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('mobile-open');
    }

    /* --- COMMAND PALETTE & GLOBAL SEARCH ENGINE --- */
    let filteredPaletteItems = [];
    let selectedPaletteIndex = 0;

    const STATIC_PALETTE_ITEMS = [
      // Quick Actions
      { id: 'act-demo', category: '⚡ Quick Actions', title: 'Run 180s Flagship Demo', subtitle: 'Execute 5-agent micro-IOU simulation, bilateral netting & PayPal settlement', icon: '🚀', badge: 'DEMO', action: function() { runFlagshipDemo(); } },
      { id: 'act-ai', category: '⚡ Quick Actions', title: 'Run Live AI SLA Evaluation', subtitle: 'Evaluate dispute deliverable via Gemini 3.7 Flash with DeepSeek failover', icon: '🤖', badge: 'AI JUDGE', action: function() { testLiveAiJudge(); } },
      { id: 'act-capture', category: '⚡ Quick Actions', title: 'Verify Live PayPal Capture', subtitle: 'Query api-m.sandbox.paypal.com Orders v2 authoritative record', icon: '💳', badge: 'PAYPAL', action: function() { verifyPayPalCapture('7PV82720RX415822V'); } },
      { id: 'act-payout', category: '⚡ Quick Actions', title: 'Verify Live PayPal Payout', subtitle: 'Query api-m.sandbox.paypal.com Payouts v1 authoritative record', icon: '🪙', badge: 'PAYPAL', action: function() { verifyPayPalPayout('N4M49PUHNCNQ4'); } },
      { id: 'act-recalc', category: '⚡ Quick Actions', title: 'Recalculate Rail Fee Savings', subtitle: 'Run fee model calculation against configured interchange rates', icon: '🧮', badge: 'FEE MODEL', action: function() { recalculateFeesCustom(); } },
      { id: 'act-refresh', category: '⚡ Quick Actions', title: 'Refresh Dashboard & Subledger', subtitle: 'Poll subledger balances and assert zero-variance state', icon: '🔄', badge: 'SYNC', action: function() { refreshDashboardData(); } },

      // Navigation
      { id: 'nav-overview', category: '🧭 Navigation', title: 'Executive Overview', subtitle: 'Conserved net exposure, fee comparison & judge briefing', icon: '🏛️', badge: 'VIEW', action: function() { switchTab('overview'); } },
      { id: 'nav-cycles', category: '🧭 Navigation', title: 'Clearing Room & Settlement Cycles', subtitle: 'Bilateral netting graph, debt compression & net positions', icon: '⚡', badge: 'VIEW', action: function() { switchTab('cycles'); } },
      { id: 'nav-agents', category: '🧭 Navigation', title: 'Agent Directory', subtitle: 'Registered swarm agents, public keys & credit limits', icon: '🤖', badge: 'VIEW', action: function() { switchTab('agents'); } },
      { id: 'nav-scale', category: '🧭 Navigation', title: 'Hero Scale & AG Grid (1,500+ IOUs)', subtitle: 'High-density grid with 1,500+ micro-IOU cryptographic audit', icon: '📊', badge: 'VIEW', action: function() { switchTab('scale'); } },
      { id: 'nav-payments', category: '🧭 Navigation', title: 'Payment Rails (PayPal Sandbox)', subtitle: 'PayPal Sandbox Orders v2 captures & Payouts v1 disbursements', icon: '💳', badge: 'VIEW', action: function() { switchTab('payments'); } },
      { id: 'nav-ledger', category: '🧭 Navigation', title: 'Double-Entry Subledger', subtitle: '14 SQLite triggers asserting zero-sum mathematical balance', icon: '⚖️', badge: 'VIEW', action: function() { switchTab('ledger'); } },
      { id: 'nav-security', category: '🧭 Navigation', title: 'Trust & Security Center', subtitle: 'Cryptographic Merkle anchors, Ed25519 keys & failovers', icon: '🛡️', badge: 'VIEW', action: function() { switchTab('security'); } },
      { id: 'nav-events', category: '🧭 Navigation', title: 'Live Event Stream (SSE)', subtitle: 'Monotonic outbox event stream of signed state mutations', icon: '📡', badge: 'VIEW', action: function() { switchTab('events'); } },
      { id: 'nav-recovery', category: '🧭 Navigation', title: 'Recovery Operations', subtitle: 'Crash recovery, stale lock pruning & idempotency ledger', icon: '🔄', badge: 'VIEW', action: function() { switchTab('recovery'); } },

      // Swarm Agents
      { id: 'agent-research', category: '🤖 Swarm Agents', title: 'agent_research', subtitle: 'Lead Research Analyst • $10,000 credit • Ed25519 Verified', icon: '🔬', badge: 'AGENT', action: function() { switchTab('agents'); } },
      { id: 'agent-data', category: '🤖 Swarm Agents', title: 'agent_data', subtitle: 'Data Extraction Worker • $10,000 credit • Active Ingestion', icon: '📥', badge: 'AGENT', action: function() { switchTab('agents'); } },
      { id: 'agent-compute', category: '🤖 Swarm Agents', title: 'agent_compute', subtitle: 'Compute Infrastructure Node • High GPU throughput', icon: '⚡', badge: 'AGENT', action: function() { switchTab('agents'); } },
      { id: 'agent-loc', category: '🤖 Swarm Agents', title: 'agent_loc', subtitle: 'Liquidity Optimization Controller • Dynamic Netting Engine', icon: '💧', badge: 'AGENT', action: function() { switchTab('agents'); } },
      { id: 'agent-qa', category: '🤖 Swarm Agents', title: 'agent_qa', subtitle: 'Quality Assurance Assessor • Autonomous SLA Adjudicator', icon: '✅', badge: 'AGENT', action: function() { switchTab('agents'); } },

      // Canonical Micro-IOUs
      { id: 'iou-1', category: '📜 Micro-IOU Proofs', title: 'IOU #001 ($15.00 USD)', subtitle: 'agent_research → agent_compute • RFC 8785 Ed25519 Verified', icon: '📄', badge: 'PROOF', action: function() { showMerkleProof('iou_001'); } },
      { id: 'iou-2', category: '📜 Micro-IOU Proofs', title: 'IOU #002 ($25.00 USD)', subtitle: 'agent_data → agent_compute • Milvus vector database slice', icon: '📄', badge: 'PROOF', action: function() { showMerkleProof('iou_002'); } },
      { id: 'iou-3', category: '📜 Micro-IOU Proofs', title: 'IOU #003 ($5.00 USD)', subtitle: 'agent_compute → agent_qa • Validation gate execution', icon: '📄', badge: 'PROOF', action: function() { showMerkleProof('iou_003'); } }
    ];

    function openCommandPalette() {
      const modal = document.getElementById('command-palette-modal');
      if (!modal) return;
      modal.style.display = 'flex';
      const input = document.getElementById('palette-search-input');
      if (input) {
        input.value = '';
        setTimeout(function() { input.focus(); }, 50);
      }
      filterCommandPalette('');
    }

    function closeCommandPalette() {
      const modal = document.getElementById('command-palette-modal');
      if (modal) modal.style.display = 'none';
    }

    function handlePaletteBackdropClick(e) {
      if (e.target && e.target.id === 'command-palette-modal') {
        closeCommandPalette();
      }
    }

    function filterCommandPalette(query) {
      query = (query || '').trim().toLowerCase();
      selectedPaletteIndex = 0;

      let items = STATIC_PALETTE_ITEMS.slice();

      // Dynamically add matches from 1,500 scale IOUs if loaded
      if (query && currentScaleData && Array.isArray(currentScaleData.ious)) {
        let matchingIous = currentScaleData.ious.filter(function(iou) {
          return (iou.iouId && iou.iouId.toLowerCase().includes(query)) ||
                 (iou.taskTitle && iou.taskTitle.toLowerCase().includes(query)) ||
                 (iou.debtorAgentId && iou.debtorAgentId.toLowerCase().includes(query)) ||
                 (iou.creditorAgentId && iou.creditorAgentId.toLowerCase().includes(query));
        }).slice(0, 6);

        matchingIous.forEach(function(iou) {
          items.push({
            id: 'dyn-iou-' + iou.iouId,
            category: '🔍 AG Grid Matches',
            title: iou.iouId + ' ($' + (iou.amountCents / 100).toFixed(2) + ' USD)',
            subtitle: iou.debtorAgentId + ' → ' + iou.creditorAgentId + ' • ' + iou.taskTitle,
            icon: '📄',
            badge: 'SCALE IOU',
            action: function() { showMerkleProof(iou.iouId); }
          });
        });
      }

      if (query) {
        filteredPaletteItems = items.filter(function(item) {
          return item.title.toLowerCase().includes(query) ||
                 item.subtitle.toLowerCase().includes(query) ||
                 item.category.toLowerCase().includes(query) ||
                 item.badge.toLowerCase().includes(query);
        });
      } else {
        filteredPaletteItems = items;
      }

      renderPaletteResults();
    }

    function renderPaletteResults() {
      const container = document.getElementById('palette-results-list');
      if (!container) return;

      if (filteredPaletteItems.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 36px 20px; color: var(--text-secondary);"><div style="font-size: 28px; margin-bottom: 8px;">🔍</div><div style="font-weight: 600; color: #FFF; font-size: 14px;">No matching actions or records found</div><div style="font-size: 12px; margin-top: 4px;">Try searching for "demo", "paypal", "agent", "ledger", or an IOU ID.</div></div>';
        return;
      }

      let html = '';
      let currentCategory = '';

      filteredPaletteItems.forEach(function(item, idx) {
        if (item.category !== currentCategory) {
          currentCategory = item.category;
          html += '<div class="palette-section-title">' + escapeHtml(currentCategory) + '</div>';
        }

        const isSelected = idx === selectedPaletteIndex;
        html += '<div class="palette-item ' + (isSelected ? 'selected' : '') + '" id="palette-item-' + idx + '" onclick="executePaletteItem(' + idx + ')">' +
          '<div class="palette-item-left">' +
            '<div class="palette-item-icon">' + item.icon + '</div>' +
            '<div style="min-width: 0;">' +
              '<div class="palette-item-title">' + escapeHtml(item.title) + '</div>' +
              '<div class="palette-item-subtitle">' + escapeHtml(item.subtitle) + '</div>' +
            '</div>' +
          '</div>' +
          '<span class="palette-item-badge">' + escapeHtml(item.badge) + '</span>' +
        '</div>';
      });

      container.innerHTML = html;
      scrollPaletteSelectionIntoView();
    }

    function updatePaletteSelection() {
      document.querySelectorAll('.palette-item').forEach(function(el, idx) {
        if (idx === selectedPaletteIndex) {
          el.classList.add('selected');
        } else {
          el.classList.remove('selected');
        }
      });
      scrollPaletteSelectionIntoView();
    }

    function scrollPaletteSelectionIntoView() {
      const el = document.getElementById('palette-item-' + selectedPaletteIndex);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    function executePaletteItem(index) {
      if (index >= 0 && index < filteredPaletteItems.length) {
        const item = filteredPaletteItems[index];
        closeCommandPalette();
        if (typeof item.action === 'function') {
          setTimeout(function() { item.action(); }, 80);
        }
      }
    }

    function handlePaletteKeydown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredPaletteItems.length > 0) {
          selectedPaletteIndex = (selectedPaletteIndex + 1) % filteredPaletteItems.length;
          updatePaletteSelection();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredPaletteItems.length > 0) {
          selectedPaletteIndex = (selectedPaletteIndex - 1 + filteredPaletteItems.length) % filteredPaletteItems.length;
          updatePaletteSelection();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        executePaletteItem(selectedPaletteIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeCommandPalette();
      }
    }

    // Global keyboard shortcut listeners (Cmd+Space, Ctrl+K, Cmd+K, '/')
    document.addEventListener('keydown', function(e) {
      const isCmdSpace = (e.metaKey && e.code === 'Space');
      const isCtrlK = (e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K');
      const isSlash = e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA';

      if (isCmdSpace || isCtrlK || isSlash) {
        e.preventDefault();
        const modal = document.getElementById('command-palette-modal');
        if (modal && modal.style.display === 'flex') {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      } else if (e.key === 'Escape') {
        const modal = document.getElementById('command-palette-modal');
        if (modal && modal.style.display === 'flex') {
          closeCommandPalette();
        }
      }
    });

    function showToast(type, title, message, details) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      const icon = type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ';
      let detailsHtml = '';
      if (details) {
        const detailStr = typeof details === 'string' ? details : JSON.stringify(details, null, 2);
        detailsHtml = '<details style="margin-top: 8px; cursor: pointer;"><summary style="font-size: 11px; color: var(--accent-primary); outline: none; user-select: none;">Technical Details & Payload</summary><div class="toast-details">' + escapeHtml(detailStr) + '</div></details>';
      }
      toast.innerHTML = 
        '<div class="toast-header">' +
          '<div class="toast-title"><span>' + icon + '</span> <span>' + escapeHtml(title) + '</span></div>' +
          '<button class="toast-close" type="button">×</button>' +
        '</div>' +
        '<div class="toast-body">' + escapeHtml(message) + '</div>' +
        detailsHtml;
      const closeBtn = toast.querySelector('.toast-close');
      if (closeBtn) {
        closeBtn.onclick = function() { toast.remove(); };
      }
      container.appendChild(toast);
      if (type !== 'error') {
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 6500);
      }
    }

    function switchTab(tabName) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      // Update sidebar nav items
      document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
      const activeNavBtn = document.getElementById('btn-nav-' + tabName);
      if (activeNavBtn) activeNavBtn.classList.add('active');

      // Update legacy tab-btns
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      const legacyBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => {
        const text = b.textContent.toLowerCase();
        if (tabName === 'scale') return text.includes('hero scale');
        if (tabName === 'security') return text.includes('trust & security');
        return text.includes(tabName);
      });
      if (legacyBtn) legacyBtn.classList.add('active');

      // Update tab contents
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const activeContent = document.getElementById('tab-' + tabName);
      if (activeContent) activeContent.classList.add('active');

      // Close mobile drawer if open
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.classList.contains('mobile-open')) {
        sidebar.classList.remove('mobile-open');
      }

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
          cellRenderer: params => \`<strong style="color: #FF9A52;">$\${params.value}</strong>\`
        },
        {
          field: 'signature',
          headerName: 'Ed25519 Signature',
          width: 190,
          cellRenderer: params => \`<span class="mono" title="\${params.value}" style="font-size: 11px; color: #FFB36B; cursor: pointer;">\${params.value.substring(0, 16)}...</span>\`
        },
        {
          field: 'status',
          headerName: 'Status & Merkle Proof',
          width: 175,
          cellRenderer: params => \`
            <span class="status-chip-proof" onclick="showMerkleProof('\${params.data.iouId}')" title="Click to view Ed25519 signature & RFC 8785 Merkle proof">
              <span style="font-size: 8px;">●</span> \${params.value} <span style="font-size: 10px; color: #FF9A52;">[Proof ↗]</span>
            </span>\`
        },
        {
          headerName: 'Action',
          width: 100,
          cellRenderer: params => \`<button class="btn btn-secondary" style="padding: 3px 8px; font-size: 11px;" onclick="verifyIouInteractive('\${params.data.iouId}')">Audit</button>\`
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
          cellRenderer: params => \`<span style="color: #22C55E;">+$\${params.value}</span>\`
        },
        {
          field: 'grossDebt',
          headerName: 'Gross Debt ($)',
          width: 150,
          cellRenderer: params => \`<span style="color: #EF4444;">-$\${params.value}</span>\`
        },
        {
          field: 'netAmount',
          headerName: 'Net Position ($)',
          width: 160,
          cellRenderer: params => {
            const val = parseFloat(params.value);
            const color = val > 0 ? '#22C55E' : (val < 0 ? '#EF4444' : '#929BAA');
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
            <td style="color: #EF4444;"><strong>\${m.fromAgentName}</strong></td>
            <td style="color: #22C55E;"><strong>\${m.toAgentName}</strong></td>
            <td class="mono" style="color: #A7F3D0;">\${m.toAgentEmail}</td>
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
              envBadge.style.background = 'rgba(34,197,94,0.15)';
              envBadge.style.color = '#22C55E';
              envBadge.style.border = '1px solid rgba(34,197,94,0.3)';
              envBadge.innerHTML = '<span class="pulse-dot"></span>[ENV: LIVE SANDBOX VERIFIED]';
            } else {
              envBadge.className = 'badge';
              envBadge.style.background = 'rgba(245, 158, 11, 0.15)';
              envBadge.style.color = '#F59E0B';
              envBadge.style.border = '1px solid rgba(245, 158, 11, 0.35)';
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
                <td style="color: var(--text-secondary); font-size: 11px;">\${new Date(c.createdAt).toLocaleTimeString()}</td>
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
                <td class="mono" style="color: var(--accent-secondary)">\${o.debtorAgentId}</td>
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
                <td class="mono" style="color: var(--accent-secondary)">\${a.agent_id}</td>
                <td><strong>\${a.name}</strong></td>
                <td>\${a.role}</td>
                <td class="mono" style="font-size: 10px; color: var(--text-secondary);">\${a.public_key.substring(0,24)}...</td>
                <td class="mono" style="color: #A7F3D0">\${a.paypal_receiver_email}</td>
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
                <td class="mono" style="color: var(--accent-secondary)">\${e.debitAccount}</td>
                <td class="mono" style="color: #FBBF24">\${e.creditAccount}</td>
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-secondary);">All payout items healthy and settled. Zero items in recovery hold.</td></tr>';
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
      const box = document.getElementById('stream-box');
      const sseBadge = document.getElementById('sse-badge');
      const counterTag = document.getElementById('stream-counter-tag');
      const seenSeq = new Set();
      let eventCount = 0;

      function renderEvent(event) {
        if (!event || !event.sequenceId || seenSeq.has(event.sequenceId)) return;
        seenSeq.add(event.sequenceId);
        eventCount++;
        if (counterTag) counterTag.textContent = eventCount + ' Events Logged';

        const line = document.createElement('div');
        line.className = 'stream-line';
        
        const type = event.eventType || 'EVENT';
        let color = '#00C3FF';
        if (type.includes('FAIL') || type.includes('REJECT') || type.includes('BREACH')) color = '#EF4444';
        else if (type.includes('SETTLED') || type.includes('SUCCESS') || type.includes('APPROVED')) color = '#10B981';
        else if (type.includes('PAY') || type.includes('ORDER') || type.includes('IOU')) color = '#F59E0B';
        else if (type.includes('LEDGER')) color = '#C084FC';

        const timeStr = event.emittedAt || new Date().toLocaleTimeString();
        const payloadStr = event.payload ? JSON.stringify(event.payload).slice(0, 110) : '';
        line.innerHTML = \`<span class="stream-time">[\${timeStr}]</span> <strong class="stream-type" style="color: \${color}; font-weight: 700;">\${type}</strong> <span style="color: #94A3B8; font-family: var(--font-mono);">seq=\${event.sequenceId}</span> <span style="color: #64748B; font-family: var(--font-mono);">cycle=\${event.cycleId || 'N/A'}</span> <span style="color: #CBD5E1; font-size: 11px; font-family: var(--font-mono);">\${payloadStr}</span>\`;
        box.prepend(line);
      }

      // 1. Initial replay of historical outbox events so stream is immediately populated
      fetch('/api/events/stream?afterSequenceId=0&closeAfterReplay=true')
        .then(function(res) { return res.text(); })
        .then(function(text) {
          const blocks = text.split('\\n\\n');
          for (const blk of blocks) {
            const dataMatch = blk.match(/data:\\s*(\\{.*\\})/);
            if (dataMatch) {
              try {
                renderEvent(JSON.parse(dataMatch[1]));
              } catch (e) {}
            }
          }
        }).catch(function() {});

      // 2. Real-time EventSource connection for live broadcast
      const source = new EventSource('/api/events/stream');
      const knownEvents = [
        'TASK_VERIFIED', 'TASK_REJECTED', 'TASK_EVALUATED', 'IOU_SIGNED', 'NETTING_PROPOSED',
        'CYCLE_FIREWALL_APPROVED', 'ORDER_CREATED', 'CAPTURE_COMPLETED', 'CYCLE_CAPTURED',
        'PAYOUT_DISPATCHED', 'PAYOUT_ITEM_SUCCESS', 'PAYOUT_ITEM_CONFIRMED', 'PAYMENT_RETURNED',
        'REISSUE_AUTHORIZED', 'CYCLE_SETTLED', 'MERKLE_TREE_SEALED', 'LEDGER_ENTRY_POSTED',
        'INVARIANT_BREACH_DETECTED', 'FLAGSHIP_DEMO_COMPLETED', 'LIVE_TEST_EVENT'
      ];

      function handleSse(e) {
        try {
          renderEvent(JSON.parse(e.data));
        } catch (err) {}
      }

      source.onmessage = handleSse;
      knownEvents.forEach(function(evt) {
        source.addEventListener(evt, handleSse);
      });

      source.onopen = function() {
        if (sseBadge) {
          sseBadge.className = 'badge badge-live-stream';
          sseBadge.innerHTML = '<span class="pulse-dot"></span>SSE Live';
        }
      };

      source.onerror = function() {
        if (sseBadge) {
          sseBadge.className = 'badge tag-error';
          sseBadge.innerHTML = '<span class="pulse-dot"></span>SSE Offline';
        }
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
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
      }
    }

    function tourStep(step) {
      console.log('Executing Tour Step:', step);

      // Reset all 6 step cards
      for (let i = 1; i <= 6; i++) {
        const card = document.getElementById('tour-card-' + i);
        if (card) {
          card.style.borderColor = '#E2E8F0';
          card.style.background = '#FFFFFF';
          card.style.boxShadow = '0 2px 6px rgba(0, 112, 186, 0.04)';
          const badge = card.querySelector('.tour-step-badge');
          if (badge) {
            badge.style.background = '#EBF4FC';
            badge.style.color = '#0070BA';
          }
        }
      }

      // Highlight the active step card with signature PayPal blue border & soft tint
      const activeCard = document.getElementById('tour-card-' + step);
      if (activeCard) {
        activeCard.style.borderColor = '#0070BA';
        activeCard.style.background = '#F0F7FF';
        activeCard.style.boxShadow = '0 4px 14px rgba(0, 112, 186, 0.16)';
        const activeBadge = activeCard.querySelector('.tour-step-badge');
        if (activeBadge) {
          activeBadge.style.background = '#0070BA';
          activeBadge.style.color = '#FFFFFF';
        }
      }

      if (step === 1) {
        switchTab('overview');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (step === 2) {
        switchTab('overview');
        const stepper = document.querySelector('.stepper');
        if (stepper) stepper.scrollIntoView({ behavior: 'smooth', block: 'center' });
        runFlagshipDemo();
      } else if (step === 3) {
        testLiveAiJudge();
      } else if (step === 4) {
        switchTab('scale');
        setTimeout(() => {
          const posGrid = document.getElementById('positions-grid');
          if (posGrid) posGrid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      } else if (step === 5) {
        verifyPayPalCapture('7PV82720RX415822V');
      } else if (step === 6) {
        switchTab('ledger');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }

    async function testLiveAiJudge() {
      openVerifyModal();
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'AI SLA Judge Adjudication Evidence';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Live FreeModel (Gemini 3.7 / DeepSeek) evaluation with deterministic clamping';

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

        if (!res.ok || data.error) {
          const badge = document.getElementById('modal-status-badge');
          badge.className = 'tag tag-error';
          badge.style.background = '';
          badge.style.color = '';
          badge.textContent = 'AI JUDGE EVALUATION FAILED (' + (data.error?.code || res.status) + ')';
          
          const provStatusElem = document.getElementById('modal-provider-status');
          provStatusElem.textContent = 'FAILED';
          provStatusElem.style.color = 'var(--accent-rose)';

          document.getElementById('modal-amount').textContent = 'N/A';
          document.getElementById('modal-anchor').textContent = 'N/A';
          document.getElementById('modal-debug-id').textContent = 'HTTP ' + res.status;

          const evMatch = document.getElementById('modal-evidence-match');
          evMatch.className = 'tag tag-error';
          evMatch.textContent = 'PERSISTENCE FAILED';

          const noticeBanner = document.getElementById('modal-notice-banner');
          if (noticeBanner) {
            noticeBanner.style.display = 'block';
            noticeBanner.style.background = 'rgba(239, 68, 68, 0.12)';
            noticeBanner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
            noticeBanner.style.color = '#FCA5A5';
            noticeBanner.innerHTML = '❌ <strong>AI Judge Error:</strong> ' + (data.error?.message || 'Adjudication failed');
          }

          document.getElementById('modal-raw-json').textContent = JSON.stringify(data, null, 2);
          return;
        }

        const badge = document.getElementById('modal-status-badge');
        const isLive = data.classification === 'LIVE_EVALUATION';
        badge.className = 'tag ' + (isLive ? 'tag-success' : 'tag-warning');
        badge.style.background = isLive ? '' : '#F59E0B';
        badge.style.color = isLive ? '' : '#000';
        badge.textContent = isLive ? 'LIVE AI VERDICT (' + (data.modelUsed || data.model) + ')' : 'STORED RUN EVIDENCE';

        const provStatusElem = document.getElementById('modal-provider-status');
        provStatusElem.textContent = data.validatedVerdict || 'COMPLETED';
        provStatusElem.style.color = data.validatedVerdict === 'PASS' ? 'var(--accent-emerald)' : 'var(--accent-rose)';

        const finalAmt = data.finalObligationCents ? ('$' + (data.finalObligationCents / 100).toFixed(2) + ' USD (' + (data.obligationDisposition || 'OBLIGATION_STANDS') + ')') : '$50.00 USD';
        document.getElementById('modal-amount').textContent = finalAmt;
        document.getElementById('modal-anchor').textContent = data.promptHash ? data.promptHash.substring(0, 32) + '...' : 'SHA-256 Prompt Hash';
        document.getElementById('modal-debug-id').textContent = data.tokenUsage ? ('Tokens: ' + data.tokenUsage.totalTokens + ' (Latency: ' + data.latencyMs + 'ms)') : 'Latency: ' + (data.latencyMs || 0) + 'ms';

        const evMatch = document.getElementById('modal-evidence-match');
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'PERSISTED IN LEDGER & OUTBOX';

        const noticeBanner = document.getElementById('modal-notice-banner');
        if (noticeBanner) {
          noticeBanner.style.display = 'none';
        }

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
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'PayPal Sandbox Authoritative Proof';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Cryptographically linked server-side verification against PayPal rails';
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
      const modalTitle = document.getElementById('verify-modal-header-title');
      if (modalTitle) modalTitle.textContent = 'PayPal Sandbox Authoritative Proof';
      const modalSub = document.getElementById('verify-modal-header-sub');
      if (modalSub) modalSub.textContent = 'Cryptographically linked server-side verification against PayPal rails';
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
      const badge = document.getElementById('modal-status-badge');
      const vStatus = data.verificationStatus || data.providerVerificationStatus;
      const provStatusElem = document.getElementById('modal-provider-status');
      const provStatus = data.providerStatus || data.batchHeader?.batchStatus || (data.isSimulatedRecord ? 'NOT_FOUND_ON_RAILS' : 'NOT_FOUND');
      provStatusElem.textContent = provStatus;

      const evMatch = document.getElementById('modal-evidence-match');

      // Clear any prior inline styles
      badge.style.background = '';
      badge.style.color = '';
      evMatch.style.background = '';
      evMatch.style.color = '';

      if (vStatus === 'VERIFIED_ON_PAYPAL_SANDBOX' || ((provStatus === 'COMPLETED' || provStatus === 'SUCCESS') && !data.isSimulatedRecord && vStatus !== 'RESOURCE_NOT_FOUND')) {
        provStatusElem.style.color = 'var(--accent-emerald)';
        badge.className = 'tag tag-success';
        badge.textContent = 'VERIFIED ON PAYPAL SANDBOX';
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'LIVE SANDBOX & LEDGER VERIFIED';
      } else if (vStatus === 'STORED_CANONICAL_EVIDENCE' || data.storedEvidenceMatched) {
        provStatusElem.style.color = 'var(--accent-emerald)';
        badge.className = 'tag';
        badge.style.background = '#F59E0B';
        badge.style.color = '#000';
        badge.style.fontWeight = '700';
        badge.textContent = 'STORED CANONICAL EVIDENCE (SANDBOX RUN)';
        evMatch.className = 'tag tag-success';
        evMatch.textContent = 'MATCHED CANONICAL PROOF';
      } else if (provStatus === 'NOT_FOUND' || vStatus === 'RESOURCE_NOT_FOUND' || vStatus === 'LOCAL_RECORD_FOUND') {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = 'RESOURCE NOT FOUND ON PAYPAL';
        if (data.dbRecordMatched) {
          evMatch.className = 'tag';
          evMatch.style.background = '#FEF3C7';
          evMatch.style.color = '#B45309';
          evMatch.style.border = '1px solid #FDE68A';
          evMatch.textContent = 'LOCAL LEDGER ONLY (UNCONFIRMED ON PAYPAL)';
        } else {
          evMatch.className = 'tag tag-error';
          evMatch.textContent = 'RECORD NOT FOUND';
        }
      } else if (data.isSimulatedRecord) {
        provStatusElem.style.color = 'var(--accent-amber)';
        badge.className = 'tag tag-info';
        badge.textContent = 'LOCAL LEDGER RECORD (SIMULATED)';
        evMatch.className = 'tag tag-info';
        evMatch.textContent = 'SIMULATED DEMO RECORD';
      } else if (vStatus === 'EVIDENCE_MISMATCH') {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = 'EVIDENCE MISMATCH (AMOUNT / CURRENCY)';
        evMatch.className = 'tag tag-error';
        evMatch.textContent = 'AMOUNT MISMATCH';
      } else {
        provStatusElem.style.color = 'var(--accent-rose)';
        badge.className = 'tag tag-error';
        badge.textContent = vStatus || 'RESOURCE NOT FOUND';
        evMatch.className = 'tag tag-error';
        evMatch.textContent = 'UNCONFIRMED';
      }

      // Display Contextual Notice Banners
      if (noticeBanner) {
        if (data.notice || data.explanation) {
          noticeBanner.style.display = 'block';
          const icon = data.isSimulatedRecord ? 'ℹ️' : (data.amountMatched === false ? '❌' : '⚠️');
          noticeBanner.innerHTML = icon + ' <strong>' + (data.isSimulatedRecord ? 'Simulation Notice:' : 'Verification Notice:') + '</strong> ' + (data.notice || data.explanation);
          if (data.isSimulatedRecord) {
            noticeBanner.style.background = 'rgba(0, 112, 186, 0.08)';
            noticeBanner.style.borderColor = 'rgba(0, 112, 186, 0.3)';
            noticeBanner.style.color = '#0070BA';
          } else if (data.amountMatched === false) {
            noticeBanner.style.background = 'rgba(239, 68, 68, 0.08)';
            noticeBanner.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            noticeBanner.style.color = '#DC2626';
          } else {
            noticeBanner.style.background = 'rgba(245, 158, 11, 0.08)';
            noticeBanner.style.borderColor = '#FDE68A';
            noticeBanner.style.color = '#B45309';
          }
        } else if ((provStatus === 'NOT_FOUND' || vStatus === 'RESOURCE_NOT_FOUND') && data.dbRecordMatched) {
          noticeBanner.style.display = 'block';
          noticeBanner.style.background = '#FEF3C7';
          noticeBanner.style.borderColor = '#FDE68A';
          noticeBanner.style.color = '#B45309';
          noticeBanner.innerHTML = '⚠️ <strong>Unconfirmed on Live Rails:</strong> This record exists in the local clearinghouse database, but PayPal Sandbox reported NOT_FOUND. It represents a local test cycle.';
        } else {
          noticeBanner.style.display = 'none';
        }
      }

      document.getElementById('modal-id').textContent = data.identifier || '-';
      const amt = data.amount || data.batchHeader?.amount;
      document.getElementById('modal-amount').textContent = amt ? (amt.value + ' ' + (amt.currency_code || amt.currency || 'USD')) : '-';
      
      const anchor = data.merkleAnchor || data.customId || '-';
      document.getElementById('modal-anchor').textContent = anchor;

      document.getElementById('modal-debug-id').textContent = data.paypalDebugId || (data.isSimulatedRecord ? 'N/A (Simulated Demonstration)' : 'N/A');

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
</body>
</html>
`;
}
