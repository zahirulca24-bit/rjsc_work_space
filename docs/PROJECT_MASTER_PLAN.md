# ZA Corporate Desk — Project Master Plan

Updated: 2026-10-13. Source of truth: this repository's code plus office-approved decisions. This document records scope, not a claim that every feature is finished.

## Approved business rules
- One client is registered **once** with a permanent profile; subsequent filings/documents update the profile and maintain dated, source-linked corporate history rather than creating duplicate clients.
- Client creation is allowed with zero, one, or more primary documents, including manual intake. The **three primary legal evidence documents** are Certificate of Incorporation, latest Form XII, and latest Schedule X. Missing items stay highlighted as **required / documentation incomplete**; they must **not** block client registration. Memorandum/Articles are not part of this initial minimum.
- Minimize manual entry: derive company, directors, shareholder, capital and registered-office fields from verified source documents where possible; retain human confirmation and source provenance. Never invent absent values.
- **One Work may contain multiple forms**, checklists, tasks, document requests, staff roles, reviews, submissions, invoice items and costs. A form is not necessarily a separate Work.
- **Flexible service-wise billing:** Package, Itemized or Hybrid. **Internal work/job costing** is required independently of billing style.
- Our app **prepares and exports forms** for staff review and manual upload to RJSC. It does **not** directly submit filings, automatically access private RJSC accounts, or claim RJSC portal acceptance.
- AGM Date, audit report/DVC date, Schedule X summary date, filed date, and RJSC acknowledgement date must be tracked as distinct events. No fabricated/backdated meeting evidence. Apply law/fees only from reviewed, effective-date-specific references; flag uncertain scenarios for review.
- Client advances, work costs, government disbursements, staff advances/settlement, accounts receivable and service revenue must not be conflated. Profit views must avoid double-counting salary/overhead.

## Intended office workflow
Client onboarding and evidence check → Work Register → checklist/requisition → verified Working Papers and statutory date analysis → multi-form generation and internal review → staff's manual RJSC submission and queries → delivery and operational closing. Billing/collection may happen throughout; financial closing remains distinct.

## Ten workstreams — planning framework
The exact numbering of the earlier verbal ten-point roadmap has not been independently recovered; treat these as headings for tracking, **not** a claim about the original phase numbering.

| Workstream | Scope |
|---|---|
| Client Master | Permanent profile, verified corporate history, 3-document evidence indicator |
| Work Register | Client-linked work, intake, assigned staff, service scope, dates |
| Workflow / Tasks | Stages, roles, reviews, checklists, deadlines |
| Working Papers | Verified snapshots, AGM/audit/DVC analysis, draft preparation |
| RJSC Forms Lab | Reference library, field mapping, reviewer-approved downloadable PDFs |
| Submission / Filing Records | Manual submission, receipt, query, resubmission, delivery |
| Documents / Requisition | Primary legal evidence, files, versioning, missing-document alerts |
| Billing | Package/itemized/hybrid bills, advances, partial receipts, adjustments |
| Accounting / Costing | Government fees, expenses, staff advances, bank/cash, profitability |
| Reports / Management | Work, client, compliance, finance, profitability dashboards |

## Open decisions / scope limits
- Final AGM and Annual Return date rules for exceptional historic cases require expert, evidence-based review.
- Authoritative and currently applicable RJSC filing/late-fee/VAT rules and effective dates must be corroborated against gazettes and actual assessments.
- Staff costing model (salary plus work-wise labour/incentive) was suggested, **not approved**.
- Approval limits, expense policies, revenue recognition, overhead allocation and accounting close rules remain to be specified.
- RJSC client-account credential vault is **planned only**; require authorization, encryption, role gating and audit trail before implementation.
- Template versions and portal acceptability require human validation. The local reference PDF collection is not automatically packaged in the repository.

## Change control
Current code checkpoint: PR #22 — https://github.com/zahirulca24-bit/rjsc_work_space/pull/22
Do not merge or deploy solely on the basis of automated test counts. See IMPLEMENTATION_TRACKER.md, TESTING_STATUS.md and BRANCH_AUDIT_REPORT.md.
