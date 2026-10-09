import { fetchApi } from "./fetchApi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface AuditLogItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  performed_by: string | null;
  performed_by_name: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

export async function getAuditLogs(params?: {
  entity_type?: string;
  action?: string;
  limit?: number;
}): Promise<AuditLogItem[]> {
  const qs = new URLSearchParams();

  if (params?.entity_type) {
    qs.set("entity_type", params.entity_type);
  }

  if (params?.action) {
    qs.set("action", params.action);
  }

  qs.set("limit", String(params?.limit || 100));

  const res = await fetchApi(
    `${API_BASE}/api/audit-logs?${qs.toString()}`
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch audit logs");
  }

  return res.json();
}
