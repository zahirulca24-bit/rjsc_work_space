"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { services } from "@/lib/rjsc/services";
import { getRequiredDocuments } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { getWorks, getWorkChecklist, updateWorkChecklistItem, ChecklistItem } from "@/lib/api/works";
import { getClients } from "@/lib/api/clients";
import {
  PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td
} from "@/components/SharedUI";
import {
  ClipboardList, CheckCircle2, AlertTriangle, FolderOpen, ExternalLink,
  Copy, Check, FileText, Building2, RefreshCw
} from "lucide-react";

export default function ChecklistRequisitionPage() {
  const [mode, setMode] = useState<"work" | "template">("work");
  const [works, setWorks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const [liveChecklist, setLiveChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Template Mode State
  const [serviceId, setServiceId] = useState(services[4]?.id || "annual-return");
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);

  // Requisition Copy state
  const [copied, setCopied] = useState(false);

  // Fetch works and clients
  useEffect(() => {
    Promise.all([getWorks().catch(() => []), getClients().catch(() => [])])
      .then(([wList, cList]) => {
        setWorks(wList);
        setClients(cList);
        if (wList.length > 0) {
          setSelectedWorkId(wList[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.legal_name;
    return map;
  }, [clients]);

  // Load live checklist when selected work changes
  useEffect(() => {
    if (!selectedWorkId) {
      setLiveChecklist([]);
      return;
    }
    getWorkChecklist(selectedWorkId)
      .then(setLiveChecklist)
      .catch(() => setLiveChecklist([]));
  }, [selectedWorkId]);

  const selectedWork = useMemo(
    () => works.find((w) => w.id === selectedWorkId),
    [works, selectedWorkId]
  );

  // Template requirements
  const selectedService = services.find((x) => x.id === serviceId);
  const availableEntities = selectedService?.entityTypes || [];
  const currentEntity = availableEntities.includes(entityType)
    ? entityType
    : availableEntities[0] || EntityType.PRIVATE_COMPANY;

  const templateDocs = useMemo(() => {
    return getRequiredDocuments(serviceId, currentEntity);
  }, [serviceId, currentEntity]);

  // Checklist counts
  const totalLive = liveChecklist.length;
  const completedLive = liveChecklist.filter(
    (c) => c.status === "COMPLETED" || c.status === "VERIFIED" || c.status === "RECEIVED"
  ).length;
  const missingLive = liveChecklist.filter(
    (c) => c.status === "PENDING" || c.status === "MISSING"
  );

  // Toggle item
  const handleToggle = async (item: ChecklistItem) => {
    const nextStatus = item.status === "COMPLETED" || item.status === "VERIFIED" ? "PENDING" : "COMPLETED";
    try {
      await updateWorkChecklistItem(selectedWorkId, item.id, { status: nextStatus });
      const refreshed = await getWorkChecklist(selectedWorkId);
      setLiveChecklist(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to update item");
    }
  };

  // Generate formal requisition letter text
  const requisitionText = useMemo(() => {
    if (!selectedWork) return "";
    const clientName = clientMap[selectedWork.client_id] || "Valued Client";
    const dateStr = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

    return `DOCUMENT REQUISITION NOTICE
Date: ${dateStr}
Reference: ${selectedWork.work_code}
Client: ${clientName}
Service: ${selectedWork.service_id.replace(/-/g, " ").toUpperCase()}

Dear Sir/Madam,

To facilitate the timely filing and regulatory compliance for ${clientName} with the Registrar of Joint Stock Companies and Firms (RJSC), we kindly request the following outstanding statutory documents:

${missingLive.map((m, idx) => `${idx + 1}. ${m.item_text} ${m.source_reference ? `[Basis: ${m.source_reference}]` : ""}`).join("\n")}

Please provide signed copies or verified digital scans at your earliest convenience.

Sincerely,
ZA Corporate Desk
Zahir & Associate (Chartered Accountants)`;
  }, [selectedWork, clientMap, missingLive]);

  const handleCopyRequisition = () => {
    navigator.clipboard.writeText(requisitionText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      <PageHeader
        icon={ClipboardList}
        title="Checklist & Requisition Desk"
        subtitle="Manage required filing documents and generate formal client document requisitions."
      />

      {/* Mode Selector */}
      <div className="flex gap-2 border-b border-[#d9e3df] pb-4">
        <button
          onClick={() => setMode("work")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
            mode === "work"
              ? "bg-[#447a5d] text-white shadow-sm"
              : "bg-white text-[#6c7671] border border-[#d9e3df] hover:text-[#181818]"
          }`}
        >
          <FolderOpen size={16} /> Active Work Order Requisitions
        </button>
        <button
          onClick={() => setMode("template")}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-2 ${
            mode === "template"
              ? "bg-[#447a5d] text-white shadow-sm"
              : "bg-white text-[#6c7671] border border-[#d9e3df] hover:text-[#181818]"
          }`}
        >
          <FileText size={16} /> RJSC Statutory Service Rules
        </button>
      </div>

      {mode === "work" ? (
        <div className="space-y-6">
          {/* Work Selector Bar */}
          <ContentCard className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full sm:max-w-md">
                <label className="text-xs font-black uppercase text-[#6c7671] mb-1 block">
                  Select Work Order
                </label>
                <select
                  value={selectedWorkId}
                  onChange={(e) => setSelectedWorkId(e.target.value)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                >
                  {works.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.work_code} — {clientMap[w.client_id] || "Client"} ({w.service_id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedWork && (
                <div className="flex items-center gap-3">
                  <Link
                    href={`/work-register/${selectedWork.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3.5 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
                  >
                    <ExternalLink size={14} /> Open Full Work Workspace
                  </Link>
                  <button
                    onClick={handleCopyRequisition}
                    disabled={missingLive.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? "Requisition Copied!" : `Copy Requisition (${missingLive.length} Pending)`}
                  </button>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Requirements" value={totalLive} icon={ClipboardList} color="sage" />
            <StatCard title="Received / Verified" value={completedLive} icon={CheckCircle2} color="aqua" />
            <StatCard title="Pending / Missing" value={missingLive.length} icon={AlertTriangle} color="coral" />
            <StatCard title="Work Status" value={selectedWork?.status || "-"} icon={FolderOpen} color="yellow" />
          </div>

          {/* Checklist Items Table */}
          <ContentCard>
            {loading ? (
              <LoadingState />
            ) : liveChecklist.length === 0 ? (
              <div className="p-8 text-center text-[#6c7671]">
                <ClipboardList className="mx-auto h-10 w-10 text-[#6c7671] mb-2" />
                <p className="font-bold">No checklist requirements attached to this work order yet.</p>
                {selectedWork && (
                  <Link
                    href={`/work-register/${selectedWork.id}`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50]"
                  >
                    Open Work to Sync Requirements
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th className="w-12">Done</Th>
                    <Th>Required Document / Evidence</Th>
                    <Th>Statutory Basis</Th>
                    <Th>Current Status</Th>
                    <Th>Completed By</Th>
                  </tr>
                </thead>
                <tbody>
                  {liveChecklist.map((item) => {
                    const isDone = item.status === "COMPLETED" || item.status === "VERIFIED" || item.status === "RECEIVED";
                    return (
                      <tr key={item.id} className={isDone ? "bg-[#f8fdfa]" : ""}>
                        <Td>
                          <button
                            onClick={() => handleToggle(item)}
                            className={`grid h-6 w-6 place-items-center rounded-lg border transition ${
                              isDone
                                ? "border-[#447a5d] bg-[#447a5d] text-white"
                                : "border-[#d9e3df] bg-white text-transparent hover:border-[#447a5d]"
                            }`}
                          >
                            <Check size={14} />
                          </button>
                        </Td>
                        <Td>
                          <div className={`font-bold text-sm ${isDone ? "text-[#234a32]" : "text-[#181818]"}`}>
                            {item.item_text}
                          </div>
                          {item.item_code && (
                            <span className="font-mono text-[10px] text-[#6c7671] font-semibold">{item.item_code}</span>
                          )}
                        </Td>
                        <Td className="text-xs text-[#6c7671]">
                          {item.source_reference || "Statutory Practice"}
                        </Td>
                        <Td>
                          <StatusBadge status={item.status} />
                        </Td>
                        <Td className="text-xs text-[#6c7671]">
                          {item.completed_by || "-"}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </ContentCard>
        </div>
      ) : (
        <div className="space-y-6">
          <ContentCard className="p-6">
            <h2 className="text-base font-black text-[#181818] mb-4">RJSC Service Document Requirements Matrix</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-xs font-black uppercase text-[#6c7671] mb-1 block">Service Name</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.serviceName} ({s.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black uppercase text-[#6c7671] mb-1 block">Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value as EntityType)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                >
                  {Object.values(EntityType).map((v) => (
                    <option key={v} value={v}>{v.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {templateDocs.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6c7671] font-bold">No standard document requirements defined for this service and entity.</div>
              ) : (
                templateDocs.map((doc) => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl border border-[#ece5d9] bg-[#fffdf7]">
                    <div>
                      <div className="font-bold text-sm text-[#181818]">{doc.documentName}</div>
                      <div className="text-xs text-[#6c7671] mt-0.5">Reference: {doc.sourceReference}</div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        doc.required ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {doc.required ? "Mandatory" : "Conditional"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ContentCard>
        </div>
      )}
    </div>
  );
}
