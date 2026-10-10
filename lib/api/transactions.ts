import { fetchApi } from "./fetchApi";
const API_BASE = "";

export const getTransactions = async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.append(k, String(v));
    });
    const res = await fetchApi(`${API_BASE}/api/transactions?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch transactions");
    return res.json();
};

export const getTransactionById = async (id: string) => {
    const res = await fetchApi(`${API_BASE}/api/transactions/${id}`);
    if (!res.ok) throw new Error("Failed to fetch transaction");
    return res.json();
};

export const createTransaction = async (data: any) => {
    const res = await fetchApi(`${API_BASE}/api/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create transaction");
    }
    return res.json();
};

export const updateTransaction = async (id: string, data: any) => {
    const res = await fetchApi(`${API_BASE}/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update transaction");
    return res.json();
};
