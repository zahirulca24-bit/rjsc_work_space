import { fetchApi } from "./fetchApi";
const API_BASE = "";

export const getFinanceSummary = async (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    const res = await fetchApi(`${API_BASE}/api/analytics/finance-summary?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch finance summary");
    return res.json();
};

export const getMonthlyAnalytics = async (year: number, clientId?: string, serviceId?: string) => {
    const params = new URLSearchParams({ year: String(year) });
    if (clientId) params.append("client_id", clientId);
    if (serviceId) params.append("service_id", serviceId);
    const res = await fetchApi(`${API_BASE}/api/analytics/monthly?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch monthly analytics");
    return res.json();
};

export const getServiceGrowth = async (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    const res = await fetchApi(`${API_BASE}/api/analytics/service-growth?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch service growth");
    return res.json();
};

export const getClientGrowth = async () => {
    const res = await fetchApi(`${API_BASE}/api/analytics/client-growth`);
    if (!res.ok) throw new Error("Failed to fetch client growth");
    return res.json();
};

export const getOutstandingAging = async () => {
    const res = await fetchApi(`${API_BASE}/api/analytics/outstanding-aging`);
    if (!res.ok) throw new Error("Failed to fetch outstanding aging");
    return res.json();
};

export const getMomGrowth = async () => {
    const res = await fetchApi(`${API_BASE}/api/analytics/mom`);
    if (!res.ok) throw new Error("Failed to fetch mom growth");
    return res.json();
};
