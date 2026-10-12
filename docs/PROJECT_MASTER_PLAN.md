# ZA Corporate Desk — Project Master Plan
Version: 1.0 | Date: 2026-10-12 | Status: Working business blueprint (not implemented)

## Purpose
Internal RJSC and corporate compliance service-management system for Zahir & Associate. Preserve client records, work processing, forms, submissions, finance, accountability and audit trail. This is a planning document, not evidence that functionality exists.

## Core model — APPROVED DIRECTION
- **One Client → many Works; One Work → multiple Forms, Tasks, Documents and Transactions (Option A).**
- Work Register is the operational hub. Each work has unique reference, service, owner, dates, status, checklist, documents, forms, submissions, costing, billing and closing records.
- Client Master holds company/entity details, registration, contact, directors, shareholders, corporate history and secure portal account references.
- Work-specific changes do not silently overwrite Client Master. Updates to corporate history require evidence and review.
- Form auto-fill only uses recorded, appropriate source data; missing fields remain missing and require verification. No invented director or filing details.
- Maintain both client-wide and work-specific views.

## End-to-end operational workflow
1. Client onboarding / select existing client and verify master records.
2. Open work: choose service, assign staff, due dates, priority and unique reference.
3. Service checklist, request/receive documents, verify provenance.
4. Prepare working papers and applicable forms, including verified auto-fill and manual completion.
5. Internal review: preparer → reviewer → authorized approver; corrections tracked.
6. Actual RJSC submission, fees, tracking, queries, resubmissions and final outcome; draft is NOT submission.
7. Flexible billing, advances, receipts and settlement (may occur before or after submission).
8. Deliver outputs, record acknowledgement, update verified corporate history and archive.
9. Close operational and financial records independently.

## Proposed work statuses (to validate against office practice)
New Request → Awaiting Documents → In Preparation → Under Review → Ready for Submission → Submitted → Query/Resubmission → Approved/Processed → Delivered → Closed.
Exception states: On Hold, Cancelled, Rejected; preserve transition history. Billing status is separate.

## Modules / navigation
Dashboard; Clients; Work Register; Tasks & Deadlines; Checklist/Requisition; Documents; Working Papers; Services & Fees; Transactions; Billing; Team; Reports; Settings.
Mobile design: desktop sidebar retained; mobile hamburger drawer with role-filtered full navigation and bottom tabs Home, Clients, Works, Finance, More. Avoid controls overlapping navigation.

## RJSC forms and official templates
Keep client-specific **Working Papers** distinct from a proposed official **Corporate Forms & Document Library**. Act/entity/process-based grouping is a proposal, not a verified legal classification. Only Form XII draft generator was observed as implemented during planning; other forms may remain mapping-pending. Verify exact official PDF and statutory mapping before publication.

## RJSC portal account management
Client-authorized access only. Store login IDs and encrypted secrets in a restricted vault (never plaintext, logs, invoices, exports or ordinary documents); access logs, role permissions, revocation, rotation and MFA where available. Account recovery is a tracked task with authorization, evidence, approved fees and handover. No credentials in this document.

## Roles and controls
Manager/Admin: work assignment, approvals, close.
Case Officer: client coordination and processing.
Preparer: documents and drafts.
Reviewer: verification and compliance.
Accounts: receipts, payments, reconciliation.
Small-office role overlap is allowed; separate preparer/approver for material items where practical.

## Open decisions
- Staff cost policy: salary-only, per-work, or both (both recommended, NOT yet selected).
- Approval monetary thresholds; overhead allocation basis; client billing/tax presentation; recognition and reimbursement rules; retention policy.
- Official RJSC service/form/fee mapping and deadlines require independent validation.
- Final work statuses and role matrix need office acceptance.

## Change control
Business decisions go into this file or FINANCIAL_BUSINESS_RULES.md; development tasks and PRs go into IMPLEMENTATION_TRACKER.md. A PR is not complete until reviewed, checks pass and it is merged. No software/database modifications in this documentation PR.
