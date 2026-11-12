# Tally Nexus — Technical Documentation Hub

Welcome to the central documentation index for **Tally Nexus**, an institutional-grade autonomous agent clearinghouse providing deterministic bilateral debt compression, subledger finality, and authoritative PayPal Sandbox settlement rails.

---

## 🧭 System Documentation Index

### 1. Architecture & Core Specifications
System architecture, execution lifecycle, mathematical netting models, and canonical Architecture Decision Records (ADRs).

- **[Product Requirements Document (PRD)](./architecture/PRD.md)**: Master specification of functional, operational, and financial clearing requirements.
- **[System Architecture Guide](./architecture/ARCHITECTURE.md)**: High-level system topology, module boundaries, concurrency model, and data flows.
- **[Mathematical Netting & Algorithm Design](./architecture/DESIGN.md)**: Mathematical formulations for $O(V+E)$ graph condensation and cycle cancellation.
- **[Execution Lifecycle & Flow Diagrams](./architecture/FLOW.md)**: End-to-end lifecycle flow from agent task commissioning to cryptographic subledger seal.
- **[Architecture Decision Records (ADR-001 to ADR-022)](./architecture/DECISIONS.md)**: Canonical record of all 22 architectural choices, rationale, and consequences.

---

### 2. API & Database Specifications
Authoritative REST interfaces, event streaming specs, and SQLite relational schema with safety triggers.

- **[REST & SSE API Specification](./api/API_SPEC.md)**: Complete endpoint contract, authentication rules, rate limits, and SSE schemas.
- **[Database Schema & Trigger Matrix](./database/DATABASE_SCHEMA.md)**: Double-entry table structures, indexes, and 14 strict SQLite triggers asserting zero-variance ($\Delta \equiv \$0.00$).

---

### 3. PayPal Integration & Payment Rails
Deterministic bridge between mathematical multilateral netting and real-world banking rails.

- **[PayPal Integration Design](./integrations/paypal/PAYPAL_INTEGRATION_DESIGN.md)**: End-to-end integration architecture for Orders v2 captures and Payouts v1 disbursements.
- **[PayPal State Machine](./integrations/paypal/PAYPAL_STATE_MACHINE.md)**: Strict state transitions, timeout handling, idempotency, and rollback rules.
- **[PayPal Failure & Edge Case Matrix](./integrations/paypal/PAYPAL_FAILURE_MATRIX.md)**: Comprehensive defensive matrix handling network partitions, race conditions, and provider rejections.
- **[PayPal Sandbox Execution Plan](./integrations/paypal/PAYPAL_SANDBOX_EXECUTION_PLAN.md)**: Testbed setup, credential management, and simulated network suites.
- **[PayPal Sandbox Validation Evidence](./integrations/paypal/PAYPAL_SANDBOX_VALIDATION.md)**: Cryptographically verified sandbox execution logs and raw PayPal response artifacts.

---

### 4. Security, Cryptography & Compliance
Threat modeling, RFC 8785 canonical JSON, Ed25519 signatures, and license audits.

- **[Security Threat Model](./security/SECURITY_THREAT_MODEL.md)**: 5-point adversarial threat model covering spoofing, tampering, replay, and insolvency attacks.
- **[Dependency & License Audit](./security/DEPENDENCY_AND_LICENSE_AUDIT.md)**: Automated license verification, SBOM compliance, and vulnerability audit.
- **[Repository & Skills Audit](./security/REPOSITORY_AND_SKILLS_AUDIT.md)**: Comprehensive code quality, dead code elimination, and security hygiene audit.

---

### 5. Testing, Quality Assurance & Verification
Testing strategies, property-based tests, crash durability, and multi-agent simulation suites.

- **[Test Strategy & Harness](./testing/TEST_STRATEGY.md)**: Unit, integration, adversarial security, and end-to-end simulation methodology (216/216 passing vitest suites).

---

### 6. UI / UX Design & Playwright Browser QA
Design system tokens, spatial ergonomics, glassmorphic layout, and automated browser verification.

- **[Design Direction](./design/DESIGN_DIRECTION.md)**: Philosophy of the PayPal-inspired institutional financial command center.
- **[Design System Architecture](./design/DESIGN_SYSTEM.md)**: 3-layer token architecture, typography scale, color primitives, and contrast standards.
- **[Visual Audit & Defect Log](./design/VISUAL_AUDIT.md)**: Pre- and post-transformation visual audit across multiple viewports.
- **[Playwright Visual QA](./design/PLAYWRIGHT_VISUAL_QA.md)**: Headless browser visual regression test specs and snapshot verification.
- **[Screenshot Catalog](./design/SCREEN_SHOT_LIST.md)**: Annotated catalog of UI views across desktop, tablet, and mobile.
- **[Implementation Report](./design/IMPLEMENTATION_REPORT.md)**: Component-level refactoring log and CSS grid token migrations.

---

### 7. Deployment & Operations
Production containerization, zero-downtime execution, and hosting configuration.

- **[Deployment Plan](./deployment/DEPLOYMENT_PLAN.md)**: Docker container setup, Render web service config, and environment injection.

---

### 8. Hackathon Submission Dossier
Official judging artifacts, demonstration scripts, and submission package.

- **[Official Submission Dossier](./submission/SUBMISSION.md)**: Complete project submission document detailing problem, solution, architecture, and live links.
- **[Judge Demo Script (3-Minute Tour)](./submission/DEMO_SCRIPT.md)**: Exact chronological script for demonstrating the 6-step clearing lifecycle to hackathon judges.

---

### 9. Engineering Chronicle & Audit Reports
Consolidated milestone verification reports, safety audits, and release assessments.

- **[Phase Implementation Chronicle & Release Audits](./reports/PHASE_CHRONICLE_AND_RELEASE_AUDITS.md)**: Comprehensive chronicle consolidating Phases 1 through 12, the 23-subphase safety hardening retrospective, the 1,500 IOU enterprise scale benchmarks, and the 8/8 Phase 12 Quality Gates assessment.
