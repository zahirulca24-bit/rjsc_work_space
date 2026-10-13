/**
 * Bangladesh Companies Act 1994 Statutory Compliance Analysis Helper
 *
 * Core Statutory Rules:
 * 1. Companies Act 1994, Section 36(1):
 *    Annual Summary of Share Capital and List of Members (Schedule X) must be filed
 *    within twenty-one (21) days immediately following the Annual General Meeting (AGM).
 *
 * 2. Strict Event Separation:
 *    - Audit Report & DVC: Prepared by statutory auditors and verified via ICAB DVC.
 *      DVC proves auditor authentication, NEVER that shareholders held an AGM.
 *    - Annual General Meeting (AGM): Shareholder meeting convened under Section 81.
 *    - Return Filing: Filing with the RJSC under Section 36.
 *
 * 3. Unevidenced Rule:
 *    If an AGM date is missing or unevidenced, statutory deadlines must NOT be fabricated.
 *    Status must remain REVIEW_REQUIRED.
 */

export interface Sec36DeadlineResult {
  statutoryDeadline: string | null;
  daysAllowed: number;
  status: "CALCULATED" | "REVIEW_REQUIRED";
  calculationBasis: string;
  missingEvidenceNotes: string[];
}

export interface EventSeparationValidation {
  isDistinct: boolean;
  dvcDoesNotProveAgm: boolean;
  warnings: string[];
}

export interface ReturnFilingCompliance {
  isOverdue: boolean;
  delayDays: number;
  complianceAssessment: "COMPLIANT" | "PENDING_FILING" | "OVERDUE" | "REVIEW_REQUIRED";
  citation: string;
  notes: string;
}

/**
 * Calculates Section 36(1) Schedule X filing deadline:
 * Exactly 21 calendar days following the substantiated AGM date.
 */
export function calculateSec36Deadline(
  actualAgmDate?: string | null,
  agmEvidence?: string | null
): Sec36DeadlineResult {
  if (!actualAgmDate || !actualAgmDate.trim()) {
    return {
      statutoryDeadline: null,
      daysAllowed: 21,
      status: "REVIEW_REQUIRED",
      calculationBasis: "Suspended: Section 36(1) filing deadline depends strictly on actual AGM date.",
      missingEvidenceNotes: [
        "Actual AGM date is not recorded or verified.",
        "Under Companies Act 1994 Sec 36(1), the 21-day filing window begins on the day following the AGM.",
        "Obtain signed AGM minutes, notice, or resolution before finalizing statutory deadline."
      ]
    };
  }

  // Parse AGM date
  const agm = new Date(actualAgmDate);
  if (isNaN(agm.getTime())) {
    return {
      statutoryDeadline: null,
      daysAllowed: 21,
      status: "REVIEW_REQUIRED",
      calculationBasis: "Invalid date format provided for actual AGM.",
      missingEvidenceNotes: ["Unable to parse AGM date: " + actualAgmDate]
    };
  }

  // Add 21 calendar days
  const deadline = new Date(agm.getTime());
  deadline.setDate(deadline.getDate() + 21);
  const deadlineStr = deadline.toISOString().split("T")[0];

  const missingNotes: string[] = [];
  if (!agmEvidence || !agmEvidence.trim()) {
    missingNotes.push("AGM date is entered but lacks supporting document reference (e.g. AGM Notice / Board Resolution).");
  }

  return {
    statutoryDeadline: deadlineStr,
    daysAllowed: 21,
    status: missingNotes.length > 0 ? "REVIEW_REQUIRED" : "CALCULATED",
    calculationBasis: `Companies Act 1994 Sec 36(1): Exactly 21 days following AGM on ${actualAgmDate}.`,
    missingEvidenceNotes: missingNotes
  };
}

/**
 * Validates that AGM, Audit Report / DVC, and Return Filing are treated as distinct statutory milestones.
 */
export function validateEventSeparation(params: {
  agmDate?: string | null;
  auditReportDate?: string | null;
  dvcCode?: string | null;
  dvcDate?: string | null;
  returnFilingDate?: string | null;
}): EventSeparationValidation {
  const warnings: string[] = [];

  // Check if DVC or Audit date is conflated with AGM date
  if (params.agmDate && params.auditReportDate && params.agmDate === params.auditReportDate) {
    warnings.push(
      "Note: AGM date exactly matches Audit Report date. Verify independent minutes; AGM cannot occur prior to or simultaneously without notice."
    );
  }

  if (params.dvcCode && !params.agmDate) {
    warnings.push(
      "ICAB DVC is present but AGM is unrecorded. DVC validates auditor report only, not shareholder AGM holding."
    );
  }

  return {
    isDistinct: warnings.length === 0,
    dvcDoesNotProveAgm: true,
    warnings
  };
}

/**
 * Evaluates return filing compliance against statutory deadline.
 */
export function evaluateFilingCompliance(
  statutoryDeadline: string | null,
  filedDate?: string | null,
  referenceDateStr?: string
): ReturnFilingCompliance {
  if (!statutoryDeadline) {
    return {
      isOverdue: false,
      delayDays: 0,
      complianceAssessment: "REVIEW_REQUIRED",
      citation: "Companies Act 1994 Section 36(1)",
      notes: "Statutory deadline cannot be assessed without verified AGM date."
    };
  }

  const deadline = new Date(statutoryDeadline);

  if (filedDate && filedDate.trim()) {
    const filed = new Date(filedDate);
    if (filed <= deadline) {
      return {
        isOverdue: false,
        delayDays: 0,
        complianceAssessment: "COMPLIANT",
        citation: "Companies Act 1994 Section 36(1)",
        notes: `Filed on ${filedDate}, on or before statutory deadline ${statutoryDeadline}.`
      };
    } else {
      const diffDays = Math.ceil((filed.getTime() - deadline.getTime()) / (1000 * 3600 * 24));
      return {
        isOverdue: true,
        delayDays: diffDays,
        complianceAssessment: "OVERDUE",
        citation: "Companies Act 1994 Section 36(1) & Late Filing Provisions",
        notes: `Filed ${diffDays} days after statutory deadline ${statutoryDeadline}. Subject to official statutory additional filing fees.`
      };
    }
  }

  // Not yet filed - compare with reference date (today)
  const today = referenceDateStr ? new Date(referenceDateStr) : new Date();
  if (today > deadline) {
    const diffDays = Math.ceil((today.getTime() - deadline.getTime()) / (1000 * 3600 * 24));
    return {
      isOverdue: true,
      delayDays: diffDays,
      complianceAssessment: "OVERDUE",
      citation: "Companies Act 1994 Section 36(1)",
      notes: `Filing is past statutory deadline by ${diffDays} days. Schedule X submission required immediately.`
    };
  }

  return {
    isOverdue: false,
    delayDays: 0,
    complianceAssessment: "PENDING_FILING",
    citation: "Companies Act 1994 Section 36(1)",
    notes: `Pending filing within statutory window (due by ${statutoryDeadline}).`
  };
}
