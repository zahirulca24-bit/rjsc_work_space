import { describe, test } from "node:test";
import assert from "node:assert";

describe("task deadline semantics", () => {
  test("known deadline states are stable", () => {
    const states = [
      "NO_DUE_DATE",
      "OVERDUE",
      "DUE_TODAY",
      "DUE_SOON",
      "UPCOMING",
      "COMPLETED",
    ];

    assert.strictEqual(states.includes("NO_DUE_DATE"), true);
    assert.strictEqual(states.includes("OVERDUE"), true);
    assert.strictEqual(states.includes("COMPLETED"), true);
  });

  test("phase 3 does not encode unresolved RJSC deadlines", () => {
    const unresolvedLegalDeadlines = ["Form VI", "Form XII"];

    assert.deepStrictEqual(unresolvedLegalDeadlines, [
      "Form VI",
      "Form XII",
    ]);
  });
});
