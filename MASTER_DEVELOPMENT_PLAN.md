# ZA Corporate Desk — Master Development Plan

Updated: 2026-10-12

## Ground rules
- Add newly requested requirements; never discard previously agreed requirements.
- Distinguish **implemented in code**, **merged**, **production deployed**, and **manually tested**.
- Staff review is mandatory for legal/compliance forms; the application does not file with RJSC.
- An RJSC form template is not evidence that a company has filed it.
- Never treat Form XII's issue date as incorporation date or an audit/DVC date as an AGM date.
- Do not invent financial statements, directors, shareholdings, AGM records, dates, penalties, or fees.

## Current functionality
- PR #1–#14 merged into main as of 2026-10-12 (frontend/backend latest production deployment reported ready/live; manual end-to-end QA remains).
- Existing: Auth/users; client directory and profiles; corporate history; works/tasks/checklists; billing/finance; document upload; RJSC snapshots and office comparison; dashboard; mobile dashboard update.
- PDF/screenshot onboarding: PR #13 merged, staff confirmation required.
- Form XII source extraction in Add Client: PR #15 exists; check current PR status separately. PDF text extraction and image suggestions do not extract director table and must be verified on authentic sample.

## P0 — Stability and verification
1. **[Implemented in local code & verified]** Fix Pydantic validation exception serialization crash (FastAPI `jsonable_encoder`) and add regression test for safe HTTP 422 JSON errors without traceback leakage.
2. **[Implemented in local code & verified]** Centralize HTTP 401 detection in `lib/api/fetchApi.ts`, exclude `/api/auth/login` to prevent credential-failure loops, synchronize `AuthProvider` user-state reset, preserve `returnUrl` destination, and harmonize `SESSION_EXPIRED` throwing across `clients.ts`, `works.ts`, and `analytics.ts`.
3. Run a real backend test suite in CI (GitHub workflow missing); verify build/typecheck and authenticated E2E flows.
4. Real Google Drive storage configuration, upload, download, retention and recovery test; Render local storage is not durable by default.
5. Mobile shell/navigation and mobile form/table testing across phone sizes.
6. Remove remaining fake notification items; never show demo content as real client compliance.
7. Verify staff roles/login and document authorization; assess access control and audit logging.
8. Improve client import duplicate checks and failed document attachment recovery.

## P1 — RJSC forms and Working Papers (user-confirmed)
**Requirement:** Keep user's 31 supplied RJSC form formats in ZA Corporate Desk. Select client/work; automatically populate fields from **verified, existing saved data**, leave unknowns blank, permit staff correction, require review/approval, then generate a form matching the appropriate layout. Do not replace original format with a generic sheet.

### Phased delivery
- **First slice (this branch):** Remove fictional WP-DEMO-001 entry; show 31-item form catalog; Form XII preview/draft with client name, registration and saved director name/designation/appointment dates; staff fills missing values and confirms; browser Print / Save as PDF. **Not yet saved into database**, **not official PDF template overlay**, **not merged or fully tested**.
- **Next:** Verified original-geometry templates (PDF overlays or faithfully reproduced official layout), and server-side saved draft version records tied to Client ID, Work ID, author, date, uploaded source and audit trail.
- **Next priority forms:** Schedule X (capital, shareholders, directors), Form VI (registered-office change), Form IV and XV (capital/allotments), Form 23B, Form 117.
- **After that:** remaining templates: I, III, VII, VIII, IX, X, XII, XIV, XVIII, XIX, XXVIII, XXXVI–XLI, certified-copy, name-clearance and extension, financial formats, board resolution, winding-up.
- Enable editable prefill and visible source provenance per field; warn for mismatch and stale records.
- Review workflow should reuse existing WorkReview (Junior -> Senior -> Manager) where applicable; do not duplicate it.
- Final PDF and source documents in persistent storage, optional approved signature, format/version metadata.
- Compliance/fees/legal references should be verified against current RJSC rules; the uploaded samples contain historical printed text and are not proof of current law.
- Maintain separation between **prepared draft**, **reviewed draft**, **approved internal file** and **filed/acknowledged by RJSC**.

## P1 — Corporate/office flows
- Test Corporate History save/edit and status transitions, AGM/annual-return status distinction.
- Test RJSC snapshot field comparison and source linking; compare director sets robustly without false mismatch.
- SILVEE AND SINTHEE TRAVEL AGENCY LTD (C-118168): source-verify existing client and documents first; never fabricate or auto-create legal work. Record 2022 AGM status only on verified authority; audit/DVC does not prove AGM.
- E2E Work -> Task -> documents -> Working Paper -> reviewer -> bill/payment -> reporting.

## P2 — Project documentation
- Rewrite README.md and backend/README.md to describe ZA Corporate Desk and real architecture/config, rather than FAMES & R frontend-only prototype.
- Publish tests and manual QA outcomes by module.
- Maintain this plan and known issues on each meaningful PR; changes additive, status updated only after evidence.

## Execution status notes
- Latest existing PRs #13 and #14 merged, Vercel READY and Render live as last checked; functionality needs real-device verification.
- First Form XII Working Paper implementation is on feature branch, **draft-only and unverified**.
- No auto-filing, no live client records or uploaded source documents modified by the form generator.
