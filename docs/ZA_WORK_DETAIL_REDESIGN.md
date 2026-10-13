# ZA Corporate Desk — Work Detail Screen Redesign Specification

**Target Component**: `app/work-register/[id]/page.tsx`  
**Goal**: Replace the bloated, stacked-card, 9-tab layout with a compact, wide, space-efficient professional legal workspace without adding redundant card layers or discarding working features.

---

## 1. Deficiencies in the Current Implementation

The current Work Detail page suffers from several serious operational and usability flaws:
1. **Vertical Space Wastage ("Stacked Card Syndrome")**:
   - Breadcrumb bar + Large Header Card + Progress Bars + 9 Tabs Bar + Large Action Cards vertically push the actual working content far below the fold.
2. **Excessive Tab Splitting**:
   - 9 horizontal tabs (`Overview`, `Specialized Module`, `Checklist`, `Tasks`, `Documents`, `Working Papers`, `Review`, `Submission Lifecycle`, `Finance`) force users to hunt for interrelated data.
3. **Redundant Forms Interfaces**:
   - Both `Working Papers & Forms` tab and the specialized service panel (*e.g.* `AnnualReturnServicePanel` or `ShareTransferServicePanel`) display forms, generating confusion regarding where the canonical draft is saved.
4. **Disconnected RJSC Screenshot Verification**:
   - Verifying the current RJSC portal state requires navigating back to the Client profile rather than inspecting evidence directly within the active Work.
5. **No Visual Separation Between Analysis and Execution**:
   - Preparation, review, statutory assessment, and submission tracking are flattened into disconnected tabs without a clear workflow progression.

---

## 2. Redesigned Layout Architecture (Zero Redundant Card Layers)

The new Work Detail screen replaces the 9-tab layout with a **unified legal workspace** organized into:
1. **Compact Sticky Work Header** (Top): One-line summary with work code, service, entity type, client name, status badge, and total billable.
2. **Card-Style Stage Navigation**: Compact 4-stage pipeline selector.
3. **Wide Two-Column Operational Layout**:
   - **Left / Main Column (70%)**: Active workspace view for the selected stage.
   - **Right / Context Column (30%)**: Compact persistent sidebar showing Client Summary, Key Deadlines, Staff Assignment, Review Gate Status, and Financial Billable Summary.

```
+-------------------------------------------------------------------------------------------------------+
| COMPACT WORK HEADER: WORK-0001 • ANNUAL RETURN • PVT LTD • CLIENT NAME • [STATUS BADGE] [৳ 15,000]    |
+-------------------------------------------------------------------------------------------------------+
| WORKFLOW STAGES (Pipeline):                                                                           |
| [1. Current Position] -> [2. Legal Analysis & Checklist] -> [3. Papers & Forms] -> [4. Signoff/Filing]|
+-------------------------------------------------------------------------------------------------------+
| MAIN CONTENT AREA (70% Width)                         | PERSISTENT SIDEBAR (30% Width)                |
|                                                       |                                               |
| - Stage 1: RJSC Screenshot & Foundational Baseline    | - Client Master Snapshot & Contacts           |
| - Stage 2: Statutory Assessment & Dynamic Checklist   | - Assigned Staff & Due Date Controls          |
| - Stage 3: Working Papers, Forms Lab & PDF Generation | - Multi-Level Review Gate (Junior/Senior/Mgr) |
| - Stage 4: Review Signoff, RJSC Submission & Delivery | - Compact Billable & Payment Summary          |
|                                                       | - Associated Tasks (Quick Add)                |
+-------------------------------------------------------------------------------------------------------+
```

---

## 3. Four Core Workflow Stages (Card-Style Navigation)

Instead of 9 fragmented tabs, navigation is consolidated into 4 logically sequenced stages that preserve all existing functional logic:

### Stage 1: Current Position & Foundational Baseline
- **What it displays**:
  - Foundational Legal Scorecard (Certificate of Incorporation, Schedule X, Form XII).
  - Integrated **RJSC Online Screenshot Upload & Viewer**: Upload official RJSC company details or certified-copy list screenshot directly inside the Work order.
  - Side-by-side reconciliation between internal Client Master data and verified RJSC online record.
- **Action**: Verify whether internal records match the portal before drafting documents.

### Stage 2: Legal Analysis & Checklist
- **What it displays**:
  - **Specialized Service Engine**:
    - *Annual Return*: Multi-year Schedule X compliance table, Section 36 deadline countdown, actual AGM date verification, ICAB DVC audit status. Form XII kept separate unless director changes occurred.
    - *Share Transfer*: Mathematical shareholding reconciliation, transferor/transferee parity, consideration calculation, stamp duty calculation.
    - *Mortgage & Charge*: Section 159 21-day countdown, High Court Section 171 condonation alert, lender particulars.
  - **Integrated Statutory Checklist**: Requirements dynamically filtered based on entity type and service rules.
  - **AI Legal Preflight**: Automated review backed by the versioned Legal Knowledge Base with citations.

### Stage 3: Working Papers & Forms Lab
- **What it displays**:
  - Point-in-time Working Paper editor with preflight validation against verified Client Master records.
  - Integrated Forms Lab: Live preview and generation of RJSC forms (Schedule X, Form 117, Form XVIII/XIX/XXVIII, Form 23B, Form XII when applicable).
  - Version history of generated PDFs with direct view/download.

### Stage 4: Signoff, RJSC Submission & Completion
- **What it displays**:
  - Multi-level review desk (Junior submission -> Senior quality check -> Manager final authorization).
  - RJSC portal manual submission record (RJSC tracking number, payment challan, upload timestamp).
  - Query and resubmission tracking (if RJSC raises an objection).
  - Final client delivery record and corporate history archive.

---

## 4. Persistent Sidebar Specification (Right 30%)

The persistent right-hand sidebar keeps essential contextual data visible at all times regardless of active stage:

1. **Client Master Snapshot**:
   - Legal Name, Registration No., Incorporation Date, Registered Office, TIN/BIN.
   - One-click link to open Client Master.
2. **Assignment & Lifecycle Controls**:
   - Compact dropdown for Assigned Staff.
   - Statutory / Internal Due Date picker.
   - Work Lifecycle Stage selector (compact pills instead of a massive card grid).
3. **Review & Signoff Gate**:
   - Current stage (`DRAFT`, `SUBMITTED_TO_SENIOR`, `SUBMITTED_TO_MANAGER`, `APPROVED`).
   - One-click action button appropriate for current user role.
4. **Compact Financial Summary**:
   - Professional Fee, Govt Fee (Challan), Disbursements, Total Billable.
   - Invoiced vs. Collected vs. Outstanding balance.
5. **Quick Tasks**:
   - Collapsible list of active tasks with quick-add input.

---

## 5. UI Component Hierarchy & File Modularization Plan

To avoid monolithic code while preserving 100% of underlying API hooks and handlers, `app/work-register/[id]/page.tsx` will be modularized into clean, focused sub-components:

```
app/work-register/[id]/
├── page.tsx                           # Lightweight container & state manager (~250 lines)
├── components/
│   ├── CompactWorkHeader.tsx          # Work code, badges, total billable, breadcrumbs
│   ├── WorkStageNavigation.tsx        # Card-style 4-stage pipeline selector
│   ├── WorkPersistentSidebar.tsx      # Client summary, assignment, review gate, finance
│   ├── stages/
│   │   ├── StageCurrentPosition.tsx   # Foundational scorecard & RJSC screenshot verify
│   │   ├── StageLegalAnalysis.tsx     # Specialized service engine & statutory checklist
│   │   ├── StageWorkingPapers.tsx     # Working papers snapshot & Forms Lab generation
│   │   └── StageSignoffSubmission.tsx # Multi-level review & manual RJSC submission tracking
```
