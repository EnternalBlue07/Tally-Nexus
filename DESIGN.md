# DESIGN.md — TALLY NEXUS UX & DESIGN STRATEGY

**Document Version:** 1.0.0 (Phase 3 Baseline)  
**System Name:** TALLY NEXUS  
**Classification:** Design System & User Experience Specification  
**Visual Style:** Institutional Financial Terminal / Obsidian Precision  

---

## 1. Design Philosophy & Experience Principles

TALLY NEXUS is designed as an institutional-grade financial clearinghouse for autonomous systems. Its interface communicates mathematical authority, cryptographic rigor, and deterministic control.

### Core Experience Principles
1. **Mathematical Clarity Over Decorative Flair**  
   Every pixel serves operational comprehension. We reject generic "AI glitter," pulsing decorative gradients, and floating robot illustrations. Numbers, states, and proofs are displayed with unambiguous clarity.
2. **Financial Information Density**  
   Operators and judges must grasp network health, obligation exposure, and settlement status without endless scrolling. We employ compact, high-contrast tabular presentations and structured data drawers.
3. **Transparent Execution (Zero-Jank / Zero-Fake)**  
   The UI never fakes activity. Progress bars represent real backend operations received over Server-Sent Events (SSE). If an operation takes 4.2 seconds, the UI reports 4.2 seconds of real execution with live stage logs.
4. **Separation of Sovereign Stages**  
   The interface visually segregates:
   - *Probabilistic Agent Actions* (Reasoning, Task Drafts)
   - *Deterministic Adjudication* (SLA Verdicts, IOU Signatures)
   - *Mathematical Clearing* (Netting Graphs, Conservation Checks)
   - *Real Money Rails* (PayPal Orders, Webhook Confirmations, Payouts)

---

## 2. Visual Identity & Design Tokens

### 2.1 Color Palette

```
Surface (Obsidian Scale)
├── Void Background:      #08080C (Pure deep obsidian)
├── Card / Panel:         #0F0F17 (Elevated dark slate)
├── Border Subdued:       #1E1E2E (Subtle structural separation)
└── Border Prominent:     #2D2D42 (Active / focused borders)

Brand Accents (Institutional & Restrained)
├── Electric Lime:        #C8FF00 (Active netting, zero-sum success, primary action)
├── Cyber Turquoise:      #00E5CC (Cryptographic verification, verified signatures)
└── Pale Ice:             #E2E8F0 (High-contrast neutral text)

Semantic Financial States
├── Net Creditor / PASS:  #10B981 (Positive balance, deliverable verified)
├── Net Debtor / Due:     #F59E0B (Pending payment, owed balance)
├── Error / FAIL:         #FF3B5C (Schema violation, invalid signature, firewall deny)
├── Quarantined / Review: #8B5CF6 (SLA review required, disputed obligation)
└── Muted Foreground:     #64748B (Secondary labels, hashes, timestamps)
```

### 2.2 Typography Hierarchy

```
Primary UI Font:         Inter (sans-serif) — clean, neutral, highly legible at small sizes
Financial & Code Font:   JetBrains Mono (monospace) — tabular numbers, hashes, currency amounts
```

| Element | Font Family | Size | Weight | Line Height | Tracking |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Page Title** | Inter | 24px (1.5rem) | 600 SemiBold | 32px | -0.02em |
| **Section Header** | Inter | 16px (1.0rem) | 600 SemiBold | 24px | -0.01em |
| **Body Regular** | Inter | 13px (0.8125rem) | 400 Regular | 20px | 0 |
| **Small / Metadata** | Inter | 11px (0.6875rem) | 500 Medium | 16px | +0.01em |
| **Financial Monospace** | JetBrains Mono | 14px (0.875rem) | 500 Medium | 20px | 0 (Tabular) |
| **Cryptographic Hash** | JetBrains Mono | 11px (0.6875rem) | 400 Regular | 16px | 0 |

### 2.3 Financial Number Formatting Rules
- **Currency Format:** Always explicit currency prefix and 2 decimal places: `$45.00`, `$130.00`.
- **Signage:** Explicit signs for net positions: `+$20.00` (green), `-$45.00` (amber/orange), `$0.00` (neutral).
- **Tabular Figures:** Monospace alignment (`font-variant-numeric: tabular-nums`) applied to all financial columns so decimals line up vertically.
- **Hashes & Keys:** Truncated by default with full copy-on-click: `ed25519:7a4f...9c2e` `[Copy]`.

---

## 3. Product Surfaces & Screen Architectures

### 3.1 Surface 1: Nexus Command (Operator Control Plane)

**Purpose:** Continuous operational management of agent consortia, aggregate obligation volumes, liquidity reduction metrics, and the real-time event ledger.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ NEXUS COMMAND  [● SYSTEM OPERATIONAL] [ENV: SANDBOX]               [Run Clearing Batch]│
├─────────────────┬──────────────────┬──────────────────┬─────────────────┬──────────────┤
│ GROSS EXPOSURE  │ NET EXPOSURE     │ LIQUIDITY SAVINGS│ ACTIVE AGENTS   │ UNVERIFIED   │
│ $130.00         │ $45.00           │ 65.38% REDUCTION │ 5 ONLINE        │ 0 QUARANTINED│
├─────────────────┴──────────────────┴──────────────────┴─────────────────┴──────────────┤
│ AG STUDIO OBLIGATION MATRIX                                                            │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ IOU ID    │ DEBTOR      │ CREDITOR    │ GROSS AMT │ SLA VERDICT │ STATUS   │ PROOF     │ │
│ ├───────────┼─────────────┼─────────────┼───────────┼─────────────┼──────────┼───────────┤ │
│ │ IOU-001   │ Research    │ Data        │ $40.00    │ [PASS 94]   │ ELIGIBLE │ [VERIFY]  │ │
│ │ IOU-002   │ Research    │ Compute     │ $30.00    │ [PASS 91]   │ ELIGIBLE │ [VERIFY]  │ │
│ │ IOU-003   │ Data        │ QA          │ $20.00    │ [PASS 88]   │ ELIGIBLE │ [VERIFY]  │ │
│ │ IOU-004   │ Compute     │ Research    │ $15.00    │ [PASS 96]   │ ELIGIBLE │ [VERIFY]  │ │
│ │ IOU-005   │ QA          │ Localization│ $15.00    │ [PASS 89]   │ ELIGIBLE │ [VERIFY]  │ │
│ │ IOU-006   │ Localization│ Research    │ $10.00    │ [PASS 92]   │ ELIGIBLE │ [VERIFY]  │ │
│ └───────────┴─────────────┴─────────────┴───────────┴─────────────┴──────────┴───────────┘ │
├────────────────────────────────────────────────────┬───────────────────────────────────┤
│ LIVE EVENT STREAM (SSE)                            │ NET POSITION COLLAPSE             │
│ [22:40:12] Task 6 deliverable submitted by LocAgent│ Research Agent: -$45.00 (DEBTOR)  │
│ [22:40:14] SLA Judge emitted PASS for TSK-006      │ Data Agent:     +$20.00 (CREDITOR)│
│ [22:40:15] Ed25519 IOU-006 signed by LocAgent      │ Compute Agent:  +$15.00 (CREDITOR)│
│ [22:40:18] Conservation Invariant checked: OK ($0) │ QA Agent:       +$5.00  (CREDITOR)│
│ [22:40:22] Awaiting Operator Authorization         │ Loc Agent:      +$5.00  (CREDITOR)│
└────────────────────────────────────────────────────┴───────────────────────────────────┘
```

---

### 3.2 Surface 2: Nexus Clearing Room (Judge 3-Minute Interactive Console)

**Purpose:** A guided, step-by-step interactive workflow optimized for hackathon evaluation. The judge can step through the five stages of clearing, inject failures, and inspect the real PayPal settlement.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ NEXUS CLEARING ROOM — 5-STAGE AUTONOMOUS SETTLEMENT PIPELINE                           │
├───────────────┬─────────────────┬─────────────────┬────────────────┬───────────────────┤
│ 1. ECONOMY    │ 2. SLA JUDGE    │ 3. NETTING      │ 4. FIREWALL    │ 5. PAYPAL SETTLE  │
│ [● COMPLETED] │ [● COMPLETED]   │ [● ACTIVE]      │ [○ PENDING]    │ [○ PENDING]       │
├───────────────┴─────────────────┴─────────────────┴────────────────┴───────────────────┤
│ STAGE CONTROLS:                                                                        │
│ [Run Research Consortium]  [Inject Malformed Task (Adversarial)]  [Step: Netting]      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ INTERACTIVE WORKSPACE:                                                                 │
│                                                                                        │
│   STAGE 3: MULTILATERAL NETTING ENGINE                                                 │
│                                                                                        │
│   Gross Obligation Graph (6 Edges)        ──►  Multilateral Net Positions              │
│                                                                                        │
│   Research ──$40.00──► Data                    Research Agent: -$45.00  (Payer)        │
│   Research ──$30.00──► Compute                 Data Agent:     +$20.00  (Payee)        │
│   Data     ──$20.00──► QA                      Compute Agent:  +$15.00  (Payee)        │
│   Compute  ──$15.00──► Research                QA Agent:       +$5.00   (Payee)        │
│   QA       ──$15.00──► Localization            Localization:   +$5.00   (Payee)        │
│   Localize ──$10.00──► Research                ────────────────────────────────        │
│                                                Net Cash Flow Required:  $45.00         │
│   Total Gross Volume:  $130.00                 Conservation Check:      $0.00 [VALID]  │
│                                                Liquidity Reduction:     65.38%         │
│                                                                                        │
│   [Inspect Graph Invariant]                       [Proceed to Financial Firewall ──►]  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 Surface 3: SLA Evidence Inspector (Drawer / Modal)

When an operator or judge clicks any deliverable or verdict badge, a slide-out drawer appears displaying the raw evidence chain:

1. **Header:** Task ID, Client Agent, Provider Agent, Agreed SLA Version.
2. **Deterministic Validation Card:**
   - Schema validation: `PASS` / `FAIL`
   - Field completeness: `All required fields present`
   - Artifact SHA-256 Hash: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
3. **Semantic AI Evaluation Card:**
   - Evaluator: `Gemini / OmniRoute (Model: gemini-1.5-flash)`
   - Latency: `1,240ms`
   - Criteria Scores: Completeness (95%), Grounding (92%), Accuracy (90%)
   - AI Reasoning Summary: `"Executive summary explicitly cites source dataset metrics and provides required structured section headings."`
4. **Outcome Action:**
   - If `PASS`: Shows linked signed IOU with Ed25519 signature verification badge.
   - If `FAIL`: Shows exact schema error message and red banner: *"Deliverable Rejected — No IOU Created"*.

---

### 3.4 Surface 4: Financial Firewall Inspector

Displays the 4 deterministic gate checks before funds can move:

| Gate Check | Rule | Status | Detail |
| :--- | :--- | :--- | :--- |
| **1. Cryptographic Authenticity** | All IOUs signed by valid debtor Ed25519 keys | `[PASSED]` | 6/6 signatures verified against public keys |
| **2. Zero-Sum Balance Conservation** | $\sum \text{Net Positions} \equiv 0$ | `[PASSED]` | Sum = $0.00 exactly (0 residual) |
| **3. Agent Credit & Spending Limits** | Max debtor limit: $100.00/cycle | `[PASSED]` | Research Agent exposure: $45.00 $\le$ $100.00 |
| **4. Anti-Replay Idempotency** | Cycle batch hash unique in ledger history | `[PASSED]` | Batch Hash `0x8f2a...` not previously executed |

**Decision Banner:** `FIREWALL STATUS: APPROVED FOR OPERATOR AUTHORIZATION`

---

### 3.5 Surface 5: PayPal Sandbox Settlement & Reconciliation Console

When the Firewall emits `APPROVED`, the settlement console guides the operator:

1. **Step 1: Collection Creation**
   - Shows PayPal Order ID: `ORDER-8FG294819A`
   - Amount: `$45.00 USD` (Net Debtor: Research Agent)
   - Status: `AWAITING_OPERATOR_APPROVAL`
2. **Step 2: Operator Sandbox Action**
   - Primary CTA Button: `[Authorize Collection in PayPal Sandbox ↗]`
   - Clicking opens the standard PayPal Sandbox approval window.
   - Upon return, status updates to: `ORDER_CAPTURED`.
3. **Step 3: Webhook Verification Badge**
   - Webhook Event: `PAYMENT.CAPTURE.COMPLETED`
   - Status: `VERIFIED (Signature Valid, Event Persisted)`
4. **Step 4: Creditor Payout Lifecycle Tracker**
   - Displays real-time status of the 4 payout recipients:
     - Data Agent (`agent-data@nexus.local`): `$20.00` $\rightarrow$ `[SUCCESS]`
     - Compute Agent (`agent-compute@nexus.local`): `$15.00` $\rightarrow$ `[SUCCESS]`
     - QA Agent (`agent-qa@nexus.local`): `$5.00` $\rightarrow$ `[SUCCESS]`
     - Localization Agent (`agent-loc@nexus.local`): `$5.00` $\rightarrow$ `[SUCCESS]`
5. **Step 5: Final Reconciliation**
   - Total Collected: `$45.00` | Total Disbursed: `$45.00` | Residual Balance: `$0.00`
   - Cycle Status: `SETTLED (Reconciliation Confirmed)`

---

## 4. AG Studio Integration Architecture

To compete effectively for the **AG Grid / AG Studio Sponsor Category**, we define a deep, functional integration rather than an embedded plain table.

### 4.1 Integration Boundaries
- **Source of Truth:** Pure backend REST/SSE APIs. AG Studio is strictly a presentation and analytics layer.
- **Components Implemented:**
  1. **`NexusObligationGrid`:** AG Grid component utilizing custom cell renderers:
     - `VerdictCellRenderer`: Interactive status pill linking directly to the SLA Evidence Inspector.
     - `SignatureCellRenderer`: Displays verified/tampered cryptographic badge with public key tooltip.
     - `CurrencyCellRenderer`: Right-aligned monospace tabular figures with net color accents.
  2. **Custom Financial Theme:** AG Studio theme overrides applying our dark obsidian background (`#08080C`), crisp grid borders (`#1E1E2E`), and electric lime selection highlights.
  3. **Configurable Dashboard Layouts:** Utilizing AG Studio's layout engine to allow operators to toggle between "High-Density Ledger View", "SLA Performance View", and "Settlement Reconciliation View".

---

## 5. Interaction States & Edge Cases

| State | Visual Treatment | Operator Action Available |
| :--- | :--- | :--- |
| **Idle / Uninitialized** | Neutral obsidian cards, dimmed metrics (`--`), clear prompt to launch consortium. | `[Launch Research Consortium]` button enabled. |
| **In Progress (Tasks Running)** | Subtle progress pulse on active agent node; live event log appending rows with timestamp. | Stage controls disabled until batch completes. |
| **SLA Failure (Task 7)** | Highlighted red row in audit log; clear `FAIL` badge; explainer banner. | Click row to open SLA Evidence Inspector. |
| **Firewall Denied** | Prominent warning banner; specific violated gate highlighted in red. | Button: `[Quarantine Cycle & Return to Review]`. |
| **Awaiting PayPal Approval** | Amber pulsing border around Collection card; clear external link icon. | Primary CTA: `[Authorize Collection in PayPal Sandbox]`. |
| **Network / SSE Disconnect** | Persistent yellow header banner: `"Event stream interrupted — attempting reconnect (3/5)..."` | Manual `[Reconnect]` button. |
| **Settlement Reconciled** | Crisp electric lime accent border; all badges green; immutable receipt viewable. | `[Download Cryptographic Receipt (JSON)]`. |

---

## 6. Accessibility & Keyboard Navigation

- **Contrast Ratios:** Primary body and headings utilize Pale Ice (`#E2E8F0`) on Void Obsidian (`#08080C`), yielding an exceptional **14.2:1** contrast ratio (surpassing WCAG AAA 7:1 requirements). Electric Lime (`#C8FF00`) and Cyber Turquoise (`#00E5CC`) accents are utilized strictly for badges, borders, icons, and emphasized numbers against dark surfaces (Electric Lime on `#0F0F17` yields **13.8:1**; Cyber Turquoise yields **11.4:1**). Where colored text is displayed, background brightness is verified to guarantee minimum 4.5:1 for UI elements and 7:1 for critical text.
- **Color Independence:** No financial state is conveyed by color alone. Every status uses both a distinct icon/badge text (`PASS`, `FAIL`, `DEBTOR`, `CREDITOR`) and semantic color.
- **Keyboard Shortcuts:**
  - `Space` / `Enter`: Triggers action **only** when the specific interactive element or button is explicitly focused (no global capture, preserving standard scroll and input field typing).
  - `Esc`: Close SLA Evidence Inspector or modal.
  - `Tab` / `Shift+Tab`: Predictable sequential focus through clearing pipeline stages.
  - `?`: Toggle keyboard shortcuts cheatsheet modal.

---

## 7. 180-Second Judge Walkthrough Plan

```
[0:00 - 0:30]
SCREEN: Nexus Clearing Room (Stage 1: Economy)
Action: Operator launches Research Consortium. 5 agents create 6 tasks ($130 gross).
Judge Takeaway: "Real agents with real business dependencies are creating mutual debts."

[0:30 - 1:00]
SCREEN: Nexus Clearing Room (Stage 2: SLA Judge)
Action: Operator triggers Task 7 (Adversarial Data Task). SLA Judge rejects it.
Drawer opens: Judge inspects raw deliverable, schema error, and deterministic FAIL verdict.
Judge Takeaway: "AI doesn't blindly approve work. Bad deliverables are strictly rejected without creating debt."

[1:00 - 1:35]
SCREEN: Nexus Clearing Room (Stage 3 & 4: Netting & Firewall)
Action: Operator runs clearing. Graph collapses $130 gross to $45 net. Firewall runs 4 checks.
Judge Takeaway: "Mathematics cancels 65% of cash flow; deterministic rules gate settlement."

[1:35 - 2:25]
SCREEN: Nexus Clearing Room (Stage 5: PayPal Settlement)
Action: Operator approves $45 order in PayPal Sandbox. Webhook confirms capture. Payouts fire to 4 creditors.
Judge Takeaway: "Real PayPal sandbox money movement—not simulated balances."

[2:25 - 3:00]
SCREEN: Nexus Command + AG Studio Analytics
Action: Operator shows reconciled ledger, individual payout confirmations, and zero residual.
Judge Takeaway: "Complete institutional audit trail. Production-quality architecture."
```

