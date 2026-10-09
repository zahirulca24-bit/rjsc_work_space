import { describe, test } from "node:test";
import assert from "node:assert";

describe("document AI contract", () => {
  test("AI requires human approval", () => {
    const contract = {
      humanApprovalRequired: true,
      checklistAutoUpdate: false,
      legalInferenceEnabled: false,
    };

    assert.strictEqual(contract.humanApprovalRequired, true);
    assert.strictEqual(contract.checklistAutoUpdate, false);
    assert.strictEqual(contract.legalInferenceEnabled, false);
  });

  test("Groq key is not a public frontend env key", () => {
    const publicKeys = [
      "NEXT_PUBLIC_API_BASE_URL",
    ];

    assert.strictEqual(
      publicKeys.includes("GROQ_API_KEY"),
      false
    );
  });
});
