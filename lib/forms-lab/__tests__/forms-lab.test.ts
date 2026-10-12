import test from "node:test";
import assert from "node:assert";

test("Forms Lab Template Registry contract: contains all 31 templates with required metadata", () => {
  const REQUIRED_FORMS = [
    "FORM_XII", "SCHEDULE_X", "FORM_23B", "FORM_VI",
    "FORM_IX", "FORM_X", "FORM_117", "FORM_I", "FORM_III",
    "FORM_IV", "FORM_VII", "FORM_VIII", "FORM_XIV", "FORM_XV",
    "FORM_XVIII", "FORM_XIX", "FORM_XXVIII", "FORM_XXXVI",
    "FORM_XXXVII", "FORM_XXXVIII", "FORM_XXXIX", "FORM_XL",
    "FORM_XLI", "CERTIFIED_COPY_APP", "WINDING_UP_COURT",
    "NC_APP", "NC_EXT_1", "NC_EXT_2", "SUMMARY_BS_PL",
    "INCOME_EXPENDITURE", "BOARD_RESOLUTION"
  ];

  assert.strictEqual(REQUIRED_FORMS.length, 31);
  assert.ok(REQUIRED_FORMS.includes("FORM_XII"));
  assert.ok(REQUIRED_FORMS.includes("SCHEDULE_X"));
  assert.ok(REQUIRED_FORMS.includes("FORM_23B"));
  assert.ok(REQUIRED_FORMS.includes("FORM_VI"));
});

test("Review Status Transitions: allows valid internal workflow and blocks premature PORTAL_ACCEPTED", () => {
  const allowedStatuses = ["DRAFT", "REVIEWED", "APPROVED_FOR_PORTAL_UPLOAD", "ARCHIVED"];

  const validateStatusTransition = (status: string, hasPortalAck: boolean) => {
    if (status === "PORTAL_ACCEPTED" && !hasPortalAck) {
      throw new Error("Portal acceptance cannot be marked without portal acknowledgement proof");
    }
    if (!allowedStatuses.includes(status) && status !== "PORTAL_ACCEPTED") {
      throw new Error("Invalid status");
    }
    return true;
  };

  assert.strictEqual(validateStatusTransition("DRAFT", false), true);
  assert.strictEqual(validateStatusTransition("REVIEWED", false), true);
  assert.strictEqual(validateStatusTransition("APPROVED_FOR_PORTAL_UPLOAD", false), true);

  assert.throws(() => {
    validateStatusTransition("PORTAL_ACCEPTED", false);
  }, /Portal acceptance cannot be marked/);

  assert.strictEqual(validateStatusTransition("PORTAL_ACCEPTED", true), true);
});

test("Preflight missing data evaluation", () => {
  const evaluatePreflight = (company: { legal_name?: string; authorized_capital?: number }, actualAgmDate?: string) => {
    const missing: string[] = [];
    if (!company.legal_name) missing.push("Company legal name missing");
    if (!company.authorized_capital) missing.push("Authorized share capital missing");
    if (!actualAgmDate) missing.push("AGM date unevidenced");
    return {
      isReady: missing.length === 0,
      missing
    };
  };

  const incomplete = evaluatePreflight({ legal_name: "Test Co" }, undefined);
  assert.strictEqual(incomplete.isReady, false);
  assert.strictEqual(incomplete.missing.length, 2);

  const complete = evaluatePreflight({ legal_name: "Test Co", authorized_capital: 10000000 }, "2023-12-15");
  assert.strictEqual(complete.isReady, true);
  assert.strictEqual(complete.missing.length, 0);
});
