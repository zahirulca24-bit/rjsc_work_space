import test from "node:test";
import assert from "node:assert";
import {
  calculateSec36Deadline,
  validateEventSeparation,
  evaluateFilingCompliance
} from "../compliance-analysis";

test("calculateSec36Deadline: correctly adds exactly 21 calendar days when AGM date and evidence are provided", () => {
  const result = calculateSec36Deadline("2023-12-15", "Signed Board Resolution & AGM Notice");
  assert.strictEqual(result.statutoryDeadline, "2024-01-05");
  assert.strictEqual(result.daysAllowed, 21);
  assert.strictEqual(result.status, "CALCULATED");
  assert.ok(result.calculationBasis.includes("Sec 36(1)"));
  assert.strictEqual(result.missingEvidenceNotes.length, 0);
});

test("calculateSec36Deadline: missing AGM date suspends calculation and requires review", () => {
  const result = calculateSec36Deadline(null, null);
  assert.strictEqual(result.statutoryDeadline, null);
  assert.strictEqual(result.status, "REVIEW_REQUIRED");
  assert.ok(result.missingEvidenceNotes.length > 0);
  assert.ok(result.missingEvidenceNotes[0].includes("Actual AGM date is not recorded"));
});

test("calculateSec36Deadline: AGM date without evidence flags REVIEW_REQUIRED", () => {
  const result = calculateSec36Deadline("2023-12-15", "");
  assert.strictEqual(result.statutoryDeadline, "2024-01-05");
  assert.strictEqual(result.status, "REVIEW_REQUIRED");
  assert.ok(result.missingEvidenceNotes.some((n) => n.includes("lacks supporting document reference")));
});

test("validateEventSeparation: DVC code does not prove that an AGM occurred", () => {
  const result = validateEventSeparation({
    agmDate: null,
    auditReportDate: "2023-10-31",
    dvcCode: "231031ABCD1234",
    dvcDate: "2023-10-31"
  });

  assert.strictEqual(result.dvcDoesNotProveAgm, true);
  assert.strictEqual(result.isDistinct, false);
  assert.ok(result.warnings.some((w) => w.includes("DVC validates auditor report only")));
});

test("validateEventSeparation: distinct verified events pass without warnings", () => {
  const result = validateEventSeparation({
    agmDate: "2023-12-15",
    auditReportDate: "2023-10-31",
    dvcCode: "231031ABCD1234",
    dvcDate: "2023-10-31",
    returnFilingDate: "2023-12-28"
  });

  assert.strictEqual(result.dvcDoesNotProveAgm, true);
  assert.strictEqual(result.isDistinct, true);
  assert.strictEqual(result.warnings.length, 0);
});

test("evaluateFilingCompliance: returns COMPLIANT when filed within 21 days", () => {
  const compliance = evaluateFilingCompliance("2024-01-05", "2023-12-28");
  assert.strictEqual(compliance.complianceAssessment, "COMPLIANT");
  assert.strictEqual(compliance.isOverdue, false);
  assert.strictEqual(compliance.delayDays, 0);
});

test("evaluateFilingCompliance: returns OVERDUE with correct days when filed late", () => {
  const compliance = evaluateFilingCompliance("2024-01-05", "2024-01-15");
  assert.strictEqual(compliance.complianceAssessment, "OVERDUE");
  assert.strictEqual(compliance.isOverdue, true);
  assert.strictEqual(compliance.delayDays, 10);
  assert.ok(compliance.notes.includes("10 days after statutory deadline"));
});

test("evaluateFilingCompliance: unevidenced deadline returns REVIEW_REQUIRED without fabricating penalties", () => {
  const compliance = evaluateFilingCompliance(null, null);
  assert.strictEqual(compliance.complianceAssessment, "REVIEW_REQUIRED");
  assert.strictEqual(compliance.isOverdue, false);
  assert.strictEqual(compliance.delayDays, 0);
});
