"use client";

import { useEffect, useState } from "react";
import { listDocuments } from "@/lib/api/documents";
import { listRjscSnapshots, saveRjscSnapshot, type RjscSnapshot } from "@/lib/api/rjsc-snapshots";

type Props = {
  clientId: string;
  client: any;
  currentPosition: any;
};

type DocumentSummary = { id: string; category: string; document_name: string; status?: string; document_date?: string | null };

export default function RjscRecordComparison({ clientId, client, currentPosition }: Props) {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [snapshots, setSnapshots] = useState<RjscSnapshot[]>([]);
  const [snapshotError, setSnapshotError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [checkedOn, setCheckedOn] = useState("");
  const [verified, setVerified] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const fieldKeys = [
    ["legal_name", "Legal Name"],
    ["registration_no", "Registration No."],
    ["incorporation_date", "Incorporation Date"],
    ["registered_office", "Registered Office"],
    ["current_directors", "Current Directors"],
    ["authorized_capital", "Authorized Capital (BDT)"],
    ["paid_up_capital", "Paid-up Capital (BDT)"]
  ] as const;

  const latest = snapshots[0];
  const normalized = (value: unknown) => String(value ?? "").trim().replace(/[,৳\s]/g, "").toLowerCase();
  const saveSnapshot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving || loading || error) return;
    if (!Object.values(fields).some(v => v.trim())) {
      setSnapshotError("Enter at least one field from the RJSC source.");
      return;
    }
    setSaving(true);
    setSnapshotError("");
    setSaveMessage("");
    try {
      const filtered = Object.fromEntries(Object.entries(fields).filter(([_, v]) => v.trim()));
      await saveRjscSnapshot(clientId, {
        source_reference: sourceReference.trim(), checked_on: checkedOn,
        is_verified: verified, fields: filtered
      });
      // A successful POST must not look like a failed save if the refresh fails.
      setSaveMessage("Snapshot saved. Updating the display...");
      setFields({});
      setSourceReference("");
      setCheckedOn("");
      setVerified(false);
      try {
        setSnapshots(await listRjscSnapshots(clientId));
        setSaveMessage("Snapshot saved. Earlier snapshots remain in history.");
      } catch {
        setSaveMessage("Snapshot saved, but the list could not refresh. Reopen the profile to view it.");
      }
    } catch (err: unknown) {
      setSnapshotError(err instanceof Error ? err.message : "Unable to save snapshot");
    } finally {
      setSaving(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [docsError, setDocsError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([listDocuments({ client_id: clientId }), listRjscSnapshots(clientId)])
      .then(([documents, storedSnapshots]) => {
        if (!active) return;
        if (documents.status === "fulfilled" && Array.isArray(documents.value)) {
          setDocs(documents.value);
          setDocsError("");
        } else {
          setDocs([]);
          setDocsError("Could not load linked documents. Retry by reopening this profile.");
        }
        if (storedSnapshots.status === "fulfilled" && Array.isArray(storedSnapshots.value)) {
          setSnapshots(storedSnapshots.value);
          setError("");
        } else {
          setSnapshots([]);
          setError("Could not load saved RJSC snapshots. Do not enter new records until this is resolved.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId]);

  const directors = (Array.isArray(currentPosition?.current_directors) ? currentPosition.current_directors : [])
    .map((d: any) => d.full_name).filter(Boolean).join(", ");
  const rows = [
    { key: "legal_name", label: "Legal Name", office: currentPosition?.current_legal_name || client?.legal_name },
    { key: "registration_no", label: "Registration No.", office: client?.registration_no },
    { key: "incorporation_date", label: "Incorporation Date", office: client?.incorporation_date },
    { key: "registered_office", label: "Registered Office", office: currentPosition?.current_registered_office },
    { key: "current_directors", label: "Current Directors", office: directors },
    { key: "authorized_capital", label: "Authorized Capital", office: currentPosition?.authorized_capital == null ? null : "৳ " + Number(currentPosition.authorized_capital).toLocaleString("en-BD") },
    { key: "paid_up_capital", label: "Paid-up Capital", office: currentPosition?.paid_up_capital == null ? null : "৳ " + Number(currentPosition.paid_up_capital).toLocaleString("en-BD") },
    { key: "agm_unavailable", label: "Last recorded AGM", office: currentPosition?.last_agm?.agm_date ? currentPosition.last_agm.financial_year + " — " + currentPosition.last_agm.agm_date : null },
    { key: "return_unavailable", label: "Last recorded Annual Return", office: currentPosition?.last_annual_return?.filed_date ? currentPosition.last_annual_return.financial_year + " — " + currentPosition.last_annual_return.filed_date : null }
  ];

  const referenceDocs = docs.filter(d => ["CERTIFIED_COPY", "ACKNOWLEDGEMENT", "FORM_XII", "SCHEDULE_X", "INCORPORATION"].includes(d.category));

  return (
    <section className="space-y-4 rounded-[20px] border border-[#d9e3df] bg-[#fffdf7] p-5">
      <div>
        <h3 className="text-lg font-black text-[#22342d]">RJSC vs Office Record — Verification Worksheet</h3>
        <p className="mt-1 text-xs leading-5 text-[#6c7671]">
          The Office column uses saved client records. RJSC column uses only manually entered, source-linked snapshots;
          this is not a live RJSC connection. Mismatch is shown only after staff explicitly marks the snapshot reviewed and verified.
        </p>
      </div>
      <form onSubmit={saveSnapshot} className="space-y-3 rounded-xl border border-[#d9e3df] bg-white p-4">
        <h4 className="font-bold text-[#315f55]">Record new RJSC source snapshot</h4>
        <p className="text-xs text-[#6c7671]">Enter values from an authenticated RJSC extract, not from office history. Source reference and check date are required. Leave fields blank if the RJSC extract does not show them.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold">RJSC source reference / extract ID
            <input required minLength={3} maxLength={600} value={sourceReference} onChange={e => setSourceReference(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" placeholder="Document number / certified copy reference" />
          </label>
          <label className="text-xs font-bold">Date checked
            <input required type="date" value={checkedOn} max={new Date().toISOString().slice(0,10)} onChange={e => setCheckedOn(e.target.value)} className="mt-1 block w-full rounded-lg border p-2 text-sm" />
          </label>
          {fieldKeys.map(([key, label]) => <label key={key} className="text-xs font-bold">{label}
            <input value={fields[key] || ""} onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))} className="mt-1 block w-full rounded-lg border p-2 text-sm" placeholder="Value on RJSC extract" />
          </label>)}
        </div>
        <label className="flex items-start gap-2 text-xs text-[#4b4d47]">
          <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />
          I reviewed the cited RJSC source and confirm these entered values agree with it. Unchecked snapshots remain unverified.
        </label>
        {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
        {snapshotError && <p role="alert" className="text-xs text-red-700">{snapshotError}</p>}
        {saveMessage && <p role="status" className="text-xs text-[#315f55]">{saveMessage}</p>}
        <button type="submit" disabled={saving || loading || Boolean(error)} className="rounded-lg bg-[#447a5d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving..." : "Save RJSC Snapshot"}</button>
      </form>
      {latest && <p className="text-xs text-[#6c7671]">Latest RJSC snapshot: {latest.checked_on}, source {latest.source_reference}, recorded by {latest.checked_by} — {latest.is_verified ? "Staff-verified" : "Draft / Unverified"}. {snapshots.length} snapshot(s) retained.</p>}
      <div className="overflow-x-auto">
        <table className="min-w-[670px] w-full text-left text-sm">
          <thead className="border-b border-[#d9e3df] text-xs font-bold uppercase text-[#44765b]">
            <tr><th className="py-3 pr-3">Field</th><th className="py-3 pr-3">Office Record</th><th className="py-3 pr-3">RJSC Source Value (manual entry)</th><th className="py-3">Reconciliation</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-[#ece5d9]">
                <td className="py-3 pr-3 font-semibold text-[#343530]">{row.label}</td>
                <td className="py-3 pr-3">{row.office || "Not recorded"}</td>
                <td className="py-3 pr-3 text-[#8b6a3d]">{latest?.fields?.[row.key] || "Not verified"}</td>
                <td className="py-3 text-[#6c7671]">{
                  !latest?.is_verified ? "Source verification needed"
                  : !latest.fields[row.key] ? "Not verified"
                  : !row.office ? "Office record missing"
                  : normalized(row.office) === normalized(latest.fields[row.key]) ? "Match (staff-reviewed)" : "Mismatch — review"
                }</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl bg-[#eef7f3] p-4">
        <h4 className="text-sm font-bold text-[#315f55]">Relevant documents already linked</h4>
        {loading ? <p className="mt-2 text-xs">Checking client document index...</p> :
          docsError ? <p role="alert" className="mt-2 text-xs text-red-700">{docsError}</p> :
          referenceDocs.length === 0 ? <p className="mt-2 text-xs">No certified copy, Form XII, Schedule X, incorporation certificate, or RJSC acknowledgement recorded.</p> :
          <ul className="mt-2 space-y-1 text-xs text-[#4b4d47]">
            {referenceDocs.slice(0, 12).map(d => <li key={d.id}>{d.category.replaceAll("_", " ")} — {d.document_name} (document status: {d.status || "Unknown"})</li>)}
          </ul>
        }
        <p className="mt-3 text-xs leading-5 text-[#6c7671]">Document presence is not independent verification. Review the source, its date and authenticity before signing off.</p>
      </div>
      <p className="text-xs text-[#6c7671]">
        Next staff action: obtain the latest authenticated RJSC extracts, check them against office records, then record supported corrections in Corporate History.
        AGM held status and Annual Return filing status must be reviewed separately. Do not treat an audit report or DVC as AGM evidence.
      </p>
    </section>
  );
}
