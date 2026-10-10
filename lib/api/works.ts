import { fetchApi } from "./fetchApi";
const API_BASE = "";

export const getWorks = async () => {
    const res = await fetchApi(`${API_BASE}/api/works`);
    if (!res.ok) throw new Error("Failed to fetch works");
    return res.json();
};

export const getWork = async (id: string) => {
    const res = await fetchApi(`${API_BASE}/api/works/${id}`);
    if (!res.ok) throw new Error("Failed to fetch work");
    return res.json();
};

export const createWork = async (workData: any) => {
    const res = await fetchApi(`${API_BASE}/api/works`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workData)
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || "Failed to create work");
    }
    return res.json();
};

export const updateWork = async (id: string, workData: any) => {
    const res = await fetchApi(`${API_BASE}/api/works/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workData)
    });
    if (!res.ok) throw new Error("Failed to update work");
    return res.json();
};

export const getWorkFinancialSummary = async (id: string) => {
    const res = await fetchApi(`${API_BASE}/api/works/${id}/financial-summary`);
    if (!res.ok) throw new Error("Failed to fetch work financial summary");
    return res.json();
};
