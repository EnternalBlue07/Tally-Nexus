# TALLY NEXUS — FINAL ARCHITECTURE DECISIONS (ADRs)
**Project:** Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine  
**Version:** 1.0.0 (Implementation-Ready Master Architecture)  
**Date:** November 7, 2026  
**Status:** Authoritative Architectural Single Source of Truth  

---

## Architecture Decision Records (ADRs) Index

- [ADR-001: Runtime Environment (Node.js 24 LTS)](#adr-001-runtime-environment-nodejs-24-lts)
- [ADR-002: Programming Language (TypeScript Strict Mode)](#adr-002-programming-language-typescript-strict-mode)
- [ADR-003: HTTP Routing Framework (Express with Raw Body Preservation)](#adr-003-http-routing-framework-express-with-raw-body-preservation)
- [ADR-004: Primary Database Engine (SQLite via `better-sqlite3` in WAL Mode)](#adr-004-primary-database-engine-sqlite-via-better-sqlite3-in-wal-mode)
- [ADR-005: Production Database Portability & PostgreSQL Strategy](#adr-005-production-database-portability--postgresql-strategy)
- [ADR-006: Omission of Redis & Distributed Cache](#adr-006-omission-of-redis--distributed-cache)
- [ADR-007: Cryptographic Identity & Micro-IOU Signatures (Ed25519)](#adr-007-cryptographic-identity--micro-iou-signatures-ed25519)
- [ADR-008: Deterministic Multilateral Netting Algorithm ($O(V + E)$)](#adr-008-deterministic-multilateral-netting-algorithm-ov--e)
- [ADR-009: Fiduciary Financial Firewall & Custodial Capital Separation](#adr-009-fiduciary-financial-firewall--custodial-capital-separation)
- [ADR-010: Two-Tier PayPal Settlement Rail (Orders v2 + Payouts v1)](#adr-010-two-tier-paypal-settlement-rail-orders-v2--payouts-v1)
- [ADR-011: Webhook Cryptographic Verification & Replay Protection](#adr-011-webhook-cryptographic-verification--replay-protection)
- [ADR-012: Transactional Outbox Pattern & SSE Event Stream](#adr-012-transactional-outbox-pattern--sse-event-stream)
- [ADR-013: Decoupling AI Cognition from Financial Authorization](#adr-013-decoupling-ai-cognition-from-financial-authorization)
- [ADR-014: Single-Container Deployment Strategy on Render](#adr-014-single-container-deployment-strategy-on-render)

---

### ADR-001: Runtime Environment (Node.js 24 LTS)
- **Status:** Accepted.
- **Context:** We need a modern, high-performance runtime supporting native cryptography, modern ECMAScript standards, and standardized HTTP primitives.
- **Decision:** Target **Node.js 24 LTS**.
- **Rationale:** Node.js 24 provides global `fetch` (via `undici`), native Web Crypto and Ed25519 algorithms in `node:crypto`, and native Buffer operations, eliminating heavy third-party polyfills.
- **Consequences:** All developer and deployment environments must use Node 24. Older Node versions (< 20) are unsupported.

---

### ADR-002: Programming Language (TypeScript Strict Mode)
- **Status:** Accepted.
- **Context:** Financial ledgers and settlement state machines require compile-time type safety to prevent null-pointer dereferences, implicit number conversions, and state-machine invalid transitions.
- **Decision:** Implement 100% of the backend codebase in **TypeScript 5.7+** with `strict: true`, `noImplicitAny: true`, and `exactOptionalPropertyTypes: true`.
- **Rationale:** Strict typing guarantees that monetary quantities are explicitly typed as integers (`cents: number`) and prevents string-to-number arithmetic bugs.
- **Consequences:** Code generation and development require a compilation pass or tsx runtime loader.

---

### ADR-003: HTTP Routing Framework (Express with Raw Body Preservation)
- **Status:** Accepted.
- **Context:** The server must ingest webhook events from PayPal, provide REST APIs for agent task management, and stream SSE events to the operator UI. PayPal webhook verification strictly requires access to the exact unparsed raw request buffer.
- **Decision:** Use **Express 4.21+** configured with `express.raw({ type: 'application/json' })` on webhook routes, preserving `req.rawBody` before JSON parsing.
- **Rationale:** Standard `express.json()` mutates whitespace and JSON key ordering, which invalidates cryptographic RSA-SHA256 signature verification.
- **Consequences:** Webhook handlers must explicitly verify the raw buffer before calling `JSON.parse()`.

---

### ADR-004: Primary Database Engine (SQLite via `better-sqlite3` in WAL Mode)
- **Status:** Accepted.
- **Context:** Tally Nexus requires an ACID-compliant, self-contained relational database capable of running embedded in desktop, CI/CD, and local demo environments with zero external daemon configuration.
- **Decision:** Use **SQLite 3 via `better-sqlite3`** operating in Write-Ahead Logging mode (`PRAGMA journal_mode = WAL;`) and synchronous normal (`PRAGMA synchronous = NORMAL;`).
- **Rationale:**
  1. `better-sqlite3` executes synchronously, completely eliminating asynchronous JavaScript event loop race conditions during transaction blocks (`BEGIN IMMEDIATE ... COMMIT`).
  2. Full support for complex declarative triggers, check constraints, and partial unique indexes (`CREATE UNIQUE INDEX ... WHERE ...`).
  3. Single-file database simplifies local testing, demo reproducibility, and audit trail archiving.
- **Consequences:** Write operations are serialized by SQLite's single-writer architecture. High-throughput distributed clustering requires migration to PostgreSQL.

---

### ADR-005: Production Database Portability & PostgreSQL Strategy
- **Status:** Accepted.
- **Context:** While SQLite is ideal for MVP, local testing, and deterministic demos, enterprise deployment requires horizontal scaling on cloud PostgreSQL.
- **Decision:** Architect all SQL statements using standard ANSI SQL-92/99 DDL. Isolate database interactions inside a Data Access Object (DAO) layer.
- **Rationale:** SQLite triggers use `RAISE(ABORT, ...)` while PostgreSQL requires PL/pgSQL stored procedures. By keeping business logic in service classes and mirroring trigger invariants in application guards, porting to PostgreSQL requires only replacing trigger syntax with PostgreSQL functions without altering schema structure.

---

### ADR-006: Omission of Redis & Distributed Cache
- **Status:** Accepted.
- **Context:** Many architectures introduce Redis for pub/sub, caching, and distributed locking.
- **Decision:** **Omit Redis entirely.** All state, locks, idempotency keys, and event outbox queues reside directly in SQLite.
- **Rationale:**
  1. Eliminates dual-write consistency problems between Redis and the database.
  2. SQLite WAL mode handles thousands of read queries per second in-process with sub-millisecond latency.
  3. The transactional outbox table (`system_events`) provides reliable pub/sub for SSE streaming with zero risk of cache eviction or message loss.

---

### ADR-007: Cryptographic Identity & Micro-IOU Signatures (Ed25519)
- **Status:** Accepted.
- **Context:** Agents must be able to issue micro-IOUs that are tamper-evident, non-repudiable, and verifiable offline without a centralized authority.
- **Decision:** Every agent is provisioned an **Ed25519 cryptographic keypair**. IOUs are digitally signed by the debtor agent over a canonical JSON serialization of the task deliverable, amount, cycle ID, and timestamp.
- **Rationale:** Ed25519 delivers 128-bit security, 64-byte signatures, fast verification (~50,000 verifications/sec), and immunity to length-extension attacks.
- **Consequences:** The clearinghouse engine must reject any IOU whose digital signature fails cryptographic verification against the agent's public key registered in the database.

---

### ADR-008: Deterministic Multilateral Netting Algorithm ($O(V + E)$)
- **Status:** Accepted.
- **Context:** Gross bilateral payments between $N$ agents generate $O(N^2)$ transactions and excessive transaction fees.
- **Decision:** Implement a **deterministic multilateral netting algorithm** based on vertex balance summation:
  $$B_i = \sum_{j} \text{Credit}_{j \to i} - \sum_{k} \text{Debt}_{i \to k}$$
  Agents with $B_i > 0$ are net creditors; agents with $B_i < 0$ are net debtors; agents with $B_i = 0$ are net zero and clear with zero money movement.
- **Rationale:** In the flagship 5-agent consortium, gross transactions totaling $130.00 collapse into a single $45.00 payment from the net debtor (Research Agent) distributed to 4 net creditors ($20, $15, $5, $5), achieving a **65.4% reduction in cash flow volume and a 75% reduction in payment rail transactions**.

---

### ADR-009: Fiduciary Financial Firewall & Custodial Capital Separation
- **Status:** Accepted.
- **Context:** Clearinghouse operators must never commingle custodial settlement funds with operating capital.
- **Decision:** Maintain two strictly segregated internal cash partitions:
  1. `ASSET:PAYPAL_SETTLEMENT_CASH`: Rings-fenced debtor funds held in custodial trust for creditors.
  2. `ASSET:OPERATOR_CASH`: Operator equity utilized to absorb rail fees, absorb operational losses, and maintain the $10.00 reserve floor (`OPERATOR_RESERVE_FLOOR`).
- **Rationale:** Ensures that even during operational anomalies, rail fee surges, or delayed debits, creditor principal is 100% preserved.

---

### ADR-010: Two-Tier PayPal Settlement Rail (Orders v2 + Payouts v1)
- **Status:** Accepted.
- **Context:** The clearinghouse must collect net funds from human-authorized debtor wallets and disburse net entitlements to autonomous creditor agent wallets.
- **Decision:**
  - **Debtor Ingestion:** PayPal Orders v2 (`POST /v2/checkout/orders` with `intent: "CAPTURE"`), requiring human debtor approval in the PayPal sandbox portal.
  - **Creditor Distribution:** PayPal Payouts v1 (`POST /v1/payments/payouts`), executing a single batch payout with unique `sender_batch_id` and item-level `sender_item_id`.
- **Rationale:** Separates customer-approved funding from automated programmatic disbursement.

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
- **Rationale:** Guarantees end-to-end cryptographic integrity and complete protection against replay attacks and late webhook double-extinguishment collisions.

---

### ADR-012: Transactional Outbox Pattern & SSE Event Stream
- **Status:** Accepted.
- **Context:** The operator dashboard requires real-time observability of clearing state transitions without client polling.
- **Decision:** Implement a **Transactional Outbox table (`system_events`)** in SQLite. Financial mutations insert a monotonic event into `system_events` inside the same database transaction. An Express Server-Sent Events (SSE) route (`GET /api/events/stream`) tails `system_events` by monotonic `sequence_id`.
- **Rationale:** Guarantees that clients never miss an event upon reconnection and eliminates polling overhead while ensuring zero desynchronization between ledger state and visual UI.

---

### ADR-013: Decoupling AI Cognition from Financial Authorization
- **Status:** Accepted.
- **Context:** Modern multi-agent systems frequently delegate decision-making to LLMs, exposing systems to prompt injection, hallucination, and nondeterministic behavior.
- **Decision:** Formalize a strict boundary: **AI analyzes deliverables under SLA contracts; deterministic code authorizes money.**
- **Rationale:** An LLM may decide whether a market research report satisfies prompt criteria (SLA PASS/FAIL), but it has zero ability to sign an IOU, generate a netting balance, or execute a PayPal payout.

---

### ADR-014: Single-Container Deployment Strategy on Render
- **Status:** Accepted.
- **Context:** The project requires a cloud deployment plan that is simple, cost-effective, reproducible, and compliant with SQLite data persistence.
- **Decision:** Deploy Tally Nexus as a single Docker container / Web Service on **Render** configured with a **Persistent Disk** mounted at `/data`.
- **Rationale:** Avoids the multi-container orchestration overhead of Kubernetes for MVP while guaranteeing SQLite database persistence across container restarts.

