"use client";

import { useMemo, useState, useEffect } from "react";
import { services } from "@/lib/rjsc/services";
import { getRequiredDocuments } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users, Calculator, ClipboardList } from "lucide-react";

type Status = "Missing" | "Received" | "N/A";

type DocItem = {
  id: string;
  name: string;
  status: Status;
};

export default function ChecklistRequisitionPage() {
  const [serviceId, setServiceId] = useState(services[11].id); // Society Reg
  const [entityType, setEntityType] = useState<EntityType>(EntityType.SOCIETY);

  const [docs, setDocs] = useState<DocItem[]>([]);

  const selectedService = services.find(x => x.id === serviceId);
  const availableEntities = selectedService?.entityTypes || [];
  const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

  useEffect(() => {
    const required = getRequiredDocuments(serviceId, currentEntity);
    setDocs(required.map(r => ({
      id: r.id,
      name: r.documentName,
      status: "Missing" as Status
    })));
    if (entityType !== currentEntity) setEntityType(currentEntity);
  }, [serviceId, currentEntity]); // intentional minimal dependency

  const received = docs.filter((x) => x.status === "Received").length;
  const applicable = docs.filter((x) => x.status !== "N/A").length;

  const progress = useMemo(
    () => (applicable ? Math.round((received / applicable) * 100) : 100),
    [received, applicable]
  );

  const missing = docs.filter((x) => x.status === "Missing");

  function updateStatus(id: string, status: Status) {
    setDocs((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status } : x))
    );
  }

  const hasDocs = docs.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ClipboardList}
        title="Checklist / Requisition"
        subtitle="Track document completion status for works."
      />
      <ContentCard className="p-6">
        <h2 className="text-lg font-black text-[#181818] mb-4">Requirements Tracker</h2>
        <div className="flex gap-4 items-center mb-6">
          <div className="flex-1">
            <select value={serviceId} onChange={e=>setServiceId(e.target.value)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
              {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <select value={entityType} onChange={e=>setEntityType(e.target.value as EntityType)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
              {Object.values(EntityType).map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="space-y-3">
          {docs.length === 0 ? <p className="text-[#6c7671] font-bold italic">No documents required.</p> : docs.map(d => (
            <div key={d.id} className="flex justify-between items-center p-4 bg-[#fffdf7] border border-[#ece5d9] rounded-xl">
              <span className="font-bold text-[#181818]">{d.name}</span>
              <div className="flex gap-2">
                <StatusBadge status={d.status} />
              </div>
            </div>
          ))}
        </div>
      </ContentCard>
    </div>
  );
}
