# ZA Corporate Desk — Implementation Tracker
As of 2026-10-12. This is a status ledger, not a promise that features are built.

## Status definitions
- **Decision/Planning:** business intent discussed or selected, no code necessarily.
- **In development / PR open:** proposed code not yet merged; verify CI and Vercel preview.
- **Merged:** code merged into main; production deployment separately verified.
- **Verified live:** production behavior manually validated.

| Area | Business status | Implementation status | Evidence / next action |
| --- | --- | --- | --- |
| Client Master and corporate history | Workflow defined | Existing functionality, completeness unverified | Validate directors and source history |
| One Work → Multiple Forms | Option A selected | Existing Work Register; integration completeness unverified | Map work IDs to forms, costs, invoices |
| Full office lifecycle | Proposed detailed flow | Not verified implemented end-to-end | Finalize transitions and permissions |
| Working Papers / Form XII | Verified-data auto-fill policy | Form XII draft exists; director population issue reported | Inspect history payload and test with verified data |
| Official forms library | Grouping discussed | Not started/unknown | Verify official forms and applicable laws |
| Package / Itemized / Hybrid Billing | **Selected** | Not verified implemented | Define schema and invoice workflows |
| Work-wise budget and actual job cost | **Selected** | Not verified implemented | Build costing ledger after rules review |
| Cash/Bank/Deposits | Planned | Not verified implemented | Chart of accounts and reconciliation |
| Government fees and recoverables | Planned | Not verified implemented | Receipt/challan and reimbursement rules |
| Staff advance and expense settlement | Planned | Not verified implemented | Approvals and settlement |
| Client/work/office profitability | Planned | Not verified implemented | Accounting treatment and overhead rules |
| RJSC credential vault | Planned, security constraints defined | Not verified implemented | Security design before storage |
| Staff compensation method | **Decision pending** | Not started | Select salary-only / per-work / both |
| Mobile drawer + five bottom tabs | Design selected | **PR #20 opened; merge and live status not confirmed** | https://github.com/zahirulca24-bit/rjsc_work_space/pull/20 |
| Documentation baseline | In progress | This documentation PR | Review and merge independently |

## PR register
- **PR #19** — earlier backend auth resilience/tests work; previously reported merged to main.
- **PR #20** — mobile navigation, branch `fix/mobile-navigation-bottom-tabs`, syntax correction commit `0305999`. Do not assume deployed to production without verifying PR merge and Vercel.
- **This PR** — documentation only; no application code or database changes.

## Suggested execution order (not yet approved)
1. Confirm documentation and unresolved policy decisions.
2. Validate PR #20 CI, Vercel preview, role visibility and mobile UX; merge only after review.
3. Define Work Register relational model and cost attribution.
4. Specify Financial Ledger/Chart of Accounts and accounting controls.
5. Implement and test costing, cash/bank, government fees, staff settlements.
6. Implement billing, collections, profit reports and secure credential vault with security review.
7. Expand forms library and auto-fill by verified source.

## Working practice
Every PR should link its tracker row, scope, test results and deployment status. Update this document when decisions change or features move from planned to verified. Avoid credentials or sensitive client data in GitHub documentation.
