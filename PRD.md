# PRD.md — TALLY NEXUS PRODUCT REQUIREMENTS DOCUMENT

**Document Version:** 1.1.0 (Phase 2 Corrected Specification)  
**System Name:** TALLY NEXUS  
**Target Environment:** Node.js 24+, SQLite (Postgres-compatible), PayPal Sandbox, AG Studio  
**Classification:** Core System Specification  

---

## 1. System Architecture Overview & Data Flow

```
   ┌──────────────────────────────────────────────────────────────────┐
   │                ECONOMIC COMMISSIONING LAYER                     │
   │  [Research Agent] <──> [Data Agent] <──> [Compute Agent]       │
   │           ▲                               ▲                      │
   │           └──────── [Localization] ───────┘                      │
   └──────────────────────────────┬───────────────────────────────────┘
                                  │ Task Deliverable + Artifact Hash
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                     HYBRID SLA JUDGE                            │
   │  • Deterministic Schema & Integrity Checks                       │
   │  • Bounded LLM Semantic Fidelity / Completeness Evaluation       │
   │  • Output: Typed Verdict (PASS / FAIL / REVIEW_REQUIRED)         │
   │  • FAIL -> Deliverable Rejected; NO IOU Generated               │
   │  • REVIEW_REQUIRED -> Unverified Deliverable; Quarantined        │
   └──────────────────────────────┬───────────────────────────────────┘
                                  │ Eligible PASS Deliverables Only
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                NEXUS IOU & CLEARING PROTOCOL                     │
   │  • Ed25519 Micro-IOU Generation & Signature Verification         │
   │  • Multilateral Netting Engine (Cycle Detection & Collapse)      │
   │  • Conservation Check: Sum of Net Balances == 0 ($130 -> $45)   │
   └──────────────────────────────┬───────────────────────────────────┘
                                  │ Net Positions Proposal
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                    FINANCIAL FIREWALL                            │
   │  • Spending Limits, Velocity & Anti-Replay Idempotency Checks    │
   │  • Output: ALLOW / DENY / REQUIRES_OPERATOR_OVERRIDE             │
   └──────────────────────────────┬───────────────────────────────────┘
                                  │ Approved Settlement Batch
                                  ▼
   ┌──────────────────────────────────────────────────────────────────┐
   │                PAYPAL SANDBOX SETTLEMENT RAIL                    │
   │  1. Net Debtors: PayPal Order Created ($45.00)                   │
   │  2. Operator Approves Sandbox Redirect                           │
   │  3. Order Captured -> Funds Verified via Webhook                 │
   │  4. Net Creditors: PayPal Payout Batch Dispatched                │
   │  5. Individual Item Reconciliation -> Complete Settlement        │
   │  6. Immutable Audit Proof Anchored                               │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 2. Decoupled Lifecycle State Machines

To prevent ambiguity between deliverable quality, verification status, debt eligibility, and payment execution, Tally Nexus enforces distinct lifecycle states.

```
1. TASK EXECUTION:     CREATED -> ASSIGNED -> IN_PROGRESS -> SUBMITTED -> [COMPLETED | FAILED | ABORTED]
2. SLA EVALUATION:     PENDING_VERIFICATION -> [PASS | FAIL | REVIEW_REQUIRED]
3. OBLIGATION / IOU:   (On PASS only) DRAFTED -> SIGNED -> ELIGIBLE_FOR_CLEARING -> IN_CLEARING -> NETTED -> SETTLED
                       (If challenged post-signing) -> DISPUTED -> UNDER_REVIEW -> [CANCELLED (Upheld) | ELIGIBLE_FOR_CLEARING (Dismissed)]
4. SETTLEMENT CYCLE:   PREPARED -> FIREWALL_APPROVED -> COLLECTION_PENDING -> [COLLECTION_CAPTURED | COLLECTION_FAILED]
                       -> PAYOUT_DISPATCHED -> RECONCILING -> [SETTLED | PARTIAL_FAILURE_HOLD | PAYOUT_AMBIGUOUS_HOLD | OPERATOR_DISPUTE_HOLD | OPERATOR_RESERVE_HOLD]
  - **Default Loss Tolerance (Scenario A-DEF):** Under total counterparty default ($20 unrecovered shortfall written off at Stage 7), ending operator cash remains $77.14, maintaining +$67.14 headroom above the mandatory $10.00 `OPERATOR_RESERVE_FLOOR`.
                       (Post-Settlement Reversal: -> POST_SETTLEMENT_RECONCILING) (or ABORTED)
```

### State Semantics Rules:
- **`FAIL` Deliverable:** Deliverable rejected by SLA Judge. **No IOU is drafted or signed.** The failed deliverable and reasoning are recorded in the audit log. The task is closed as unfulfilled.
- **`REVIEW_REQUIRED` Deliverable:** Verification inconclusive or AI provider timed out. Obligation remains **unverified** and is strictly prohibited from entering any clearing cycle.
- **`DISPUTED` Obligation:** Applies only to an already signed IOU that is formally challenged (e.g., latent defect discovered). It is quarantined from active clearing cycles until resolved.
- **`SETTLED` Cycle:** Achieved **only** when all net creditor payout items are confirmed successful and total disbursements equal total collections.

---

## 3. Functional Requirements (FR)

### 3.1 Agent Identity & Commissioning Protocol
- **FR-AGT-001 (Identity & Keys):** Every agent possesses a unique identifier (`agent_id`), a human-readable role, a capability manifest, and an Ed25519 keypair for cryptographic signing.
- **FR-AGT-002 (Task Commissioning):** An agent requiring external service generates a structured `TaskRequest` containing target capability, input payload, maximum budget (integer cents), deadline timestamp, and SLA specification reference.
- **FR-AGT-003 (Budget Enforcement):** The scenario orchestrator rejects any `TaskRequest` exceeding the initiating agent's allocated session budget or maximum execution depth.
- **FR-AGT-004 (Artifact Submission):** When fulfilling a task, the provider agent submits a `TaskSubmission` containing the deliverable artifact, artifact SHA-256 hash, execution metadata, and its Ed25519 signature.

### 3.2 Hybrid SLA Judge & Dispute System
- **FR-SLA-001 (Deterministic Evaluation):** The system executes non-LLM validation first: schema verification, required fields, minimum word/row count, deadline compliance, and artifact hash match.
- **FR-SLA-002 (Bounded LLM Evaluation):** If deterministic checks pass, the SLA Judge invokes an LLM evaluation prompt with strict JSON schema constraints to assess semantic criteria (e.g., factual grounding, topic completeness, translation fidelity).
- **FR-SLA-003 (Typed Verdict):** The SLA Judge emits a structured verdict:
  ```typescript
  interface SLAVerdict {
    verdictId: string;
    taskId: string;
    outcome: 'PASS' | 'FAIL' | 'REVIEW_REQUIRED';
    score: number; // 0 - 100
    deterministicChecksPassed: boolean;
    semanticEvaluation: {
      criteriaScores: Record<string, number>;
      reasoning: string;
      evidenceRefs: string[];
    };
    evaluatorMetadata: {
      provider: string;
      model: string;
      latencyMs: number;
    };
    timestamp: string;
  }
  ```
- **FR-SLA-004 (Failure Handling):** Any deliverable receiving a `FAIL` verdict prevents IOU generation. The failure reasoning and artifact hash are permanently stored in the audit trail.
- **FR-SLA-005 (Inference Outage Fallback):** If external LLM inference times out or fails, the task transitions to `REVIEW_REQUIRED` (unverified). It must **never** fail-open or become eligible for clearing automatically.

### 3.3 Micro-IOU & Ledger Protocol
- **FR-IOU-001 (Debtor-Signed Micro-IOU):** Upon a `PASS` verdict, the debtor agent emits an immutable IOU payload:
  $$\text{IOU} = \{ \text{iouId}, \text{debtorId}, \text{creditorId}, \text{amountCents}, \text{currency: "USD"}, \text{taskId}, \text{artifactHash}, \text{timestamp} \}$$
  signed with the debtor agent’s Ed25519 private key. Protocol-level creditor acceptance is established through the agreed task commissioning contract.
- **FR-IOU-002 (Signature Verification):** The ledger engine verifies the Ed25519 signature against the debtor's registered public key prior to persisting the obligation.
- **FR-IOU-003 (Append-Only Ledger):** All obligation state transitions are recorded as append-only ledger entries. No financial records may be updated or deleted in place.

### 3.4 Multilateral Netting Engine
- **FR-NET-001 (Graph Construction):** The netting engine constructs a directed obligation graph $G = (V, E)$, where vertices $V$ are agents and directed edges $E = (u, v, w)$ represent debtor $u$ owing creditor $v$ an amount $w$ (integer cents) from eligible IOUs.
- **FR-NET-002 (Cycle Detection & Net Calculation):** The engine calculates each agent's net balance:
  $$\text{Net}(a) = \sum_{e \in \text{InEdges}(a)} w(e) - \sum_{e \in \text{OutEdges}(a)} w(e)$$
- **FR-NET-003 (Zero-Sum Invariant):** The netting engine must abort and alert if the conservation invariant fails:
  $$\sum_{a \in V} \text{Net}(a) \equiv 0$$
- **FR-NET-004 (Residual Carryover):** Any non-zero fractional cents or unresolvable edge residuals must be carried forward into the next settlement cycle pool, maintaining an exact zero residual balance on executed batches.

### 3.5 Financial Firewall
- **FR-FWL-001 (Pre-Settlement Validation):** Before any settlement cycle is submitted to PayPal, the firewall verifies:
  1. All included IOUs have valid Ed25519 signatures and `PASS` SLA verdicts.
  2. The net debtor amounts equal the net creditor amounts exactly.
  3. No agent exceeds its per-cycle credit limit.
  4. The cycle hash has not been submitted previously (anti-replay idempotency).
- **FR-FWL-002 (Decision Outcomes):** The firewall emits an explicit `ALLOW`, `DENY`, or `OPERATOR_REVIEW` decision with machine-readable policy reasons.

### 3.6 PayPal Sandbox Settlement Rail
- **FR-PAY-001 (Debtor Collection via Orders API):** For each net debtor ($Net < 0$), the backend creates a PayPal Order with `intent: "CAPTURE"`.
- **FR-PAY-002 (Operator Authorization Redirect):** The frontend displays the pending settlement batch with an "Authorize Settlement" action. Clicking this opens the official PayPal Sandbox checkout URL for the operator to approve funding.
- **FR-PAY-003 (Strict Capture & Webhook Verification):** The backend captures the approved Order upon return. Captured funds are confirmed only upon receipt and cryptographic validation of the `PAYMENT.CAPTURE.COMPLETED` PayPal webhook.
- **FR-PAY-004 (Creditor Distribution via Payouts API):** Payout batches are dispatched to net creditors ($Net > 0$) **only** after net debtor collections have been captured and verified.
- **FR-PAY-005 (Independent Item Reconciliation, Double-Entry Reversals & Single-Reissue Entitlement):** The settlement engine tracks the lifecycle of every payout item across all 9 official PayPal statuses (`PENDING`, `SUCCESS`, `FAILED`, `UNCLAIMED`, `RETURNED`, `ONHOLD`, `BLOCKED`, `REFUNDED`, `REVERSED`) and child reissues (`DRAFT`, `DISPATCHED`, `AMBIGUOUS_HOLD`, `SUCCESS`, `FAILED`, `RETURNED`). Child reissues obey a strict single-reissue entitlement model: an item can have at most one active or settled child reissue enforced by database partial unique index `uq_active_child_per_parent`. Reissue authorization requires completing the persistent 5-stage return verification sequence (`PARENT_TERMINAL_CONFIRMED` ──► `RETURN_FUNDS_VERIFIED` ──► `INTERNAL_LEDGER_RESTORED` ──► `CREDITOR_PAYABLE_REINSTATED` ──► `REISSUE_AUTHORIZED`) before child dispatch. Reissues are **strictly forbidden** while the parent payout item is in any non-terminal status (`PENDING`, `PROCESSING`, `ONHOLD`, `UNCLAIMED`, `AMBIGUOUS_HOLD`, `BLOCKED`, `SUCCESS`), enforced at the API layer (HTTP 409 `REISSUE_PROHIBITED_PARENT_NOT_TERMINAL`) and database layer (`trg_reissue_entitlement_check`). Reissue is authorized **only** after parent reaches confirmed terminal `RETURNED`, `REFUNDED`, or `FAILED` status, and funds return has been verified on PayPal. `UNCLAIMED` items obey a strict 30-day provider return timer, allowing reissues only post-return; `ONHOLD` items represent compliance holds where reissues are strictly prohibited. The clearing cycle transitions to `SETTLED` **only** when all payout items (or confirmed reissues) reach individual `SUCCESS`, total disbursed principal equals total collected principal, and real-time in-flight variance achieves zero ($\Delta_{\text{InFlight}} \equiv 0$). A batch-level `SUCCESS` status from PayPal never settles liabilities for items that remain pending, unclaimed, or held. Periodic reporting balance reconciliation operates asynchronously subject to documented provider freshness latency (up to 3 hours); stale reporting data (`STALE_REPORTING_DATA`), unreflected transactions (`PENDING_PROVIDER_REFLECTION`), or reflection timeouts (`REFLECTION_TIMEOUT`) do not halt settlement, while verified discrepancies with confirmed transaction reflection transition the cycle to `OPERATOR_DISPUTE_HOLD`. The ledger enforces the fundamental accounting identity $\text{Assets} \equiv \text{Liabilities} + \text{Equity}$ at every transition. If an item is later returned, refunded, or reversed, the cycle transitions to `POST_SETTLEMENT_RECONCILING` and writes a balanced double-entry record to `compensating_ledger` reinstating the creditor payable with unique provider or signed operator correction references.
- **FR-PAY-006 (Reserve Floor Gate, Subrogation & Framework-Specific Recovery Asset Discipline):** The Financial Firewall enforces an active operational reserve floor (`OPERATOR_RESERVE_FLOOR = $10.00`) and concurrency mutex (`GATE-RESERVE-FLOOR`), evaluating physical liquidity via a freshness-aware multi-tier gate:
  $$PP_{\text{Est\_Physical\_Available}} = PP_{\text{Reported\_Available}} - \sum \text{Dispatches Since Refresh} + \sum \text{Confirmed Captures Since Refresh}$$
  A 180-minute window serves strictly as an observability and reporting freshness tolerance, not a live external balance guarantee. Local estimates expose baseline timestamps, applied events, and uncertainty flags; if external movements cannot be verified or if $PP_{\text{Est\_Physical\_Available}} < \text{SETTLEMENT\_CASH} + \text{OPERATOR\_CASH}$, or if projected post-fee operator cash drops below $10.00, dispatch is strictly held (`OPERATOR_RESERVE_HOLD` / `OPERATOR_DISPUTE_HOLD`). Custodial shortfalls cured by the operator grant irrevocable subrogation rights against the overpaid counterparty under Tally Nexus Platform Terms of Service — Operational Recoupment Policy, with legal ownership decoupled from balance-sheet recognition:
  - **Stage 4 Documentary Evidence Gate & Immutability:** Any claim advancing to Stage $\ge 4$ strictly requires non-null documentary evidence (`stage4_evidence_type`, `stage4_evidence_hash`, `authorization_role`, `authorizer_id`, `stage4_evaluated_at`) enforced by database CHECK constraints. Furthermore, once evaluated at Stage $\ge 4$, documentary evidence fields are strictly immutable (`trg_recovery_claims_evidence_immutable`).
  - **Internal Conservative Policy (Default: `US_GAAP_CONSERVATIVE`):** Potential recovery claims remain 100% off-balance-sheet through Stages 1–4 (`recognized_receivable_cents = 0`); Stage 5 is skipped. Recovery is recognized on-balance-sheet strictly upon verified physical cash receipt at Stage 6 (`cash_recovered_cents > 0`) crediting `REVENUE:RECOVERY_GAIN`. Stage 6 permits partial cash collections (`cash_recovered_cents <= claim_amount_cents`), with uncollected residual balances transitioning $6 \to 7$ (`unrecognized_claim_closed_cents > 0`) where `cash_recovered_cents + unrecognized_claim_closed_cents = claim_amount_cents`, with zero additional P&L impact. Full uncollectible claims transition $4 \to 7$ with zero ledger entry.
  - **IFRS Virtually Certain Route (`IFRS_IAS37`):** On-balance-sheet receivable recognition at Stage 5 (`recognized_receivable_cents > 0`) is permitted strictly when realization is virtually certain, supported by objective written debt acknowledgment or binding adjudication, dual fiduciary sign-off, and formal CPA/CA policy certification without blanket statutory compliance assertions. Stage 6 collections credit the receivable (allowing partial collections), while Stage 7 uncollectible balances (either full $5 \to 7$ or residual uncollected $6 \to 7$) are written off to `EXPENSE:BAD_DEBT_EXPENSE` (`recognized_receivable_written_off_cents > 0` where `cash_recovered_cents + recognized_receivable_written_off_cents = recognized_receivable_cents`).
  Initial duplicate debits are expensed immediately against operator equity, and claim lifecycle events are tracked immutably in `recovery_claims` and `recovery_claim_events` protected by append-only database triggers.

### 3.7 Observability & User Experience
- **FR-OBS-001 (SSE Event Stream):** The backend exposes an HTTP Server-Sent Events endpoint (`/api/events`) streaming all persistent system events with monotonically increasing sequence IDs.
- **FR-OBS-002 (Nexus Command):** Provides platform operators with high-density metrics: total gross volume, netted volume, Gross-to-Net Reduction (Liquidity Reduction %), active agent status, and real-time ledger stream.
- **FR-OBS-003 (Nexus Clearing Room):** An interactive 5-stage console for judges:
  1. *Agent Activity:* Live task exchange.
  2. *Evidence Inspection:* Inspect raw deliverable, SLA schema, and AI verdict.
  3. *Netting Collapse:* Visual graph collapsing $130 gross to $45 net.
  4. *Firewall Gate:* Step-by-step policy verification checkmarks.
  5. *PayPal Settlement:* Real sandbox redirect, capture confirmation, and payout item reconciliation.
- **FR-OBS-004 (AG Studio Sponsor Integration):** Embed custom AG Studio financial clearing components showcasing:
  - Interactive obligation grid with cell-level status badges.
  - Custom dark financial theme (obsidian background, electric lime/turquoise accents).
  - Configurable layout tools for clearing metrics.

---

## 4. Flagship Scenario: Autonomous AI Research Consortium

The flagship scenario models 5 autonomous agents collaborating on a global industry analysis package.

### 4.1 Valid Economic Tasks (The $130.00 Gross Baseline)

| Task ID | Client (Debtor) | Provider (Creditor) | Service Description | Value (Gross) | SLA Outcome | IOU Generated |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-001** | Research Agent | Data Agent | Market Metrics Dataset (JSON) | $40.00 | `PASS` | IOU-001 (Signed) |
| **TSK-002** | Research Agent | Compute Agent | Statistical Regression Analysis | $30.00 | `PASS` | IOU-002 (Signed) |
| **TSK-003** | Data Agent | QA Agent | Dataset Schema Validation Audit | $20.00 | `PASS` | IOU-003 (Signed) |
| **TSK-004** | Compute Agent | Research Agent | Domain Research Methodology | $15.00 | `PASS` | IOU-004 (Signed) |
| **TSK-005** | QA Agent | Localization Agent | Multilingual Quality Metrics | $15.00 | `PASS` | IOU-005 (Signed) |
| **TSK-006** | Localization Agent | Research Agent | Source Text Verification | $10.00 | `PASS` | IOU-006 (Signed) |
| **TOTAL** | — | — | **6 Valid Bilateral Obligations** | **$130.00** | — | **6 Valid IOUs** |

### 4.2 The Canonical Netting Matrix ($130.00 Gross $\rightarrow$ $45.00 Net)

$$\text{Liquidity Reduction} = \frac{\$130.00 - \$45.00}{\$130.00} \times 100\% = 65.38\%$$

| Agent | Gross Receives | Gross Owes | Net Position | Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Research Agent** | $25.00 | $70.00 | **-$45.00** | **Net Debtor:** Pays $45.00 via PayPal |
| **Data Agent** | $40.00 | $20.00 | **+$20.00** | **Net Creditor:** Receives $20.00 payout |
| **Compute Agent** | $30.00 | $15.00 | **+$15.00** | **Net Creditor:** Receives $15.00 payout |
| **QA Agent** | $20.00 | $15.00 | **+$5.00** | **Net Creditor:** Receives $5.00 payout |
| **Localization Agent**| $15.00 | $10.00 | **+$5.00** | **Net Creditor:** Receives $5.00 payout |
| **CONSERVATION** | **$130.00** | **$130.00** | **$0.00** | $\sum \text{Net} \equiv 0$ (Invariant Satisfied) |

---

### 4.3 The Adversarial / SLA Failure Demonstration (Task 7)

To demonstrate rigorous SLA gating without contaminating the valid clearing baseline, the scenario includes a 7th task:

- **Task ID:** `TSK-007-ADV`
- **Client (Debtor):** Research Agent
- **Provider (Creditor):** Data Agent
- **Service Description:** "Exploratory Sentiment Dataset" (Requested: 50 validated sentiment records with confidence scores).
- **Injected Flaw:** Provider returns an unparseable payload missing required sentiment columns and hallucinated timestamps.
- **SLA Evaluation:**
  - Deterministic Check: **FAILED** (Schema validation error: missing `confidence_score` and `sentiment_label`; Deterministic Score: 0/100).
  - Semantic Check: **SKIPPED** (Structural schema validation failed; semantic inference bypassed).
  - Verdict: **`FAIL`** (Overall: FAIL; Deterministic: 0/100, Semantic: N/A — skipped; Reason: "Deliverable violates structural schema constraints").
- **Financial Consequence:**
  - **NO IOU IS CREATED.**
  - Task state transitions to `FAILED`.
  - Zero financial obligation enters the ledger.
  - Full evidence, raw artifact, and failure rationale remain inspectable in the audit log.
  - **The $130 gross $\rightarrow$ $45 net clearing cycle proceeds unaffected.**

---

## 5. Corrected 180-Second Demo Sequence

```
[0:00 - 0:30] THE AGENT ECONOMY PROBLEM
• Operator opens Nexus Clearing Room.
• Explains: 5 independent AI agents collaborate in a Research Consortium.
• Graph visualizes circular debts: 6 obligations totaling $130.00 gross.

[0:30 - 1:00] THE SLA DEFENSE (INJECTED FAILURE)
• Operator triggers Task 7 (Exploratory Sentiment Dataset).
• Data Agent delivers malformed artifact.
• SLA Judge runs live checks -> emits FAIL verdict.
• System displays: "Deliverable Rejected — No IOU Created".
• Judges inspect raw artifact and deterministic error in real time.

[1:00 - 1:35] MULTILATERAL NETTING & THE FIREWALL
• Operator triggers "Run Clearing" on the 6 valid obligations.
• Graph netting engine detects circular dependencies and collapses the graph.
• Net positions displayed: -$45 (Research) owes +$20, +$15, +$5, +$5 (Creditors).
• 65.38% liquidity reduction achieved. Zero-sum invariant verified ($0.00).
• Financial Firewall runs 4 deterministic checks -> emits ALLOW.

[1:35 - 2:25] REAL PAYPAL SANDBOX SETTLEMENT
• Clearing Room shows: "Awaiting Operator Authorization ($45.00)".
• Operator clicks "Authorize Settlement" -> Redirects to PayPal Sandbox checkout.
• Operator logs into Sandbox Buyer account and approves $45.00 payment.
• Backend captures Order -> Verified via PAYMENT.CAPTURE.COMPLETED webhook.
• System immediately dispatches PayPal Payout batch to the 4 net creditors.
• Payout item statuses track from PENDING -> SUCCESS.

[2:25 - 3:00] RECONCILIATION & AUDIT PROOF
• All 4 payout items confirmed; cycle marked SETTLED.
• Operator opens AG Studio financial analytics view.
• Demonstrates tamper-evident receipt, Ed25519 signatures, and zero residual balance.
• Summary: "AI does the work. PayPal settles the net balance. Tally Nexus proves what happened."
```

---

## 6. Non-Functional Requirements (NFR)

- **NFR-REL-001 (Financial Precision):** Minor units (USD cents) used exclusively. Zero floating-point arithmetic.
- **NFR-SEC-001 (Credential Hygiene):** Zero PayPal or LLM secrets in frontend bundles, logs, or agent prompts.
- **NFR-SEC-002 (Idempotency):** Every payment API call and webhook handler uses UUIDv4 idempotency keys.
- **NFR-PER-001 (Netting Latency):** Netting calculation over $\le 50$ obligations executes in $< 15\text{ms}$.
- **NFR-USA-001 (Zero-Jank UX):** No simulated animations. Real SSE events trigger targeted state updates.
