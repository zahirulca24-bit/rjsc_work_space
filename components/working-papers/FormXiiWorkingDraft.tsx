"use client";

import { useEffect, useMemo, useState } from "react";
import { getClients, getClientHistory } from "@/lib/api/clients";
import { FileText, Printer, RefreshCcw, AlertTriangle } from "lucide-react";

type Client = { id: string; legal_name: string; registration_no?: string | null; registered_office_text?: string | null };
type DirectorRow = {
  full_name: string; former_name: string; nationality: string; nationality_of_origin: string;
  residential_address: string; occupation: string; appointment_date: string; changes: string;
};
const emptyRow = (): DirectorRow => ({
  full_name: "", former_name: "", nationality: "", nationality_of_origin: "",
  residential_address: "", occupation: "", appointment_date: "", changes: "",
});
const columns: { key: keyof DirectorRow; label: string }[] = [
  { key: "full_name", label: "Present Names / Surnames" },
  { key: "former_name", label: "Former Names / Surnames" },
  { key: "nationality", label: "Nationality" },
  { key: "nationality_of_origin", label: "Nationality of Origin" },
  { key: "residential_address", label: "Usual Residential Address" },
  { key: "occupation", label: "Other Business, Occupation and Directorship" },
  { key: "appointment_date", label: "Date of Appointment or Change" },
  { key: "changes", label: "Changes" },
];

export default function FormXiiWorkingDraft() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [registration, setRegistration] = useState("");
  const [presentedBy, setPresentedBy] = useState("");
  const [dated, setDated] = useState("");
  const [designation, setDesignation] = useState("");
  const [rows, setRows] = useState<DirectorRow[]>([emptyRow()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [reviewed, setReviewed] = useState(false);

  useEffect(() => {
    getClients().then((data: Client[]) => setClients(data)).catch(() => setError("Could not load clients."));
  }, []);
  const selectedClient = useMemo(() => clients.find(c => c.id === selectedId), [clients, selectedId]);

  useEffect(() => {
    setReady(false);
    setReviewed(false);
    setName(selectedClient?.legal_name || "");
    setRegistration(selectedClient?.registration_no || "");
    setRows([emptyRow()]);
    setError("");
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    getClientHistory(selectedId).then((hist: any) => {
      if (cancelled) return;
      const directors = Array.isArray(hist.directors) ? hist.directors : [];
      const active = directors.filter((d: any) => d.is_current === true);
      setRows(active.length ? active.map((d: any) => ({
        full_name: String(d.full_name || ""), former_name: "",
        nationality: "", nationality_of_origin: "", residential_address: "",
        occupation: String(d.designation || ""), appointment_date: String(d.appointment_date || ""),
        changes: "", // This must be validated from source, not inferred from status.
      })) : [emptyRow()]);
      setReady(true);
    }).catch(() => {
      if (!cancelled) setError("Director records could not be loaded. Draft preview is disabled until data is retrieved.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId, selectedClient?.legal_name, selectedClient?.registration_no]);

  const edit = (index: number, field: keyof DirectorRow, value: string) => {
    setReviewed(false);
    setRows(previous => previous.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #form-xii-print, #form-xii-print * { visibility: visible !important; }
          #form-xii-print { position: absolute !important; top: 0; left: 0; width: 100%; padding: 10mm; background: white; color: black; }
          .no-print { display: none !important; }
          @page { size: A4 landscape; margin: 10mm; }
          #form-xii-print table { width: 100%; border-collapse: collapse; }
          #form-xii-print th, #form-xii-print td { border: 1px solid #333; padding: 7px; font-size: 10px; vertical-align: top; overflow-wrap: anywhere; }
        }
      `}</style>
      <div className="no-print grid gap-3 rounded-xl border border-[#d9e3df] bg-[#fffdf7] p-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Select Client
          <select className="mt-1 w-full rounded-lg border p-2.5" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">Choose existing client</option>
            {clients.map(c => <option value={c.id} key={c.id}>{c.legal_name}</option>)}
          </select>
        </label>
        <div className="self-center text-xs text-[#546c62]">
          <p>Client name, registration number and current director names/designations/dates are read from existing records.</p>
          <p className="mt-1 font-semibold">Other fields remain blank unless a staff member verifies and enters them.</p>
        </div>
      </div>

      {error && <p className="no-print rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      {loading && <p className="no-print text-sm">Loading saved client and director records...</p>}
      {selectedId && ready && !error && (
        <>
          <div className="no-print grid gap-3 rounded-xl border border-[#e7dfce] bg-white p-4 sm:grid-cols-2">
            <label className="text-sm font-semibold">Company Name
              <input className="mt-1 w-full rounded-lg border p-2" value={name} onChange={e => { setName(e.target.value); setReviewed(false); }} />
            </label>
            <label className="text-sm font-semibold">Registration Number
              <input className="mt-1 w-full rounded-lg border p-2" value={registration} onChange={e => { setRegistration(e.target.value); setReviewed(false); }} />
            </label>
            <label className="text-sm font-semibold">Presented for Filing By
              <input className="mt-1 w-full rounded-lg border p-2" value={presentedBy} onChange={e => { setPresentedBy(e.target.value); setReviewed(false); }} />
            </label>
            <label className="text-sm font-semibold">Form Date
              <input type="date" className="mt-1 w-full rounded-lg border p-2" value={dated} onChange={e => { setDated(e.target.value); setReviewed(false); }} />
            </label>
            <label className="text-sm font-semibold">Signatory Designation
              <input className="mt-1 w-full rounded-lg border p-2" value={designation} onChange={e => { setDesignation(e.target.value); setReviewed(false); }} />
            </label>
          </div>
          <div className="no-print overflow-x-auto rounded-xl border bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="font-bold">Directors — Review every row</h3>
              <button type="button" className="rounded-lg bg-[#e2f3e9] px-3 py-2 text-sm font-semibold" onClick={() => { setRows(p => [...p, emptyRow()]); setReviewed(false); }}>Add Row</button>
            </div>
            <div className="min-w-[1000px] space-y-3">
              {rows.map((row, index) => <div key={index} className="grid grid-cols-4 gap-2 border-b pb-3">
                <div className="col-span-4 text-xs font-bold">Director {index + 1}</div>
                {columns.map(col => <label key={col.key} className="text-xs">
                  {col.label}
                  <input type={col.key === "appointment_date" ? "date" : "text"} className="mt-1 w-full rounded-md border p-2 text-sm" value={row[col.key]} onChange={e => edit(index, col.key, e.target.value)} />
                </label>)}
                <button type="button" onClick={() => { setRows(p => p.filter((_, i) => i !== index)); setReviewed(false); }} className="w-max text-xs text-red-700">Remove Row</button>
              </div>)}
            </div>
          </div>

          <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1" />
              I have checked all entries against the applicable RJSC sources; this is a working draft, not evidence of filing.
            </label>
            <button type="button" disabled={!reviewed || !name.trim()} onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg bg-[#315f55] px-4 py-2.5 font-bold text-white disabled:opacity-40">
              <Printer size={16} /> Print / Save as PDF
            </button>
          </div>

          <section id="form-xii-print" className="rounded-xl border border-slate-200 bg-white p-5 text-black shadow-sm">
            <div className="mb-4 text-center">
              <h2 className="text-lg font-bold">FORM XII</h2>
              <p className="text-xs font-bold">PARTICULARS OF THE DIRECTORS, MANAGER AND MANAGING AGENTS AND OF ANY CHANGE THEREIN</p>
              <p className="mt-1 text-[10px]">WORKING DRAFT — Requires independent checking and authorization before filing</p>
            </div>
            <p className="text-xs">Name of the Company: <strong>{name || "________________"}</strong></p>
            <p className="text-xs">Registration No.: <strong>{registration || "________________"}</strong></p>
            <p className="mb-4 text-xs">Presented for Filing by: <strong>{presentedBy || "________________"}</strong></p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse text-[10px]">
                <thead><tr>{columns.map(c => <th className="border border-slate-500 p-1 align-top" key={c.key}>{c.label}</th>)}</tr></thead>
                <tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td className="h-20 border border-slate-500 p-1 align-top" key={c.key}>{r[c.key] || "—"}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div className="mt-8 flex justify-between text-xs">
              <p>Dated: {dated || "________________"}</p>
              <p>Signature: _____________________<br />Designation: {designation || "________________"}</p>
            </div>
          </section>
          <p className="no-print flex items-start gap-2 text-xs text-[#5a6560]"><AlertTriangle size={14} className="shrink-0" /> Current saved director records may be incomplete or outdated. Generated draft does not update client history, mark RJSC facts verified, or submit anything.</p>
        </>
      )}
      {!selectedId && <div className="rounded-xl border border-dashed p-8 text-center text-sm text-[#63756a]"><FileText className="mx-auto mb-2" /> Choose a client to generate a Form XII working draft.</div>}
    </div>
  );
}
