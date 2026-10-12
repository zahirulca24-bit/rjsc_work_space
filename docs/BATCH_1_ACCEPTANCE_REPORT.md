# ZA Corporate Desk — Batch 1 Local Acceptance Report

**Date**: October 13, 2026  
**Audited Branch**: `feature/za-office-workflow-forms-batch1`  
**PR Reference**: [#22](https://github.com/zahirulca24-bit/rjsc_work_space/pull/22)  
**Overall Automated Gate**: **`LOCAL_AUTOMATED_ACCEPTANCE_PASSED`** (10/10 Automated Checks Passed — 100%)  
**Human Visual Review Gate**: **`PENDING_PHYSICAL_STAFF_ACCEPTANCE`**

---

## 1. Executive Summary

This document records the acceptance verification of **Batch 1 (Office Workflow, Working Papers, RJSC Forms Lab & Manual Submission Records)**.

- **Automated Verification**: 100% passed across all 10 programmatic checks, including unit tests, API integration tests, coordinate bounding, and end-to-end filing lifecycles against isolated ephemeral SQLite test databases.
- **Physical/Human Visual Acceptance**: Explicitly segregated as **PENDING**. Programmatic text extraction and coordinate verification confirm text placement within template boundaries, but final human visual inspection on office monitors and test printouts must be conducted by office staff prior to production filing.
- **Data Protection**: Real production database (`backend/dev.db`) and verified client records (`SILVEE AND SINTHEE TRAVEL AGENCY LTD`) were verified and remained completely untouched.

---

## 2. Automated Acceptance Results (Checks 1–10)

| Check # | Verification Area | Target Criteria | Automated Result | Status |
|:---|:---|:---|:---|:---:|
| **Check 1** | **Backend Pytest Suite** | All backend tests pass with 0 regressions | **163 passed, 0 failed in 23.62s** | **PASS** |
| **Check 2** | **Frontend Jest Suite** | All frontend component tests pass | **100 passed, 0 failed in 1.04s** | **PASS** |
| **Check 3** | **TypeScript Typecheck** | `tsc --noEmit` completes with zero errors | **0 errors, strict type compliance** | **PASS** |
| **Check 4** | **Next.js Production Build** | `npm run build` compiles clean production bundle | **23/23 routes compiled in 6.5s (0 errors)** | **PASS** |
| **Check 5** | **Login & Navigation** | Auth tokens, Argon2 password verification, protected route 401 | **200 on login/logout; 401 on unauthorized access** | **PASS** |
| **Check 6** | **Form XII Multi-Page** | >6 directors triggers 2-page Legal Landscape continuation | **2 pages: Page 1 (Dirs 1-6) + Page 2 Continuation (Dir 7)** | **PASS** |
| **Check 7** | **Schedule X Reconciliation** | Capital lines 1-7, Page 3 members list, Sec 36 AGM warnings | **Page 1 capital reconciliation, Page 3 list, Sec 36 mismatch caught** | **PASS** |
| **Check 8** | **Form 117 Transfer Deed** | Word conversion, century mask, transferor/transferee signatures | **Number in words ("Five Hundred"), 2003 mask, signatures placed** | **PASS** |
| **Check 9** | **Visual Layout Sanity** | Media boxes, margin bounding, no clipping or overlapping | **Legal landscape (1008x612), letter portrait verified** | **PASS** |
| **Check 10** | **End-to-End Filing Lifecycle** | Intake $\to$ Working Papers $\to$ Forms Lab $\to$ Review $\to$ Submission $\to$ Delivery | **All stages advanced; work status: Draft $\to$ Submitted $\to$ Closed** | **PASS** |

---

## 3. Automated Technical Verification Details

### Check 5: Authentication & Access Control
- Verified `/api/auth/login` issues valid JWT session credentials for valid email and password.
- Verified `/api/auth/login` rejects bad passwords with `401 Unauthorized`.
- Verified protected endpoints (`/api/clients`, `/api/works`) reject unauthenticated requests with `401 Unauthorized`.
- Verified `/api/auth/logout` clears session.

### Check 6: Form XII Multi-Page Continuation Sheet (>6 Directors)
- **Base Template**: Landscape Legal (`1008 x 612 pt`).
- **Condition**: Client Master with 7 active directors.
- **Output**: 2-page PDF. Page 1 contains base template with company name, filing agent, and Directors 1–6 in designated slots. Page 2 dynamically renders a continuation sheet titled `"FORM XII — CONTINUATION SHEET: [Company Name]"`, displaying Director 7 and the Managing Director sign-off block.

### Check 7: Schedule X Capital Reconciliation & Statutory Warnings
- **Page 1**: Authorized capital (`BDT 10,000,000`), paid-up capital (`BDT 5,000,000`), nominal value per share (`BDT 100`), issued shares (`50,000`), and statutory lines 1–7.
- **Page 2**: Section 20 Directors table with clean whiteout mask over outdated century indicators (`"19__"`).
- **Page 3**: Member Register continuation sheet appended with table headers (*Sl, Member Name, Shares Held, Nominal Value, % Holding*).
- **Unevidenced AGM Warning**: When AGM date is unevidenced, an alert tag `"[REVIEW REQUIRED: AGM DATE UNEVIDENCED]"` is rendered in bold red (`#880000`).
- **Section 36 Reconciliation**: When member share count does not equal issued shares derived from paid-up capital, preflight checks flag:
  `"Shareholding mismatch: Sum of member shares (...) does not equal issued shares derived from paid-up capital (...). Discrepancy flagged under Sec 36."`

### Check 8: Form 117 Share Transfer Deed
- Transferor, Transferee, addresses, consideration amount, and distinctive share numbers overlaid.
- Share count dynamically converted to English words (*e.g., "500 (Five Hundred)"*).
- Outdated century reference (`"2003"`) masked cleanly and current year overlaid.
- Transferor, transferee, and Managing Director signature markers positioned accurately.

### Check 9: Coordinate Overlay & Dimensional Bounds
- Form XII Page 1 & 2 MediaBox: `[0, 0, 1008, 612]`.
- Schedule X Page 1, 2 & 3 MediaBox: `[0, 0, 612, 792]`.
- Form 117 Page 1 MediaBox: `[0, 0, 522, 756]`.
- Coordinates bounded strictly within printable margins; no text truncated or overflowing page edges.

### Check 10: End-to-End Filing Lifecycle
- **Work Intake**: Work Order created in Work Register (`In Preparation`).
- **Working Papers**: Auto-initialized from Client Master snapshot (`POST /api/working-papers/work/{work_id}/init`), updated with audit notes.
- **Forms Lab Generation & Versioning**: Form XII generated as v1; updated generation correctly incremented to v2 (`DRAFT`).
- **Senior Review Workflow**: Version 2 advanced through `REVIEWED` $\to$ `APPROVED_FOR_PORTAL_UPLOAD`.
- **Pre-Submission Review**: `/api/submissions/work/{work_id}/pre-submission-review` confirmed `is_approved_for_submission: True` and `is_submission_ready: True`.
- **Manual RJSC Submission**: Staff submission recorded with RJSC tracking number and Sonali Bank challan ref; work status updated to `Submitted`.
- **Portal Query & Resubmission**: Recorded RJSC portal query objection (`OPEN`), resolved via resubmission record (`RESUBMISSION`, submission #2).
- **Client Delivery**: Certified document delivery recorded; work operationally moved to `Closed` and new permanent record inserted in `RjscFilingHistory`.

---

## 4. Pending Human Visual & Office Acceptance Items

The following items cannot be accepted solely by automated scripts and require human staff verification:

1. **[ ] Physical Test Printout (Legal Paper)**:
   - Print Form XII on standard Legal size paper (`8.5" x 14"`) in landscape mode.
   - Verify that tabular grid lines align with the pre-printed RJSC template without drift.
2. **[ ] Typography & Visual Legibility**:
   - Verify that long names (>30 characters) wrap or truncate gracefully without overlapping adjacent table borders.
   - Inspect whiteout century masks on Schedule X and Form 117 under high screen contrast to verify complete opacity.
3. **[ ] Reviewer Role Permissions UX**:
   - Verify in the browser that a `JUNIOR` user cannot click the "Approve for Portal Upload" button without senior escalation.
4. **[ ] Manual Upload Portal Dry-Run**:
   - Staff to take an approved PDF generated by Forms Lab and manually upload to the RJSC portal sandbox/test filing to confirm portal file acceptance.
