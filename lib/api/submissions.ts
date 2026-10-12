import { fetchApi } from "./fetchApi";

const API_BASE = "";

export interface PreSubmissionReview {
  work_id: string;
  client_id: string;
  service_id: string;
  work_status: string;
  review_status: string;
  filing_year?: string | null;
  is_approved_for_submission: boolean;
  approved_forms: Array<{
    id: string;
    form_code: string;
    form_title: string;
    version: number;
    file_name: string;
    file_path: string;
    status: string;
    missing_fields: string[];
    created_at?: string;
  }>;
  latest_generated_forms: Array<{
    id: string;
    form_code: string;
    form_title: string;
    version: number;
    file_name: string;
    file_path: string;
    status: string;
    missing_fields: string[];
    created_at?: string;
  }>;
  required_checklist_items: Array<{
    id: string;
    item_code?: string;
    item_text: string;
    status: string;
    source_reference?: string;
  }>;
  completed_checklist_count: number;
  total_checklist_count: number;
  missing_documents: Array<{
    item_code?: string;
    item_text: string;
    status: string;
    source_reference?: string;
  }>;
  is_submission_ready: boolean;
  readiness_warnings: string[];
}

export interface WorkQueryRecord {
  id: string;
  submission_id: string;
  work_id: string;
  client_id: string;
  query_date: string;
  query_reference?: string | null;
  query_subject: string;
  query_description: string;
  query_document_id?: string | null;
  query_document_name?: string | null;
  assigned_to?: string | null;
  deadline_date?: string | null;
  linked_task_id?: string | null;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "WAIVED";
  resolution_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkSubmissionRecord {
  id: string;
  work_id: string;
  client_id: string;
  submission_type: "INITIAL" | "RESUBMISSION";
  submission_number: number;
  parent_submission_id?: string | null;
  filing_year?: string | null;
  forms_submitted: Array<{
    form_code: string;
    form_title: string;
    version: number;
    file_name?: string;
    file_path?: string;
  }>;
  submitted_at: string;
  submitted_by: string;
  rjsc_tracking_no: string;
  portal_ack_ref?: string | null;
  govt_fee_challan_ref?: string | null;
  ack_document_id?: string | null;
  ack_document_name?: string | null;
  notes?: string | null;
  status: "SUBMITTED" | "QUERY_RAISED" | "ACCEPTED" | "REJECTED";
  created_at: string;
  updated_at: string;
  queries?: WorkQueryRecord[];
}

export interface WorkDeliveryRecord {
  id: string;
  work_id: string;
  client_id: string;
  outcome: "APPROVED" | "CERTIFIED_COPY_ISSUED" | "REJECTED";
  outcome_date: string;
  rjsc_approval_ref?: string | null;
  certified_copy_document_id?: string | null;
  certified_copy_document_name?: string | null;
  delivered_to_client_at?: string | null;
  delivered_by?: string | null;
  delivery_method?: string | null;
  client_ack_ref?: string | null;
  client_ack_document_id?: string | null;
  client_ack_document_name?: string | null;
  notes?: string | null;
  corporate_history_filing_id?: string | null;
  operational_closed_at?: string | null;
  closed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionLifecycleHistory {
  work_id: string;
  client_id: string;
  work_status: string;
  review_status: string;
  submissions: WorkSubmissionRecord[];
  active_queries: WorkQueryRecord[];
  resolved_queries: WorkQueryRecord[];
  delivery: WorkDeliveryRecord | null;
}

export const getPreSubmissionReview = async (workId: string): Promise<PreSubmissionReview> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/work/${workId}/pre-submission-review`);
  if (!res.ok) throw new Error("Failed to load pre-submission review");
  return res.json();
};

export const recordManualSubmission = async (
  workId: string,
  payload: {
    submitted_at: string;
    submitted_by: string;
    rjsc_tracking_no: string;
    portal_ack_ref?: string;
    govt_fee_challan_ref?: string;
    filing_year?: string;
    forms_submitted?: Array<{ form_code: string; form_title: string; version: number; file_name?: string }>;
    notes?: string;
    ack_document_name?: string;
  }
): Promise<WorkSubmissionRecord> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/work/${workId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to record manual submission");
  }
  return res.json();
};

export const getSubmissionLifecycleHistory = async (workId: string): Promise<SubmissionLifecycleHistory> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/work/${workId}/history`);
  if (!res.ok) throw new Error("Failed to load submission history");
  return res.json();
};

export const recordRjscQuery = async (
  submissionId: string,
  payload: {
    submission_id: string;
    query_date: string;
    query_reference?: string;
    query_subject: string;
    query_description: string;
    assigned_to?: string;
    deadline_date?: string;
    create_correction_task?: boolean;
    query_document_name?: string;
  }
): Promise<WorkQueryRecord> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/${submissionId}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to record RJSC objection/query");
  }
  return res.json();
};

export const updateRjscQuery = async (
  queryId: string,
  payload: {
    status?: string;
    resolution_notes?: string;
    assigned_to?: string;
    deadline_date?: string;
  }
): Promise<WorkQueryRecord> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/queries/${queryId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to update RJSC query");
  }
  return res.json();
};

export const recordResubmission = async (
  workId: string,
  payload: {
    parent_submission_id: string;
    submitted_at: string;
    submitted_by: string;
    rjsc_tracking_no: string;
    portal_ack_ref?: string;
    govt_fee_challan_ref?: string;
    filing_year?: string;
    forms_submitted?: Array<{ form_code: string; form_title: string; version: number; file_name?: string }>;
    resolves_query_id?: string;
    resolution_notes?: string;
    notes?: string;
  }
): Promise<WorkSubmissionRecord> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/work/${workId}/resubmit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to record resubmission");
  }
  return res.json();
};

export const recordFinalDecisionAndDelivery = async (
  workId: string,
  payload: {
    outcome: "APPROVED" | "CERTIFIED_COPY_ISSUED" | "REJECTED";
    outcome_date: string;
    rjsc_approval_ref?: string;
    certified_copy_document_name?: string;
    delivered_to_client_at?: string;
    delivered_by?: string;
    delivery_method?: string;
    client_ack_ref?: string;
    notes?: string;
    close_work_operationally?: boolean;
  }
): Promise<WorkDeliveryRecord> => {
  const res = await fetchApi(`${API_BASE}/api/submissions/work/${workId}/delivery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to record final decision / delivery");
  }
  return res.json();
};

export const getSubmissionDeskDashboard = async () => {
  const res = await fetchApi(`${API_BASE}/api/submissions/dashboard`);
  if (!res.ok) throw new Error("Failed to load submission desk dashboard");
  return res.json();
};
