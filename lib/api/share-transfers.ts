import { fetchApi } from "./fetchApi";

export interface ShareholderBalanceState {
  shareholder_name: string;
  share_count: number;
  ownership_percentage: number;
}

export interface ShareTransferRecord {
  id: string;
  transfer_no: string;
  transferor_name: string;
  transferor_address: string | null;
  transferee_name: string;
  transferee_address: string | null;
  share_class: string;
  share_count: number;
  nominal_value: number;
  paid_up_per_share: number;
  consideration_amount: number;
  distinctive_from: number | null;
  distinctive_to: number | null;
  execution_date: string | null;
  board_approval_date: string | null;
  status: "DRAFT" | "APPROVED" | "EXECUTED_IN_REGISTER" | "CANCELLED";
  pre_transfer_state: ShareholderBalanceState[] | null;
  post_transfer_state: ShareholderBalanceState[] | null;
  source_evidence: string | null;
  notes: string | null;
}

export interface WorkShareTransferResponse {
  work_id: string;
  work_code: string;
  client_id: string;
  client_name: string;
  total_company_shares: number;
  current_shareholders: Array<{
    id: string;
    shareholder_name: string;
    share_count: number;
    share_value: number;
    ownership_percentage: number | null;
  }>;
  active_transfer: ShareTransferRecord | null;
}

export interface ShareTransferProposalPayload {
  transferor_name: string;
  transferor_address?: string;
  transferee_name: string;
  transferee_address?: string;
  share_class?: string;
  share_count: number;
  nominal_value?: number;
  paid_up_per_share?: number;
  consideration_amount: number;
  distinctive_from?: number;
  distinctive_to?: number;
  execution_date?: string;
  board_approval_date?: string;
  transfer_no?: string;
  source_evidence?: string;
  notes?: string;
}

export async function getWorkShareTransfer(workId: string): Promise<WorkShareTransferResponse> {
  const res = await fetchApi(`/api/share-transfers/work/${workId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to fetch work share transfer particulars");
  }
  return res.json();
}

export async function saveShareTransferProposal(
  workId: string,
  payload: ShareTransferProposalPayload
): Promise<any> {
  const res = await fetchApi(`/api/share-transfers/work/${workId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to save share transfer proposal");
  }
  return res.json();
}

export interface ShareTransferApprovePayload {
  board_approval_date?: string;
  document_id?: string;
  board_resolution_evidence?: string;
}

export async function approveShareTransferProposal(
  workId: string,
  payload?: ShareTransferApprovePayload
): Promise<any> {
  const res = await fetchApi(`/api/share-transfers/work/${workId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload ? JSON.stringify(payload) : undefined
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to approve share transfer proposal");
  }
  return res.json();
}

export async function applyShareTransferToMaster(workId: string): Promise<any> {
  const res = await fetchApi(`/api/share-transfers/work/${workId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to apply share transfer to register");
  }
  return res.json();
}
