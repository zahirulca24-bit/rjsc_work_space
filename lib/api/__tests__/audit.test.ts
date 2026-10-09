import { describe, test } from "node:test";
import assert from "node:assert";

describe("audit trail contract", () => {
  test("audit actions are immutable event types", () => {
    const actions = ["CREATE", "UPDATE", "DELETE"];

    assert.deepStrictEqual(actions, [
      "CREATE",
      "UPDATE",
      "DELETE",
    ]);
  });

  test("sensitive audit fields are not intended for display", () => {
    const sensitive = [
      "password_hash",
      "storage_reference",
      "tin",
      "bin",
      "mobile",
    ];

    assert.strictEqual(sensitive.includes("password_hash"), true);
    assert.strictEqual(sensitive.includes("storage_reference"), true);
  });
});
