import { fetchApi } from "./fetchApi";

const API_BASE = "";

export interface CompanyData {
  legal_name: string;
  registration_no?: string;
  entity_type: string;
  incorporation_date?: string | null;
  former_name?: string;
  registered_office?: string;
  tin?: string;
  bin?: string;
  authorized_capital?: number | null;
  paid_up_capital?: number | null;
  sources?: Record<string, string>;
}

export interface DirectorRecord {
  id?: string;
  full_name: string;
  former_name?: string;
  designation?: string;
  nationality?: string;
  nationality_of_origin?: string;
  residential_address?: string;
  occupation?: string;
  nid_or_passport?: string;
  appointment_date?: string;
  cessation_date?: string;
  is_current?: boolean;
  source_document?: string;
  changes?: string;
}

export interface ShareholderRecord {
  id?: string;
  shareholder_name: string;
  share_count: number;
  share_value: number;
  total_value: number;
  ownership_percentage?: number | null;
  is_current?: boolean;
  source_document?: string;
}

export interface AgmAnalysisRow {
  financial_year: string;
  fy_start_date?: string | null;
  fy_end_date?: string | null;
  previous_agm_date?: string | null;
  previous_agm_source?: string | null;
  actual_agm_date?: string | null;
  agm_status: string; // "HELD", "NOT_HELD", "EVIDENCE_PENDING", "EXTENSION_OBTAINED"
  agm_evidence?: string | null;
  audit_report_date?: string | null;
  dvc_reference?: string | null;
  dvc_date?: string | null;
  annual_return_period?: string | null;
  annual_return_filed_date?: string | null;
  rjsc_ack_ref?: string | null;
  statutory_agm_deadline?: string | null;
  statutory_filing_deadline?: string | null;
  calculation_basis?: string | null;
  compliance_assessment: string; // "COMPLIANT", "PENDING_FILING", "REVIEW_REQUIRED", "EVIDENCE_PENDING"
  missing_or_conflicting_evidence: string[];
  suggested_next_action?: string | null;
}

export interface WorkingPaper {
  id: string;
  work_id: string;
  client_id: string;
  title: string;
  paper_type: string;
  filing_year?: string | null;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "FINAL";
  prepared_by?: string | null;
  reviewed_by?: string | null;
  approved_by?: string | null;
  reviewed_at?: string | null;
  notes?: string | null;
  company_data: CompanyData;
  directors_data: DirectorRecord[];
  shareholders_data: ShareholderRecord[];
  agm_analysis: AgmAnalysisRow[];
  forms_data: Record<string, any>;
  linked_documents: Array<{
    id: string;
    document_name: string;
    category?: string;
    scope: "CLIENT_LEGAL_DOC" | "WORK_SUPPORTING_DOC";
    status?: string;
    uploaded_at?: string;
  }>;
  missing_fields: Array<{
    field: string;
    message: string;
    severity: "INFO" | "WARNING" | "ERROR";
  }>;
  created_at: string;
  updated_at: string;
}

export async function getWorkingPapers(params?: {
  work_id?: string;
  client_id?: string;
}): Promise<WorkingPaper[]> {
  const qs = new URLSearchParams();
  if (params?.work_id) qs.set("work_id", params.work_id);
  if (params?.client_id) qs.set("client_id", params.client_id);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetchApi(`${API_BASE}/api/working-papers${suffix}`);
  if (!res.ok) throw new Error("Failed to fetch working papers");
  return res.json();
}

export async function getWorkingPaper(id: string): Promise<WorkingPaper> {
  const res = await fetchApi(`${API_BASE}/api/working-papers/${id}`);
  if (!res.ok) throw new Error("Failed to fetch working paper");
  return res.json();
}

export async function initWorkWorkingPaper(workId: string): Promise<WorkingPaper> {
  const res = await fetchApi(`${API_BASE}/api/working-papers/work/${workId}/init`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to initialize working paper");
  }
  return res.json();
}

export async function updateWorkingPaper(
  id: string,
  payload: Partial<WorkingPaper>
): Promise<WorkingPaper> {
  const res = await fetchApi(`${API_BASE}/api/working-papers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update working paper");
  }
  return res.json();
}

export async function refreshWorkingPaperFromMaster(id: string): Promise<WorkingPaper> {
  const res = await fetchApi(`${API_BASE}/api/working-papers/${id}/refresh`, {
    method: "POST"
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to refresh working paper");
  }
  return res.json();
}

export async function applyWorkingPaperReviewAction(
  id: string,
  payload: { action: "SUBMIT_FOR_REVIEW" | "APPROVE" | "RETURN_TO_DRAFT"; notes?: string }
): Promise<WorkingPaper> {
  const res = await fetchApi(`${API_BASE}/api/working-papers/${id}/review-action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to apply review action");
  }
  return res.json();
}
