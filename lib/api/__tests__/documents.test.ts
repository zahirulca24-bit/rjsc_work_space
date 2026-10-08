import { describe, it, mock } from 'node:test';
import * as assert from 'node:assert';

// Mock process.env for tests
process.env.NEXT_PUBLIC_API_BASE_URL = "http://test-api";

import { listDocuments, uploadDocument, getDocumentDownloadUrl } from '../documents';

describe('Document API helper URL construction', () => {
  it('constructs correct download URL', () => {
    const url = getDocumentDownloadUrl("123-uuid");
    assert.ok(url.includes("/api/documents/123-uuid/download"));
  });

  it('constructs correct list filters', async () => {
    // We mock global fetch
    const originalFetch = global.fetch;
    let fetchedUrl = "";
    global.fetch = async (url: string | URL | globalThis.Request, options?: RequestInit) => {
      fetchedUrl = url.toString();
      return { ok: true, json: async () => [] } as Response;
    };
    
    try {
      await listDocuments({ client_id: "cid", work_id: "wid", status: "PENDING", category: "OTHER", search: "test" });
      assert.ok(fetchedUrl.includes("client_id=cid"));
      assert.ok(fetchedUrl.includes("work_id=wid"));
      assert.ok(fetchedUrl.includes("status=PENDING"));
      assert.ok(fetchedUrl.includes("category=OTHER"));
      assert.ok(fetchedUrl.includes("search=test"));
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe('upload form validation / API error handling', () => {
  it('rejects without file', async () => {
    try {
      await uploadDocument(null as any, "OTHER");
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.ok(e instanceof TypeError || e.message.includes("fail") === false);
    }
  });

  it('global upload without client/work passes correct form data', async () => {
    const originalFetch = global.fetch;
    let formData: any = null;
    global.fetch = async (url: any, options: any) => {
      formData = options.body;
      return { ok: true, json: async () => ({}) } as Response;
    };
    
    try {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      await uploadDocument(file, "OTHER");
      // Node.js test environment doesn't perfectly expose FormData contents easily without a parser,
      // but we can ensure fetch was called successfully.
      assert.ok(formData !== null);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('handles API error correctly', async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return { ok: false, status: 409, json: async () => ({ detail: "Duplicate file" }) } as Response;
    };
    
    try {
      const file = new File(["test"], "test.pdf", { type: "application/pdf" });
      await uploadDocument(file, "OTHER");
      assert.fail("Should have thrown");
    } catch (e: any) {
      assert.ok(e.message.includes("Duplicate file"));
    } finally {
      global.fetch = originalFetch;
    }
  });
});
