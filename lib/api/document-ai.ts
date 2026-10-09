import { fetchApi } from "./fetchApi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:8000";

export type DocumentAIStatus = {
  provider: string;
  configured: boolean;
  text_model: string;
  vision_model: string;
  human_approval_required: boolean;
  legal_inference_enabled: boolean;
};

export type DocumentAIAnalysis = {
  id: string;
  document_id: string;
  provider: string;
  model: string;
  status: string;
  extracted_text?: string | null;
  suggested_category?: string | null;
  confidence?: number | null;
  extracted_metadata: Record<string, unknown>;
  checklist_matches: Array<{
    item_id: string;
    reason?: string;
  }>;
  missing_checklist_items: Array<{
    item_id: string;
    item_code?: string | null;
    item_text?: string | null;
    current_status?: string | null;
  }>;
  needs_source_review: boolean;
  approved: boolean;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  created_at?: string | null;
};

async function readError(
  response: Response,
  fallback: string
) {
  try {
    const body = await response.json();

    if (typeof body?.detail === "string") {
      return body.detail;
    }
  } catch {}

  return fallback;
}

export async function getDocumentAIStatus(): Promise<DocumentAIStatus> {
  const response = await fetchApi(
    `${API_BASE}/api/documents/ai/status`
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        "Failed to load AI status"
      )
    );
  }

  return response.json();
}

export async function analyzeDocument(
  documentId: string
): Promise<DocumentAIAnalysis> {
  const response = await fetchApi(
    `${API_BASE}/api/documents/${documentId}/ai-analyze`,
    {
      method: "POST",
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        "AI analysis failed"
      )
    );
  }

  return response.json();
}

export async function getLatestDocumentAIAnalysis(
  documentId: string
): Promise<DocumentAIAnalysis> {
  const response = await fetchApi(
    `${API_BASE}/api/documents/${documentId}/ai-analysis`
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        "AI analysis not found"
      )
    );
  }

  return response.json();
}

export async function approveDocumentAIAnalysis(
  documentId: string,
  analysisId: string,
  applyCategory = true
) {
  const response = await fetchApi(
    `${API_BASE}/api/documents/${documentId}/ai-analysis/${analysisId}/approve`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apply_category: applyCategory,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await readError(
        response,
        "AI approval failed"
      )
    );
  }

  return response.json();
}
