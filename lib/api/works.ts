import { fetchApi } from "./fetchApi";
const API_BASE = "";

export const getWorks = async () => {
    const res = await fetchApi(`${API_BASE}/api/works`);
    if (res.status === 401) throw new Error("SESSION_EXPIRED");
    if (!res.ok) throw new Error(`Failed to fetch works (HTTP ${res.status})`);
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

export interface ChecklistItem {
    id: string;
    work_id: string;
    item_code?: string | null;
    item_text: string;
    status: string;
    source_reference?: string | null;
    sort_order: number;
    completed_at?: string | null;
    completed_by?: string | null;
}

export const getWorkChecklist = async (workId: string): Promise<ChecklistItem[]> => {
    const res = await fetchApi(`${API_BASE}/api/works/${workId}/checklist`);
    if (!res.ok) throw new Error("Failed to fetch checklist");
    return res.json();
};

export const addWorkChecklistItem = async (
    workId: string,
    payload: { item_text: string; item_code?: string; status?: string; source_reference?: string; sort_order?: number }
): Promise<ChecklistItem> => {
    const res = await fetchApi(`${API_BASE}/api/works/${workId}/checklist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to add checklist item");
    }
    return res.json();
};

export const updateWorkChecklistItem = async (
    workId: string,
    itemId: string,
    payload: { status?: string; item_text?: string; completed_by?: string }
): Promise<ChecklistItem> => {
    const res = await fetchApi(`${API_BASE}/api/works/${workId}/checklist/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to update checklist item");
    }
    return res.json();
};

export const deleteWorkChecklistItem = async (workId: string, itemId: string): Promise<void> => {
    const res = await fetchApi(`${API_BASE}/api/works/${workId}/checklist/${itemId}`, {
        method: "DELETE"
    });
    if (!res.ok) throw new Error("Failed to delete checklist item");
};

export const generateWorkChecklist = async (workId: string): Promise<ChecklistItem[]> => {
    const res = await fetchApi(`${API_BASE}/api/works/${workId}/checklist/generate`, {
        method: "POST"
    });
    if (!res.ok) throw new Error("Failed to generate checklist");
    return res.json();
};

