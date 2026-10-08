"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { CorporateEvent } from "@/lib/clients/history-types";
import { buildTimeline } from "@/lib/clients/history-utils";
import { Badge, Stat, PrimaryButton } from "@/components/UI";
import { getClient, getClientCurrentPosition, getClientHistory } from "@/lib/api/clients";
import { getWorks } from "@/lib/api/works";
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{currentPosition.current_legal_name || client.legal_name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm">
            <Badge tone="info">{client.client_code}</Badge>
            <Badge tone="neutral">{client.entity_type.replace('_', ' ')}</Badge>
            <Badge tone={currentPosition.current_entity_status === 'Active' ? 'success' : 'warning'}>
              {currentPosition.current_entity_status || client.status}
            </Badge>
            {client.registration_no && (
              <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-xs">
                {client.registration_no}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/new-work" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors">
            Start New Work
          </Link>
        </div>
      </div>

      <div className="flex gap-6 border-b border-slate-200">
        {["Overview", "Corporate History", "Timeline", "Active Works"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 font-medium text-sm border-b-2 transition-colors ${
              tab === t ? "border-emerald-600 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Total Billed (YTD)" value={`৳ ${clientWorks.reduce((sum: number, w: any) => sum + (w.total_bill ? parseFloat(w.total_bill) : 0), 0)}`} />
            <Stat label="Active Works" value={clientWorks.filter((w:any) => w.status !== 'Completed').length} />
            <Stat label="Pending Compliance" value={currentPosition.pending_compliance_count} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Business Profile</h3>
              <dl className="space-y-3 text-sm">
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">Contact</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.contact_person || "-"}</dd>
                </div>
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">Mobile</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.mobile || "-"}</dd>
                </div>
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">Email</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.email || "-"}</dd>
                </div>
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">TIN</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.tin || "-"}</dd>
                </div>
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">BIN</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.bin || "-"}</dd>
                </div>
                <div className="flex">
                  <dt className="w-1/3 text-slate-500">Assigned</dt>
                  <dd className="w-2/3 font-medium text-slate-900">{client.assigned_staff || "-"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Registered Office</h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-3 rounded">
                  {currentPosition.current_registered_office || "Not on file"}
                </p>
              </div>

              {client.entity_type.includes('COMPANY') && (
                <div>
                  <h3 className="font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">Capital Structure</h3>
                  <div className="flex gap-8 text-sm">
                    <div>
                      <div className="text-slate-500 mb-1">Authorized</div>
                      <div className="font-medium text-slate-900">৳ {(currentPosition.authorized_capital || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 mb-1">Paid Up</div>
                      <div className="font-medium text-slate-900">৳ {(currentPosition.paid_up_capital || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Current Board</h3>
              {currentPosition.current_directors?.length > 0 ? (
                <ul className="space-y-3">
                  {currentPosition.current_directors.map((d: any) => (
                    <li key={d.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-900">{d.full_name}</span>
                      <span className="text-slate-500 text-xs px-2 py-0.5 bg-slate-100 rounded">{d.designation}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 italic">No current directors recorded.</p>
              )}
            </div>

            {client.entity_type.includes('COMPANY') && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 border-b border-slate-100 pb-2">Shareholding</h3>
                {currentPosition.current_shareholders?.length > 0 ? (
                  <ul className="space-y-3">
                    {currentPosition.current_shareholders.map((s: any) => (
                      <li key={s.id} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-900">{s.shareholder_name}</span>
                        <span className="text-slate-600 font-medium">{s.share_count.toLocaleString()} shares</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic">No shareholders recorded.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "Corporate History" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex justify-between items-center">
             <h3 className="font-bold text-slate-900 text-lg">Historical Records</h3>
             <PrimaryButton onClick={() => { setEditEvent(null); setIsModalOpen(true); }}>
                Add Record
             </PrimaryButton>
          </div>
          <div className="text-sm text-slate-500 italic">History records managed via API.</div>

          <HistoryRecordModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            clientId={id}
            onSave={() => {
              setIsModalOpen(false);
              fetchAllData();
            }}
          />
        </div>
      )}

      {tab === "Timeline" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 text-lg">Event Timeline</h3>
          <div className="space-y-6">
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No events recorded.</p>
            ) : (
              timeline.map((ev: any, idx: number) => (
                <div key={ev.id || idx} className="relative pl-8 mb-6">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200"></div>
                  <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-slate-700 bg-slate-200/50 px-2 py-0.5 rounded text-xs">{(ev.type || '').replace(/_/g, ' ')}</span>
                          <span className="text-xs text-slate-500">{ev.date}</span>
                        </div>
                        <p className="text-slate-600 mt-2">{ev.title || ev.notes || 'Recorded in system'}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === "Active Works" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Work Register</h3>
          {clientWorks.length === 0 ? (
             <p className="text-sm text-slate-500 italic">No works found.</p>
          ) : (
             <ul className="space-y-3">
               {clientWorks.map(w => (
                 <li key={w.id} className="flex justify-between items-center text-sm p-3 bg-slate-50 rounded border border-slate-100">
                   <div>
                     <div className="font-medium text-slate-900">{w.service_id}</div>
                     <div className="text-xs text-slate-500 mt-1">{w.work_code}</div>
                   </div>
                   <Badge tone={w.status === 'Completed' ? 'success' : 'warning'}>{w.status}</Badge>
                 </li>
               ))}
             </ul>
          )}
        </div>
      )}
    </div>
  );
}
