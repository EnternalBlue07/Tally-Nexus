# TALLY NEXUS — Architecture Decision Records (ADRs)

**Project:** Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine with PayPal Settlement  
**Status:** Canonical Master ADR Repository (ADR-001 through ADR-022)  
**Target Runtime:** Node.js 24 LTS · TypeScript 5.7+ Strict · Native `node:sqlite`  

---

## Index of Architecture Decision Records

| ADR ID | Title | Status | Date / Phase |
| :--- | :--- | :---: | :---: |
| [**ADR-001**](#adr-001-runtime-environment-nodejs-24-lts) | Runtime Environment (Node.js 24 LTS) | Accepted | Phase 1 |
| [**ADR-002**](#adr-002-programming-language-typescript-strict-mode) | Programming Language (TypeScript Strict Mode) | Accepted | Phase 1 |
| [**ADR-003**](#adr-003-http-routing-framework-express-with-raw-body-preservation) | HTTP Routing Framework (Express with Raw Body Preservation) | Accepted | Phase 1 |
| [**ADR-004**](#adr-004-primary-database-engine-sqlite-via-better-sqlite3-superseded) | Primary Database Engine (`better-sqlite3` — SUPERSEDED) | Superseded | Phase 1 |
| [**ADR-005**](#adr-005-production-database-portability--postgresql-strategy) | Production Database Portability & PostgreSQL Strategy | Accepted | Phase 2 |
| [**ADR-006**](#adr-006-omission-of-redis--distributed-cache) | Omission of Redis & Distributed Cache | Accepted | Phase 2 |
| [**ADR-007**](#adr-007-cryptographic-identity--micro-iou-signatures-ed25519) | Cryptographic Identity & Micro-IOU Signatures (Ed25519) | Accepted | Phase 2 |
| [**ADR-008**](#adr-008-deterministic-multilateral-netting-algorithm-ov--e) | Deterministic Multilateral Netting Algorithm ($O(V + E)$) | Accepted | Phase 2 |
| [**ADR-009**](#adr-009-fiduciary-financial-firewall--custodial-capital-separation) | Fiduciary Financial Firewall & Custodial Capital Separation | Accepted | Phase 2 |
| [**ADR-010**](#adr-010-two-tier-paypal-settlement-rail-orders-v2--payouts-v1) | Two-Tier PayPal Settlement Rail (Orders v2 + Payouts v1) | Accepted | Phase 3 |
| [**ADR-011**](#adr-011-webhook-cryptographic-verification--replay-protection) | Webhook Cryptographic Verification & Replay Protection | Accepted | Phase 3 |
| [**ADR-012**](#adr-012-transactional-outbox-pattern--sse-event-stream) | Transactional Outbox Pattern & SSE Event Stream | Accepted | Phase 3 |
| [**ADR-013**](#adr-013-decoupling-ai-cognition-from-financial-authorization) | Decoupling AI Cognition from Financial Authorization | Accepted | Phase 3 |
| [**ADR-014**](#adr-014-single-container-deployment-strategy-on-render) | Single-Container Deployment Strategy on Render | Accepted | Phase 3 |
| [**ADR-015**](#adr-015-adoption-of-nodejs-24-native-nodesqlite-engine) | Adoption of Node.js 24 Native `node:sqlite` Engine | Accepted | Gate 1 |
| [**ADR-016**](#adr-016-multi-debtor-intermediate-clearing-accounting--concurrency-guards) | Multi-Debtor Intermediate Clearing Accounting & Concurrency Guards | Accepted | Gate 3B |
| [**ADR-017**](#adr-017-5-stage-return-verification--single-reissue-entitlement-model) | 5-Stage Return Verification & Single-Reissue Entitlement Model | Accepted | Gate 3C |
| [**ADR-018**](#adr-018-hermetic-single-page-operator-dashboard-with-zero-cdn-dependencies) | Hermetic Single-Page Operator Dashboard with Zero CDN Dependencies | Accepted | Gate 3C |
| [**ADR-019**](#adr-019-production-http-server-bootstrap--graceful-lifecycle-management) | Production HTTP Server Bootstrap & Graceful Lifecycle Management | Accepted | Phase 4 |
| [**ADR-020**](#adr-020-deterministic-180s-flagship-scenario--multi-tier-sandbox-validation) | Deterministic 180s Flagship Scenario & Multi-Tier Sandbox Validation | Accepted | Phase 4 |
| [**ADR-021**](#adr-021-ag-grid-community-virtualized-high-density-ledger-integration) | AG Grid Community Virtualized High-Density Ledger Integration | Accepted | Phase 5 |
| [**ADR-022**](#adr-022-hero-scale-1500-swarm-netting--calculated-rail-fee-savings-model) | Hero Scale 1,500+ Swarm Netting & Calculated Rail Fee-Savings Model | Accepted | Phase 5 |

---

### ADR-001: Runtime Environment (Node.js 24 LTS)
- **Status:** Accepted.
- **Context:** Requires modern runtime supporting native Web Crypto, modern ECMAScript standards, and standardized HTTP primitives.
- **Decision:** Target **Node.js 24 LTS**.
- **Rationale:** Node.js 24 provides global `fetch` (via `undici`), native Web Crypto and Ed25519 algorithms in `node:crypto`, and native Buffer operations, eliminating heavy third-party polyfills.

---

### ADR-002: Programming Language (TypeScript Strict Mode)
- **Status:** Accepted.
- **Context:** Financial ledgers and settlement state machines require compile-time type safety to prevent null-pointer dereferences, implicit number conversions, and state-machine invalid transitions.
- **Decision:** Implement 100% of the backend codebase in **TypeScript 5.7+** with `strict: true`, `noImplicitAny: true`, and `exactOptionalPropertyTypes: true`.
- **Rationale:** Strict typing guarantees that monetary quantities are explicitly typed as integers (`cents: number`) and prevents floating-point arithmetic drift.

---

### ADR-003: HTTP Routing Framework (Express with Raw Body Preservation)
- **Status:** Accepted.
- **Context:** The server must ingest webhook events from PayPal, provide REST APIs for agent task management, and stream SSE events to the operator UI. PayPal webhook verification strictly requires access to the exact unparsed raw request buffer.
- **Decision:** Use **Express** configured with `express.raw({ type: 'application/json' })` on webhook routes, preserving `req.rawBody` before JSON parsing.
- **Rationale:** Standard `express.json()` mutates whitespace and JSON key ordering, which invalidates cryptographic RSA-SHA256 signature verification.

---

### ADR-004: Primary Database Engine (`better-sqlite3` — SUPERSEDED)
- **Status:** Superseded by **ADR-015**.
- **Context:** Early specification selected `better-sqlite3`. On Windows/Node 24 ABI, lack of prebuilt C++ binaries triggered compilation issues, resolved cleanly by migrating to Node 24 native `node:sqlite`.

---

### ADR-005: Production Database Portability & PostgreSQL Strategy
- **Status:** Accepted.
- **Context:** While SQLite is ideal for MVP, local testing, and deterministic demos, enterprise deployment requires horizontal scaling on cloud PostgreSQL.
- **Decision:** Architect all SQL statements using standard ANSI SQL-92/99 DDL. Isolate database interactions inside a Data Access Object (DAO) layer (`DatabaseManager`).
- **Rationale:** Keeping business logic in service classes and mirroring trigger invariants in application guards ensures porting to PostgreSQL requires only replacing trigger syntax with PL/pgSQL stored procedures without altering schema structure.

---

### ADR-006: Omission of Redis & Distributed Cache
- **Status:** Accepted.
- **Context:** Many architectures introduce Redis for pub/sub, caching, and distributed locking, adding dual-write complexity.
- **Decision:** **Omit Redis entirely.** All state, locks, idempotency keys, and event outbox queues reside directly in SQLite.
- **Rationale:** SQLite WAL mode handles thousands of read queries per second in-process with sub-millisecond latency. The transactional outbox table (`system_events`) provides reliable pub/sub for SSE streaming with zero risk of cache eviction or message loss.

---

### ADR-007: Cryptographic Identity & Micro-IOU Signatures (Ed25519)
- **Status:** Accepted.
- **Context:** Agents must be able to issue micro-IOUs that are tamper-evident, non-repudiable, and verifiable offline without a centralized authority.
- **Decision:** Every agent is provisioned an **Ed25519 cryptographic keypair**. IOUs are digitally signed by the debtor agent over an RFC 8785 canonical JSON serialization of the task deliverable, amount, cycle ID, and timestamp.
- **Rationale:** Ed25519 delivers 128-bit security, 64-byte signatures, fast verification (~50,000 verifications/sec), and immunity to length-extension attacks.

---

### ADR-008: Deterministic Multilateral Netting Algorithm ($O(V + E)$)
- **Status:** Accepted.
- **Context:** Gross bilateral payments between $N$ agents generate $O(N^2)$ transactions and excessive transaction fees.
- **Decision:** Implement a **deterministic multilateral netting algorithm** based on vertex balance summation:
  $$B_i = \sum_{j} \text{Credit}_{j \to i} - \sum_{k} \text{Debt}_{i \to k}$$
- **Rationale:** In the flagship 5-agent consortium, gross transactions totaling $130.00 collapse into a single $45.00 payment from the net debtor distributed to 4 net creditors ($20, $15, $5, $5), achieving a **65.38% reduction in cash flow volume**.

---

### ADR-009: Fiduciary Financial Firewall & Custodial Capital Separation
- **Status:** Accepted.
- **Context:** Clearinghouse operators must never commingle custodial settlement funds with operating capital.
- **Decision:** Maintain two strictly segregated internal cash partitions:
  1. `ASSET:PAYPAL_SETTLEMENT_CASH`: Ring-fenced debtor funds held in custodial trust for creditors.
  2. `ASSET:OPERATOR_CASH`: Operator equity utilized to absorb rail fees, absorb operational losses, and maintain the $10.00 reserve floor (`OPERATOR_RESERVE_FLOOR`).

---

### ADR-010: Two-Tier PayPal Settlement Rail (Orders v2 + Payouts v1)
- **Status:** Accepted.
- **Context:** The clearinghouse must collect net funds from human-authorized debtor wallets and disburse net entitlements to autonomous creditor agent wallets.
- **Decision:**
  - **Debtor Ingestion:** PayPal Orders v2 (`POST /v2/checkout/orders` with `intent: "CAPTURE"`), requiring human debtor approval.
  - **Creditor Distribution:** PayPal Payouts v1 (`POST /v1/payments/payouts`), executing a single batch payout with unique `sender_batch_id` and item-level `sender_item_id`.

---

### ADR-011: Webhook Cryptographic Verification & Replay Protection
- **Status:** Accepted.
- **Context:** PayPal communicates payout statuses and capture confirmations asynchronously via HTTP webhooks. Malicious actors could forge or replay webhooks to steal funds.
- **Decision:** Webhook ingestion mandates:
  1. Verification of the 5 PayPal headers (`PAYPAL-AUTH-ALGO`, `PAYPAL-CERT-URL`, `PAYPAL-TRANSMISSION-ID`, `PAYPAL-TRANSMISSION-SIG`, `PAYPAL-TRANSMISSION-TIME`).
  2. Transmission timestamp skew enforcement ($\le 300\text{ seconds}$).
  3. Certificate domain whitelisting (`*.paypal.com` via HTTPS).
  4. Nonce deduplication in `processed_webhooks`.
  5. Collision protection via `trg_parent_payout_item_late_success_guard` on `paypal_payout_items`.

---

### ADR-012: Transactional Outbox Pattern & SSE Event Stream
- **Status:** Accepted.
- **Context:** The operator dashboard requires real-time observability of clearing state transitions without client polling.
- **Decision:** Implement a **Transactional Outbox table (`system_events`)** in SQLite. Financial mutations insert a monotonic event into `system_events` inside the same database transaction. An Express Server-Sent Events (SSE) route (`GET /api/events/stream`) tails `system_events` by monotonic `sequence_id`.

---

### ADR-013: Decoupling AI Cognition from Financial Authorization
- **Status:** Accepted.
- **Context:** Modern multi-agent systems frequently delegate decision-making to LLMs, exposing systems to prompt injection, hallucination, and non-deterministic behavior.
- **Decision:** Formalize a strict boundary: **AI analyzes deliverables under SLA contracts; deterministic code authorizes money.**
- **Rationale:** An LLM may decide whether a market research report satisfies prompt criteria (SLA PASS/FAIL), but it has zero ability to sign an IOU, generate a netting balance, or execute a PayPal payout.

---

### ADR-014: Single-Container Deployment Strategy on Render
- **Status:** Accepted.
- **Context:** The project requires a cloud deployment plan that is simple, cost-effective, reproducible, and compliant with SQLite data persistence.
- **Decision:** Deploy Tally Nexus as a single Docker container / Web Service on **Render** configured with a **Persistent Disk** mounted at `/data`.

---

### ADR-015: Adoption of Node.js 24 Native `node:sqlite` Engine
- **Status:** Accepted (Superseding ADR-004).
- **Context:** Project baseline initially specified `better-sqlite3`. Node.js 24.17.0+ introduces built-in `node:sqlite` with zero native C++ build dependencies, full synchronous execution support, and official LTS backing.
- **Decision:** Adopt `node:sqlite` as the primary database driver. Enable Write-Ahead Logging (WAL) and `synchronous=NORMAL`. Verify durability under hard process termination (`SIGKILL`).
- **Consequences:** Eliminates `node-gyp` native compile issues across platforms while achieving verified process crash recovery.

---

### ADR-016: Multi-Debtor Intermediate Clearing Accounting & Concurrency Guards
- **Status:** Accepted.
- **Context:** In multilateral netting with $N$ debtors and $M$ creditors, capturing an individual debtor's payment cannot immediately advance the cycle to `CAPTURED` nor credit full creditor entitlements, or premature payouts and duplicate allocations occur.
- **Decision:**
  1. Route all individual debtor collections to `LIABILITY:COLLECTION_IN_CLEARING`.
  2. Transition cycle status to `CAPTURED` strictly when every net debtor's obligation is confirmed.
  3. Allocate creditor liabilities in a single atomic transaction upon cycle completion.
  4. Perform atomic re-verification of `paypal_orders.status` inside `db.withTransaction` lock after external PayPal capture calls to prevent check-then-act races.

---

### ADR-017: 5-Stage Return Verification & Single-Reissue Entitlement Model
- **Status:** Accepted.
- **Context:** When a creditor payout item is returned, refunded, or fails at PayPal, reissuing payouts prematurely while parent status is pending or held risks duplicate disbursements.
- **Decision:**
  1. Enforce strict terminal status prerequisite (`RETURNED`, `REFUNDED`, `FAILED`).
  2. Require completion of the 5-stage return verification sequence (`PARENT_TERMINAL_CONFIRMED` $\to$ `RETURN_FUNDS_VERIFIED` $\to$ `INTERNAL_LEDGER_RESTORED` $\to$ `CREDITOR_PAYABLE_REINSTATED` $\to$ `REISSUE_AUTHORIZED`).
  3. Enforce single-reissue entitlement via partial unique index `uq_active_child_per_parent` (at most one active/settled child reissue per parent).
  4. Parent item preserves terminal status with `reissue_authorization_state = 'CHILD_SETTLED'` upon child success to avoid late parent success collisions.

---

### ADR-018: Hermetic Single-Page Operator Dashboard with Zero CDN Dependencies
- **Status:** Accepted.
- **Context:** The hackathon operator dashboard must execute reliably in offline, sandboxed, and air-gapped demo environments without depending on external script CDNs or third-party stylesheets.
- **Decision:** Embed a self-contained Single-Page Application (HTML5, modern CSS3, vanilla ES6 JS) served directly by Express at `/` and `/dashboard`. Connect in real-time to the `/api/events/stream` Server-Sent Events endpoint and live REST APIs.

---

### ADR-019: Production HTTP Server Bootstrap & Graceful Lifecycle Management
- **Status:** Accepted.
- **Context:** In production and local development, the application must run as an autonomous daemon via `npm start` or `npm run dev`, cleanly managing database connections and graceful OS termination signals.
- **Decision:** Implement `src/server.ts` wiring `createApp`, initializing `DatabaseManager`, running migrations, detecting PayPal credentials vs deterministic mock fallback, and handling `SIGINT`/`SIGTERM` to close SQLite safely.

---

### ADR-020: Deterministic 180s Flagship Scenario & Multi-Tier Sandbox Validation
- **Status:** Accepted.
- **Context:** Evaluators need to independently verify the complete multi-agent lifecycle under strict hackathon evaluation constraints without requiring pre-configured external credentials or manual PayPal UI interaction.
- **Decision:** Implement `src/demo/flagship-runner.ts` and CLI runner `src/demo/cli.ts` executing the canonical 5-agent consortium across 6 scenes in under 100ms. Provide dual-mode execution (live PayPal Sandbox or local deterministic simulator) and expose `POST /api/demo/run` for one-click UI invocation.

---

### ADR-021: AG Grid Community Virtualized High-Density Ledger Integration
- **Status:** Accepted.
- **Context:** Visualizing high-density micro-IOUs (1,500+ items) in a standard DOM table degrades browser render performance and limits interactive analysis (filtering, sorting, paging, tooltips).
- **Decision:** Integrate AG Grid Community (`ag-grid-community`) into the operator dashboard (`src/dashboard/dashboard-html.ts`). Configure client-side row virtualization, custom cell renderers for currency and truncated Ed25519 signatures, text/number filters, CSV data export, and dark-mode styling aligned with the design token palette.

---

### ADR-022: Hero Scale 1,500+ Swarm Netting & Calculated Rail Fee-Savings Model
- **Status:** Accepted.
- **Context:** To prove clearinghouse feasibility for production agent economies, Tally Nexus must demonstrate large-scale mathematical compression, conservation proofs, and tangible payment rail fee reductions beyond small 5-agent consortiums.
- **Decision:** Implement `src/simulation/scale-clearing-engine.ts` simulating a 10-agent research swarm generating 1,500 deterministic Ed25519-signed micro-IOUs (seeded PRNG `0x7A11`). Apply greedy $O(V)$ multilateral netting, proving zero-sum balance ($\sum \text{Net} \equiv 0$). Calculate exact transaction reduction ($1,500 \to \le 9$ physical transfers, $>99\%$ reduction) and explicit fee savings modeled against standard payment rails ($0.30 fixed + 2.9% volume fee).
