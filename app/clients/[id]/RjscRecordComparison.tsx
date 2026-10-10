"use client";

import { useEffect, useState } from "react";
import { listDocuments } from "@/lib/api/documents";

type Props = {
  clientId: string;
  client: any;
  currentPosition: any;
};

type DocumentSummary = { id: string; category: string; document_name: string; status?: string; document_date?: string | null };

export default function RjscRecordComparison({ clientId, client, currentPosition }: Props) {
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    listDocuments({ client_id: clientId })
      .then(result => {
        if (!active) return;
        if (!Array.isArray(result)) throw new Error("Unexpected document response");
        setDocs(result);
        setError("");
      })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : "Unable to load documents"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId]);

  const directors = (currentPosition?.current_directors || []).map((d: any) => d.full_name).filter(Boolean).join(", ");
  const rows = [
    { label: "Legal Name", office: currentPosition?.current_legal_name || client?.legal_name },
    { label: "Registration No.", office: client?.registration_no },
    { label: "Incorporation Date", office: client?.incorporation_date },
    { label: "Registered Office", office: currentPosition?.current_registered_office },
    { label: "Current Directors", office: directors },
    { label: "Authorized Capital", office: currentPosition?.authorized_capital == null ? null : "৳ " + Number(currentPosition.authorized_capital).toLocaleString("en-BD") },
    { label: "Paid-up Capital", office: currentPosition?.paid_up_capital == null ? null : "৳ " + Number(currentPosition.paid_up_capital).toLocaleString("en-BD") },
    { label: "Last recorded AGM", office: currentPosition?.last_agm?.agm_date ? currentPosition.last_agm.financial_year + " — " + currentPosition.last_agm.agm_date : null },
    { label: "Last recorded Annual Return", office: currentPosition?.last_annual_return?.filed_date ? currentPosition.last_annual_return.financial_year + " — " + currentPosition.last_annual_return.filed_date : null }
  ];

  const referenceDocs = docs.filter(d => ["CERTIFIED_COPY", "ACKNOWLEDGEMENT", "FORM_XII", "SCHEDULE_X", "INCORPORATION"].includes(d.category));

  return (
    <section className="space-y-4 rounded-[20px] border border-[#d9e3df] bg-[#fffdf7] p-5">
      <div>
        <h3 className="text-lg font-black text-[#22342d]">RJSC vs Office Record — Verification Worksheet</h3>
        <p className="mt-1 text-xs leading-5 text-[#6c7671]">
          The Office column contains your saved client records. No independently verified RJSC data feed or structured RJSC snapshot is connected yet,
          so this worksheet does not claim any fields match or differ. Compare against authenticated RJSC extracts before confirming a discrepancy.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[670px] w-full text-left text-sm">
          <thead className="border-b border-[#d9e3df] text-xs font-bold uppercase text-[#44765b]">
            <tr><th className="py-3 pr-3">Field</th><th className="py-3 pr-3">Office Record</th><th className="py-3 pr-3">RJSC Verified Record</th><th className="py-3">Reconciliation</th></tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.label} className="border-b border-[#ece5d9]">
                <td className="py-3 pr-3 font-semibold text-[#343530]">{row.label}</td>
                <td className="py-3 pr-3">{row.office || "Not recorded"}</td>
                <td className="py-3 pr-3 text-[#8b6a3d]">Not verified</td>
                <td className="py-3 text-[#6c7671]">Source needed</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl bg-[#eef7f3] p-4">
        <h4 className="text-sm font-bold text-[#315f55]">Relevant documents already linked</h4>
        {loading ? <p className="mt-2 text-xs">Checking client document index...</p> :
          error ? <p role="alert" className="mt-2 text-xs text-red-700">Could not load documents: {error}</p> :
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
