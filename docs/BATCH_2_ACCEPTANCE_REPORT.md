# ZA Corporate Desk — Batch 2 Acceptance Report (Core RJSC Services)

**Date**: October 13, 2026  
**Audited Branch**: `feature/core-rjsc-services-batch2`  
**Base Target**: `feature/za-office-workflow-forms-batch1` (PR #23)  
**Overall Automated Gate**: **`LOCAL_AUTOMATED_ACCEPTANCE_PASSED`** (100% Tests Green)  
**Human Visual Review Gate**: **`PENDING_PHYSICAL_STAFF_ACCEPTANCE`**

---

## 1. Executive Summary

This document records the acceptance verification of **Batch 2 (Core RJSC Services: Annual Return, Share Transfer, and Mortgage & Charge Registration)** including the completion of all **PR #23 Critical Audit Fixes**.

- **Automated Verification**: 100% passed across all 166 backend pytest tests (including new negative permission, status, and evidence gate tests), 100 frontend npm tests, strict TypeScript typechecking (0 errors), and Next.js production build (23/23 routes compiled).
- **Core Services Verified**:
  1. **Annual Return**: Section 36(1) Schedule X deadline (AGM + 21 days), separate tracking of actual AGM date, audit date, DVC date, and filing date. Evidence verification requires official acknowledgment reference or source proof; unapproved hardcoded statutory late-fee formulas removed (returning `REVIEW_REQUIRED`).
  2. **Share Transfer**: Pre/post mathematical share parity reconciliation, Form 117 generation, strict role gate (`ADMIN` / `MANAGER` only), proposal approval gate (`APPROVED` only, rejecting `DRAFT`), and immutable register apply audit logging.
  3. **Mortgage & Charge**: Creation/Modification/Satisfaction workflows, Section 159 21-day deadline countdown, Section 171 High Court condonation detection, Forms XVIII/XIX/XXVIII generation, strictly prohibiting auto-substitution of today's date and enforcing verified registration dates and source-backed filing evidence.
- **Data Protection**: Real production database (`backend/dev.db`) and verified client records (`SILVEE AND SINTHEE TRAVEL AGENCY LTD`) remain completely pristine and untouched.
- **Physical/Human Visual Acceptance**: Separated as **PENDING**. Office staff inspection of generated PDFs on office screens and physical printouts remains required before live client filing.

---

## 2. Automated Test & Build Verification Summary

| Test Layer | Test Count | Result | Details | Status |
|:---|:---:|:---:|:---|:---:|
| **Backend Pytest** | **166 passed** | **100% PASS** | Zero failures in 14.03s across Phase 01–07 test suites | **PASS** |
| **Frontend Jest / tsx** | **100 passed** | **100% PASS** | Zero failures across 9 suites in 1.09s | **PASS** |
| **TypeScript Typecheck** | **0 errors** | **PASS** | Strict type compliance (`tsc --noEmit`) | **PASS** |
| **Next.js Production Build** | **23/23 routes** | **PASS** | Production compilation (`next build`) in 6.1s | **PASS** |
| **Database Integrity** | **dev.db** | **PRESERVED** | Exactly 1 client, 1 work order (untouched) | **PASS** |
| **Browser Worker Isolation**| **ZA_Browser_Worker**| **ISOLATED** | Zero files touched outside `rjsc_work_space` | **PASS** |

---

## 3. PR #23 Critical Audit Fixes Implemented

### Audit Fix 1 — Share Transfer Apply Role & Approval Gate
- **Role Enforcement**: `apply_share_transfer_to_master` and `approve_share_transfer_proposal` explicitly require `RoleEnum.ADMIN` or `RoleEnum.MANAGER`. Unauthorized roles (`JUNIOR`, `SENIOR`) are strictly rejected with HTTP 403 Forbidden.
- **Status Gate**: Transfer proposals in `DRAFT` or unapproved status are rejected with HTTP 400 Bad Request. Only proposals verified with board resolution and approved (`status == "APPROVED"`) can update the shareholder register.
- **Mandatory Board Approval Date**: Setting proposal status to `APPROVED` strictly requires an actual Board approval meeting date (`board_approval_date`). Missing date is rejected with HTTP 400 Bad Request.
- **Strict Board Resolution Evidence Gate**: A typed evidence string alone cannot authorize execution. Proposal approval strictly requires either a referenced `Document` record in `VERIFIED` status or completed statutory checklist item (`ST-CHK-03`). Referenced documents in `PENDING` status or arbitrary text strings are rejected with HTTP 400 Bad Request.
- **Negative Tests Verified**:
  - Missing `board_approval_date` -> 400 Bad Request.
  - Arbitrary typed text string alone (`"Arbitrary typed meeting minutes..."`) -> 400 Bad Request.
  - Unverified Document (`Document(status="PENDING")`) -> 400 Bad Request.
  - `JUNIOR` attempting `/apply` -> 403 Forbidden.
  - `ADMIN` attempting `/apply` while in `DRAFT` -> 400 Bad Request.
  - `JUNIOR` attempting `/approve` -> 403 Forbidden.
  - Re-applying already executed transfer -> 400 Bad Request.
  - Authorized approval with `verified_board_doc` (`status == "VERIFIED"`) and `board_approval_date` -> 200 OK (`status == "APPROVED"`).

### Audit Fix 2 — Mortgage Apply Strict Registration Evidence
- **Prohibition of Auto-Substitution**: Removed `if not charge_rec.registration_date: charge_rec.registration_date = date.today()`. Today's date is never substituted for missing registration dates.
- **Mandatory Registration Date**: Applying without verified actual RJSC registration date is rejected with HTTP 400 Bad Request.
- **Source-Backed Evidence Gate**: Applying without source-backed filing evidence (`filing_reference` / RJSC Certificate of Registration number) is rejected with HTTP 400 Bad Request.
- **Satisfaction Gate**: Applying charge satisfaction requires verified satisfaction date and source-backed evidence (Bank NOC reference or RJSC satisfaction filing reference); missing evidence is rejected with HTTP 400.
- **Role Enforcement**: Only authorized roles (`ADMIN` or `MANAGER`) can commit charges into Client Master.
- **Negative Tests Added**:
  - Creation apply without registration date -> 400 Bad Request.
  - Creation apply with registration date but missing filing reference -> 400 Bad Request.
  - Unauthorized staff (`JUNIOR`) attempting apply -> 403 Forbidden.
  - Satisfaction apply without Bank NOC ref or filing ref -> 400 Bad Request.

### Audit Fix 3 — Annual Return Provenance & Strict Evidence Gate
- **Evidence Verification Provenance**: Populating a `filed_date` no longer marks evidence `VERIFIED` automatically.
- **Strict Evidence Gate**: Arbitrary text strings in `source_evidence` (*e.g. "Arbitrary typed receipt note"*) or unverified documents (`status == "PENDING"`) return `evidence_status: "REVIEW_REQUIRED"`. Evidence is marked `VERIFIED` only when backed by an official reviewed RJSC acknowledgment reference (*e.g. prefix `AR-`, `RJSC-`, `ACK-`*) or an explicitly verified `Document` record with provenance (`status == "VERIFIED"`).
- **Late-Fee Remediation**: Removed unapproved hardcoded statutory late-fee formula (`delay_days * 10`). Delayed/overdue filings return `statutory_late_fee: "REVIEW_REQUIRED"` until legally validated penalty rules are configured.
- **Database Hygiene**: `create_or_update` in `history.py` uses the shared `evidence_verification` service and no longer calculates or writes unapproved `delay_days * 10` into the `late_fee` database column.
- **Negative Tests Verified**:
  - Filing with arbitrary text alone in `source_evidence` -> `evidence_status: "REVIEW_REQUIRED"`.
  - Filing with unverified document (`Document(status="PENDING")`) -> `evidence_status: "REVIEW_REQUIRED"`.
  - Filing with missing acknowledgment reference and source evidence -> `evidence_status: "REVIEW_REQUIRED"`.
  - Filing with official acknowledgment reference (`"AR-2022-9988"`) -> `evidence_status: "VERIFIED"`.
  - Filing with verified document (`Document(status="VERIFIED")`) -> `evidence_status: "VERIFIED"`.

### Audit Fix 4 — Strict Evidentiary Separation & AGM Non-Inference
- **No AGM Date Inference**: Actual AGM dates are never inferred from financial-year strings (*e.g. "2022-2023"*), audit report dates, or DVC codes.
- **Pending Signed Minutes**: In the absence of signed AGM minutes (`status == "HELD"`), `actual_agm_date` and Section 36 `due_date` remain `None`, with statutory notes indicating that filing deadline calculation is pending verified signed AGM minutes.

---

## 4. Pending Human Visual & Office Acceptance Items

The following physical checks remain required before final operational sign-off:

1. **[ ] Form 117 Stamp Duty & Execution Inspection**:
   - Human inspection of generated Form 117 PDF on screen and printed format to ensure consideration and non-judicial stamp duty figures comply with current Bangladesh Stamp Act rates.
   - Verify that transferor and transferee addresses are clearly aligned within designated boxes without text collision.
2. **[ ] Mortgage Forms XVIII / XIX / XXVIII Visual Review**:
   - Verify that property legal description (*Schedule of Property*) wraps correctly in Form XVIII without crossing margins.
   - Verify that lender particulars and sanction details on Form XIX Page 1 & 2 align with bank sanction letter specs.
   - Verify that Form XXVIII (Satisfaction) correctly renders lender satisfaction date and NOC reference.
3. **[ ] Multi-Year Annual Return Bulk Review**:
   - Staff to review the multi-year assessment table in UI for a test company with 3 pending years.
4. **[ ] End-to-End Test with Browser Agent**:
   - Coordinate with the independent Browser Agent team to perform portal preparation review on sandbox datasets.
