# TALLY NEXUS — Production Database Traceability Matrix
**Stage 1: Production Database Verification & Invariant Enforcement**
**Authoritative Reference:** ADR-001, ADR-011, ADR-012, ADR-014, Phase 5.22 Specification

---

## 1. Overview
This traceability matrix provides a 1-to-1 mapping between the specification-level invariants validated in the Phase 5.22 Python verification suite and the production Node.js 24 + TypeScript Vitest test suite executing against a disk-backed SQLite WAL database.

---

## 2. Canonical Specification Invariants (T1 – T16)

| Test ID | Vitest Test Name | Architecture / Specification Ref | Database Engine Enforcement Mechanism | Expected Empirical Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **T1** | `T1: Duplicate child reissue blocked by partial unique index` | ADR-011 §2.1, PRD §5.4 | Partial Unique Index `uq_active_child_per_parent` on `paypal_payout_reissues(original_item_id) WHERE status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS')` | Second active child insert throws `SQLITE_CONSTRAINT` / `UNIQUE constraint failed`. Exactly 1 active child allowed. |
| **T2** | `T2: Concurrent reissue serialization requires REISSUE_AUTHORIZED` | ADR-011 §2.2, State Machine §3.2 | Trigger `trg_reissue_entitlement_check` on `paypal_payout_reissues` | Insertion fails with `REISSUE_PROHIBITED: Reissue requires full atomic return verification sequence reaching REISSUE_AUTHORIZED state.` |
| **T3** | `T3: Concurrent Stage 6 recovery requests blocked by monotonic sequence guard` | ADR-012 §3.1, PRD §6.2 | Trigger `trg_recovery_claim_events_sequence_check` & `trg_recovery_claim_events_transition_check` | Second concurrent collection request attempts invalid from_stage (already 6) and is rejected with `STAGE_MISMATCH`. |
| **T4** | `T4: Duplicate webhook delivery blocked by primary key idempotency` | ADR-008 §4.1, API Spec §5.1 | Primary Key constraint on `processed_webhooks(paypal_event_id)` & `UNIQUE(transmission_id)` | Duplicate webhook insert rejected with `UNIQUE constraint failed: processed_webhooks.paypal_event_id`. |
| **T5** | `T5: Comprehensive immutability on Stage >= 4 core fields` | ADR-012 §2.4, PRD §6.5 | Trigger `trg_recovery_claims_evidence_immutable` on `recovery_claims` | Updates to `stage4_evidence_hash`, `claim_amount_cents`, `counterparty_id`, `claim_owner`, etc. throw `IMMUTABILITY_VIOLATION`. |
| **T6** | `T6: Direct claim stage update without matching event blocked` | ADR-012 §1.2, PRD §6.1 | Trigger `trg_recovery_claims_prevent_direct_stage_update` on `recovery_claims` | Direct SQL `UPDATE recovery_claims SET stage = 7` throws `STAGE_DESYNCHRONIZATION`. Stage mutations strictly mediated via events. |
| **T7** | `T7: Atomic outbox synchronization updates claim upon event insert` | ADR-012 §1.3, PRD §6.3 | Trigger `trg_recovery_claim_events_atomic_sync` on `recovery_claim_events` | Inserting event 1->2 automatically updates `recovery_claims.stage = 2` without application race or dual-write window. |
| **T8** | `T8: Returned before balance reflection blocked` | ADR-011 §3.1, State Machine §3.3 | Trigger `trg_reissue_entitlement_check` on `paypal_payout_reissues` | Reissue attempted when state is `RETURN_FUNDS_VERIFIED` (prior to ledger restoration) is rejected. |
| **T9** | `T9: Reissue after creditor payable already extinguished blocked` | ADR-011 §4.2, PRD §5.5 | Trigger `trg_reissue_child_terminal_sync` & `uq_active_child_per_parent` | Once child item reaches `SUCCESS`, parent transitions to `CHILD_SETTLED`. Further reissues rejected. |
| **T10** | `T10: Active late parent webhook collision blocked and quarantined` | ADR-011 §5.1, Failure Matrix §2.3 | Trigger `trg_parent_payout_item_late_success_guard` on `paypal_payout_items` | Late `SUCCESS` webhook arriving for parent when child is `CHILD_ACTIVE` or `CHILD_SETTLED` throws `LATE_PARENT_SUCCESS_COLLISION`. |
| **T11** | `T11: Transaction rollback integrity preserves 0 partial state` | ADR-001 §3.2, PRD §4.3 | `BEGIN IMMEDIATE ... ROLLBACK` in `DatabaseManager.withTransaction` | Error midway through multi-table transaction triggers rollback; zero partial rows survive in database. |
| **T12** | `T12: Recovery collection exceeding original claim amount blocked` | ADR-012 §4.1, PRD §6.4 | Check constraint on `recovery_claims`: `cash_recovered_cents + ... <= claim_amount_cents` | Event attempting to collect $15.00 on a $10.00 claim rejected by CHECK constraint. |
| **T13** | `T13: Unauthorized recovery ownership and invalid counterparty types rejected` | ADR-012 §2.1, PRD §6.6 | Check constraint on `recovery_claims(counterparty_type IN ('AGENT', 'PAYPAL'))` | Inserting unknown counterparty type throws `CHECK constraint failed`. |
| **T14** | `T14: Recovery collection transitions after Stage 7 closure prohibited` | ADR-012 §3.3, PRD §6.7 | Trigger `trg_recovery_claim_events_transition_check` | Attempted transition from Stage 7 back to Stage 6 throws `INVALID_STAGE_TRANSITION`. |
| **T15** | `T15: Scenario A-DEF default loss modeling and reserve adequacy` | ADR-014 §2.1, PRD §7.2 | Dual framework arithmetic verification & Stage 7 closure | Defaulted claim written off at Stage 7; ending operator cash ($77.14) verified $\ge$ mandatory reserve floor ($10.00). |
| **T16** | `T16: Cryptographic webhook handshake: timestamp skew, cert domain, replay defense` | ADR-008 §2.1, API Spec §5.2 | Anti-replay log (`processed_webhooks`), timestamp skew ($\le 300$s), cert URL domain whitelist | Stale timestamps (>300s), spoofed domains, and replayed transmission IDs reliably rejected. |

---

## 3. Concurrency & Multi-Connection Invariants (C1 – C3)

| Test ID | Vitest Test Name | Mechanism | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **C1** | `C1: Multi-connection write lock contention with BEGIN IMMEDIATE` | Two independent `DatabaseManager` instances connected to same disk WAL file. Conn 1 holds `BEGIN IMMEDIATE`. | Conn 2 attempting `BEGIN IMMEDIATE` is blocked until timeout and throws `database is locked`. |
| **C2** | `C2: Lock contention resolution via executeWithRetry` | Conn 1 performs write in transaction; Conn 2 executes write via `executeWithRetry` with backoff. | Conn 2 waits out lock, retries, and succeeds without crashing or data loss. |
| **C3** | `C3: Multi-connection race on child payout reissue` | Conn 1 and Conn 2 simultaneously attempt child reissue for the same parent item. | Exactly 1 connection succeeds; the other is rejected by `uq_active_child_per_parent`. Zero duplicate child payouts created. |

---

## 4. Crash & Restart Durability Invariants (R1 – R2)

| Test ID | Vitest Test Name | Mechanism | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **R1** | `R1: Committed transaction durability across disk database reopen` | Conn 1 inserts records in committed transaction. Connection closed. Conn 2 opens same disk file. | 100% of committed rows and indexes survive process reopen. |
| **R2** | `R2: Uncommitted transaction rollback cleanliness across abnormal disconnect` | Conn 1 begins transaction, writes rows, but encounters error and rolls back / closes without commit. Conn 2 opens database. | Exactly 0 uncommitted rows persist; WAL cleanly recovers. |

---

## 5. Negative & Constraint Integrity Invariants (N1 – N4)

| Test ID | Vitest Test Name | Mechanism | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **N1** | `N1: Trigger bypass prevention on direct stage mutation` | Direct `UPDATE recovery_claims SET stage = 5` without preceding event. | Rejected by `trg_recovery_claims_prevent_direct_stage_update`. |
| **N2** | `N2: Non-monotonic sequence ID rejected in event log` | Inserting `sequence_id = 3` when highest existing sequence is 1. | Rejected by `trg_recovery_claim_events_sequence_check`. |
| **N3** | `N3: Append-only immutability on audit log tables` | `UPDATE` or `DELETE` executed against `system_events` or `recovery_claim_events`. | Rejected by immutability constraints. |
| **N4** | `N4: Foreign key constraint enforcement` | Inserting task or payout with non-existent `agent_id` or `cycle_id`. | Strictly rejected by `FOREIGN KEY constraint failed`. |
