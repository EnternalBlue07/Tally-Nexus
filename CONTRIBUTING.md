# CONTRIBUTING TO TALLY NEXUS
**Project:** Autonomous Agent Clearinghouse & Multilateral SLA-Netting Engine  
**Version:** 1.0.0  
**License:** MIT License  

---

## 1. Fiduciary Engineering Philosophy

Tally Nexus is not an ordinary web application; it is an autonomous financial clearinghouse. A bug in a social media app causes a UI glitch; a bug in a clearinghouse engine causes misallocated funds, broken fiduciary trust, or financial insolvency.

Every contributor must adhere to our three engineering commandments:
1. **Mathematical Invariants Are Absolute:** No PR may weaken or bypass the Zero-Sum Clearing Boundary, Custodial Capital Ring-Fencing, or the Operator Reserve Floor.
2. **AI Is Cognitive, Not Authoritative:** AI models evaluate deliverables; deterministic code authorizes money. No LLM may directly write ledger entries or sign IOUs.
3. **Empirical Verification Before Merge:** Passing an in-memory unit test is necessary but insufficient. All database triggers, constraints, and fault-injection suites must pass with 100% empirical rigor.

---

## 2. Git Workflow & Branching Strategy

- **`main` Branch:** Always production-ready, passing all CI/CD gates. Direct pushes are disabled.
- **Feature Branches:** Named descriptively:
  - `feat/netting-matrix-sparse-optimization`
  - `fix/reissue-entitlement-edge-case`
  - `test/sandbox-unclaimed-webhook`
  - `docs/api-specification-update`

---

## 3. Mandatory Pre-Commit Quality Checklist

Before submitting any Pull Request, you must execute and verify:

```bash
# 1. Typecheck the entire codebase
npm run typecheck

# 2. Execute unit and integration tests
npm test

# 3. Execute the 16-test adversarial verification suite
python verify_phase5_22_complete_suite.py

# 4. Verify code formatting and linting
npm run lint
```

If any check fails, the pull request will be rejected automatically by CI/CD.

---

## 4. Conventional Commits Standard

We enforce the Conventional Commits specification:
- `feat(netting): add sparse matrix cycle reduction algorithm`
- `fix(webhook): enforce 300s clock skew window check`
- `test(triggers): add negative test case for post-Stage 7 collection`
- `docs(schema): document trg_parent_payout_item_late_success_guard`
- `chore(deps): bump better-sqlite3 to 11.8.1`

---

## 5. Security Vulnerability Disclosure

If you discover a security vulnerability, cryptographic weakness, or financial invariant loophole, **do NOT open a public GitHub issue**. Please email security disclosures directly to `security@nexus.local` or contact the repository maintainers.

