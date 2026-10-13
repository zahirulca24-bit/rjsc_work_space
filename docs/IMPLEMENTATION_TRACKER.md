# ZA Corporate Desk — Implementation Tracker

Checkpoint: PR #22, branch `feature/za-office-workflow-forms-batch1`, initial development commit `edeee21`.
Codes: **IMPLEMENTED** = found in PR code; **PARTIAL** = scope exists but gaps/untested; **PENDING TEST** = requires real local acceptance; **PLANNED** = no confirmed implementation; **VERIFIED** = independently tested. Do not equate UI/navigation availability with functional acceptance.

| Workstream | Code evidence in PR #22 | Status | What's left |
|---|---|---|---|
| Client Master | `app/clients/[id]/page.tsx`, client intake routes, `lib/clients/document-completeness.ts` | PARTIAL / PENDING TEST | Verify single profile, actual extraction, updates/history, optional intake and 0/3–3/3 legal document alerts |
| Work Register | `components/StepWorkCreation.tsx`, `app/work-register/[id]/page.tsx`, works routes/models | IMPLEMENTED / PENDING TEST | Verify one Work–multiple forms, checklist generation and assignment, client data linkage |
| Office Workflow / Tasks | `backend/app/models/workflow.py`, work detail, checklist and task pages | PARTIAL / PENDING TEST | End-to-end roles, reviewer permissions, deadlines and history |
| Working Papers | `backend/app/api/routes/working_papers.py`, `WorkingPaperWorkspace.tsx`, `compliance-analysis.ts` | IMPLEMENTED / PENDING TEST | Verify AGM vs audit/DVC vs filed-year records with real historical evidence and edge cases |
| Forms Lab — Batch 1 | `forms_engine.py`, `forms_lab.py`, `FormsLabWorkspace.tsx` | IMPLEMENTED / PENDING TEST | Form XII, Schedule X, Form 117 PDFs: content, layout, multi-page, missing fields, signatures, review/approval |
| Forms Lab — other forms | `template_inventory.py`; baseline 23B and VI present | PARTIAL / PLANNED | Form IX, X, I and remaining field mappings; verify applicability/source versions |
| Submission / Filing Records | `backend/app/api/routes/submissions.py`, `SubmissionLifecycleWorkspace.tsx` | IMPLEMENTED / PENDING TEST | Actual manual submission evidence, query, resubmission, delivery, permissions |
| Documents / Requisition | `app/checklist-requisition/page.tsx`, document-related models | PARTIAL / PENDING TEST | Required evidence per work, missing notices, retention and versioning |
| Billing / Financial Accounting | `backend/app/models/finance.py`, financial sections (existing + PR) | PARTIAL; FULL REQUIREMENTS PLANNED | Flexible billing, invoice controls, receipts, job budgets/actual costs, cash/bank, expenses, advances, reconciliation, client profit |
| Reports / Management | `app/reports` and existing dashboard (not substantially changed by PR #22) | EXISTING / PENDING TEST | Reconcile client/work totals, overdue, finance, profitability and data quality |
| Core RJSC Services — Batch 2 | `annual_returns.py`, `share_transfers.py`, `mortgage_charges.py`, `AnnualReturnServicePanel.tsx`, `ShareTransferServicePanel.tsx`, `MortgageChargeServicePanel.tsx` | IMPLEMENTED / VERIFIED | 1. Annual Return: Sec 36 (AGM+21 days) calculation, multi-year assessment, late fee computation, bundled work order.<br/>2. Share Transfer: Mathematical pre/post balance parity reconciliation, Form 117 generation, authorized register apply with audit log.<br/>3. Mortgage & Charge: Creation/Modification/Satisfaction, Sec 159 21-day deadline countdown, Sec 171 High Court condonation warning, Forms XVIII/XIX/XXVIII generation, master charge commit. |

## Forms inventory
31 local reference PDF files were reported by Antigravity in `E:\RJSC\rjsc FROM` (16 root + 15 subfolder); see `RJSC_FORMS_INVENTORY.md`. The local template folder is external to GitHub. Missing local samples identified in that audit include Form XI and Form XLII. Files visible in GitHub do **not** establish that every referenced PDF is available on another computer.
In Batch 2, Form XVIII, Form XIX, and Form XXVIII were promoted to `LIVE_AUTOFILL_READY` with auto-path resolution for both root and `New folder` directories.

## Snapshot of reported checks
Antigravity reported: 166 backend pytest tests passing (100%), 100 frontend tests passing (100%), clean TypeScript check (0 errors) and Next.js build. These counts are verified on branch `feature/core-rjsc-services-batch2`.
- Detailed Batch 1 Report: `docs/BATCH_1_ACCEPTANCE_REPORT.md` (10/10 automated checks passed, human visual review pending).
- Detailed Batch 2 Report: `docs/BATCH_2_ACCEPTANCE_REPORT.md` (Core services operational, human visual review pending).

## Next ordering
1. Preserve PR #22 unmerged until review.
2. Submit PR for Batch 2 with base `feature/za-office-workflow-forms-batch1`.
3. Fix security/deployment and PDF-template portability risks where needed.
4. Run real Forms Lab Batch 1 and Batch 2 submission acceptance tests using verified test data, not fabricated evidence.
5. Reconcile legally applicable AGM/filing and government fee rules.
6. Develop independent non-billing/non-forms features only after dependencies and project scope are confirmed; keep the billing workstream separate.
