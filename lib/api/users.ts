const API_BASE = "";

export const getUsers = async () => {
    const res = await fetch(`${API_BASE}/api/users`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch users");
    return res.json();
};

export const createUser = async (data: any) => {
    const res = await fetch(`${API_BASE}/api/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create user");
    }
    return res.json();
};

export const updateUser = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include"
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update user");
    }
    return res.json();
};

