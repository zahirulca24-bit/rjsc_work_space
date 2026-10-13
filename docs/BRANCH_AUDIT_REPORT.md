# PR #22 — Branch Audit Report

Date: 2026-10-13
Repository: https://github.com/zahirulca24-bit/rjsc_work_space
Branch: `feature/za-office-workflow-forms-batch1`
PR: https://github.com/zahirulca24-bit/rjsc_work_space/pull/22
Initial coding commit: `edeee21`. This documentation addition creates subsequent commit(s).

## Independently confirmed through GitHub connection
- PR #22 exists, **open and not merged**.
- Branch is **1 commit ahead of main** at the start of this documentation audit.
- Compare listed **61 changed files** (code, tests and `docs/RJSC_FORMS_INVENTORY.md`).
- Files present and inspected: `forms_engine.py`, `forms_lab.py`, `submissions.py`, `compliance-analysis.ts`, `app/work-register/[id]/page.tsx`, `app/login/page.tsx`.
- The four planning/tracking/audit documents required by the previous instruction were **not present** on the PR branch before this documentation task. They are added here.

## Findings / risks
1. **HIGH — Environment portability**: `backend/app/services/pdf/forms_engine.py` hardcodes `E:\RJSC\rjsc FROM` and `E:\RJSC\rjsc_work_space\storage\generated_forms` as default directories. This can fail after deployment or on a different PC. Make locations configurable and provide a managed template asset strategy.
2. **HIGH — Template reproducibility**: Antigravity identified 31 PDFs on the local Windows PC. Source reference PDFs are deliberately not in GitHub; generated templates may be unavailable on CI/deployment. Define an authorized, versioned template acquisition/storage policy.
3. **HIGH — Functional validation**: Reported 163 backend and 100 frontend test passes do not demonstrate output PDFs fit tables, dates and signatures, or that real filing rules hold. Batch 1 requires manual output review and provenance checks.
4. **MEDIUM — Sensitive login UX**: PR changes `app/login/page.tsx` with visible development demo-credential helper. This must not be exposed to production or mistaken for production credentials. Audit auth and remove/feature-gate this UI.
5. **MEDIUM — UX discoverability**: Browser Worker V4 reported 13 page visits PASS yet could not see Form XII/Schedule X/Form 117 labels at the top-level Working Papers page. The Work Detail tab appears to be the intended entry; test actual navigation and discoverability.
6. **MEDIUM — Compliance uncertainty**: Statutory AGM/Annual Return dates, year-specific DVC requirements and RJSC fees require source-linked, legally reviewed rules. A Schedule X summary is not itself proof AGM took place. Never infer a historic actual event only from a template/date.
7. **MEDIUM — Implementation labels**: `LIVE_AUTOFILL_READY` in template registry indicates code availability, not successful user acceptance or RJSC production acceptance.

## Scope audit
Confirmed code additions: Work Register/detail and workflow, working-paper preparation, Forms Lab engine/API/UI, submissions lifecycle/API/UI and supporting models/tests. Billing, full job-cost accounting, policy-driven fees, credential vault and final compliance review remain outside confirmed PR #22 completion.

### Batch 2 — Core RJSC Services (Branch: `feature/core-rjsc-services-batch2`)
Development branch branched safely off `feature/za-office-workflow-forms-batch1` preserving PR #22 unmerged:
1. **Annual Return Service**:
   - Assessment router (`/api/annual-returns/assessment/{client_id}`) calculating actual AGM, audit report, DVC code, and Sec 36 21-day statutory deadlines.
   - Bundled work creation (`/api/annual-returns/create-work/{client_id}`) with multi-year statutory checklist (`AR-CHK-01` to `08`) and Working Paper linkage.
   - Dedicated UI (`AnnualReturnServicePanel.tsx`) mounted in Work Register detail and Client Profile tabs.
2. **Share Transfer Service (Form 117)**:
   - Proposal validation (`/api/share-transfers/work/{work_id}`) with pre/post mathematical share balance parity reconciliation.
   - Live Form 117 PDF overlay generation.
   - Authorized register mutation (`/api/share-transfers/work/{work_id}/apply`) updating `shareholders` table with immutable audit log.
   - Dedicated UI (`ShareTransferServicePanel.tsx`) mounted in Work Register detail.
3. **Mortgage & Charge Service (Sec 159 / 160 / 169)**:
   - Creation (Form XVIII), Modification (Form XIX), and Satisfaction (Form XXVIII) workflows.
   - Section 159 21-day deadline countdown with Section 171 High Court condonation legal warnings.
   - Form XVIII, XIX, and XXVIII overlays promoted to `LIVE_AUTOFILL_READY` with multi-page coordinate mapping.
   - Dedicated UI (`MortgageChargeServicePanel.tsx`) mounted in Work Register detail.
4. **Verification**:
   - 166 passing backend pytest tests (100%).
   - 100 passing frontend tsx tests (100%).
   - 0 TypeScript type errors (`tsc --noEmit`).
   - Clean Next.js production build (`next build`).

## Verification boundary
GitHub branch metadata, file existence and inspected code were checked independently. Local machine test results, database integrity, actual PDF visuals, privacy review and on-site user workflows **were not** independently executed. Antigravity's claim of no migration risk or secrets in Git is **not an independent security/migration audit**; run dependency, secret, migration and access-control reviews before merging.

## Release gate
**Do not merge/deploy PR #22 yet.** Require output PDF acceptance, login/default-credential remediation, template portability decision, access-control/security and migration checks; then obtain explicit approval.
