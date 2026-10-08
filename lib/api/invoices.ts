const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export const getInvoices = async (filters: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== "") params.append(k, String(v));
    });
    const res = await fetch(`${API_BASE}/api/invoices?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch invoices");
    return res.json();
};

export const getInvoiceById = async (id: string) => {
    const res = await fetch(`${API_BASE}/api/invoices/${id}`);
    if (!res.ok) throw new Error("Failed to fetch invoice");
    return res.json();
};

export const createInvoice = async (data: any) => {
    const res = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create invoice");
    }
    return res.json();
};

export const updateInvoice = async (id: string, data: any) => {
    const res = await fetch(`${API_BASE}/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update invoice");
    return res.json();
};
