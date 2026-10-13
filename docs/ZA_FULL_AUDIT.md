# ZA Corporate Desk — Full Codebase & Architecture Audit

**Date**: October 13, 2026  
**Audited Directory**: `E:\RJSC\rjsc_work_space`  
**Current Branch**: `feature/core-rjsc-services-batch2` (Commit: `99d07e5`)  
**Scope**: Full stack inspection (Frontend pages/components, Backend routes/models/services, Workflow/Checklist, Legal Foundations, Billing/Finance, AI/OCR).  

---

## 1. Executive Summary & Audit Methodology

This audit examines every functional domain of **ZA Corporate Desk** across both frontend (`Next.js 15.5 App Router`) and backend (`FastAPI`, `SQLAlchemy`, SQLite `dev.db`). The system is designed as an internal practice management and statutory document preparation workstation for Bangladesh Company Law matters before the Registrar of Joint Stock Companies & Firms (RJSC).

### Verification Baseline
- **Backend Tests**: 169 automated tests (`pytest`) passing.
- **Frontend Tests**: 100 contract and logic tests (`tsx --test`) passing.
- **TypeScript**: `tsc --noEmit` clean (0 errors).
- **Next.js Production Build**: 23/23 routes successfully compiled.

### Core Architecture Findings
1. **Strengths**: Solid immutable audit trail infrastructure, strict multi-role permission gates (`ADMIN`, `MANAGER`, `SENIOR`, `JUNIOR`), mathematical share parity safeguards in Share Transfer, and clean separation between operational delivery and billing closure.
2. **Key Weaknesses & Vulnerabilities (Categorized by Impact)**:
   - **Statutory Correctness Risk**: Conflation of Form XII and Annual Return bundling in `works.py` and `annual_returns.py`, assuming Form XII is always filed with every Annual Return.
   - **Data Integrity & Drift Risk**: Disconnect between Working Paper point-in-time snapshots and updated Client Master corporate history records.
   - **Operational Workflow Disconnect**: Disconnect between client-level RJSC snapshot verification and active Work orders; staff cannot directly upload and verify portal screenshots in the Work context.
   - **AI Legal Validity Gap**: AI Document Extraction (`groq_ai.py`) relies on generic heuristic prompting without grounding in a versioned, authoritative Bangladesh Legal Knowledge Base.
   - **UI Space Inefficiency (Operational UX)**: `app/work-register/[id]/page.tsx` is an overgrown 1,157-line monolith with stacked cards, 9 horizontal tabs, and fragmented status buttons pushing operational content below the fold.

---

## 2. Inventory of Audited Functional Domains & Files

| Domain | Key Frontend Files | Key Backend Files | Current Assessment |
|:---|:---|:---|:---|
| **Work Register & Work Detail** | `app/work-register/page.tsx`<br>`app/work-register/[id]/page.tsx` | `backend/app/api/routes/works.py`<br>`backend/app/models/work.py`<br>`backend/app/schemas/work.py` | Functional but severe operational UX bloat; card stacking; lacks compact stage-oriented workspace. |
| **Client Master & History** | `app/clients/page.tsx`<br>`app/clients/[id]/page.tsx`<br>`app/clients/[id]/ComplianceReview.tsx`<br>`app/clients/[id]/HistoryRecordModal.tsx` | `backend/app/api/routes/clients.py`<br>`backend/app/api/routes/history.py`<br>`backend/app/models/client.py`<br>`backend/app/models/corporate_history.py` | Good history tracking; foundational documents strictly defined as Certificate, Schedule X, and Form XII. |
| **RJSC Online Record & Snapshots** | `app/clients/[id]/RjscRecordComparison.tsx`<br>`components/services/AnnualReturnServicePanel.tsx` | `backend/app/api/routes/rjsc_snapshots.py`<br>`backend/app/api/routes/annual_returns.py`<br>`backend/app/models/rjsc_snapshot.py` | Schedule X online verification exists, but general RJSC snapshot comparison is clunky and disconnected from Work workflows. |
| **Annual Return Assessment** | `components/services/AnnualReturnServicePanel.tsx`<br>`lib/api/annual-returns.ts` | `backend/app/api/routes/annual_returns.py`<br>`backend/app/services/evidence_verification.py` | High legal fidelity (Sec 36 21-day rule, non-inference of AGM date, review required for unevidenced fees), but needs strict statutory separation between Schedule X and Form XII. |
| **Documents & AI Extraction** | `app/documents/page.tsx`<br>`components/DocumentAIModal.tsx` | `backend/app/api/routes/documents.py`<br>`backend/app/api/routes/ai_documents.py`<br>`backend/app/services/groq_ai.py` | Human-approval gate enforced, but Groq prompts lack versioned statutory knowledge base backing. |
| **Working Papers & Forms Lab** | `components/working-papers/*`<br>`components/forms-lab/*` | `backend/app/api/routes/working_papers.py`<br>`backend/app/api/routes/forms_lab.py`<br>`backend/app/services/pdf/*` | 31 templates cataloged; Form XII and Schedule X render properly; preflight checks present. |
| **Submissions & Queries** | `components/submissions/SubmissionLifecycleWorkspace.tsx` | `backend/app/api/routes/submissions.py`<br>`backend/app/models/submission.py` | Complete manual tracking (tracking no., challan, query follow-up, resubmission, delivery). |
| **Billing & Finance** | `app/billing/page.tsx`<br>`app/transactions/page.tsx` | `backend/app/api/routes/invoices.py`<br>`backend/app/api/routes/transactions.py`<br>`backend/app/api/routes/analytics.py` | Clean separation between operational delivery and invoice settlement; pending government fee protection. |
| **Floating Assistant** | `components/FloatingAssistant.tsx` | `backend/app/api/routes/pilot_feedback.py` | Provides quick Q&A and pilot feedback submission, but hardcoded Bengali Q&A is static and disconnected from live legal citations. |

---

## 3. Detailed Issue Register (Reranked by Statutory, Data & Operational Impact)

### CRITICAL ISSUES (Severity: Statutory Correctness & Data Integrity Risk)

#### [CRIT-01] Statutory Conflation of Form XII and Annual Return Bundling
- **Domain**: Statutory Correctness & Compliance Analysis.
- **Files**: `backend/app/api/routes/works.py` (lines 78-84), `backend/app/api/routes/annual_returns.py` (line 290).
- **Root Cause**: When an Annual Return work is initiated, `works.py` and `annual_returns.py` bundle `FORM_XII` into default checklist items and forms.
- **Statutory Reality**: Under Section 36 of the Companies Act 1994, an Annual Return consists of Schedule X, Audited Balance Sheet & Profit and Loss Account (Sec 185), and Form 23B Auditor Consent (Sec 210). Form XII (Sec 115) is ONLY required if there was an actual change in directors or managing agents, or during initial incorporation. Bundling Form XII unconditionally creates legal errors and unnecessary filings.
- **Proposed Fix**: Disentangle Form XII from mandatory Annual Return checklists and generated forms. Make Form XII conditional upon verified directorship changes during the period under review.

#### [CRIT-02] Disconnect Between RJSC Online Records and Work Verification
- **Domain**: Operational Integrity & Legal Evidence Gate.
- **Files**: `app/clients/[id]/RjscRecordComparison.tsx`, `backend/app/api/routes/rjsc_snapshots.py`.
- **Root Cause**: RJSC snapshots are saved on the client profile independently of specific Work orders. When staff opens a Work order (*e.g.* Annual Return or Share Transfer), they cannot directly upload and verify an RJSC portal screenshot within the Work context.
- **Impact**: Staff must switch back and forth between Client Master and Work Register to compare online positions against proposed filings, increasing the risk of preparing filings based on unverified or stale portal data.
- **Proposed Fix**: Integrate RJSC screenshot upload and verification directly into the Work Detail workspace (Stage 1: Current Position Verification).

---

### HIGH ISSUES (Severity: Data Integrity, Legal Verification & Operational Friction)

#### [HIGH-01] Working Paper Snapshot Overwrite & Data Drift Risk
- **Domain**: Data Integrity.
- **Files**: `backend/app/api/routes/working_papers.py` (lines 31-110, `build_working_paper_snapshot`).
- **Root Cause**: When a Working Paper is created, it takes a point-in-time JSON snapshot of company, directors, and shareholders data. If Client Master records are updated subsequently, the Working Paper does not alert the user to discrepancies.
- **Impact**: Risk of generating statutory forms with stale data if Client Master was amended during review.
- **Proposed Fix**: Add a preflight reconciliation indicator comparing current Client Master state with Working Paper snapshot version timestamp.

#### [HIGH-02] AI Legal Review Lacks Versioned Statutory Knowledge Base
- **Domain**: Statutory Accuracy & AI Safety.
- **Files**: `backend/app/services/groq_ai.py`, `backend/app/api/routes/ai_documents.py`.
- **Root Cause**: AI analysis extracts metadata via heuristic prompting rather than querying a structured, versioned legal knowledge base with verified Bangladesh statutory citations, amendments, and applicability rules.
- **Impact**: Risk of AI hallucinating legal rules or failing to ground recommendations in primary law.
- **Proposed Fix**: Design and integrate a versioned, source-backed Legal Knowledge Base (with amendments, effective dates, applicability, and human-reviewed citations) before running AI analysis prompts.

#### [HIGH-03] Work Detail Page Operational Layout Bloat
- **Domain**: Operational Usability & Screen Efficiency.
- **Files**: `app/work-register/[id]/page.tsx` (1,157 lines).
- **Root Cause**: The page mixes top breadcrumbs, header cards, lifecycle state buttons, assignment inputs, progress bars, 9 tab switches, inline task creation modals, inline checklist toggling, and specialized service modules into a single monolithic component.
- **Impact**: Excessive vertical scrolling ("stacked card syndrome"), navigational friction, and cognitive overload for legal staff.
- **Proposed Fix**: Rebuild Work Detail into a compact, wide two-column layout (70% workspace, 30% persistent context sidebar) with 4 card-style workflow stages, preserving all underlying functionality without redundant card layers.

---

### MEDIUM ISSUES (Severity: Auxiliary Features & Tooling)

#### [MED-01] Floating Assistant Static Hardcoded Responses
- **Domain**: Practitioner Assistance.
- **Files**: `components/FloatingAssistant.tsx` (lines 8-15).
- **Root Cause**: The assistant uses a static array of 6 hardcoded questions in Bengali with substring matching. It cannot answer questions regarding statutory deadlines, required forms, or client status.
- **Proposed Fix**: Connect Floating Assistant to the legal rule database and active workspace context so it can explain statutory deadlines (*e.g.* "What is the Section 36 deadline for this client?").

#### [MED-02] Deprecated Pydantic V1 Config Classes
- **Domain**: Code Quality.
- **Files**: `backend/app/api/routes/documents.py`, `backend/app/api/routes/auth.py`, `backend/app/api/routes/users.py`.
- **Root Cause**: Use of inner `class Config:` instead of `model_config = ConfigDict(...)` generates deprecation warnings under Pydantic V2.
- **Proposed Fix**: Refactor all schemas to use Pydantic V2 `ConfigDict`.

#### [MED-03] Pytest Windows Temp Path Conflict
- **Domain**: Local Development & Testing.
- **Files**: `backend/tests/test_pdf_pagination_regression.py`.
- **Root Cause**: Running `pytest` without explicit `--basetemp` in certain Windows environments triggers `PermissionError: [WinError 5] Access is denied: C:\Users\RAKIB\AppData\Local\Temp\pytest-of-RAKIB` when pytest scans temp folders.
- **Proposed Fix**: Configure `--basetemp=.pytest_temp` in test runner scripts.

---

## 4. SQLite Schema & Migration-State Risk Assessment

### Current Database State
- **Database Engine**: SQLite (`backend/dev.db`).
- **Production Data State**: Contains 1 real client record (`SILVEE AND SINTHEE TRAVEL AGENCY LTD`), 1 active work order (`WORK-0001`), related corporate history, and audit log entries.
- **Alembic Tracking Status**: Inspection of `backend/dev.db` reveals that tables were created via SQLAlchemy `Base.metadata.create_all()` directly; **there is no `alembic_version` tracking table in `dev.db`**, despite migration scripts existing in `backend/alembic/versions/`.

### Migration Risks & Constraints
1. **HIGH RISK of Data Loss if Alembic is run blindly**: Running `alembic upgrade head` against `backend/dev.db` without `alembic stamp` would attempt to re-execute table creation DDL (`CREATE TABLE clients...`), which will fail or corrupt the database.
2. **ZERO TOLERANCE for DDL Mutations on Existing Data**:
   - `backend/dev.db` must **NOT** be modified, deleted, or reset.
   - Do **NOT** run destructive migrations.
   - All proposed enhancements in this rebuild are **strictly additive or application-level**:
     - No columns in `clients`, `works`, `corporate_history`, `documents`, or `finance` require deletion or structural alteration.
     - Work Detail refactoring is strictly frontend UI and orchestration.
     - The Legal Knowledge Base will be implemented as code/JSON data structures without altering client relational schemas.

---

## 5. Verification Checkpoint Status

- Working tree is clean.
- All 169 backend and 100 frontend tests pass.
- Application code and `backend/dev.db` have NOT been modified during this phase.
