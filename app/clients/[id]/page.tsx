"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { clientStore } from "@/lib/clients/client-store";
import { historyStore } from "@/lib/clients/history-store";
import { CorporateEvent } from "@/lib/clients/history-types";
import { 
  getCurrentDirectors, getCurrentShareholders, getCurrentCapital, getCurrentRegisteredOffice, buildTimeline,
  getCurrentLegalName, getLastAGM, getLastAnnualReturn, getLatestFiling, getPendingFilingCount, getNextKnownComplianceAction, getComplianceStatus 
} from "@/lib/clients/history-utils";
import { Badge, Stat, PrimaryButton } from "@/components/UI";
import { works } from "@/lib/mock";
import { HistoryRecordModal } from "./HistoryRecordModal";

export default function ClientProfilePage() {
  const params = useParams();
  const id = String(params.id);

  const clients = useSyncExternalStore(clientStore.subscribe, clientStore.getSnapshot, clientStore.getSnapshot);
  const client = clients.find(c => c.id === id);

  const events = useSyncExternalStore(historyStore.subscribe, historyStore.getAllSnapshot, historyStore.getAllSnapshot).filter(e => e.clientId === id);

  const [tab, setTab] = useState("Overview");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CorporateEvent | null>(null);
  
  const [timelineFilter, setTimelineFilter] = useState("All");

  if (!client) {
    return <div className="p-8 text-center text-slate-500">Client not found. <Link href="/clients" className="text-emerald-600 underline">Go back</Link></div>;
  }

  // Work + Financial Connection
  const activeWorks = client.id === "RJSC-0001" ? works : [];
  const totalBill = activeWorks.reduce((sum, x) => sum + x.bill, 0);
  const totalCollection = activeWorks.reduce((sum, x) => sum + x.collection, 0);
  const totalDue = totalBill - totalCollection;
  const completedWorks = activeWorks.filter(w => w.status === 'Completed');
  const completedWorkValue = completedWorks.reduce((sum, x) => sum + x.bill, 0);
  const openWorkValue = totalBill - completedWorkValue;

  // Derivations
  const curName = getCurrentLegalName(events, client.name);
  const curRegOffice = getCurrentRegisteredOffice(events);
  const curCap = getCurrentCapital(events);
  const curDirs = getCurrentDirectors(events);
  const curShares = getCurrentShareholders(events);
  
  const lastAgm = getLastAGM(events);
  const lastReturn = getLastAnnualReturn(events);
  const latestFiling = getLatestFiling(events);
  const pendingCount = getPendingFilingCount(events);
  const nextAction = getNextKnownComplianceAction(events);
  
  const timeline = buildTimeline(events).filter(t => {
    if (timelineFilter === "All") return true;
    if (timelineFilter === "Directors") return t.eventType === 'DIRECTOR_CHANGE';
    if (timelineFilter === "Shareholders") return t.eventType === 'SHAREHOLDER_CHANGE';
    if (timelineFilter === "Capital") return t.eventType === 'CAPITAL_CHANGE';
    if (timelineFilter === "AGM/Returns") return t.eventType === 'AGM' || t.eventType === 'ANNUAL_RETURN';
    if (timelineFilter === "Filings") return t.eventType === 'RJSC_FILING';
    if (timelineFilter === "Compliance") return t.eventType === 'COMPLIANCE_ISSUE';
    return true;
  });

  const agms = events.filter((e): e is import('@/lib/clients/history-types').AgmHistory => e.type === 'AGM');
  const returns = events.filter((e): e is import('@/lib/clients/history-types').AnnualReturnHistory => e.type === 'ANNUAL_RETURN');

  const tabs = [
    "Overview", "Corporate History", "Directors", "Shareholders", "Capital", 
    "AGM & Returns", "RJSC Filings", "Compliance", "Works", "Financials", "Documents"
  ];

  const handleSaveRecord = (ev: CorporateEvent) => {
    if (editEvent) {
      historyStore.updateEvent(ev);
    } else {
      historyStore.addEvent(ev);
    }
  };

  const openEdit = (ev: CorporateEvent) => {
    setEditEvent(ev);
    setIsModalOpen(true);
  };

  const openAdd = () => {
    setEditEvent(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-7 space-y-6">
      <Link href="/clients" className="text-emerald-700 font-extrabold text-sm hover:underline">
        ← Back to Clients
      </Link>

      <div className="flex justify-between items-start">
        <div>
          <div className="text-emerald-700 text-xs font-black tracking-widest">{client.id}</div>
          <h1 className="text-3xl font-black text-slate-900 mt-1 mb-2">{curName}</h1>
          <div className="flex gap-2 flex-wrap text-sm font-medium">
            <Badge tone="success">{client.status}</Badge>
            <Badge tone="neutral">{client.type}</Badge>
            <Badge tone="info">Assigned: {client.assigned}</Badge>
            <Badge tone="neutral">Reg: {client.regNo}</Badge>
            {client.formerName && <span className="text-slate-500 text-xs self-center ml-2">Formerly: {client.formerName}</span>}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={openAdd} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition shadow-sm">
            Add History Record
          </button>
          <Link href="/new-work" className="bg-[#0f3d36] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#092621] transition shadow-sm">
            + New Work
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Stat label="Open Works" value={String(activeWorks.filter(w => w.status !== 'Completed').length)} />
        <Stat label="Total Bill" value={`৳ ${totalBill.toLocaleString()}`} />
        <Stat label="Collection" value={`৳ ${totalCollection.toLocaleString()}`} />
        <Stat label="Outstanding" value={`৳ ${totalDue.toLocaleString()}`} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-1.5 flex gap-1 overflow-x-auto">
        {tabs.map(x => (
          <button key={x} onClick={() => setTab(x)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${tab === x ? 'bg-[#0f3d36] text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}>
            {x}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Current Position Snapshot</h2>
          <div className="grid grid-cols-2 gap-5">
            <Panel title="Entity Identification">
              <Info label="Current Legal Name" value={curName} />
              <Info label="Entity Status" value={client.status} />
              <Info label="Entity Type" value={client.type} />
              <Info label="RJSC Registration No." value={client.regNo || 'Not Available'} />
              <Info label="Incorporation Date" value={client.incorporationDate || 'Not Available'} />
              <Info label="TIN" value={client.tin || 'Not Available'} />
              <Info label="BIN" value={client.bin || 'Not Available'} />
            </Panel>

            <Panel title="Corporate Structure">
              <Info label="Current Registered Office" value={curRegOffice?.address || client.registeredOffice || 'Needs Update'} />
              <Info label="Authorized Capital" value={curCap ? `৳ ${curCap.authorizedCapital.toLocaleString()}` : 'Needs Update'} />
              <Info label="Paid-up Capital" value={curCap ? `৳ ${curCap.paidUpCapital.toLocaleString()}` : 'Needs Update'} />
              <Info label="Current Directors" value={curDirs.length > 0 ? String(curDirs.length) : 'Needs Update'} />
              <Info label="Current Shareholders" value={curShares.length > 0 ? String(curShares.length) : 'Needs Update'} />
            </Panel>
            
            <Panel title="Compliance Snapshot">
              <Info label="Last AGM Date" value={lastAgm?.agmDate || 'Needs Update'} />
              <Info label="Last Annual Return" value={lastReturn?.financialYear || 'Needs Update'} />
              <Info label="Latest RJSC Filing" value={latestFiling?.submissionDate || 'Needs Update'} />
              <Info label="Pending Compliance" value={String(pendingCount)} />
              <Info label="Outstanding Balance" value={`৳ ${totalDue.toLocaleString()}`} />
              <Info label="Next Known Action" value={nextAction?.title || 'None verified'} />
            </Panel>
          </div>
        </div>
      )}

      {tab === 'Corporate History' && (
        <Panel title="Corporate Timeline">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
            {["All", "Directors", "Shareholders", "Capital", "AGM/Returns", "Filings", "Compliance"].map(f => (
              <button key={f} onClick={() => setTimelineFilter(f)} className={`px-3 py-1 text-xs font-bold rounded-full border ${timelineFilter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                {f}
              </button>
            ))}
          </div>

          {timeline.length === 0 ? (
            <div className="text-slate-500 py-4 italic text-sm">No corporate events found for this filter.</div>
          ) : (
            <div className="space-y-4">
              {timeline.map((t, i) => (
                <div key={`${t.id}-${i}`} className="flex gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-100 transition relative group">
                  <div className="w-28 shrink-0 text-sm font-bold text-slate-500 pt-0.5">{t.date || 'Unknown'}</div>
                  <div className="flex-1">
                    <div className="text-xs font-black text-emerald-700 tracking-wider uppercase mb-1">{t.eventType.replace(/_/g, ' ')}</div>
                    <div className="font-bold text-slate-900">{t.title}</div>
                    {(t.reference || t.status || t.note) && (
                      <div className="mt-2 text-sm text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        {t.reference && <div><span className="font-semibold">Ref:</span> {t.reference}</div>}
                        {t.status && <div><span className="font-semibold">Status:</span> {t.status}</div>}
                        {t.note && <div className="w-full text-slate-500 italic mt-1">{t.note}</div>}
                      </div>
                    )}
                  </div>
                  <button onClick={() => openEdit(t.originalEvent)} className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 text-xs font-bold text-slate-400 hover:text-emerald-700 transition">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'Directors' && (
        <Panel title="Director History">
          {events.filter(e => e.type === 'DIRECTOR_CHANGE').length === 0 ? (
             <div className="text-slate-500 py-4 italic text-sm">No director history recorded.</div>
          ) : (
            <div className="space-y-4">
              {events.filter((e): e is any => e.type === 'DIRECTOR_CHANGE').map((d, i) => (
                 <div key={i} className={`p-4 rounded-xl border relative group ${d.current ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                   <div className="flex justify-between items-start">
                     <div>
                       <div className="font-bold text-lg text-slate-900">{d.fullName}</div>
                       <div className="text-sm font-medium text-slate-600">{d.designation}</div>
                     </div>
                     {d.current ? <Badge tone="success">Current</Badge> : <Badge tone="neutral">Ceased</Badge>}
                   </div>
                   <div className="mt-3 text-sm text-slate-500 grid grid-cols-2 gap-2">
                     <div><span className="font-semibold text-slate-700">Appointed:</span> {d.appointmentDate}</div>
                     {d.cessationDate && <div><span className="font-semibold text-slate-700">Ceased:</span> {d.cessationDate}</div>}
                     {d.sourceDocument && <div><span className="font-semibold text-slate-700">Source:</span> {d.sourceDocument}</div>}
                   </div>
                   <button onClick={() => openEdit(d)} className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 mt-8 text-xs font-bold text-slate-400 hover:text-emerald-700 transition">Edit</button>
                 </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === 'AGM & Returns' && (
        <Panel title="AGM & Annual Return Position">
          {agms.length === 0 && returns.length === 0 ? (
            <div className="text-slate-500 py-4 italic text-sm">No AGM or annual return history recorded.</div>
          ) : (
            <table className="w-full text-left text-sm mt-2">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Financial Year</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">AGM Date</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Return Due</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Return Filed</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Status</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from(new Set([...agms.map(a => a.financialYear), ...returns.map(r => r.financialYear)])).sort().reverse().map(fy => {
                  const agm = agms.find(a => a.financialYear === fy);
                  const ret = returns.find(r => r.financialYear === fy);
                  const status = getComplianceStatus(ret?.dueDate || null, ret?.filedDate || null);
                  return (
                    <tr key={fy}>
                      <td className="p-3 font-bold text-slate-700">{fy}</td>
                      <td className="p-3 text-slate-600">{agm?.agmDate || <span className="text-slate-300">-</span>}</td>
                      <td className="p-3 text-slate-600">{ret?.dueDate || <span className="text-slate-300">-</span>}</td>
                      <td className="p-3 text-slate-600">{ret?.filedDate || <span className="text-slate-300">-</span>}</td>
                      <td className="p-3">
                        <Badge tone={status === 'FILED' ? 'success' : status === 'OVERDUE' ? 'danger' : 'warning'}>{status}</Badge>
                      </td>
                      <td className="p-3 text-slate-600">{ret?.acknowledgementReference || <span className="text-slate-300">-</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      )}

      {tab === 'Financials' && (
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <Panel title="Total Bill"><div className="text-xl font-black text-slate-900 mt-2">৳ {totalBill.toLocaleString()}</div></Panel>
            <Panel title="Total Collection"><div className="text-xl font-black text-emerald-700 mt-2">৳ {totalCollection.toLocaleString()}</div></Panel>
            <Panel title="Outstanding"><div className="text-xl font-black text-red-600 mt-2">৳ {totalDue.toLocaleString()}</div></Panel>
            <Panel title="Completed Works Value"><div className="text-xl font-black text-emerald-700 mt-2">৳ {completedWorkValue.toLocaleString()}</div></Panel>
            <Panel title="Open Works Value"><div className="text-xl font-black text-amber-700 mt-2">৳ {openWorkValue.toLocaleString()}</div></Panel>
          </div>
          
          <Panel title="Work Billing Details">
            {activeWorks.length === 0 ? (
              <div className="text-slate-500 py-4 italic text-sm">No billing records found.</div>
            ) : (
              <table className="w-full text-left text-sm mt-2">
                <thead><tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Work ID</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Service</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Status</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs text-right">Bill</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs text-right">Collection</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs text-right">Outstanding</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {activeWorks.map((w,i) => (
                    <tr key={i}>
                      <td className="p-3 font-medium text-slate-600">{w.id}</td>
                      <td className="p-3 font-medium text-slate-900">{w.service}</td>
                      <td className="p-3"><Badge tone="neutral">{w.status}</Badge></td>
                      <td className="p-3 text-right">৳ {w.bill.toLocaleString()}</td>
                      <td className="p-3 text-right text-emerald-700">৳ {w.collection.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-red-600">৳ {(w.bill - w.collection).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      )}

      {tab === 'Documents' && (
        <Panel title="Client Documents">
          {/* Mock document for now, as instructed: Use existing frontend/local document metadata only. If no documents exist: "No client documents recorded." */}
          {/* We do not have document metadata, so force empty state */}
          {false ? (
            <table className="w-full text-left text-sm mt-2">
              <thead><tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Document Name</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Category</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Related Work</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Date</th>
                  <th className="p-3 text-slate-500 font-bold uppercase text-xs">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
              </tbody>
            </table>
          ) : (
            <div className="text-slate-500 py-4 italic text-sm">No client documents recorded.</div>
          )}
        </Panel>
      )}

      {tab === 'Works' && (
        <Panel title="Work History">
          {activeWorks.length === 0 ? (
             <div className="text-slate-500 py-4 italic text-sm">No works recorded.</div>
          ) : (
             <table className="w-full text-left text-sm mt-2">
               <thead><tr className="border-b border-slate-200 bg-slate-50"><th className="p-3 text-slate-500 font-bold uppercase text-xs">Service</th><th className="p-3 text-slate-500 font-bold uppercase text-xs">Status</th><th className="p-3 text-slate-500 font-bold uppercase text-xs">Due Date</th><th className="p-3 text-slate-500 font-bold uppercase text-xs text-right">Outstanding</th></tr></thead>
               <tbody className="divide-y divide-slate-100">
                 {activeWorks.map((w,i) => (
                   <tr key={i}>
                     <td className="p-3 font-medium text-slate-900">{w.service}</td>
                     <td className="p-3"><Badge tone="neutral">{w.status}</Badge></td>
                     <td className="p-3 text-slate-600">{w.due}</td>
                     <td className="p-3 font-bold text-red-600 text-right">৳ {(w.bill - w.collection).toLocaleString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
        </Panel>
      )}

      {['Shareholders', 'Capital', 'RJSC Filings', 'Compliance'].includes(tab) && (
        <Panel title={tab}>
           <div className="text-slate-500 py-4 italic text-sm">No {tab.toLowerCase()} records have been migrated yet.</div>
        </Panel>
      )}

      <HistoryRecordModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveRecord} 
        clientId={client.id}
        editEvent={editEvent}
      />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode; }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <h2 className="text-lg font-bold text-slate-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string; }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <strong className="text-sm text-slate-900 text-right max-w-[60%] leading-snug">{value}</strong>
    </div>
  );
}
