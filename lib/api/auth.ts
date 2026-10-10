const API_BASE = "";

export const login = async (credentials: any) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include"
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Login failed");
    }
    return res.json();
};

export const logout = async () => {
    const res = await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
    });
    if (!res.ok) throw new Error("Logout failed");
    return res.json();
};

export const getMe = async () => {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include"
    });
    if (!res.ok) {
        throw new Error("Not authenticated");
    }
    return res.json();
};

