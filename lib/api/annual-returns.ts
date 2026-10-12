import { fetchApi } from "./fetchApi";

export interface AnnualReturnAssessmentYear {
  financial_year: string;
  actual_agm_date: string | null;
  audit_report_date: string | null;
  dvc_date: string | null;
  dvc_code: string | null;
  due_date: string | null;
  filed_date: string | null;
  filing_status: "FILED" | "PENDING" | "OVERDUE" | "EVIDENCE_UNCERTAIN";
  evidence_status: string;
  delay_days: number;
  statutory_late_fee: number | string | null;
  acknowledgement_reference: string | null;
  source_evidence: string | null;
  statutory_basis: string;
  bundled_forms: string[];
  existing_history_id: string | null;
  work_id: string | null;
}

export interface AnnualReturnAssessmentResponse {
  client_id: string;
  legal_name: string;
  registration_no: string | null;
  incorporation_date: string | null;
  total_years_assessed: number;
  filed_count: number;
  pending_count: number;
  overdue_count: number;
  uncertain_count: number;
  statutory_rule: string;
  assessment: AnnualReturnAssessmentYear[];
}

export interface AnnualReturnWorkCreatePayload {
  financial_years: string[];
  assigned_to?: string;
  professional_fee?: number;
  notes?: string;
}

export async function getAnnualReturnAssessment(clientId: string): Promise<AnnualReturnAssessmentResponse> {
  const res = await fetchApi(`/api/annual-returns/assessment/${clientId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch annual return assessment");
  }
  return res.json();
}

export async function createAnnualReturnWork(
  clientId: string,
  payload: AnnualReturnWorkCreatePayload
): Promise<any> {
  const res = await fetchApi(`/api/annual-returns/create-work/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create annual return work");
  }
  return res.json();
}
