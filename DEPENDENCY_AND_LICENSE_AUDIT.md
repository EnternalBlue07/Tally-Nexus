# TALLY NEXUS — DEPENDENCY AND LICENSE AUDIT
**Project:** Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine  
**Version:** 1.0.0 (Pre-Implementation Baseline)  
**Date:** November 7, 2026  
**Auditor:** Principal Software Engineer & Security Architect  

---

## 1. Dependency Philosophy: Lean, Minimal, Verifiable

In financial systems, every external dependency introduces supply-chain attack surfaces, maintenance overhead, and licensing liabilities. Tally Nexus enforces a **zero-bloat, minimum-dependency standard**:
1. **Leverage Standard Library First:** Use Node.js 24 built-ins (`node:crypto`, `node:fs`, `node:path`, `node:http`, global `fetch`) wherever possible.
2. **Permissive Open-Source Licenses Only:** Every dependency must carry a permissive license (**MIT**, **Apache 2.0**, or **BSD-3-Clause**). No GPL, AGPL, commercial proprietary, or viral copyleft licenses are permitted.
3. **Exact SemVer Pinning:** All dependencies in `package.json` are pinned to exact versions (e.g. `8.7.0`, not `^8.7.0`) with an immutable `package-lock.json`.

---

## 2. Production Dependencies Manifest

| Package Name | Exact Version | License | Bundle Size | Purpose & Justification |
| :--- | :---: | :---: | :---: | :--- |
| **`better-sqlite3`** | `11.8.1` | MIT | ~2.5 MB | High-performance synchronous SQLite3 driver. Supports WAL mode, `BEGIN IMMEDIATE` exclusive locking, triggers, and partial indexes without async race conditions. |
| **`express`** | `4.21.2` | MIT | ~200 KB | Minimalist HTTP routing engine for REST endpoints, SSE stream (`text/event-stream`), and raw byte preservation for webhook RSA verification. |
| **`cors`** | `2.8.5` | MIT | ~30 KB | Strict CORS middleware for localhost and authorized dashboard origins. |
| **`dotenv`** | `16.4.7` | BSD-2-Clause | ~15 KB | Loads environment variables (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PORT`) safely from `.env`. |
| **`zod`** | `3.24.2` | MIT | ~60 KB | Runtime schema validation for incoming API payloads, task requests, and PayPal webhook JSON bodies. |
| **`uuid`** | `11.1.0` | MIT | ~12 KB | RFC4122 UUIDv4 generation for idempotency keys, cycle IDs, and event IDs. |

### Summary of Production Dependencies:
- **Total Production NPM Packages:** **6 direct dependencies.**
- **Total Production Footprint:** `< 3 MB` unpacked.
- **License Distribution:** 5 MIT, 1 BSD-2-Clause. **100% Permissive.**

---

## 3. Development & Testing Dependencies Manifest

| Package Name | Exact Version | License | Purpose & Justification |
| :--- | :---: | :---: | :--- |
| **`typescript`** | `5.7.3` | Apache-2.0 | Type checking and compilation target ES2023 / NodeNext. |
| **`@types/node`** | `24.0.0` | MIT | Authoritative TypeScript declarations for Node.js 24 runtime APIs. |
| **`@types/express`** | `5.0.0` | MIT | TypeScript typings for Express request, response, and middleware. |
| **`@types/better-sqlite3`** | `7.6.12` | MIT | Typings for SQLite statements, transactions, and pragma commands. |
| **`@types/cors`** | `2.8.17` | MIT | Typings for CORS configuration options. |
| **`tsx`** | `4.19.3` | MIT | Blazing fast TypeScript execution engine for local development and test runs without build steps. |
| **`vitest`** | `3.0.7` | MIT | Next-generation unit test runner with native TypeScript and ESM support. |
| **`rimraf`** | `6.0.1` | ISC | Cross-platform directory cleanup for build and test artifacts. |

---

## 4. Frontend & UI Dependencies (Clearinghouse Dashboard)

For the interactive financial dashboard, Tally Nexus uses standard HTML5/CSS3 bundled with AG Grid:

| Package Name | Exact Version | License | Purpose & Justification |
| :--- | :---: | :---: | :--- |
| **`@ag-grid-community/core`** | `33.1.1` | MIT | Enterprise-grade grid model for tabular clearinghouse data, net positions, and subledger accounting. |
| **`@ag-grid-community/client-side-row-model`** | `33.1.1` | MIT | Client-side sorting, filtering, and real-time SSE row updates. |

---

## 5. Runtime Compatibility Verification

### 5.1 Node.js 24 LTS Verification
- **Native Fetch:** Node.js 24 includes global `fetch` powered by `undici`. No external `node-fetch` or `axios` is required for PayPal REST API communication.
- **Native Web Crypto & Node Crypto:** Built-in `node:crypto` provides native Ed25519 signing (`crypto.sign(null, data, privateKey)`) and verification (`crypto.verify(null, data, publicKey, signature)`), eliminating third-party sodium or tweetnacl packages.
- **SQLite Native Addon:** `better-sqlite3` compiles cleanly against Node.js 24 via prebuilds or node-gyp on Windows, macOS, and Linux.

### 5.2 Python 3.12+ Verification
- Python 3.12 is utilized strictly for out-of-band verification suites (`verify_phase5_22_complete_suite.py`).
- Requires only the Python standard library (`sqlite3`, `sys`, `time`, `hashlib`, `unittest`). Zero external pip packages are required.

---

## 6. Prohibited & Rejected Packages

| Prohibited Category / Package | Rejection Reason | Approved Architectural Alternative |
| :--- | :--- | :--- |
| **Deprecated PayPal SDKs** (`@paypal/checkout-server-sdk`) | Deprecated by PayPal; lacks modern TypeScript typings and support for Payouts v1 / Webhooks v1. | Native REST client using Node.js `fetch` against official PayPal REST endpoints. |
| **Heavy ORMs** (`typeorm`, `prisma`, `sequelize`) | Obscures SQL execution, causes N+1 queries, lacks fine-grained control over SQLite triggers and partial unique indexes. | Direct SQL queries and prepared statements via `better-sqlite3`. |
| **Heavy UI Frameworks** (`next.js`, `angular`) | Extreme dependency bloat, SSR complexity unnecessary for a clearinghouse operator portal. | Lightweight SPA / static HTML5 with AG Grid and native SSE client. |
| **Copyleft / Viral Licenses** (`GPL`, `AGPL`) | Violates MIT open-source publication criteria and creates enterprise IP risk. | Strictly prohibited. Automated license audit in CI/CD pipeline. |

