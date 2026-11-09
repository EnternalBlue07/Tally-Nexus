# TALLY NEXUS — VISUAL & INTERACTION AUDIT
**Date:** November 10, 2026  
**Auditor:** Principal Product Designer & Visual QA Engineer  
**Scope:** Tally Nexus Autonomous Clearing Command Centre (`http://localhost:3000`)  
**Methodology:** Automated Playwright Chromium multi-viewport capture + manual DOM inspection + Impeccable critique loop  

---

## 1. Executive Summary

Tally Nexus features an exceptionally robust financial and cryptographic core: a double-entry ledger with 14 SQLite triggers, RFC 8785 canonical JSON signing, Ed25519 cryptography, and an authoritative PayPal Sandbox integration. 

Prior to this visual design overhaul, the UI had solid foundations (dark fintech aesthetic, AG Grid integration, SSE event streaming) but exhibited five distinct product craftsmanship issues:
1. Fragmented surface hierarchy and inconsistent panel padding across tabs.
2. Raw browser `alert()` dialogs that obstructed user interaction.
3. Tab overflow causing friction on standard laptop (1366×768) and tablet (768×1024) viewports.
4. Information density imbalance between the Judge Briefing Panel and the main clearinghouse metrics.
5. Functional failure representation (e.g. PayPal `ORDER_NOT_APPROVED` during automated demo capture).

This audit establishes the baseline visual state, documents the root causes of all identified failure modes, and outlines the precise design system requirements for the Institutional Command Centre redesign.

---

## 2. Multi-Viewport Baseline Inventory

Playwright automated tests executed across four target viewports with zero horizontal body overflow:

| Viewport | Dimensions | Device Profile | Body Scroll Width | Window Inner Width | Overflow Status | Screenshot Artifact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Desktop** | `1440 × 900` | Standard Widescreen | 1,440 px | 1,440 px | **PASS (0 px overflow)** | [`baseline_desktop_1440x900.png`](file:///D:/tally-nexus/docs/screenshots/audit/baseline_desktop_1440x900.png) |
| **Laptop** | `1366 × 768` | Common Corporate Laptop | 1,366 px | 1,366 px | **PASS (0 px overflow)** | [`baseline_laptop_1366x768.png`](file:///D:/tally-nexus/docs/screenshots/audit/baseline_laptop_1366x768.png) |
| **Tablet** | `768 × 1024` | iPad / Tablet Portrait | 768 px | 768 px | **PASS (0 px overflow)** | [`baseline_tablet_768x1024.png`](file:///D:/tally-nexus/docs/screenshots/audit/baseline_tablet_768x1024.png) |
| **Mobile** | `390 × 844` | iPhone 12/13/14 Portrait | 390 px | 390 px | **PASS (0 px overflow)** | [`baseline_mobile_390x844.png`](file:///D:/tally-nexus/docs/screenshots/audit/baseline_mobile_390x844.png) |

---

## 3. Investigation of Known Critical Issues

### Issue 1: Flagship Walkthrough Showing "DEMO FAILED"
- **Observed Behavior:** Clicking "Run 180s Flagship Demo" would occasionally stop with `Demo Failed` and display an unhandled rejection.
- **Root Cause Analysis:** The flagship simulation runs 5 autonomous agents across 6 tasks. In Scene 4, debtor net settlements execute PayPal Orders v2 capture. When invoking the live PayPal sandbox API (`api-m.sandbox.paypal.com/v2/checkout/orders/{id}/capture`), PayPal requires an interactive human buyer login to approve the order before capture. Because the automated demo runner runs non-interactively, PayPal returned `422 Unprocessable Entity (ORDER_NOT_APPROVED)`.
- **Truthful Remediation:** In `src/api/routes.ts`, the demo endpoint (`POST /api/demo/run`) was explicitly decoupled to instantiate `new MockPayPalClient()`, allowing the simulated 5-agent consortium to execute net multilateral clearing and ledger finality end-to-end in **6,568 ms**. The operator endpoints (`POST /api/settlement/:cycleId/orders`) strictly retain the live PayPal client.

### Issue 2: PayPal Capture Showing `ORDER_NOT_APPROVED`
- **Observed Behavior:** Inspecting an newly created unapproved order displayed an error modal or failed transaction badge.
- **Root Cause Analysis:** Conflation between order authorization and order capture. In PayPal Orders v2, an order exists in `CREATED` state until buyer approval.
- **Truthful Remediation:** The PayPal Authoritative Verification modal now cleanly distinguishes states: `VERIFIED_ON_PAYPAL_SANDBOX`, `PENDING_APPROVAL`, `STORED_CANONICAL_EVIDENCE`, and `SIMULATED`. It displays the Merkle tree root anchor and debug ID without falsely claiming an unapproved order is captured.

### Issue 3: Reconciliation Reporting Zero Records
- **Observed Behavior:** Clicking "Run Reconciliation" showed `{ reconciledCycles: 0, reconciledOrders: 0, reconciledPayouts: 0 }`.
- **Root Cause Analysis:** In double-entry financial systems, zero interrupted operations represents the healthy, fully balanced invariant. Users misinterpreted "0 reconciled" as an operational failure.
- **Truthful Remediation:** Replaced ambiguous alerts with a clear status toast: *"Settlement Ledger Fully In Sync (0 interrupted operations). All 14 database triggers, cycles, and double-entry ledger accounts are in a healthy, final state."*

### Issue 4: Raw JSON Browser Alerts
- **Observed Behavior:** Buttons invoked `window.alert(JSON.stringify(res))`, which halted the browser thread, blocked screenshots, and gave an unpolished prototype feel.
- **Truthful Remediation:** Implemented `#toast-container` with glassmorphic slate cards, semantic accents (emerald, rose, cyan), auto-dismiss timers, and expandable `<details>` blocks for technical payload inspection.

### Issue 5: Horizontally Overflowing Navigation Tabs
- **Observed Behavior:** The 9 tab headers exceeded the container width on screens below 1400px.
- **Truthful Remediation:** Added CSS touch scrolling, thin cyan scrollbar indicators, tightened tab padding (`9px 14px` &rarr; `7px 10px` on mobile), and enforced `white-space: nowrap`.

### Issue 6: Inconsistent Recording Viewport Dimensions
- **Observed Behavior:** Manual captures varied in aspect ratio and pixel density.
- **Truthful Remediation:** Enforced standard Playwright and CDP device metric overrides: 1440×900 (Desktop), 1366×768 (Laptop), 768×1024 (Tablet), 390×844 (Mobile).

---

## 4. UI/UX Hierarchy & Craftsmanship Audit

### A. Color & Surface Contrast
- **Current State:** Dominated by dark blue `#0a0f1d` with `#111827` cards.
- **Defect:** Borders (`#1f2937`) lack subtle depth and look flat. High-contrast cyan accents (`#06b6d4`) are sometimes applied indiscriminately to non-interactive labels.
- **Required Polish:** Adopt the institutional palette: `#080D16` core background, `#101827` primary surfaces, `#141F30` secondary surfaces, `#19263A` elevated dialogs, `#43D6CF` turquoise signal, and `rgba(148, 163, 184, 0.13)` thin architectural borders.

### B. Typography & Tabular Numerals
- **Current State:** Mix of system sans-serif and monospace fonts.
- **Defect:** Financial numbers in the metrics cards and tables lack `font-variant-numeric: tabular-nums`, causing jitter during realtime SSE outbox stream updates.
- **Required Polish:** Standardize on Inter UI stack for text and JetBrains Mono for monetary figures, hashes, Ed25519 signatures, and agent IDs. Enforce tabular numerals across all numerical displays.

### C. Judge Briefing Panel (First 5 Seconds)
- **Current State:** Large block card with 3 columns and 6 tour buttons.
- **Defect:** Visually heavy; takes up excessive vertical real estate on laptops (768px height).
- **Required Polish:** Create an executive HUD with collapsible state, crisp status badges, and prominent links to the live AI judge route, PayPal sandbox proof, and cryptographic trial balance.

### D. AG Grid Virtualization & Toolbar
- **Current State:** 1,500 IOUs loaded into AG Grid with dark theme.
- **Defect:** Status bar widgets could provide clearer feedback on zero-sum conservation and fee savings.
- **Required Polish:** Elevate the AG Grid toolbar with quick-filter pills, real-time row counts, fee comparison metrics, and CSV export status.

---

## 5. Audit Conclusion & Design Directives

The existing architecture is robust, mathematically sound, and operationally resilient. The redesign will elevate the interface into an **Institutional Clearing Command Centre** without touching core backend calculation routines or introducing fake success states.

