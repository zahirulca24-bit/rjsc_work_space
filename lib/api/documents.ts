const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";

export async function listDocuments(params?: { client_id?: string; work_id?: string; category?: string; status?: string; search?: string }) {
  const query = new URLSearchParams();
  if (params) {
    if (params.client_id) query.append("client_id", params.client_id);
    if (params.work_id) query.append("work_id", params.work_id);
    if (params.category) query.append("category", params.category);
    if (params.status) query.append("status", params.status);
    if (params.search) query.append("search", params.search);
  }
  const res = await fetch(`${API_BASE}/api/documents?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to list documents");
  return res.json();
}

export async function getDocument(document_id: string) {
  const res = await fetch(`${API_BASE}/api/documents/${document_id}`);
  if (!res.ok) throw new Error("Failed to get document");
  return res.json();
}

export async function uploadDocument(
  file: File,
  category: string,
  client_id?: string,
  work_id?: string,
  document_date?: string,
  notes?: string
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (client_id && client_id !== "undefined" && client_id !== "null") formData.append("client_id", client_id);
  if (work_id && work_id !== "undefined" && work_id !== "null") formData.append("work_id", work_id);
  if (document_date && document_date !== "undefined" && document_date !== "null") formData.append("document_date", document_date);
  if (notes && notes !== "undefined" && notes !== "null") formData.append("notes", notes);

  const res = await fetch(`${API_BASE}/api/documents/upload`, {
    method: "POST",
    body: formData,
  });
  
  if (!res.ok) {
    let detail = "Upload failed";
    try {
      const data = await res.json();
      detail = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail) || detail;
    } catch (e) {}
    throw new Error(detail);
  }
  return res.json();
}

export async function updateDocument(document_id: string, payload: { category?: string; status?: string; document_date?: string; notes?: string }) {
  const res = await fetch(`${API_BASE}/api/documents/${document_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update document");
  return res.json();
}

export function getDocumentDownloadUrl(document_id: string) {
  return `${API_BASE}/api/documents/${document_id}/download`;
}

export async function getWorkChecklist(work_id: string) {
  const res = await fetch(`${API_BASE}/api/works/${work_id}/checklist`);
  if (!res.ok) throw new Error("Failed to fetch checklist");
  return res.json();
}

export async function updateChecklistItem(work_id: string, item_id: string, status: string) {
  const res = await fetch(`${API_BASE}/api/works/${work_id}/checklist/${item_id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update checklist item");
  return res.json();
}
