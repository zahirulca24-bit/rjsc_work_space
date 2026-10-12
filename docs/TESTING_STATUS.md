# ZA Corporate Desk — Testing and Acceptance Status

As of 2026-10-13. **Automated test results reported by Antigravity are not equivalent to user acceptance.**

| Test layer | Reported result | Evidence/meaning | Acceptance |
|---|---|---|---|
| Backend pytest | 163 passed | Antigravity terminal report for PR #22 | Reported, independently not rerun |
| Frontend npm test | 100 passed | Antigravity terminal report | Reported, independently not rerun |
| Typecheck | 0 errors | Antigravity report | Reported, independently not rerun |
| Next.js build | 0 errors | Antigravity report | Reported, independently not rerun |
| Browser Worker V3 | 7 navigation routes marked PASS | Page loads only | Does not verify workflows |
| Browser Worker V4 | 13 page-load checks marked PASS | Form XII, Schedule X, Form 117 were NOT VISIBLE at /working-papers | Forms functionality NOT TESTED |
| RJSC production portal acceptance | Not performed | Our app does not submit filings | NOT VERIFIED |

## Manual acceptance checklist (all PENDING unless explicitly recorded otherwise)
- [ ] Local START.bat starts frontend/backend, login works without exposing production/default passwords.
- [ ] Client can be created with 0/1/2/3 primary documents; missing requirements remain prominently flagged and do not block creation.
- [ ] Uploaded Incorporation Certificate, latest Form XII and Schedule X populate only verified client fields, including incorporation date, directors, shareholders, registered office and capital where present.
- [ ] Corrections update one permanent client profile with corporate-history and evidence trace.
- [ ] From a client open a Work, verify work selection, checklist, deadlines, staff roles and the Forms Lab tab.
- [ ] Form XII auto-fills actual verified directors, including >6 directors, with no overlap.
- [ ] Schedule X reconciles share counts and capital; detects mismatch; renders long shareholder lists across pages.
- [ ] AGM Date is never silently inferred from Schedule X filing date or DVC date. Missing evidence triggers REVIEW REQUIRED.
- [ ] Form 117 only from approved transfer-specific work data; check transferor/transferee, consideration, distinctive share numbers, witness/signature slots.
- [ ] Generated PDF has no browser header/footer, stale year labels or clipped text.
- [ ] Form revision/approval changes neither Client Master nor RJSC submission status by itself.
- [ ] Manual submission receipt, query and resubmission lineage work; approval roles validated.
- [ ] Financial records remain separate from operational closure and no accidental invoice/cash-book entries are created on PDF generation.
- [ ] PDFs and private client data are excluded from Git and report exports are sanitized.

## Testing evidence to capture
For each test record: test case, timestamp, app branch and commit, chosen test work/client (non-sensitive identifier), expected result, observed result, screenshot/report, PASS/FAIL/BLOCKED, defect, and retest outcome. Prefer a dedicated safe test client; do not enter fictitious historic AGM evidence into live client history.

## Known test-blocking risks
- `forms_engine.py` defines absolute local paths for templates and generated output. Move to configured paths and verify Windows and production-like environments.
- The user-provided PDFs are local and not in the GitHub PR. Missing on another workstation may block generation.
- UI route `/working-papers` may not expose form selection directly; inspect the **Work Detail → Forms Lab** tab.
- Local login screen exposes example default credentials; verify these are absent/disabled in production and replace any reused credentials.
- A page load PASS is not a functional test result.
