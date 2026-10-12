import { fetchApi } from "./fetchApi";

export interface MortgageChargeRecord {
  id: string;
  charge_type: "CREATION" | "MODIFICATION" | "SATISFACTION";
  lender: string;
  secured_amount: number;
  instrument_type: string | null;
  instrument_date: string | null;
  registration_date: string | null;
  filing_reference: string | null;
  property_description: string | null;
  modification_details: string | null;
  satisfaction_date: string | null;
  satisfaction_noc_ref: string | null;
  statutory_form_code: string;
  status: "ACTIVE" | "MODIFIED" | "SATISFIED";
  notes: string | null;
}

export interface WorkMortgageChargeResponse {
  work_id: string;
  work_code: string;
  client_id: string;
  client_name: string;
  active_charge: MortgageChargeRecord | null;
  statutory_compliance: {
    statutory_deadline: string | null;
    days_remaining: number | null;
    high_court_condonation_required: boolean;
    statutory_section: string;
    message: string;
  };
  all_charges_history: Array<{
    id: string;
    charge_type: string;
    lender: string;
    secured_amount: number;
    instrument_date: string | null;
    registration_date: string | null;
    status: string;
  }>;
}

export interface MortgageChargeProposalPayload {
  charge_type?: "CREATION" | "MODIFICATION" | "SATISFACTION";
  lender: string;
  secured_amount: number;
  instrument_type?: string;
  instrument_date?: string;
  registration_date?: string;
  filing_reference?: string;
  property_description?: string;
  modification_details?: string;
  satisfaction_date?: string;
  satisfaction_noc_ref?: string;
  statutory_form_code?: string;
  notes?: string;
}

export async function getWorkMortgageCharge(workId: string): Promise<WorkMortgageChargeResponse> {
  const res = await fetchApi(`/api/mortgage-charges/work/${workId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch work mortgage/charge particulars");
  }
  return res.json();
}

export async function saveMortgageChargeProposal(
  workId: string,
  payload: MortgageChargeProposalPayload
): Promise<any> {
  const res = await fetchApi(`/api/mortgage-charges/work/${workId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to save mortgage/charge proposal");
  }
  return res.json();
}

export async function applyMortgageChargeToMaster(workId: string): Promise<any> {
  const res = await fetchApi(`/api/mortgage-charges/work/${workId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to commit mortgage/charge to register");
  }
  return res.json();
}
