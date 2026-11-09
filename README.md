# TALLY NEXUS ⚡
### Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine with PayPal Settlement

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Runtime: Node.js 24](https://img.shields.io/badge/Node.js-24%20LTS%20(node%3Asqlite)-green.svg)](https://nodejs.org)
[![TypeScript: Strict](https://img.shields.io/badge/TypeScript-Strict%20NodeNext-blue.svg)](https://www.typescriptlang.org)
[![Database: SQLite WAL](https://img.shields.io/badge/Database-SQLite%203%20(WAL%20%2B%2014%20Triggers)-blue.svg)](DATABASE_SCHEMA.md)
[![Tests: 164/164 Passed](https://img.shields.io/badge/Tests-164%2F164%20Pass%20(100%25)-brightgreen.svg)](tests/)
[![Coverage: 92.4% Func](https://img.shields.io/badge/Coverage-92.40%25%20Func%20%7C%20%3E85%25%20Core-brightgreen.svg)](coverage/)
[![AG Grid Community Partner](https://img.shields.io/badge/Sponsor-AG%20Grid%20Community-indigo.svg)](#6-hero-scale-clearinghouse--ag-grid-sponsor-challenge)
[![Hero Scale: 1500+ IOUs](https://img.shields.io/badge/Hero%20Scale-1%2C500%2B%20IOUs%20(99.4%25%20Fewer%20Moves)-cyan.svg)](#6-hero-scale-clearinghouse--ag-grid-sponsor-challenge)

---

## 1. Executive Overview

**Tally Nexus** is a trust-minimized, mathematically deterministic clearinghouse and multilateral netting engine built for the autonomous AI agent economy.

As autonomous agents exchange micro-services (e.g. data scraping, GPU model inference, verification, localization), settling money bilaterally for every individual transaction creates catastrophic transaction fee drag, rail latency, and counterparty default risk.

Tally Nexus resolves this by introducing **deterministic multilateral clearing & settlement**:
1. **Verifiable Task Exchange:** AI agents commission and execute tasks under strict Service Level Agreements (SLAs).
2. **Hybrid SLA Adjudication:** Programmatic and AI judges evaluate deliverables against structural contracts; failed deliverables produce **0 IOUs**.
3. **Cryptographic Micro-IOUs:** Debtor agents sign RFC 8785 canonical JSON debt agreements using **Ed25519 digital signatures** with domain separation.
4. **Multilateral Netting Engine:** An $O(V + E)$ vertex balance reduction algorithm collapses circular debts into minimal net positions (**65.38% cash flow compression** in the flagship 5-agent consortium; **99.4% rail transaction reduction** at 1,500 IOU hero scale).
5. **Fiduciary Financial Firewall:** Audits zero-sum clearing ($\sum \text{Net} \equiv 0$), verifies custodial fund ring-fencing, and guards the operator reserve floor ($\ge \$10.00$) before any funds move.
6. **Two-Tier PayPal Settlement Rails:** Net debtors fund via PayPal Orders v2 (human-in-the-loop capture); net creditors receive automated payouts via PayPal Payouts v1 (single batch).
7. **Self-Healing Recovery & Single-Reissue Entitlement:** Manages returned payouts through an immutable 5-stage reinstatement sequence and guards against late parent collisions via database triggers.
8. **Double-Entry Ledger & Live SSE Stream:** Strict balance-sheet accounting ($Assets \equiv Liabilities + Equity$) with monotonic Server-Sent Events (SSE) outbox and SHA-256 Merkle settlement receipts.

### The Immutable Architectural Principle:
$$\mathbf{AI\ Analyzes} \implies \mathbf{Cryptography\ Verifies} \implies \mathbf{Mathematics\ Clears} \implies \mathbf{Deterministic\ Code\ Controls} \implies \mathbf{PayPal\ Settles} \implies \mathbf{Ledger\ Proves}$$

> [!IMPORTANT]
> **Strict AI Boundary:** AI agents evaluate task quality under contract SLAs. AI models **NEVER** mint IOUs, authorize payouts, touch settlement balances, override the Financial Firewall, or modify the financial database.

---

## 2. Judge Quick-Start (3 Exact Verification Commands)

Judges can verify the entire project from scratch in under 60 seconds with three exact commands:

```bash
# 1. Run the entire automated test suite (164 tests across 13 suites, 100% PASS)
npm test

# 2. Run the deterministic 180-second Flagship Scenario (6 scenes, <100ms execution)
npm run demo:flagship

# 3. Launch the production clearinghouse and operator dashboard
npm start
# Open http://localhost:3000 to interact with the AG Grid High-Density Ledger & Trust Center
```

---

## 3. The Flagship 5-Agent Clearing Scenario

In our flagship scenario, **5 autonomous AI agents** collaborate on an industry research consortium:

```mermaid
flowchart TD
    Research["Research Agent<br/>(Lead Strategist & Net Debtor)"]
    Data["Data Agent<br/>(Scraping & Cleaning)"]
    Compute["Compute Agent<br/>(GPU Inference)"]
    QA["QA Agent<br/>(Verification)"]
    Loc["Loc Agent<br/>(Localization)"]

    Research -->|"Task 1: Market Dataset ($40.00)"| Data
    Research -->|"Task 2: Financial Inference ($30.00)"| Compute
    Data -->|"Task 3: Schema Validation ($20.00)"| QA
    Compute -->|"Task 4: Research Methodology ($15.00)"| Research
    QA -->|"Task 5: Multilingual Metrics ($15.00)"| Loc
    Loc -->|"Task 6: Text Verification ($10.00)"| Research
    Research -.->|"Task 7: Malformed Task ($20.00) — REJECTED"| Data
```

### The Clearing Mathematics ($130.00 Gross $\to$ $45.00 Net):
- **Total Gross Tasks:** 6 Valid Tasks + 1 Malformed Task = **$150.00 Gross Flow**.
- **SLA Judge Result:** Task 7 fails contract evaluation $\implies$ **0 IOUs minted**.
- **Total Valid Gross Obligations:** **$130.00 Gross Debt**.
- **Multilateral Netting Results:**
  - **Research Agent:** Net Balance = **-$45.00** (Sole Net Debtor).
  - **Data Agent:** Net Balance = **+$20.00** (Net Creditor).
  - **Compute Agent:** Net Balance = **+$15.00** (Net Creditor).
  - **QA Agent:** Net Balance = **+$5.00** (Net Creditor).
  - **Localization Agent:** Net Balance = **+$5.00** (Net Creditor).
  - **Zero-Sum Balance:** $-45.00 + 20.00 + 15.00 + 5.00 + 5.00 \equiv \mathbf{\$0.00}$ ✓
- **Economic Impact:**
  - **65.38% reduction in cash flow volume** ($130.00 gross $\to$ $45.00 net).
  - **75% reduction in payment rail transactions** (6 bilateral transfers $\to$ 1 capture).

---

## 4. Architecture & System Flow

```mermaid
sequenceDiagram
    autonumber
    actor Debtor as Debtor Agent (Research)
    participant Judge as SLA Judge
    participant Engine as Netting Engine
    participant Firewall as Financial Firewall
    participant PayPal as PayPal Rails (Sandbox)
    participant Ledger as Double-Entry Subledger
    actor Creditors as Creditor Agents (Data, Compute, QA, Loc)

    Debtor->>Judge: Submit Task Deliverables
    Judge->>Judge: Verify Schema & Bounded SLA Checks
    Judge-->>Debtor: Verdict: PASS (Task 1-6) | FAIL (Task 7)
    Debtor->>Engine: Sign Ed25519 Micro-IOUs (RFC 8785)
    Engine->>Engine: Multilateral Graph Compression ($130 -> $45)
    Engine->>Firewall: Submit Netting Proposal
    Firewall->>Firewall: Audit Zero-Sum Invariant & Reserve Floor
    Firewall->>PayPal: Create Debtor Order v2 ($45.00)
    Debtor->>PayPal: Capture Approved Order
    PayPal->>Ledger: Debit CASH ($45) / Credit CLEARING ($45)
    PayPal->>PayPal: Dispatch Payouts v1 Batch to 4 Creditors
    PayPal->>Creditors: Disburse Funds (Data $20, Compute $15, QA $5, Loc $5)
    PayPal->>Ledger: Extinguish Creditor Liabilities
    Ledger->>Ledger: Verify Trial Balance (Δ = $0.00)
```

---

## 5. Web Operator Dashboard UI

Tally Nexus includes a responsive, single-page operator dashboard served natively at `http://localhost:3000/`:

```
+---------------------------------------------------------------------------------------------------+
|  TALLY NEXUS // Autonomous Agent Multilateral Clearinghouse         [ENV: SIMULATION / MOCK]      |
+---------------------------------------------------------------------------------------------------+
|  KPI SUMMARY                                                                                      |
|  Gross Obligation: $130.00  |  Net Settled: $45.00  |  Compression: 65.38% (Saved)                |
|  Active Agents: 5           |  Settlement Cycles: 1 |  Subledger Balance: Δ = $0.00 (Balanced)    |
+---------------------------------------------------------------------------------------------------+
|  FLAGSHIP SCENARIO STEPPER                                                                        |
|  [Scene 1: SLA Pass] -> [Scene 2: Netting 65.4%] -> [Scene 3: Firewall]                          |
|  [Scene 4: PayPal Rails] -> [Scene 5: Self-Healing] -> [Scene 6: Final Merkle Seal]                |
+---------------------------------------------------------------------------------------------------+
|  NAVIGATION TABS:                                                                                 |
|  [Executive Overview] [⚡ Hero Scale & AG Grid (1,500+ IOUs)] [🛡️ Trust & Security Center]        |
|  [Settlement Cycles]  [Payment Rails]  [Recovery & Self-Healing]  [Double-Entry Ledger]            |
|  [Agent Directory]    [Live Event Stream]                                                         |
+---------------------------------------------------------------------------------------------------+
|  [Action: 🚀 Run 180s Flagship Demo]  [Action: ⚡ Run 1,500 IOU Simulation]  [Action: Refresh]     |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. Hero Scale Clearinghouse & AG Grid Sponsor Challenge

To prove high-throughput production scalability for multi-agent autonomous economies, Tally Nexus implements the **Hero Scale Swarm Engine** (`src/simulation/scale-clearing-engine.ts`) paired with **AG Grid Community**:

| Metric | Hero Scale Result | Technical Meaning |
| :--- | :--- | :--- |
| **Agent Swarm Size** | **10 Autonomous Agents** | Multi-disciplinary research swarm with unique Ed25519 keypairs |
| **Micro-IOU Volume** | **1,500 Signed IOUs** | Deterministically generated with RFC 8785 Canonical JSON |
| **Gross Task Value** | **~$51,248.50** | Total bilateral services commissioned across swarm |
| **Net Settled Cash** | **~$17,624.10** | Physical capital required to extinguish all 1,500 debts |
| **Liquidity Compression** | **65.61%** | Circulating capital preserved in agent treasuries |
| **Bilateral Rail Transfers** | **1,500 transfers $\to$ 9 movements** | Collapsed into minimal $O(V)$ physical PayPal payments |
| **Transaction Reduction** | **99.4% Reduction** | Eliminates 1,491 redundant payment rail transfers |
| **Rail Fee Savings** | **~$1,438.25 Saved (74.2%)** | Modeled against standard $0.30 fixed + 2.9% rail fee |
| **Mathematical Invariant** | **$\sum \text{Net} \equiv \$0.00$** | Machine-verified zero-sum conservation proof |

### AG Grid Community Capabilities Demonstrated:
- **High-Density Virtualized Rendering:** Flawlessly virtualizes 1,500+ cryptographically signed IOUs at 60 FPS.
- **Client-Side Filtering & Quick Search:** Real-time multi-column search across Agent IDs, Task Descriptions, Amounts, and Signatures.
- **Custom Cell Renderers:** Styled badges for verification status, currency formatting, and interactive signature tooltips displaying 128-char hex strings.
- **CSV Data Export:** 1-click export of the entire audited 1,500 IOU ledger.
- **Custom Fintech Dark Theme:** Styled to seamlessly blend with Tally Nexus's cyberpunk/fintech token palette.

---

## 7. Trust & Security Center (Adversarial Invariants & Attack Resistance)

Tally Nexus enforces strict cryptographic, fiduciary, and behavioral boundaries against adversarial interference:

```
GET /api/ious/:iouId/verify
```
Audits any IOU against the debtor agent's registered Ed25519 public key, RFC 8785 Canonical JSON representation, and SHA-256 digest in real-time.

| Invariant Boundary | Threat Vector | Enforcement Mechanism | Defensive Guarantee | Test Evidence |
| :--- | :--- | :--- | :--- | :---: |
| **1. Cryptographic Authenticity** | Signature Forgery / Key Spoofing | Ed25519 verification over RFC 8785 canonical digest with domain separation | Non-debtor agents cannot mint or alter debt obligations | **401 REJECT** |
| **2. Replay & Nonce Defense** | Duplicate IOU Double-Spend | Unique IOU ID + Task ID unique constraint in relational subledger | An adjudicated task can strictly generate exactly one IOU | **409 CONFLICT** |
| **3. Margin & Solvency Floor** | Debtor Capital Exhaustion | Financial Firewall reserve check before cycle authorization | Clearing cannot proceed if obligations breach minimum floor ($10.00) | **HALT CYCLE** |
| **4. Payload Integrity** | Amount Tampering ($100 $\to$ $1) | Contextual claim matching (claimed amount === evaluated amount) | Discrepancy between evaluated task and signed IOU is rejected | **400 MISMATCH** |
| **5. SLA Prompt Injection Defense** | Adversarial LLM Hijack | Confidence score quarantine thresholds + deterministic test harness | AI cannot mint IOUs; confidence < 0.80 quarantines to operator review | **QUARANTINED** |

---

## 8. Production Cloud Deployment (Render Blueprint & Docker)

Tally Nexus is designed as a **lean, single-container, self-contained financial engine** with zero external database dependencies (native SQLite with WAL mode on persistent disk).

### Deploy to Render via Blueprint:
1. Connect your repository to Render.
2. Select **Blueprints** and point to `render.yaml`.
3. Render automatically provisions:
   - Web service (Node.js 24)
   - Persistent SSD Disk (`/data`, 1GB)
   - Auto-generated `OPERATOR_API_KEY`
   - Health check endpoint `/api/health`

### Local Docker Deployment:
```bash
docker build -t tally-nexus .
docker run -p 3000:3000 -v tally-data:/data tally-nexus
```

---

## 9. Test Suite Breakdown (164 / 164 Passing)

```
Test Files  : 13 passed (13)
Tests       : 164 passed (164)
Duration    : 6.68 seconds
Environment : Node.js 24 LTS (native node:sqlite)
```

| Test File | Description | Tests | Status |
| :--- | :--- | :---: | :---: |
| [`tests/db/production_database.test.ts`](tests/db/production_database.test.ts) | WAL mode, 14 triggers, foreign keys, crash recovery | 28 | **PASS** |
| [`tests/crypto/canonical_json_rfc8785.test.ts`](tests/crypto/canonical_json_rfc8785.test.ts) | Canonical RFC 8785 JSON formatting & numbers | 11 | **PASS** |
| [`tests/core/stage2_core_engine.test.ts`](tests/core/stage2_core_engine.test.ts) | Ed25519 identity, IOUs, SLA Judge, netting engine | 20 | **PASS** |
| [`tests/api/stage3a_api_and_sse.test.ts`](tests/api/stage3a_api_and_sse.test.ts) | REST API endpoints, Zod validation, SSE event stream | 24 | **PASS** |
| [`tests/paypal/sandbox_client.test.ts`](tests/paypal/sandbox_client.test.ts) | PayPal sandbox client authentication & error mapping | 6 | **PASS** |
| [`tests/paypal/stage3b_paypal_rails.test.ts`](tests/paypal/stage3b_paypal_rails.test.ts) | Orders v2 capture & Payouts v1 creditor disbursements | 21 | **PASS** |
| [`tests/paypal/stage3b_remediation_invariants.test.ts`](tests/paypal/stage3b_remediation_invariants.test.ts) | Gate 3B remediation invariants & sandbox allowlist | 14 | **PASS** |
| [`tests/recovery/stage3c_recovery_and_reissue.test.ts`](tests/recovery/stage3c_recovery_and_reissue.test.ts) | 5-stage return reinstatement & single-reissue | 8 | **PASS** |
| [`tests/security/stage3c_adversarial_security.test.ts`](tests/security/stage3c_adversarial_security.test.ts) | 12 adversarial penetration scenarios | 12 | **PASS** |
| [`tests/dashboard/stage3c_dashboard_api.test.ts`](tests/dashboard/stage3c_dashboard_api.test.ts) | Operator dashboard HTML & stats REST APIs | 5 | **PASS** |
| [`tests/e2e/stage4_flagship_e2e_simulation.test.ts`](tests/e2e/stage4_flagship_e2e_simulation.test.ts) | Full 5-agent consortium flagship E2E simulation | 2 | **PASS** |
| [`tests/scale/scale_clearing.test.ts`](tests/scale/scale_clearing.test.ts) | 1,500 IOU hero scale clearing, zero-sum, and fee savings | 7 | **PASS** |
| [`tests/security/stage5_trust_and_attacks.test.ts`](tests/security/stage5_trust_and_attacks.test.ts) | 5-point adversarial attacks & IOU cryptographic verify | 6 | **PASS** |
| **Total** | **Consolidated Verification Suite** | **164** | **100% PASS** |

---

## 10. Authoritative Documentation Index

| Document | Purpose |
| :--- | :--- |
| [`SUBMISSION.md`](SUBMISSION.md) | Devpost hackathon submission narrative, video script, and tech stack |
| [`DECISIONS.md`](DECISIONS.md) | 22 Architecture Decision Records (ADRs) |
| [`DEPLOYMENT_PLAN.md`](DEPLOYMENT_PLAN.md) | Cloud deployment architecture and Render blueprint guide |
| [`API_SPEC.md`](API_SPEC.md) | Complete OpenAPI / REST API endpoints and SSE stream schemas |
| [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md) | Detailed 180-second live demo narration and video storyboard |
| [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) | Complete SQL DDL schema, 14 database triggers, and indexes |
| [`PAYPAL_SANDBOX_VALIDATION.md`](PAYPAL_SANDBOX_VALIDATION.md) | PayPal Sandbox account onboarding and validation runbook |
| [`SECURITY_THREAT_MODEL.md`](SECURITY_THREAT_MODEL.md) | Threat matrix, attack surface analysis, and cryptographic proofs |

---

## 11. License

This project is licensed under the [MIT License](LICENSE).
