"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CorporateEvent } from "@/lib/clients/history-types";
import { buildTimeline } from "@/lib/clients/history-utils";
import { Badge, Stat, PrimaryButton } from "@/components/UI";
import { getClient, getClientCurrentPosition, getClientHistory } from "@/lib/api/clients";
import { getWorks } from "@/lib/api/works";
import { PageHeader, ContentCard, StatCard, StatusBadge, Table, Th, Td, EmptyState } from "@/components/SharedUI";
import { Building2, FolderOpen, AlertTriangle, FileText, BriefcaseBusiness } from "lucide-react";
import { HistoryRecordModal } from "./HistoryRecordModal";
import { EntityType } from "@/lib/rjsc/types";

export default function ClientProfilePage() {
  const params = useParams();
  const id = String(params.id);

  const [client, setClient] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState<any>(null);
  const [events, setEvents] = useState<CorporateEvent[]>([]);
  const [clientWorks, setClientWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  const [tab, setTab] = useState("Overview");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CorporateEvent | null>(null);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [c, cp, hist, wks] = await Promise.all([
        getClient(id),
        getClientCurrentPosition(id),
        getClientHistory(id),
        getWorks()
      ]);
      setClient(c);
      setCurrentPosition(cp);
      setClientWorks(wks.filter((w: any) => w.client_id === id));

      const mappedEvents: CorporateEvent[] = [];
      hist.registered_office_history?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'REGISTERED_OFFICE_CHANGE', address: e.address,
        effectiveFrom: e.effective_from || '', effectiveTo: e.effective_to,
        filingReference: e.filing_reference, notes: e.notes
      }));
      hist.directors?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'DIRECTOR_CHANGE', fullName: e.full_name,
        designation: e.designation, appointmentDate: e.appointment_date || '', cessationDate: e.cessation_date,
        current: e.is_current
      }));
      hist.capital_history?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'CAPITAL_CHANGE', authorizedCapital: e.authorized_capital,
        paidUpCapital: e.paid_up_capital, effectiveDate: e.effective_date || '', changeType: e.change_type || 'INITIAL'
      }));
      hist.shareholders?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'SHAREHOLDER_CHANGE', shareholderName: e.shareholder_name,
        shareCount: e.share_count, shareValue: e.share_value, ownershipPercentage: e.ownership_percentage || 0,
        effectiveFrom: e.effective_from || '', effectiveTo: e.effective_to, current: e.is_current
      }));
      hist.name_history?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'NAME_CHANGE', previousName: e.previous_name,
        newName: e.new_name, effectiveDate: e.effective_date || ''
      }));
      hist.agm_history?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'AGM', financialYear: e.financial_year,
        agmDate: e.agm_date, status: e.status
      }));
      hist.annual_returns?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'ANNUAL_RETURN', financialYear: e.financial_year,
        filedDate: e.filed_date || '', dueDate: '', filingStatus: 'PENDING'
      }));
      hist.filings?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'RJSC_FILING', serviceType: e.service_type,
        submissionDate: e.submission_date || '', approvalDate: e.approval_date, status: e.status, reference: e.reference, formName: e.service_type, effectiveDate: ''
      }));
      hist.compliance_issues?.forEach((e:any) => mappedEvents.push({
        id: e.id, clientId: e.client_id, type: 'COMPLIANCE_ISSUE', title: e.title,
        status: e.status, dueDate: e.due_date || '', category: 'GENERAL', identifiedDate: '', severity: 'MEDIUM', resolutionDate: null
      }));

      setEvents(mappedEvents);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading client profile...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!client) return <div className="p-8 text-center text-slate-500">Client not found</div>;

  const timeline = buildTimeline(events);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#79b993] text-white shadow-sm">
            <Building2 size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#181818] tracking-tight">{currentPosition.current_legal_name || client.legal_name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="font-bold text-[#44765b] bg-[#dff1e7] px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider">{client.client_code}</span>
              <span className="font-bold text-[#6c7671] bg-[#eef2f0] border border-[#d9e3df] px-2 py-0.5 rounded-md text-[11px] uppercase tracking-wider">{client.entity_type.replace('_', ' ')}</span>
              <StatusBadge status={currentPosition.current_entity_status || client.status} />
              {client.registration_no && (
                <span className="font-mono font-medium text-[#4b4d47] bg-[#fffdf7] border border-[#ece5d9] px-2 py-0.5 rounded text-xs">
                  {client.registration_no}
                </span>
              )}
            </div>
          </div>
        </div>
        <Link href="/new-work" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]">
          Start New Work
        </Link>
      </div>

      <div className="flex gap-2 border-b border-[#d9e3df] overflow-x-auto pb-1 mb-4">
        {["Overview", "Corporate History", "Active Works", "Documents", "Financials"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-bold text-sm whitespace-nowrap rounded-t-xl transition-colors ${
              tab === t ? "bg-[#fffaf0] text-[#181818] border-t border-x border-[#d9e3df] border-b-2 border-b-[#fffaf0] -mb-[1px]" : "text-[#6c7671] hover:text-[#181818]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <ContentCard className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-[#181818] text-lg">Current Position</h3>
            <span className="text-xs font-bold text-[#44765b] uppercase tracking-wider">Computed from history</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold text-[#6c7671] uppercase tracking-wider mb-1">Registered Office</div>
              <div className="font-medium text-[#181818]">{currentPosition.current_registered_office || '-'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#6c7671] uppercase tracking-wider mb-1">Capital Info</div>
              <div className="text-sm font-medium text-[#181818]">
                Auth: ৳³ {currentPosition.authorized_capital?.toLocaleString() || '0'} <br/>
                Paid: ৳³ {currentPosition.paid_up_capital?.toLocaleString() || '0'}
              </div>
            </div>
          </div>
        </ContentCard>
      )}

      {tab === "Corporate History" && (
        <div className="flex gap-6">
          <div className="w-64 shrink-0 bg-[#fffdf7] border border-[#d9e3df] rounded-xl p-4 self-start sticky top-6">
            <button onClick={() => { setEditEvent(null); setIsModalOpen(true); }} className="w-full mb-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#447a5d] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]">
              + Record Event
            </button>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">Filters</h4>
              {["All", "Registration", "Address", "Directors", "Capital", "AGM"].map(f => (
                <div key={f} className="text-sm font-medium text-[#4b4d47] px-2 py-1.5 hover:bg-[#e7f5ec] hover:text-[#234a32] rounded-md cursor-pointer">{f}</div>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-6">
            {timeline.length === 0 ? (
               <EmptyState title="No events recorded" message="Add the first corporate history event." icon={FolderOpen} />
            ) : (
              timeline.map((yearGroup: any) => (
                <div key={yearGroup.year} className="mb-8">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-black text-[#181818]">{yearGroup.year}</h3>
                    <div className="h-px bg-[#d9e3df] flex-1"></div>
                  </div>
                  <div className="space-y-4">
                    {yearGroup.events.map((ev: any) => (
                      <div key={ev.id} className="relative pl-6">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-[#d9e3df]"></div>
                        <div className="absolute left-[-4px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#79b993] ring-4 ring-[#eef2f0]"></div>
                        <div className="bg-[#fffdf7] p-4 rounded-xl border border-[#ece5d9] shadow-sm hover:border-[#d9e3df] transition-colors group">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-[#44765b] bg-[#e7f5ec] px-2 py-0.5 rounded-md text-[10px] uppercase tracking-widest">{(ev.type || '').replace(/_/g, ' ')}</span>
                                <span className="text-xs font-bold text-[#6c7671]">{ev.date}</span>
                              </div>
                              <p className="text-sm font-medium text-[#181818] mt-2">{ev.title || ev.notes || 'Recorded in system'}</p>
                              <button className="mt-3 text-xs font-bold text-[#447a5d] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditEvent(ev); setIsModalOpen(true); }}>Edit Record</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "Active Works" && (
        <ContentCard className="p-6">
          <h3 className="font-black text-[#181818] mb-4 text-lg">Work Register</h3>
          {clientWorks.length === 0 ? (
             <EmptyState title="No works found" message="Start a new work to track services." icon={BriefcaseBusiness} />
          ) : (
             <Table>
               <thead><tr><Th>Service</Th><Th>Status</Th></tr></thead>
               <tbody>
                 {clientWorks.map(w => (
                   <tr key={w.id}>
                     <Td>
                       <div className="font-bold text-[#181818]">{w.service_id}</div>
                       <div className="text-[11px] font-bold text-[#6c7671] uppercase tracking-wider mt-1">{w.work_code}</div>
                     </Td>
                     <Td><StatusBadge status={w.status} /></Td>
                   </tr>
                 ))}
               </tbody>
             </Table>
          )}
        </ContentCard>
      )}

      {tab === "Documents" && (
        <ContentCard className="p-6">
          <ClientDocuments client_id={params.id as string} />
        </ContentCard>
      )}
      {tab === "Financials" && (
        <ContentCard className="p-6">
          <ClientFinancials client_id={params.id as string} />
        </ContentCard>
      )}

      {isModalOpen && (
        <HistoryRecordModal isOpen={isModalOpen} clientId={id} editEvent={editEvent} onClose={() => setIsModalOpen(false)} onSave={() => { setIsModalOpen(false); fetchAllData(); }} />
      )}
    </div>
  );
}

function ClientFinancials({ client_id }: { client_id: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(("") + "/api/clients/" + client_id + "/financial-summary", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(console.error);
  }, [client_id]);

  if (loading) return <div className="text-sm">Loading financials...</div>;
  if (!data) return <div className="text-sm text-slate-500">No financial data found.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="border border-[#b8dfc6] p-4 rounded-xl bg-[#e7f5ec]">
        <div className="text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Total Billed</div>
        <div className="text-2xl font-black text-[#181818] font-mono">৳³ {parseFloat(data.total_billed || "0").toLocaleString()}</div>
      </div>
      <div className="border border-[#d9e3df] p-4 rounded-xl bg-[#fffaf0]">
        <div className="text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Total Collected</div>
        <div className="text-2xl font-black text-[#447a5d] font-mono">৳³ {parseFloat(data.total_collected || "0").toLocaleString()}</div>
      </div>
      <div className="border border-[#f0d7d0] p-4 rounded-xl bg-[#fce9e4]">
        <div className="text-sm font-bold text-[#a03c2a] uppercase tracking-wider mb-2">Outstanding</div>
        <div className="text-2xl font-black text-[#a03c2a] font-mono">৳³ {parseFloat(data.outstanding || "0").toLocaleString()}</div>
      </div>
      <div className="border border-[#d9e3df] p-4 rounded-xl bg-[#fffdf7]">
        <div className="text-sm font-bold text-[#6c7671] uppercase tracking-wider mb-2">Completed Works Value</div>
        <div className="text-xl font-bold text-[#181818] font-mono">৳³ {parseFloat(data.completed_works_value || "0").toLocaleString()}</div>
      </div>
      <div className="border border-[#d9e3df] p-4 rounded-xl bg-[#fffdf7]">
        <div className="text-sm font-bold text-[#6c7671] uppercase tracking-wider mb-2">Open Works Value</div>
        <div className="text-xl font-bold text-[#181818] font-mono">৳³ {parseFloat(data.open_works_value || "0").toLocaleString()}</div>
      </div>
    </div>
  );
}

function ClientDocuments({ client_id }: { client_id: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const categories = [
    "INCORPORATION", "MOA", "AOA", "FORM_XII", "FORM_VI",
    "ANNUAL_RETURN", "AGM", "SHARE_TRANSFER", "DIRECTOR_CHANGE",
    "REGISTERED_OFFICE", "CAPITAL", "MORTGAGE_CHARGE", "CERTIFIED_COPY",
    "PAYMENT_CHALLAN", "ACKNOWLEDGEMENT", "BOARD_RESOLUTION",
    "NID_PASSPORT", "TIN_BIN", "OTHER"
  ];

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { listDocuments } = await import("@/lib/api/documents");
      const data = await listDocuments({ client_id });
      setDocs(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, [client_id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setError("");
    try {
      const { uploadDocument } = await import("@/lib/api/documents");
      await uploadDocument(file, category, client_id, undefined, undefined, notes);
      setFile(null);
      setCategory("OTHER");
      setNotes("");
      fetchDocs();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-sm text-slate-500">Loading documents...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleUpload} className="bg-[#fffdf7] p-4 rounded-xl border border-[#ece5d9]">
        <div className="font-black text-[#181818] mb-4">Upload Document</div>
        {error && <div className="text-[#a03c2a] text-sm font-bold mb-3">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm border border-[#d9e3df] p-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#79b993]" />
          <select value={category} onChange={e => setCategory(e.target.value)} className="text-sm border border-[#d9e3df] p-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#79b993]">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" placeholder="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} className="text-sm border border-[#d9e3df] p-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#79b993]" />
        </div>
        <button type="submit" disabled={!file} className="bg-[#447a5d] text-white px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-[#396a50] transition">Upload Document</button>
      </form>

      {docs.length === 0 ? (
        <p className="text-sm font-bold text-[#6c7671] italic text-center py-6">No client documents recorded.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {docs.map(doc => {
            const url = ("") + "/api/documents/" + doc.id + "/download";
            return (
              <div key={doc.id} className="p-3 bg-white rounded-xl border border-[#d9e3df] shadow-sm flex justify-between items-center text-sm group">
                <div className="truncate flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#e7f5ec] text-[#44765b] shrink-0"><FileText size={16}/></div>
                  <div className="truncate">
                    <div className="font-bold text-[#181818] truncate" title={doc.document_name}>{doc.document_name}</div>
                    <div className="text-[#6c7671] text-[10px] uppercase font-bold tracking-wider mt-1">{doc.category}</div>
                  </div>
                </div>
                <a href={url} target="_blank" rel="noreferrer" className="ml-3 px-3 py-1.5 bg-[#eef2f0] hover:bg-[#d9e3df] rounded-lg text-xs font-bold text-[#4b4d47] transition">Download</a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
