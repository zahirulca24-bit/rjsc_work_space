# ZA Corporate Desk — Batch 2 Acceptance Report (Core RJSC Services)

**Date**: October 13, 2026  
**Audited Branch**: `feature/core-rjsc-services-batch2`  
**Commits**:  
- `035607b` (`feat(batch2): checkpoint Core RJSC Services (Annual Return, Share Transfer, Mortgage & Charge)`)  
- `644d46c` (`fix(forms_lab): sanitize Decimal and date types in form_parameters JSON storage`)  
**Overall Automated Gate**: **`LOCAL_AUTOMATED_ACCEPTANCE_PASSED`** (100% Tests Green)  
**Human Visual Review Gate**: **`PENDING_PHYSICAL_STAFF_ACCEPTANCE`**

---

## 1. Executive Summary

This document records the acceptance verification of **Batch 2 (Core RJSC Services: Annual Return, Share Transfer, and Mortgage & Charge Registration)**.

- **Automated Verification**: 100% passed across all 166 backend pytest tests, 100 frontend npm tests, strict TypeScript typechecking, and Next.js production build.
- **Service Verification**: All three core services (Annual Return, Share Transfer, Mortgage & Charge) were verified end-to-end with automated test fixtures simulating multi-year filings, share rebalancing, and statutory deadline countdowns.
- **Physical/Human Visual Acceptance**: Separated as **PENDING**. Staff visual inspection of generated PDFs (Schedule X, Form 23B, Form 117, Form XVIII, XIX, XXVIII) on office screens and physical printouts remains required before live client usage.
- **Data Protection**: Real production database (`backend/dev.db`) and verified client records (`SILVEE AND SINTHEE TRAVEL AGENCY LTD`) were verified and remain completely untouched.

---

## 2. Automated Test & Build Verification Summary

| Test Layer | Test Count | Result | Details | Status |
|:---|:---:|:---:|:---|:---:|
| **Backend Pytest** | **166 passed** | **100% PASS** | Zero failures in 14.05s across Phase 01–07 test suites | **PASS** |
| **Frontend Jest / tsx** | **100 passed** | **100% PASS** | Zero failures across 9 suites in 1.02s | **PASS** |
| **TypeScript Typecheck** | **0 errors** | **PASS** | Strict type compliance (`tsc --noEmit`) | **PASS** |
| **Next.js Production Build** | **23/23 routes** | **PASS** | Production compilation in 4.0s (`next build`) | **PASS** |
| **Database Integrity** | **dev.db** | **PRESERVED** | Real database untouched (1 client, 1 work) | **PASS** |
| **Browser Worker Isolation**| **ZA_Browser_Worker**| **ISOLATED** | No files modified or touched outside `rjsc_work_space` | **PASS** |

---

## 3. Core Service Implementation & Automated Verification

### Service 1 — Annual Return Workflow (`/api/annual-returns/`)
- **Multi-Year Assessment (`/api/annual-returns/assessment/{client_id}`)**:
  - Differentiates previously filed years (`FILED`), overdue years (`OVERDUE`), and evidence-uncertain years (`EVIDENCE_UNCERTAIN`).
  - Strict statutory deadline computation under Section 36 of the Companies Act, 1994: exactly 21 calendar days following the verified AGM date.
  - Evidentiary separation: Audit report date and DVC code are tracked independently and are never treated as synthetic proof of an AGM having occurred.
  - Automatic calculation of delay days and statutory late fees (BDT 10/day base schedule).
- **Bundled Multi-Year Work Creation (`/api/annual-returns/create-work/{client_id}`)**:
  - Automatically initializes standard statutory checklists (`AR-CHK-01` through `08`).
  - Integrates with Forms Lab to generate upload-ready **Schedule X**, **Form 23B**, and **Form XII**.
- **UI Workspace**:
  - Mounted via `AnnualReturnServicePanel.tsx` in both the Client Profile tabs and the Work Register detail specialized workspace.

### Service 2 — Share Transfer Workflow (`/api/share-transfers/`)
- **Shareholding Balance & Parity Reconciliation (`/api/share-transfers/work/{work_id}`)**:
  - Reconciles transferor shareholdings against the Client Master register before accepting transfer proposals.
  - Automatically rejects proposals if the transferor possesses insufficient shares (HTTP 400).
  - Captures transferor, transferee, addresses, share count, nominal value, paid-up amount, consideration, and distinctive number ranges.
- **Form 117 PDF Generation (`/api/forms-lab/generate/{work_id}/FORM_117`)**:
  - Generates upload-ready Form 117 transfer deed with pixel-aligned coordinate overlays.
  - Translates share count into standard English words (*e.g., "500 (Five Hundred)"*).
  - Masks outdated century artifacts (`"2003"`) and positions signature lines for transferor, transferee, and Managing Director.
- **Authorized Execution (`/api/share-transfers/work/{work_id}/apply`)**:
  - Authorized action mutates the Client Master shareholder register (`shareholders` table), decreasing transferor shares, adding/updating transferee shares, and strictly preserving total issued share capital.
  - Logged with immutable audit trail.
- **UI Workspace**:
  - Mounted via `ShareTransferServicePanel.tsx` in Work Register detail.

### Service 3 — Mortgage & Charge Registration (`/api/mortgage-charges/`)
- **Statutory 21-Day Countdown & Section 171 Detection (`/api/mortgage-charges/work/{work_id}`)**:
  - Evaluates deed/instrument date against Section 159 of the Companies Act, 1994 (must be registered within 21 calendar days of instrument execution).
  - Flags expired deeds (>21 days) with a mandatory High Court condonation requirement under Section 171.
  - Tracks lender, secured amount, instrument type, property description, sanction letter reference, and sanction date.
- **RJSC Forms Generation**:
  - **Form XVIII**: Particulars of Mortgage or Charge Creation (1 page).
  - **Form XIX**: Particulars of Charge Modification (2 pages).
  - **Form XXVIII**: Declaration of Verification of Satisfaction of Charge (1 page).
- **Authorized Execution (`/api/mortgage-charges/work/{work_id}/apply`)**:
  - Commits verified charge records into Client Master (`mortgage_charges` table) upon completion.
- **UI Workspace**:
  - Mounted via `MortgageChargeServicePanel.tsx` in Work Register detail.

---

## 4. Pending Human Visual & Office Acceptance Items

The following physical and human checks remain required before operational sign-off:

1. **[ ] Form 117 Stamp Duty & Execution Inspection**:
   - Human inspection of generated Form 117 PDF to ensure consideration and stamp duty figures comply with current Bangladesh Stamp Act provisions.
   - Verify that transferor and transferee addresses are clearly aligned within designated boxes without text collision.
2. **[ ] Mortgage Forms XVIII / XIX / XXVIII Visual Review**:
   - Verify that property legal description (*Schedule of Property*) wraps correctly in Form XVIII without crossing footer margins.
   - Verify that lender particulars and sanction details on Form XIX Page 1 & 2 align with bank sanction letter specs.
   - Verify that Form XXVIII (Satisfaction) correctly renders lender satisfaction date and NOC reference.
3. **[ ] Multi-Year Annual Return Bulk Review**:
   - Staff to review the multi-year assessment table in UI for a test company with 3 pending years to ensure late fee calculations match manual audit worksheets.
4. **[ ] End-to-End Test with Browser Agent**:
   - Coordinate with the independent Browser Agent team to perform UI-driven filing simulations on sandbox datasets.
