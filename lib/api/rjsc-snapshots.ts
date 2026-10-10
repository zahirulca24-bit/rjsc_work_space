import { fetchApi } from "./fetchApi";

export type RjscSnapshot = {
  id: string;
  source_reference: string;
  checked_on: string;
  checked_by: string;
  is_verified: boolean;
  fields: Record<string, string>;
  created_at: string;
};

export async function listRjscSnapshots(clientId: string): Promise<RjscSnapshot[]> {
  const res = await fetchApi(`/api/rjsc-snapshots/${clientId}`);
  if (!res.ok) throw new Error("Could not load RJSC snapshots");
  return res.json();
}

export async function saveRjscSnapshot(clientId: string, data: {
  source_reference: string;
  checked_on: string;
  is_verified: boolean;
  fields: Record<string, string>;
}) {
  const res = await fetchApi(`/api/rjsc-snapshots/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(typeof body.detail === "string" ? body.detail : "Could not save RJSC snapshot");
  }
  return res.json();
}
