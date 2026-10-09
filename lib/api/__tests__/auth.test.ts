import { test, describe, mock } from "node:test";
import assert from "node:assert";

describe("Auth API Helpers", () => {
    test("login throws error on failure", async () => {
        // mock global fetch
        (globalThis as any).fetch = mock.fn(async () => ({
            ok: false,
            json: async () => ({ detail: "Incorrect email or password" })
        }));

        const { login } = await import("../auth");
        
        try {
            await login({ email: "test@test.com", password: "wrong" });
            assert.fail("Should have thrown");
        } catch (e: any) {
            assert.strictEqual(e.message, "Incorrect email or password");
        }
    });

    test("logout returns successfully", async () => {
        (globalThis as any).fetch = mock.fn(async () => ({
            ok: true,
            json: async () => ({ message: "Successfully logged out" })
        }));

        const { logout } = await import("../auth");
        const res = await logout();
        assert.strictEqual(res.message, "Successfully logged out");
    });
});
