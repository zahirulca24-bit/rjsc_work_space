import { fetchApi } from "./fetchApi";

const API_BASE = "";

export interface TemplateInfo {
  form_code: string;
  file_name: string;
  form_title: string;
  statutory_act: string;
  statutory_section: string;
  applicable_service: string;
  service_category: string;
  page_count: number;
  orientation: "LANDSCAPE" | "PORTRAIT";
  dimensions: [number, number];
  status: "LIVE_AUTOFILL_READY" | "FORMAT_MAPPING_PENDING";
  supports_multi_page_continuation: boolean;
  required_client_fields: string[];
  required_work_fields: string[];
  description: string;
}

export interface PreflightResult {
  form_code: string;
  form_title: string;
  is_fillable: boolean;
  verified_fields: Array<{ field: string; value: string }>;
  missing_fields: string[];
  warnings: string[];
  snapshot_preview: {
    company_name?: string;
    registration_no?: string;
    registered_office?: string;
    directors_count: number;
    shareholders_count: number;
  };
}

export interface GeneratedFormRecord {
  id: string;
  form_code: string;
  form_title: string;
  version: number;
  file_name: string;
  file_size: number;
  page_count: number;
  status: "DRAFT" | "REVIEWED" | "APPROVED_FOR_PORTAL_UPLOAD" | "ARCHIVED";
  generated_by: string;
  reviewed_by?: string | null;
  review_notes?: string | null;
  missing_fields: string[];
  created_at: string;
  download_url: string;
}

export interface GenerateFormPayload {
  overrides?: Record<string, any>;
  filing_by?: string;
  dated_str?: string;
  actual_agm_date?: string;
  auditor_name?: string;
  effective_date?: string;
  transferor_name?: string;
  transferor_address?: string;
  transferee_name?: string;
  transferee_address?: string;
  share_count?: number;
  nominal_value?: number;
  paid_up_per_share?: number;
  consideration_amount?: number;
  distinctive_from?: number;
  distinctive_to?: number;
  transfer_no?: string;
  board_approval_date?: string;
}

export const getTemplateCatalog = async (): Promise<TemplateInfo[]> => {
  const res = await fetchApi(`${API_BASE}/api/forms-lab/templates`);
  if (!res.ok) throw new Error("Failed to fetch template catalog");
  return res.json();
};

export const getFormPreflight = async (workId: string, formCode: string): Promise<PreflightResult> => {
  const res = await fetchApi(`${API_BASE}/api/forms-lab/preflight/${workId}/${formCode}`);
  if (!res.ok) throw new Error("Failed to fetch preflight data");
  return res.json();
};

export const generateFormPdf = async (
  workId: string,
  formCode: string,
  payload: GenerateFormPayload = {}
): Promise<GeneratedFormRecord> => {
  const res = await fetchApi(`${API_BASE}/api/forms-lab/generate/${workId}/${formCode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate form PDF");
  }
  return res.json();
};

export const getWorkGeneratedForms = async (workId: string): Promise<GeneratedFormRecord[]> => {
  const res = await fetchApi(`${API_BASE}/api/forms-lab/history/${workId}`);
  if (!res.ok) throw new Error("Failed to fetch generated forms history");
  return res.json();
};

export const reviewGeneratedForm = async (
  recordId: string,
  action: { new_status: string; review_notes?: string }
): Promise<any> => {
  const res = await fetchApi(`${API_BASE}/api/forms-lab/review/${recordId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit review action");
  }
  return res.json();
};

export const getDownloadUrl = (recordId: string): string => {
  return `${API_BASE}/api/forms-lab/download/${recordId}`;
};
