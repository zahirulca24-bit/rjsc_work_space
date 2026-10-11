import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fetchApi, onSessionExpired } from "../fetchApi";
import { login, logout, getMe } from "../auth";
import { getClients } from "../clients";
import { getWorks } from "../works";
import { getFinanceSummary } from "../analytics";

describe("Authentication Resilience & 401 Handling", () => {
    const originalFetch = globalThis.fetch;

    // 1. Successful authenticated API requests
    test("successful authenticated API request passes through and does not trigger session expiry", async () => {
        let sessionExpiredFired = false;
        const unsubscribe = onSessionExpired(() => {
            sessionExpiredFired = true;
        });

        globalThis.fetch = async (url: any, init?: any) => {
            assert.strictEqual(init?.credentials, "include");
            return {
                ok: true,
                status: 200,
                json: async () => [{ id: "work-1", service_id: "name_clearance" }]
            } as any;
        };

        try {
            const res = await fetchApi("/api/works");
            assert.strictEqual(res.ok, true);
            assert.strictEqual(res.status, 200);
            const data = await res.json();
            assert.strictEqual(data[0].id, "work-1");
            assert.strictEqual(sessionExpiredFired, false, "Session expiry should not trigger on 200");
        } finally {
            unsubscribe();
            globalThis.fetch = originalFetch;
        }
    });

    // 2. Expired session returning 401
    test("expired session on protected API returns 401 and triggers session expired event", async () => {
        let capturedDestination: string | undefined = undefined;
        let eventFired = false;

        const unsubscribe = onSessionExpired((dest) => {
            eventFired = true;
            capturedDestination = dest;
        });

        globalThis.fetch = async () => ({
            ok: false,
            status: 401,
            json: async () => ({ detail: "Could not validate credentials" })
        } as any);

        try {
            const res = await fetchApi("/api/works");
            assert.strictEqual(res.status, 401);
            assert.strictEqual(eventFired, true, "Session expiry event must fire on protected 401");
        } finally {
            unsubscribe();
            globalThis.fetch = originalFetch;
        }
    });

    // 3. Failed login credentials returning 401 without triggering an expiry loop
    test("failed login credentials return 401 without triggering session expiry notification", async () => {
        let sessionExpiredFired = false;
        const unsubscribe = onSessionExpired(() => {
            sessionExpiredFired = true;
        });

        globalThis.fetch = async (url: any) => {
            const urlStr = String(url);
            if (urlStr.includes("/api/auth/login")) {
                return {
                    ok: false,
                    status: 401,
                    json: async () => ({ detail: "Incorrect email or password" })
                } as any;
            }
            return { ok: true, status: 200, json: async () => ({}) } as any;
        };

        try {
            await assert.rejects(
                async () => {
                    await login({ email: "staff@example.com", password: "wrong-password" });
                },
                (err: any) => {
                    assert.strictEqual(err.message, "Incorrect email or password");
                    return true;
                }
            );

            // Also test fetchApi directly with /api/auth/login
            const loginRes = await fetchApi("/api/auth/login", { method: "POST" });
            assert.strictEqual(loginRes.status, 401);

            assert.strictEqual(
                sessionExpiredFired,
                false,
                "Failed login attempts must never trigger session expiry event"
            );
        } finally {
            unsubscribe();
            globalThis.fetch = originalFetch;
        }
    });

    // 4. Network failure handling & HTTP 500 distinction
    test("network failure re-throws error and does not trigger session expiry", async () => {
        let sessionExpiredFired = false;
        const unsubscribe = onSessionExpired(() => {
            sessionExpiredFired = true;
        });

        globalThis.fetch = async () => {
            throw new TypeError("Failed to fetch");
        };

        try {
            await assert.rejects(
                async () => {
                    await fetchApi("/api/clients");
                },
                (err: any) => {
                    assert.strictEqual(err.message, "Failed to fetch");
                    return true;
                }
            );
            assert.strictEqual(sessionExpiredFired, false, "Network errors must not trigger session expiry");
        } finally {
            unsubscribe();
            globalThis.fetch = originalFetch;
        }
    });

    test("HTTP 500 server error does not trigger session expiry", async () => {
        let sessionExpiredFired = false;
        const unsubscribe = onSessionExpired(() => {
            sessionExpiredFired = true;
        });

        globalThis.fetch = async () => ({
            ok: false,
            status: 500,
            json: async () => ({ detail: "Internal Server Error" })
        } as any);

        try {
            const res = await fetchApi("/api/clients");
            assert.strictEqual(res.status, 500);
            assert.strictEqual(sessionExpiredFired, false, "HTTP 500 must not trigger session expiry");
        } finally {
            unsubscribe();
            globalThis.fetch = originalFetch;
        }
    });

    // 5. Consistent SESSION_EXPIRED throwing across API helpers
    test("getClients, getWorks, and getFinanceSummary all throw SESSION_EXPIRED on HTTP 401", async () => {
        globalThis.fetch = async () => ({
            ok: false,
            status: 401,
            json: async () => ({ detail: "Could not validate credentials" })
        } as any);

        try {
            await assert.rejects(
                () => getClients(),
                (err: any) => {
                    assert.strictEqual(err.message, "SESSION_EXPIRED");
                    return true;
                }
            );

            await assert.rejects(
                () => getWorks(),
                (err: any) => {
                    assert.strictEqual(err.message, "SESSION_EXPIRED");
                    return true;
                }
            );

            await assert.rejects(
                () => getFinanceSummary(),
                (err: any) => {
                    assert.strictEqual(err.message, "SESSION_EXPIRED");
                    return true;
                }
            );
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    // 6. Dashboard concurrent load behavior on session expiry
    test("Dashboard Promise.all consistently surfaces SESSION_EXPIRED regardless of rejection order", async () => {
        globalThis.fetch = async () => ({
            ok: false,
            status: 401,
            json: async () => ({ detail: "Could not validate credentials" })
        } as any);

        try {
            let errorReason = "";
            try {
                await Promise.all([
                    getClients(),
                    getWorks(),
                    getFinanceSummary()
                ]);
            } catch (err: any) {
                errorReason = err.message === "SESSION_EXPIRED" ? "SESSION_EXPIRED" : err.message;
            }

            assert.strictEqual(
                errorReason,
                "SESSION_EXPIRED",
                "Dashboard must identify SESSION_EXPIRED on concurrent API 401 failures"
            );
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    // 7. Login and logout flows
    test("login and logout API flows execute correctly with credentials include", async () => {
        const fetchCalls: Array<{ url: string; init: any }> = [];

        globalThis.fetch = async (url: any, init: any) => {
            fetchCalls.push({ url: String(url), init });
            if (String(url).includes("/api/auth/login")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ message: "Successfully logged in" })
                } as any;
            }
            if (String(url).includes("/api/auth/logout")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ message: "Successfully logged out" })
                } as any;
            }
            if (String(url).includes("/api/auth/me")) {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ id: "user-1", name: "Staff User", role: "STAFF" })
                } as any;
            }
            return { ok: false, status: 404 } as any;
        };

        try {
            const loginRes = await login({ email: "staff@example.com", password: "valid" });
            assert.strictEqual(loginRes.message, "Successfully logged in");
            assert.strictEqual(fetchCalls[0].init.credentials, "include");

            const meRes = await getMe();
            assert.strictEqual(meRes.name, "Staff User");
            assert.strictEqual(fetchCalls[1].init.credentials, "include");

            const logoutRes = await logout();
            assert.strictEqual(logoutRes.message, "Successfully logged out");
            assert.strictEqual(fetchCalls[2].init.credentials, "include");
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
