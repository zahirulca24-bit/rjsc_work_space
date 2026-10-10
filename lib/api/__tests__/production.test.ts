import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (file: string) => readFileSync(file, "utf8");

describe("same-origin browser API configuration", () => {
  const browserFiles = [
    "lib/api/auth.ts",
    "lib/api/users.ts",
    "lib/api/clients.ts",
    "lib/api/analytics.ts",
    "lib/api/audit.ts",
    "lib/api/document-ai.ts",
    "lib/api/documents.ts",
    "lib/api/invoices.ts",
    "lib/api/reviews.ts",
    "lib/api/tasks.ts",
    "lib/api/transactions.ts",
    "lib/api/works.ts",
    "components/FloatingAssistant.tsx",
    "app/clients/[id]/page.tsx",
  ];

  test("browser calls cannot fall back to localhost or external API host", () => {
    for (const file of browserFiles) {
      const text = source(file);
      assert.doesNotMatch(text, /NEXT_PUBLIC_API_BASE_URL|http:\/\/localhost:8000/, file);
    }
  });

  test("authentication calls use relative API URLs and include credentials", () => {
    const auth = source("lib/api/auth.ts");
    assert.match(auth, /const API_BASE = "";/);
    assert.match(auth, /\/api\/auth\/login/);
    assert.match(auth, /\/api\/auth\/me/);
    assert.match(auth, /\/api\/auth\/logout/);
    assert.equal((auth.match(/credentials: "include"/g) || []).length, 3);
  });

  test("Next.js rewrites same-origin API requests to the backend", () => {
    const config = source("next.config.js");
    assert.match(config, /source: '\/api\/:path\*'/);
    assert.match(config, /destination: backendUrl/);
  });
});
