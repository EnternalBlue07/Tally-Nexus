# API_SPEC.md — TALLY NEXUS API SPECIFICATION

**Document Version:** 1.0.0 (Phase 4 Specification)  
**System Name:** TALLY NEXUS  
**Base URL:** `http://localhost:3001`  
**Protocol:** HTTP/1.1 REST + Server-Sent Events (SSE)  
**Classification:** Core API Contracts & Schemas  

---

## 1. General Principles & Error Taxonomy

### 1.1 Headers & Content Negotiation
- `Content-Type: application/json` for all request and response bodies.
- `Idempotency-Key: <UUIDv4>` header supported on state-mutating endpoints (`POST`).
- Responses follow strict camelCase JSON schemas validated by **Zod**.

### 1.2 Standard Error Response Schema
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "The Ed25519 signature on IOU-003 does not match the debtor public key.",
    "details": {
      "iouId": "iou_8f921a",
      "expectedKey": "ed25519_pub_...",
      "timestamp": "2026-11-04T22:50:00Z"
    }
  }
}
```

### 1.3 Error Taxonomy Matrix
| HTTP Status | Error Code | Description |
| :--- | :--- | :--- |
| **400 Bad Request** | `VALIDATION_ERROR` | Request payload failed Zod schema parsing. |
| **400 Bad Request** | `SCHEMA_CHECK_FAILED` | Artifact failed deterministic schema constraints. |
| **401 Unauthorized** | `INVALID_SIGNATURE` | Cryptographic signature verification failed. |
| **409 Conflict** | `IDEMPOTENT_REPLAY` | Idempotency key already processed with different payload. |
| **422 Unprocessable** | `INVARIANT_VIOLATION` | Netting engine failed zero-sum conservation ($\sum \text{Net} \neq 0$). |
| **422 Unprocessable** | `FIREWALL_REJECTED` | Financial Firewall policy check failed. |
| **502 Bad Gateway** | `LLM_PROVIDER_ERROR` | External inference failed or timed out. |
| **502 Bad Gateway** | `PAYPAL_API_ERROR` | PayPal Sandbox API returned non-2xx status. |

---

## 2. Real-Time Event Stream (SSE)

### `GET /api/events`
Establishes a persistent Server-Sent Events stream for real-time dashboard updates.

- **Request Headers:**
  - `Accept: text/event-stream`
  - `Last-Event-ID: <sequenceId>` *(optional, enables automatic replay of missed events)*
- **Response Headers:**
  - `Content-Type: text/event-stream`
  - `Cache-Control: no-cache`
  - `Connection: keep-alive`
- **Replay & Live Handoff Protocol (Race-Free):**
  1. Client sends `Last-Event-ID: <sequenceId>` (or omits for beginning).
  2. Server immediately subscribes client to live event bus and buffers incoming events into a FIFO queue.
  3. Server queries DB watermark: `watermark = SELECT MAX(sequence_id) FROM system_events;`
  4. Server streams all persisted events where `sequence_id > Last-Event-ID AND sequence_id <= watermark` in ascending order.
  5. Server drains buffered events with `sequence_id > watermark` in order.
  6. Server transitions connection to live streaming mode.
  7. Client deduplicates by `sequenceId`. Zero events are missed or duplicated.
- **Event Wire Format:**
  ```
  id: 42
  event: IOU_SIGNED
  data: {"sequenceId":42,"eventType":"IOU_SIGNED","entityId":"iou_001","timestamp":"2026-11-04T22:50:15Z","payload":{"amountCents":4000,"debtorId":"agt_research","creditorId":"agt_data"}}
  
  ```

---

## 3. Scenario Runner & Agent APIs

### `POST /api/scenario/run-consortium`
Triggers the canonical 5-agent Research Consortium execution ($130.00 gross baseline).
- **Idempotency:** Supported via `Idempotency-Key`.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "scenarioId": "scn_consortium_001",
      "tasksCreated": 6,
      "totalGrossAmountCents": 13000,
      "status": "COMPLETED",
      "summary": "6 tasks executed successfully with valid Ed25519 IOUs."
    }
  }
  ```

### `POST /api/scenario/inject-adversarial`
Injects Task 7 (malformed exploratory sentiment dataset) to demonstrate SLA rejection.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "taskId": "tsk_007_adv",
      "clientAgentId": "agt_research",
      "providerAgentId": "agt_data",
      "slaVerdict": {
        "outcome": "FAIL",
        "score": 0,
        "reason": "Deliverable violates structural schema constraints (missing required columns).",
        "iouCreated": false
      }
    }
  }
  ```

### `POST /api/scenario/reset`
Resets scenario database state for a fresh demo run (clears active tasks, IOUs, and cycles; preserves immutable historical receipts).
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": { "clearedEntities": ["tasks", "ious", "settlement_cycles"] }
  }
  ```

---

## 4. SLA Evaluation & Evidence Inspection APIs

### `GET /api/sla/verdicts/:taskId`
Retrieves the complete evaluation and evidence chain for a specific task.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "taskId": "tsk_001",
      "verdictId": "vrd_8f921a",
      "outcome": "PASS",
      "score": 94,
      "deterministicChecks": {
        "schemaValid": true,
        "wordCount": 420,
        "minWordCount": 200,
        "artifactHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "semanticEvaluation": {
        "completenessScore": 95,
        "factualGroundingScore": 92,
        "reasoning": "Executive summary explicitly incorporates all mandatory metric dimensions.",
        "evidenceRefs": ["doc_ref_market_2026_q3"]
      },
      "evaluatorMetadata": {
        "provider": "gemini-1.5-flash",
        "latencyMs": 1180
      },
      "timestamp": "2026-11-04T22:45:00Z"
    }
  }
  ```

---

## 5. Multilateral Netting & Clearing APIs

### `GET /api/clearing/preview`
Computes the current multilateral netting matrix across all un-cleared eligible IOUs without committing state.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "grossObligationCount": 6,
      "grossVolumeCents": 13000,
      "netCashFlowRequiredCents": 4500,
      "liquidityReductionPct": 65.38,
      "conservationSumCents": 0,
      "invariantValid": true,
      "netPositions": [
        { "agentId": "agt_research", "grossOwedCents": 7000, "grossReceivesCents": 2500, "netCents": -4500, "role": "DEBTOR" },
        { "agentId": "agt_data",     "grossOwedCents": 2000, "grossReceivesCents": 4000, "netCents": 2000,  "role": "CREDITOR" },
        { "agentId": "agt_compute",  "grossOwedCents": 1500, "grossReceivesCents": 3000, "netCents": 1500,  "role": "CREDITOR" },
        { "agentId": "agt_qa",       "grossOwedCents": 1500, "grossReceivesCents": 2000, "netCents": 500,   "role": "CREDITOR" },
        { "agentId": "agt_loc",      "grossOwedCents": 1000, "grossReceivesCents": 1500, "netCents": 500,   "role": "CREDITOR" }
      ]
    }
  }
  ```

### `POST /api/clearing/prepare-cycle`
Commits eligible IOUs into a newly prepared settlement cycle and runs Financial Firewall gates.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "cycleId": "cyc_20261104_001",
      "status": "FIREWALL_APPROVED",
      "allowedStatuses": ["PREPARED", "FIREWALL_APPROVED", "COLLECTION_PENDING", "COLLECTION_CAPTURED", "COLLECTION_FAILED", "PAYOUT_DISPATCHED", "RECONCILING", "SETTLED", "PARTIAL_FAILURE_HOLD", "PAYOUT_AMBIGUOUS_HOLD", "OPERATOR_DISPUTE_HOLD", "POST_SETTLEMENT_RECONCILING", "ABORTED"],
      "firewallCheck": {
        "status": "APPROVED",
        "signaturesValid": true,
        "zeroSumVerified": true,
        "limitsRespected": true,
        "batchHash": "0x8f2a99c4e2...",
        "antiReplayValid": true
      },
      "netDebtors": [{ "agentId": "agt_research", "amountCents": 4500 }]
    }
  }
  ```

---

## 6. PayPal Settlement Rail APIs

### `POST /api/settlement/initiate-collection`
Creates a PayPal Sandbox Order for the net debtor ($45.00) and returns the approval URL.
- **Request Body:**
  ```json
  { "cycleId": "cyc_20261104_001" }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "paypalOrderId": "ORDER-9DF821948B",
      "amountCents": 4500,
      "currency": "USD",
      "approvalUrl": "https://www.sandbox.paypal.com/checkoutnow?token=9DF821948B"
    }
  }
  ```

### `POST /api/settlement/capture`
Captures the PayPal Order following operator approval redirect.
- **Request Body:**
  ```json
  { "cycleId": "cyc_20261104_001", "paypalOrderId": "ORDER-9DF821948B" }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "captureId": "CAP-3819283719",
      "status": "COMPLETED",
      "amountCapturedCents": 4500,
      "collectedFundsAvailable": true
    }
  }
  ```

### `POST /api/settlement/dispatch-payouts`
Dispatches PayPal Payouts to the 4 net creditors using confirmed collected funds.
- **Request Body:**
  ```json
  { "cycleId": "cyc_20261104_001" }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "payoutBatchId": "PAYOUT-BATCH-7749182",
      "status": "SUBMITTED",
      "recipientCount": 4,
      "totalDisbursedCents": 4500,
      "items": [
        { "agentId": "agt_data",    "email": "agent-data@nexus.local",    "amountCents": 2000, "status": "PENDING" },
        { "agentId": "agt_compute", "email": "agent-compute@nexus.local", "amountCents": 1500, "status": "PENDING" },
        { "agentId": "agt_qa",      "email": "agent-qa@nexus.local",      "amountCents": 500,  "status": "PENDING" },
        { "agentId": "agt_loc",     "email": "agent-loc@nexus.local",     "amountCents": 500,  "status": "PENDING" }
      ]
    }
  }
  ```

### `GET /api/settlement/reconciliation/:cycleId`
Returns item-level payout reconciliation status, formal double-entry accounting balances, and final cycle completion.
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "cycleId": "cyc_20261104_001",
      "cycleStatus": "SETTLED",
      "accounting": {
        "assetsCents": {
          "operatorCash": 9900,
          "settlementCash": 0,
          "payoutsInFlight": 0,
          "disputeReceivables": 0,
          "totalAssets": 9900
        },
        "liabilitiesCents": {
          "creditorPayables": 0,
          "totalLiabilities": 0
        },
        "equityCents": {
          "operatorCapital": 10000,
          "retainedEarnings": -100,
          "totalEquity": 9900
        },
        "identityVerified": true
      },
      "providerReconciliation": {
        "asOfTime": "2026-11-06T19:30:00Z",
        "lastRefreshTime": "2026-11-06T19:30:00Z",
        "isFresh": true,
        "freshnessTtlSeconds": 10800,
        "transactionReflectionStatus": "CONFIRMED",
        "providerAvailableCents": 9900,
        "internalAvailableCashCents": 9900,
        "varianceAvailableCents": 0,
        "providerReportedPendingCents": 0,
        "internalPayoutsInFlightCents": 0,
        "varianceInFlightCents": 0,
        "status": "RECONCILED_MATCH",
        "statusEnum": ["RECONCILED_MATCH", "PENDING_PROVIDER_REFLECTION", "REFLECTION_CONFIRMED", "REFLECTION_TIMEOUT", "STALE_REPORTING_DATA", "DISCREPANCY_DETECTED"]
      },
      "custodialConservation": {
        "capturedPrincipalCents": 4500,
        "disbursedPrincipalCents": 4500,
        "residualPrincipalCents": 0,
        "outstandingLiabilityCents": 0
      },
      "items": [
        { "agentId": "agt_data",    "status": "SUCCESS", "amountCents": 2000, "transactionId": "TXN-001", "reissueCount": 0 },
        { "agentId": "agt_compute", "status": "SUCCESS", "amountCents": 1500, "transactionId": "TXN-002", "reissueCount": 0 },
        { "agentId": "agt_qa",      "status": "SUCCESS", "amountCents": 500,  "transactionId": "TXN-003", "reissueCount": 0 },
        { "agentId": "agt_loc",     "status": "SUCCESS", "amountCents": 500,  "transactionId": "TXN-004", "reissueCount": 0 }
      ],
      "compensatingAdjustments": [],
      "cycleStatusEnum": ["PREPARED", "FIREWALL_APPROVED", "COLLECTION_PENDING", "COLLECTION_CAPTURED", "COLLECTION_FAILED", "PAYOUT_DISPATCHED", "RECONCILING", "SETTLED", "PARTIAL_FAILURE_HOLD", "PAYOUT_AMBIGUOUS_HOLD", "OPERATOR_DISPUTE_HOLD", "OPERATOR_RESERVE_HOLD", "POST_SETTLEMENT_RECONCILING", "ABORTED"],
      "itemStatusEnum": ["PENDING", "SUCCESS", "FAILED", "UNCLAIMED", "RETURNED", "ONHOLD", "BLOCKED", "REFUNDED", "REVERSED"],
      "immutableReceiptHash": "0x5c8e3a2f..."
    }
  }
  ```

### `POST /api/settlement/verify-payout-return`
Executes the atomic 5-stage return verification sequence before child reissue authorization can occur, eliminating false authorization from stale balance reporting.
- **Workflow:**
  1. Validates PayPal webhook `PAYMENT.PAYOUTS-ITEM.RETURNED` or transaction search showing re-credited principal.
  2. Updates `reissue_authorization_state` from `NONE` -> `PARENT_TERMINAL_CONFIRMED` -> `RETURN_FUNDS_VERIFIED`.
  3. Records double-entry journal restoring custodial settlement cash: Dr `ASSET:PAYPAL_SETTLEMENT_CASH` $20 | Cr `ASSET:PAYPAL_PAYOUTS_IN_FLIGHT` $20 (`INTERNAL_LEDGER_RESTORED`).
  4. Verifies creditor liability remains open / reinstated in compensating ledger (`CREDITOR_PAYABLE_REINSTATED`).
  5. Evaluates corrected receiver identity and fiduciary controller signature, advancing to `REISSUE_AUTHORIZED`.
- **Request Body:**
  ```json
  {
    "cycleId": "cyc_20261104_001",
    "itemId": "item_9df821a",
    "returnTransactionId": "PP-RET-TXN-991823",
    "providerWebhookEventId": "WH-9df821a-RET",
    "verifiedReceiverEmail": "agent-data-fixed@nexus.local",
    "authorizationRole": "FIDUCIARY_CONTROLLER",
    "authorizerId": "usr_controller_01",
    "evidenceHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "itemId": "item_9df821a",
      "status": "RETURNED",
      "reissueAuthorizationState": "REISSUE_AUTHORIZED",
      "returnedPrincipalCents": 2000,
      "settlementCashRestored": true,
      "creditorPayableReinstated": true,
      "authorizedReceiverEmail": "agent-data-fixed@nexus.local"
    }
  }
  ```
- **Response `409 Conflict` (Funds Not Yet Reflected / Stale Balance):**
  ```json
  {
    "success": false,
    "error": "RETURN_FUNDS_NOT_VERIFIED",
    "message": "Provider return transaction not confirmed in PayPal Available Balance. Stale reporting data cannot authorize reissue."
  }
  ```

### `POST /api/settlement/reissue-payout`
Reissues an unpaid payout item that has reached confirmed `REISSUE_AUTHORIZED` status.
- **Strict Preconditions & Safety Guards:**
  - `originalItem.status` MUST be in `['RETURNED', 'REFUNDED', 'FAILED']`.
  - `originalItem.reissue_authorization_state` MUST be strictly `'REISSUE_AUTHORIZED'`.
  - Zero active child reissue can exist (`COUNT(*) == 0` where `status IN ('DRAFT', 'DISPATCHED', 'AMBIGUOUS_HOLD', 'SUCCESS')`), enforced by `uq_active_child_per_parent` partial unique index.
  - Reissue is **STRICTLY PROHIBITED** while parent item is in `PENDING`, `PROCESSING`, `ONHOLD`, `UNCLAIMED`, or `AMBIGUOUS_HOLD`. Any attempt returns HTTP 409 Conflict (`REISSUE_PROHIBITED_PARENT_NOT_TERMINAL`).
  - Max 3 reissue attempts allowed per item (`reissueAttempt <= 3`).
- **Request Body:**
  ```json
  {
    "cycleId": "cyc_20261104_001",
    "originalItemId": "item_9df821a",
    "updatedReceiverEmail": "agent-data-fixed@nexus.local"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "reissueId": "reissue_8f192b",
      "originalItemId": "item_9df821a",
      "reissueAttempt": 1,
      "senderItemId": "cyc_001_item_data_reissue_1",
      "status": "DISPATCHED",
      "amountCents": 2000,
      "parentAuthorizationState": "CHILD_ACTIVE"
    }
  }
  ```
- **Response `409 Conflict` (Active Child Reissue Already Exists):**
  ```json
  {
    "success": false,
    "error": "REISSUE_ENTITLEMENT_LOCKED",
    "message": "An active or settled child reissue already exists for this parent payout item. Multiple concurrent reissues are strictly prohibited."
  }
  ```
- **Response `409 Conflict` (Parent Item Not Terminal / Return Not Verified):**
  ```json
  {
    "success": false,
    "error": "REISSUE_PROHIBITED_PARENT_NOT_TERMINAL",
    "message": "Reissue cannot be authorized while parent item is in non-terminal state or return verification sequence has not reached REISSUE_AUTHORIZED state."
  }
  ```

### `POST /api/settlement/operator-compensation`
Records an authorized manual post-settlement compensation when PayPal provider reversal reference is absent or partial.
- **Request Body:**
  ```json
  {
    "cycleId": "cyc_20261104_001",
    "originalItemId": "item_9df821a",
    "reversalType": "REFUND",
    "amountCents": 2000,
    "operatorCorrectionRef": "op_adj_20261105_001",
    "operatorSignedHash": "ed25519_sig_9f821a7c...",
    "reason": "Receiver refunded payment outside standard webhook envelope; verified in dashboard"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "compensationId": "comp_918237",
      "compensationKey": "comp:cyc_20261104_001:item_9df821a:REFUND:OPERATOR_SIGNED:op_adj_20261105_001",
      "status": "APPLIED",
      "reinstatedLiabilityCents": 2000,
      "cycleStatus": "POST_SETTLEMENT_RECONCILING"
    }
  }
  ```

### `POST /api/settlement/cure-custodial-shortfall`
Executes the asynchronous, crash-resilient cure of an audited custodial shortfall across distinct funding routes with strict economic substance evidence.
- **Request Body:**
  ```json
  {
    "cycleId": "cyc_20261104_001",
    "fundingRoute": "BANK_TOPUP",
    "fundingSource": "OPERATOR_CAPITAL_CONTRIBUTION",
    "fundingSubrogationBasis": "EQUITY_INJECTION",
    "sourceEvidenceDocHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "authorizationRole": "FIDUCIARY_CONTROLLER",
    "amountCents": 2000,
    "providerRef": "BANK-TXN-91827364",
    "evidenceMetadata": {
      "reportingTransactionId": "TXN-BANK-00912",
      "reportingEventCode": "T0300",
      "verifiedAvailableBalanceCents": 2000,
      "bankSettlementTimestamp": "2026-11-06T20:00:00Z",
      "declarationMemo": "Irrevocable operator equity capital replenishment with contractual subrogation"
    }
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "intentId": "cure_intent_8192a",
      "cycleId": "cyc_20261104_001",
      "fundingRoute": "BANK_TOPUP",
      "fundingSource": "OPERATOR_CAPITAL_CONTRIBUTION",
      "fundingSubrogationBasis": "EQUITY_INJECTION",
      "sourceVerificationStatus": "VERIFIED",
      "amountCents": 2000,
      "status": "RECONCILED",
      "custodialShortfallCents": 0,
      "cycleStatus": "RECONCILING",
      "holdReleased": true
    }
  }
  ```

### `POST /api/settlement/evaluate-recovery-claim`
Evaluates Stage 4 evidence criteria (written debt acknowledgment, binding dispute adjudication, or uncontested statutory notice) under specified accounting framework.
- **US_GAAP_CONSERVATIVE Lifecycle:** Records evidence off-balance-sheet; advances claim to Stage 4 (if in Stages 1–3). Does **not** advance to Stage 5 (`recognized_receivable_cents` remains 0; zero balance-sheet mutation).
- **IFRS_IAS37 Lifecycle:** Evaluates virtual certainty, counterparty solvency, and CPA policy sign-off; advances claim from Stage 4 to Stage 5, recording `recognized_receivable_cents` and journal entry: Dr `ASSET:OPERATOR_DISPUTE_RECEIVABLE` / Cr `REVENUE:RECOVERY_GAIN`.
- **Request Body:**
  ```json
  {
    "claimId": "rec_claim_99182",
    "cycleId": "cyc_20261104_001",
    "accountingFramework": "IFRS_IAS37",
    "stage4EvidenceType": "WRITTEN_DEBT_ACKNOWLEDGMENT",
    "stage4EvidenceHash": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
    "authorizationRole": "FIDUCIARY_CONTROLLER",
    "authorizerId": "controller_ed25519_pubkey_001",
    "authorizerSignature": "sig_ed25519_hex...",
    "counterpartySolvent": true
  }
  ```
- **Response `200 OK` (IFRS_IAS37 Example):**
  ```json
  {
    "success": true,
    "data": {
      "claimId": "rec_claim_99182",
      "newStage": 5,
      "accountingFramework": "IFRS_IAS37",
      "recognizedReceivableCents": 2000,
      "debitAccount": "ASSET:OPERATOR_DISPUTE_RECEIVABLE:agt_data",
      "creditAccount": "REVENUE:RECOVERY_GAIN",
      "eventId": "rec_evt_88192",
      "sequenceId": 4,
      "idempotencyKey": "rec_evt:rec_claim_99182:STAGE5_RECOGNIZED:1",
      "authorizedAt": "2026-11-07T01:00:00Z"
    }
  }
  ```
- **Response `200 OK` (US_GAAP_CONSERVATIVE Example):**
  ```json
  {
    "success": true,
    "data": {
      "claimId": "rec_claim_99182",
      "newStage": 4,
      "accountingFramework": "US_GAAP_CONSERVATIVE",
      "recognizedReceivableCents": 0,
      "offBalanceSheetDisclosed": true,
      "eventId": "rec_evt_88192",
      "sequenceId": 4,
      "idempotencyKey": "rec_evt:rec_claim_99182:STAGE4_EVALUATED:1",
      "evaluatedAt": "2026-11-07T01:00:00Z"
    }
  }
  ```

### `POST /api/settlement/collect-recovery-claim`
Records verified physical cash recovery from counterparty.
- **Framework Authorization & Execution Guard:**
  - `US_GAAP_CONSERVATIVE`: Claim must be in `stage == 4` (or `6` for partial collection). Advances directly to `stage = 6` upon verified cash receipt. Journal: Dr `ASSET:OPERATOR_CASH` (or `ASSET:PAYPAL_SETTLEMENT_CASH`) / Cr `REVENUE:RECOVERY_GAIN`. Sets `cash_recovered_cents`.
  - `IFRS_IAS37`: Claim must be in `stage == 5` (or `6` for partial collection). Advances to `stage = 6`. Journal: Dr `ASSET:OPERATOR_CASH` / Cr `ASSET:OPERATOR_DISPUTE_RECEIVABLE`. Sets `cash_recovered_cents`.
  - If called when claim is in an invalid stage for its framework, returns HTTP 422 Unprocessable Entity.
- **Request Body:**
  ```json
  {
    "claimId": "rec_claim_99182",
    "amountCents": 2000,
    "providerRef": "PP-TXN-REFUND-9182",
    "targetAccount": "ASSET:OPERATOR_CASH",
    "idempotencyKey": "rec_collect:rec_claim_99182:seq1"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "claimId": "rec_claim_99182",
      "newStage": 6,
      "accountingFramework": "US_GAAP_CONSERVATIVE",
      "cashRecoveredCents": 2000,
      "cashPartitionCredited": "ASSET:OPERATOR_CASH",
      "creditAccount": "REVENUE:RECOVERY_GAIN",
      "eventId": "rec_evt_88193",
      "sequenceId": 5,
      "idempotencyKey": "rec_evt:rec_claim_99182:STAGE6_COLLECTED:1",
      "collectedAt": "2026-11-07T01:15:00Z"
    }
  }
  ```

### `POST /api/settlement/write-off-recovery-claim`
Auditably writes off or closes an uncollectible recovery claim.
- **Framework Authorization & Execution Guard:**
  - `US_GAAP_CONSERVATIVE`: Claim must be in `stage == 4`. Transitions to `stage = 7`. Sets `unrecognized_claim_closed_cents = claim_amount_cents`. Appends `STAGE7_CLOSED` event. **Zero ledger mutation** (initial loss was already recognized in equity as OpEx at onset; zero double loss).
  - `IFRS_IAS37`: Claim must be in `stage == 5` (or `6` with uncollected balance). Transitions to `stage = 7`. Sets `recognized_receivable_written_off_cents = recognized_receivable_cents - cash_recovered_cents`. Appends `STAGE7_WRITTEN_OFF` event. Journal: Dr `EXPENSE:BAD_DEBT_EXPENSE` / Cr `ASSET:OPERATOR_DISPUTE_RECEIVABLE`.
- **Request Body:**
  ```json
  {
    "claimId": "rec_claim_99182",
    "reason": "COUNTERPARTY_INSOLVENT_ABANDONED",
    "fiduciarySignoff1": "controller_ed25519_pubkey_001",
    "fiduciarySignoff2": "compliance_ed25519_pubkey_002",
    "idempotencyKey": "rec_writeoff:rec_claim_99182:seq1"
  }
  ```
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "claimId": "rec_claim_99182",
      "newStage": 7,
      "accountingFramework": "US_GAAP_CONSERVATIVE",
      "unrecognizedClaimClosedCents": 2000,
      "recognizedReceivableWrittenOffCents": 0,
      "additionalPnlExpenseCents": 0,
      "eventId": "rec_evt_88194",
      "sequenceId": 5,
      "idempotencyKey": "rec_evt:rec_claim_99182:STAGE7_CLOSED:1",
      "closedAt": "2026-11-07T01:20:00Z"
    }
  }
  ```

### `POST /api/webhooks/paypal`
Receives and verifies authoritative PayPal webhooks (`PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, etc.).
- **Response `200 OK`:** `{ "received": true }`

