# ARCHITECTURE.md — TALLY NEXUS SYSTEM ARCHITECTURE

**System Title:** TALLY NEXUS  
**Subtitle:** The Autonomous Clearinghouse for the Agent Economy  
**Document Version:** 1.1.0 (Phase 4.1 Consistency Specification)  
**Target Environment:** Node.js 24+, TypeScript 5+, SQLite (WAL mode, Postgres-compatible), PayPal Sandbox, AG Studio  
**Classification:** Core Engineering Architecture Specification  

---

## 1. System Topology & Monorepo Architecture

TALLY NEXUS is structured as an npm-native TypeScript monorepo (`workspaces`) with strict unidirectional package dependencies. No circular dependencies are permitted.

```
                              ┌────────────────────────┐
                              │       apps/web         │
                              │  (Next.js 14, Tailwind,│
                              │   AG Studio, SSE Hook) │
                              └───────────┬────────────┘
                                          │ REST / SSE
                                          ▼
                              ┌────────────────────────┐
                              │       apps/api         │
                              │ (Express, Controllers, │
                              │  SSE Stream, Webhooks) │
                              └───────────┬────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
    ┌───────────────┐             ┌───────────────┐             ┌───────────────┐
    │packages/agents│             │packages/paypal│             │ packages/sla- │
    │(Runtime, Key- │             │ (Orders, Pay- │             │     judge     │
    │ pairs, Consor-│             │ outs, Webhook │             │(Schema checks,│
    │ tium Runner)  │             │ Verification) │             │ LLM adapter)  │
    └───────┬───────┘             └───────┬───────┘             └───────┬───────┘
            │                             │                             │
            │     ┌───────────────────────┴───────┐                     │
            │     ▼                               ▼                     │
            │ ┌───────────────┐           ┌───────────────┐             │
            │ │  packages/    │           │  packages/    │             │
            └►│   firewall    │           │    netting    │◄────────────┘
              │(Limits, Idem- │           │(Direct Netting│
              │ potency gates)│           │ Math Engine)  │
              └───────┬───────┘           └───────┬───────┘
                      │                           │
                      └─────────────┬─────────────┘
                                    ▼
                          ┌───────────────────┐
                          │   packages/core   │
                          │(Domain Types, Ed- │
                          │ 25519 Crypto, In- │
                          │ teger Cents, DB)  │
                          └───────────────────┘
```

---

## 2. Cryptographic Security & Agent Key Custody

### 2.1 Debtor-Signed Micro-IOU Model
Tally Nexus adopts the **Debtor-Signed IOU model**:
- The debtor agent cryptographically signs the micro-IOU using its private Ed25519 key, providing an irrefutable cryptographic proof of debt.
- Protocol-level creditor acceptance is established through the agreed task commissioning contract (`TaskRequest` $\leftrightarrow$ `TaskSubmission`). Creditor re-signing is unnecessary for clearing and introduces avoidable protocol latency.
- Canonical IOU Payload:
  ```typescript
  interface IOUPayload {
    iouId: string;           // UUIDv4
    debtorId: string;        // agent_id of debtor
    creditorId: string;      // agent_id of creditor
    amountCents: number;     // Integer USD cents (e.g. 4000 = $40.00)
    currency: 'USD';
    taskId: string;          // Linked Task ID
    artifactHash: string;    // SHA-256 of delivered work
    createdAt: string;       // ISO 8601 UTC timestamp
  }
  ```
- Serialization: RFC 8785 Canonical JSON (lexicographically sorted keys, zero whitespace).

### 2.2 Key Custody, Deterministic Derivation & Restart Safety
To guarantee that agent keys survive application restarts without invalidating historical IOUs:
1. **Master Secret Encoding & Startup Validation:**
   - The system requires `NEXUS_MASTER_SEED` in the root `.env` file.
   - **Encoding & Length:** Exactly 32 bytes represented as **exactly 64 hexadecimal characters** (case-insensitive ASCII string matching regex `/^[0-9a-fA-F]{64}$/`).
   - **Startup Validation:** On process initialization, the server asserts that `NEXUS_MASTER_SEED` exists and strictly satisfies the 64-character hex format. If missing or malformed, the process immediately throws `FatalConfigError` and halts boot.
   - **Blast Radius & Security Model:** In this hackathon architecture, compromise of `NEXUS_MASTER_SEED` compromises every derived agent identity. This is an explicit prototype boundary (in production, each agent would hold its keypair in an isolated hardware security module (HSM) or KMS).
   - Secret hygiene: `NEXUS_MASTER_SEED` is never logged, never committed to git, never exposed in API responses, and never regenerated silently on boot.
2. **Deterministic Derivation (HKDF):** Agent keypairs are derived using RFC 5869 HKDF-SHA256:
   $$\text{AgentKeySeed} = \text{HKDF-Expand}(\text{PRK} = \text{HKDF-Extract}(\text{salt}=\text{"tally-nexus:agent-identity:v1"}, \text{IKM}=\text{NEXUS\_MASTER\_SEED}), \text{info}=\text{agent\_id}, \text{length}=32)$$
   $$\text{Keypair} = \text{Ed25519}(\text{AgentKeySeed})$$
3. **Restart Persistence Invariant:** On system boot, `packages/agents` loads registered agents from the `agents` table. For each agent, it re-derives the public key from `NEXUS_MASTER_SEED` and verifies that $\text{DerivedPublicKey} \equiv \text{StoredPublicKey}$. If a mismatch is detected, the server halts with `KeyIntegrityError`.
4. **Key Versioning:** `key_version` (integer, default `1`) is recorded with every key and IOU to support future key rotation without breaking historical signature verification.

---

## 3. Simplified Financial Netting Engine & Invariants

### 3.1 Direct Balance Calculation (Algorithmic Simplification)
Cycle cancellation in graph theory is useful for visual explanation, but calculating multilateral net balances does not require cycle elimination. Net positions are computed **directly** from all eligible obligations:

For a set of eligible IOUs $E$ across all agents $A$:
$$\text{GrossPayables}(a) = \sum_{e \in E, e.\text{debtorId} = a} e.\text{amountCents}$$
$$\text{GrossReceivables}(a) = \sum_{e \in E, e.\text{creditorId} = a} e.\text{amountCents}$$
$$\text{Net}(a) = \text{GrossReceivables}(a) - \text{GrossPayables}(a)$$

Partitioning:
- **Net Debtors:** $D = \{ a \in A \mid \text{Net}(a) < 0 \}$ (Total Cash Required: $C_{\text{in}} = \sum_{a \in D} |\text{Net}(a)|$)
- **Net Creditors:** $C = \{ a \in A \mid \text{Net}(a) > 0 \}$ (Total Cash Disbursed: $C_{\text{out}} = \sum_{a \in C} \text{Net}(a)$)
- **Balanced Agents:** $B = \{ a \in A \mid \text{Net}(a) = 0 \}$ (No cash movement required)

### 3.2 Formal Mathematical Invariants
1. **Conservation of Value:**
   $$\sum_{a \in A} \text{Net}(a) \equiv 0 \iff C_{\text{in}} \equiv C_{\text{out}}$$
2. **Integer Arithmetic:** All operations are integer addition and subtraction over minor units (USD cents). Floating-point arithmetic is banned.
3. **Liquidity Reduction Metric:**
   $$\text{GrossVolume} = \sum_{e \in E} e.\text{amountCents}$$
   $$\text{NetCashFlow} = C_{\text{in}} = C_{\text{out}}$$
   $$\text{LiquidityReductionPct} = \frac{\text{GrossVolume} - \text{NetCashFlow}}{\text{GrossVolume}} \times 100\%$$
   *(Example: $130 gross $\rightarrow$ $45 net = 65.38% reduction).*
4. **Comprehensive Test Invariant Coverage:**
   The netting engine is property-tested against:
   - Self-loops (agent owing itself $\rightarrow$ net = 0).
   - Disconnected subgraphs (independent clusters net independently; total conservation holds).
   - Many-to-one and one-to-many topologies.
   - Zero-net agents with high gross turnover.

---

## 4. Hardened Database State Machines & Audit Architecture

### 4.1 Synchronized Lifecycle State Machines

```
1. TASK EXECUTION:
   CREATED ──► ASSIGNED ──► IN_PROGRESS ──► SUBMITTED ──► [COMPLETED | FAILED | ABORTED]

2. SLA EVALUATION:
   PENDING_VERIFICATION ──► [PASS | FAIL | REVIEW_REQUIRED]
   • PASS: Triggers Task COMPLETED + IOU generation
   • FAIL: Rejects deliverable; Task FAILED; ZERO IOU created
   • REVIEW_REQUIRED: Quarantines task; ZERO IOU created

3. OBLIGATION / IOU:
   DRAFTED ──► SIGNED ──► ELIGIBLE_FOR_CLEARING ──► IN_CLEARING ──► NETTED ──► SETTLED
   (If challenged via Dispute) ──► DISPUTED ──► UNDER_REVIEW ──► [CANCELLED (Upheld) | ELIGIBLE_FOR_CLEARING (Dismissed)]

4. DISPUTE RECORD:
   OPEN ──► UNDER_REVIEW ──► [UPHELD | DISMISSED]

4. SETTLEMENT CYCLE:
   PREPARED ──► FIREWALL_APPROVED ──► COLLECTION_PENDING ──► [COLLECTION_CAPTURED | COLLECTION_FAILED]
   ──► PAYOUT_DISPATCHED ──► RECONCILING ──► [SETTLED | PARTIAL_FAILURE_HOLD | PAYOUT_AMBIGUOUS_HOLD | OPERATOR_DISPUTE_HOLD | OPERATOR_RESERVE_HOLD | POST_SETTLEMENT_RECONCILING | ABORTED]

5. PAYPAL PAYOUT BATCH:
   SUBMITTED ──► PENDING ──► PROCESSING ──► [SUCCESS | FAILED | DENIED]

6. PAYPAL PAYOUT ITEM (Per Creditor):
   PENDING ──► [SUCCESS | FAILED | UNCLAIMED | RETURNED | ONHOLD | BLOCKED | REFUNDED | REVERSED]

7. PAYPAL PAYOUT REISSUE (Single-Reissue Entitlement Model):
   DRAFT ──► DISPATCHED ──► [SUCCESS | FAILED | RETURNED | REFUNDED | AMBIGUOUS_HOLD]
   • Hard Precondition: Parent status MUST be in ('RETURNED', 'REFUNDED', 'FAILED') AND parent reissue_authorization_state MUST be 'REISSUE_AUTHORIZED'.
   • Storage-level Exclusivity: Database partial unique index uq_active_child_per_parent permits at most ONE child in ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS').
   • Premature reissue on PENDING, ONHOLD, UNCLAIMED, or AMBIGUOUS_HOLD is strictly prohibited by trg_reissue_entitlement_check.

8. RECOVERY CLAIM LIFECYCLE (7-Stage Framework-Specific Model):
   • US_GAAP_CONSERVATIVE: Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► [Stage 6 (Cash Collection) | Stage 7 (Unrecognized Claim Closed)]
                           Stage 6 ──► Stage 6 (Partial Cash Collection) ──► Stage 7 (Residual Uncollected Claim Closed)
   • IFRS_IAS37:           Stage 1 ──► Stage 2 ──► Stage 3 ──► Stage 4 ──► Stage 5 (Virtually Certain Accrual) ──► [Stage 6 (Collection) | Stage 7 (Bad-Debt Write-Off)]
                           Stage 6 ──► Stage 6 (Partial Collection) ──► Stage 7 (Residual Receivable Written Off)
   • Evidence Gate: Stage >= 4 requires non-null documentary evidence and fiduciary controller signoff. Events are strictly append-only.
```

### 4.2 Append-Only Lifecycle Transitions Table
To maintain an immutable, tamper-evident audit history, every state change across tasks, verdicts, IOUs, settlement cycles, and payout items is recorded in `lifecycle_transitions`:
- `transition_id` (UUIDv4)
- `entity_type` (`TASK`, `SLA`, `IOU`, `DISPUTE`, `SETTLEMENT_CYCLE`, `PAYOUT_ITEM`, `PAYOUT_REISSUE`, `COMPENSATION`, `CURE_INTENT`, `RECOVERY_CLAIM`, `RECOVERY_CLAIM_EVENT`, `RECONCILIATION_SNAPSHOT`)
- `entity_id`
- `from_status`
- `to_status`
- `reason`
- `metadata_json`
- `created_at` (ISO 8601 UTC)

---

## 5. Hardened PayPal Settlement Rail & Race Condition Recovery

### 5.1 Race Condition Resolution: Capture API vs. Webhook
The system must handle asynchronous webhook arrivals, client redirects, and process crashes gracefully:

```
                  Operator Approves PayPal Sandbox Order
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼                                                   ▼
Path A: Browser Redirect                            Path B: PayPal Webhook
GET /api/settlement/return?token=...                POST /api/webhooks/paypal
         │                                                   │
Calls PayPal POST /v2/checkout/orders/{id}/capture           Receives PAYMENT.CAPTURE.COMPLETED
         │                                                   │
         ▼                                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ATOMIC DATABASE TRANSACTION (BEGIN IMMEDIATE)                          │
│ 1. Check current status of paypal_orders for order_id:                 │
│    - If already 'CAPTURED': Idempotent return (noop).                  │
│    - If 'CREATED' or 'APPROVED':                                       │
│        a. Update paypal_orders.status = 'CAPTURED'                     │
│        b. Update settlement_cycles.status = 'COLLECTION_CAPTURED'      │
│        c. Insert row into lifecycle_transitions                        │
│        d. Insert row into system_events (SSE outbox)                   │
│        e. Insert webhook_id into processed_webhooks (if via webhook)   │
│ 2. COMMIT TRANSACTION                                                  │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Failure & Recovery Protocols
1. **Crash After Capture API Call, Before DB Write:**
   If the API server crashes after PayPal captures funds but before the local DB commits:
   - On reboot or retry, the frontend calls `POST /api/settlement/capture` with the same `Idempotency-Key` and `PayPal-Request-Id`.
   - The backend calls PayPal `GET /v2/checkout/orders/{id}`.
   - If PayPal reports status `COMPLETED`, the backend reconciles local state to `CAPTURED` and sets cycle to `COLLECTION_CAPTURED`.
   - Authoritative PayPal status always prevails over local uncommitted state.
2. **Duplicate Webhook Delivery:**
   `processed_webhooks` table enforces a `UNIQUE(paypal_event_id)` constraint. Replays immediately return HTTP 200 without executing side-effects.
3. **Partial Payout Failure Handling:**
   - If a payout batch is accepted by PayPal, cycle enters `RECONCILING`.
   - If individual payout item status returns `FAILED`, `BLOCKED`, or `RETURNED`, cycle status is set to `PARTIAL_FAILURE_HOLD`.
   - Residual funds remain marked as unallocated in the ledger. Automatic payouts are halted.
   - Cycle transitions to `SETTLED` **only when 100% of payout items reach individual `SUCCESS` and total disbursed equals total captured.** Batch-level `SUCCESS` alone never extinguishes liabilities. Real-time in-flight balance must verify $\Delta_{\text{InFlight}} \equiv 0$. Periodic reporting balance reconciliation operates asynchronously subject to documented provider latency (up to 3 hours).
4. **Child Reissue Safety & Parent Terminal Constraint:**
   - Child reissues are authorized **only** when the original parent item is in terminal `RETURNED`, `REFUNDED`, or `FAILED` status, and funds return has been verified on PayPal.
   - Premature reissue attempts while parent item is in `PENDING`, `PROCESSING`, `ONHOLD`, `UNCLAIMED`, or `AMBIGUOUS_HOLD` are rejected locally before network submission via HTTP 409 and SQLite trigger `trg_reissue_parent_terminal_check`.
   - Child reissues that time out transition to `AMBIGUOUS_HOLD` and query PayPal by deterministic `sender_item_id` without creating duplicate payouts.

### 5.3 Distributed Systems Atomicity vs Local Database Atomicity
Tally Nexus strictly distinguishes local transactional atomicity from distributed provider rail atomicity:
- **Local Database Atomicity:** Guaranteed via SQLite `BEGIN IMMEDIATE ... COMMIT` blocks. Ensures that internal subledger balances (`SETTLEMENT_CASH`, `OPERATOR_CASH`, `PAYOUTS_IN_FLIGHT`), journal entries, and outbox events commit with full ACID guarantees. Internal non-deficit invariants are mathematically preserved within local committed state.
- **Distributed Rail Boundary:** External payment rails (PayPal Sandbox) do not share a 2-Phase Commit (2PC) or distributed lock with the local database. External rail failures (e.g. duplicate network debits, provider delays, offline chargebacks) can create temporary variances between physical external funds and local ledger balances.
- **Fault-Tolerant Resolution:** Tally Nexus bridges this distributed boundary without claiming impossible continuous physical synchronization. Discrepancies are contained via:
  1. *Durable Pre-Commit Intent Records & Immutable Outbox* (`cure_intents`, `recovery_claims`, `recovery_claim_events` enforced append-only via SQLite triggers prohibiting UPDATE/DELETE and verifying sequence monotonic integrity).
  2. *Idempotent Webhooks & Safe Polling* using deterministic `sender_item_id` and unique transaction deduplication.
  3. *Automated Safety Holds* (`OPERATOR_DISPUTE_HOLD`, `OPERATOR_RESERVE_HOLD`) that immediately freeze further automated disbursements until physical and local records are reconciled.

### 5.4 Multi-Tier Freshness-Aware Liquidity & Reserve Gate
PayPal's `GET /v1/reporting/balances` endpoint documentation notes that balance records can take up to 3 hours to reflect recent transactions. Synchronous balance queries before dispatch cannot guarantee real-time external balance visibility. Furthermore, unrecorded external rail debits or fees can cause local estimates to diverge from actual provider balances. The Financial Firewall addresses this via a multi-tier gate:
1. **Tier A (Observability Freshness Tolerance):** Asserts $T_{\text{now}} - T_{\text{last\_refresh}} \le 180\text{ minutes}$. This 180-minute window is strictly an observability freshness tolerance, not a live physical balance guarantee. Stale reporting triggers `STALE_REPORTING_DATA` or `REFLECTION_TIMEOUT`.
2. **Tier B (Post-Refresh Delta Tracking & Uncertainty Exposure):** Reconstructs estimated physical balance:
   $$PP_{\text{Est\_Physical\_Available}} = PP_{\text{Reported\_Available}} - \sum \text{Dispatches Since Refresh} + \sum \text{Confirmed Captures Since Refresh}$$
   The engine logs baseline timestamps, event sequences, and uncertainty flags. If unknown external rail movements are detected, uncertainty is flagged.
3. **Tier C (Solvency, Reserve Floor & Hold-on-Uncertainty):** Payout dispatch is strictly blocked unless:
   $$PP_{\text{Est\_Physical\_Available}} \ge \text{SETTLEMENT\_CASH} + \text{OPERATOR\_CASH}$$
   $$\text{and} \quad \text{OPERATOR\_CASH} \ge \text{OPERATOR\_RESERVE\_FLOOR} \ (\$10.00)$$
   If an uncertainty flag is raised, or if balance conditions fail, disbursements are **held** (`OPERATOR_RESERVE_HOLD` / `OPERATOR_DISPUTE_HOLD`) rather than silently trusting an estimate.

---

## 6. Guaranteed Real-Time Consistency: Transactional Outbox Pattern

To prevent desynchronization between database state and the frontend SSE event stream:

### 6.1 Atomic Transactional Outbox
Every domain mutation is paired with a corresponding `system_events` insertion inside the **exact same SQLite atomic transaction**:
```typescript
db.transaction(() => {
  // 1. Update Domain Table
  db.prepare(`UPDATE settlement_cycles SET status = 'COLLECTION_CAPTURED' WHERE cycle_id = ?`).run(cycleId);
  
  // 2. Insert Append-Only Transition
  db.prepare(`INSERT INTO lifecycle_transitions ...`).run(...);
  
  // 3. Insert Outbox Event for SSE
  db.prepare(`INSERT INTO system_events (event_id, event_type, entity_id, payload_json) VALUES (?, ?, ?, ?)`).run(
    eventId, 'CYCLE_CAPTURED', cycleId, JSON.stringify({ cycleId, amountCents })
  );
})();
```

### 6.2 Race-Free SSE Replay & Live Subscription Handoff
To eliminate the race condition where events commit during historical replay before live subscription:

```
Client connects: GET /api/events?lastEventId=42
  │
  ├─► 1. SUBSCRIBE & BUFFER:
  │      Server immediately registers client into live event bus listener.
  │      Newly arriving live events are placed into a per-connection FIFO buffer (max: 1,000 events).
  │      Buffer Overflow Policy: If buffer exceeds 1,000 events before historical replay drains,
  │      the connection is closed with an explicit error frame (code: 4009 "BUFFER_OVERFLOW"),
  │      instructing the client to reconnect using its latest persisted Last-Event-ID cursor.
  │      Events are NEVER silently dropped.
  │
  ├─► 2. CAPTURE WATERMARK:
  │      Server captures the DB watermark:
  │      watermarkSeq = SELECT COALESCE(MAX(sequence_id), 0) FROM system_events;
  │
  ├─► 3. REPLAY HISTORICAL:
  │      Server queries SQLite and streams all events where:
  │      sequence_id > lastEventId AND sequence_id <= watermarkSeq
  │      ordered by sequence_id ASC.
  │
  ├─► 4. DRAIN BUFFER:
  │      Server drains the per-connection FIFO buffer in sequence order:
  │      For each event in buffer:
  │        If event.sequence_id > watermarkSeq:
  │          Stream event to client.
  │
  └─► 5. DIRECT STREAMING:
         Client connection transitions from buffering mode to direct live streaming.
         Defense-in-depth: Client deduplicates by monotonic sequence_id.
```
This guarantees zero dropped events and zero duplicate gaps during connection establishment or reconnects.


## 9. Phase 5.22 Safety Hardening Architecture Extensions

### 9.1 Atomic Recovery Outbox Synchronization
To eliminate split-brain dual-write risks between `recovery_claims` and `recovery_claim_events`, the database enforces:
1. `trg_recovery_claims_prevent_direct_stage_update`: Direct SQL updates to `recovery_claims.stage` are prohibited.
2. `trg_recovery_claim_events_atomic_sync`: An `AFTER INSERT ON recovery_claim_events` trigger automatically synchronizes `recovery_claims.stage`, balances (`cash_recovered_cents`, `recognized_receivable_cents`, `unrecognized_claim_closed_cents`), and timestamp fields within the exact same atomic database transaction.
3. `trg_recovery_claims_evidence_immutable`: Freezes ALL core fields (`claim_amount_cents`, `counterparty_type`, `counterparty_id`, `claim_owner`, `original_loss_acct`, `recovery_dest_acct`, `evidence_hash`) once `stage >= 4`.

### 9.2 Late Webhook Collision Guard
`trg_parent_payout_item_late_success_guard` on `paypal_payout_items` aborts any attempt to set `status = 'SUCCESS'` on a parent item if `reissue_authorization_state` is `CHILD_ACTIVE` or `CHILD_SETTLED`. The event is diverted to `status = 'QUARANTINED_COLLISION'` and the cycle enters `OPERATOR_DISPUTE_HOLD`.

### 9.3 Cryptographic Webhook Authentication & Replay Protection
All incoming PayPal webhooks must satisfy the 5-header cryptographic handshake (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`) within a 300-second window before database interaction.
