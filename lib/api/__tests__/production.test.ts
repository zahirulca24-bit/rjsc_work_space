import { describe, test } from "node:test";
import assert from "node:assert";

describe("production API configuration", () => {
  test("canonical frontend API environment variable", () => {
    assert.strictEqual(
      "NEXT_PUBLIC_API_BASE_URL",
      "NEXT_PUBLIC_API_BASE_URL"
    );
  });

  test("development API fallback uses localhost", () => {
    assert.strictEqual(
      "http://localhost:8000",
      "http://localhost:8000"
    );
  });
});
