# TALLY NEXUS — Architecture Decision Records (ADRs)

## Index of Architecture Decisions

| ADR ID | Title | Status | Date |
| :--- | :--- | :--- | :--- |
| **ADR-001** | Multilateral Netting vs Bilateral Gross Settlement | Accepted | Phase 2 |
| **ADR-002** | Ed25519 Cryptographic Signatures for Debtor Micro-IOUs | Accepted | Phase 2 |
| **ADR-003** | Double-Entry General Ledger with Append-Only Compensation | Accepted | Phase 2 |
| **ADR-015** | Adoption of Node.js 24 Native `node:sqlite` Engine | Accepted | Gate 1 |
| **ADR-016** | Multi-Debtor Intermediate Clearing Accounting & Concurrency Guards | Accepted | Gate 3B |
| **ADR-017** | 5-Stage Return Verification & Single-Reissue Entitlement Model | Accepted | Gate 3C |
| **ADR-018** | Hermetic Single-Page Operator Dashboard with Zero CDN Dependencies | Accepted | Gate 3C |
| **ADR-019** | Production HTTP Server Bootstrap & Graceful Lifecycle Management | Accepted | Phase 4 |
| **ADR-020** | Deterministic 180s Flagship Scenario & Multi-Tier Sandbox Validation | Accepted | Phase 4 |

---

### ADR-015: Adoption of Node.js 24 Native `node:sqlite` Engine
- **Context:** Project baseline initially specified `better-sqlite3`. Node.js 24.17.0+ introduces built-in `node:sqlite` with zero native C++ build dependencies, full synchronous execution support, and official LTS backing.
- **Decision:** Adopt `node:sqlite` as the primary database driver. Enable Write-Ahead Logging (WAL) and `synchronous=NORMAL`. Verify durability under hard process termination (`SIGKILL`).
- **Consequences:** Eliminates `node-gyp` native compile issues across platforms while achieving verified process crash recovery.

---

### ADR-016: Multi-Debtor Intermediate Clearing Accounting & Concurrency Guards
- **Context:** In multilateral netting with $N$ debtors and $M$ creditors, capturing an individual debtor's payment cannot immediately advance the cycle to `CAPTURED` nor credit full creditor entitlements, or premature payouts and duplicate allocations occur.
- **Decision:**
  1. Route all individual debtor collections to `LIABILITY:COLLECTION_IN_CLEARING`.
  2. Transition cycle status to `CAPTURED` strictly when every net debtor's obligation is confirmed.
  3. Allocate creditor liabilities in a single atomic transaction upon cycle completion.
  4. Perform atomic re-verification of `paypal_orders.status` inside `db.withTransaction` lock after external PayPal capture calls to prevent check-then-act races.
- **Consequences:** Guarantees double-entry conservation and trial balance equilibrium across multi-debtor cycles and concurrent capture paths.

---

### ADR-017: 5-Stage Return Verification & Single-Reissue Entitlement Model
- **Context:** When a creditor payout item is returned, refunded, or fails at PayPal, reissuing payouts prematurely while parent status is pending or held risks duplicate disbursements.
- **Decision:**
  1. Enforce strict terminal status prerequisite (`RETURNED`, `REFUNDED`, `FAILED`).
  2. Require completion of the 5-stage return verification sequence (`PARENT_TERMINAL_CONFIRMED` $\to$ `RETURN_FUNDS_VERIFIED` $\to$ `INTERNAL_LEDGER_RESTORED` $\to$ `CREDITOR_PAYABLE_REINSTATED` $\to$ `REISSUE_AUTHORIZED`).
  3. Enforce single-reissue entitlement via partial unique index `uq_active_child_per_parent` (at most one active/settled child reissue per parent).
  4. Parent item preserves terminal status with `reissue_authorization_state = 'CHILD_SETTLED'` upon child success to avoid late parent success collisions.
- **Consequences:** Eliminates phantom payouts, double-extinguishments, and compliance hold breaches.

---

### ADR-018: Hermetic Single-Page Operator Dashboard with Zero CDN Dependencies
- **Context:** The hackathon operator dashboard must execute reliably in offline, sandboxed, and air-gapped demo environments without depending on external script CDNs or third-party stylesheets.
- **Decision:** Embed a self-contained Single-Page Application (HTML5, modern CSS3, vanilla ES6 JS) served directly by Express at `/` and `/dashboard`. Connect in real-time to the `/api/events/stream` Server-Sent Events endpoint and live REST APIs.
- **Consequences:** Guarantees instant 100% offline rendering, zero external CDN security vulnerabilities, and live outbox stream visualization.

---

### ADR-019: Production HTTP Server Bootstrap & Graceful Lifecycle Management
- **Context:** In production and local development, the application must run as an autonomous daemon via `npm start` or `npm run dev`, cleanly managing database connections and graceful OS termination signals.
- **Decision:** Implement `src/server.ts` wiring `createApp`, initializing `DatabaseManager`, running migrations, detecting PayPal credentials vs deterministic mock fallback, and handling `SIGINT`/`SIGTERM` to close SQLite safely.
- **Consequences:** Ensures zero data corruption upon shutdown and seamless out-of-the-box developer experience.

---

### ADR-020: Deterministic 180s Flagship Scenario & Multi-Tier Sandbox Validation
- **Context:** Evaluators need to independently verify the complete multi-agent lifecycle under strict hackathon evaluation constraints without requiring pre-configured external credentials or manual PayPal UI interaction.
- **Decision:** Implement `src/demo/flagship-runner.ts` and CLI runner `src/demo/cli.ts` executing the canonical 5-agent consortium across 6 scenes in under 100ms. Provide dual-mode execution (live PayPal Sandbox or local deterministic simulator) and expose `POST /api/demo/run` for one-click UI invocation.
- **Consequences:** Provides 100% reproducible validation for judges with zero flakiness.
