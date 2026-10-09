"use client";

import { useState, useMemo } from "react";
import { PageTitle, Card, Badge } from "@/components/UI";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getFeeRule } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users, Calculator, ClipboardList } from "lucide-react";

export default function Page() {
  const [serviceId, setServiceId] = useState(services[4].id); // Annual Return
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [count, setCount] = useState(1);
  const [late, setLate] = useState(0);
  const [authCapital, setAuthCapital] = useState(0);
  const [certifiedType, setCertifiedType] = useState<'memorandum' | 'articles' | 'other' | 'incorporation' | 'commencement' | 'any' | 'comparison' | 'inspection'>('any');


  const [securedAmount, setSecuredAmount] = useState(0);
  const [yearsLate, setYearsLate] = useState(0);
  const feeResult = useMemo(() => {
    return calculateRJSCFee({ serviceId, entityType, securedAmount, yearsLate });
  }, [serviceId, entityType, securedAmount, yearsLate]);
const selectedService = services.find(s => s.id === serviceId);
  const availableEntities = selectedService?.entityTypes || [];

  // Ensure selected entity is valid for the service
  const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

  const feeRule = getFeeRule(serviceId, currentEntity);
  const isPerDoc = feeRule?.calculationType === 'PER_DOCUMENT' || feeRule?.calculationType === 'PER_FORM' || feeRule?.calculationType === 'FIXED';
  const hasLate = feeRule?.lateFeeRules;
  const isComplexReg = feeRule?.calculationType === 'COMPLEX_COMPANY_REGISTRATION';
  const isCertified = feeRule?.calculationType === 'CERTIFIED_COPY';

  const result = useMemo(() => {
    return calculateRJSCFee({
      serviceId,
      entityType: currentEntity,
      documentCount: count,
      authorizedCapital: authCapital,
      yearsLate: late,
      certifiedCopyType: certifiedType
    });
  }, [serviceId, currentEntity, count, authCapital, late, certifiedType]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={Calculator}
        title="Fee Calculator"
        subtitle="Estimate RJSC fees before client approval."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContentCard className="p-6">
          <h2 className="text-lg font-black text-[#181818] mb-4">Calculation Inputs</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Entity Type</label>
              <select value={entityType} onChange={e=>setEntityType(e.target.value as EntityType)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
                {Object.values(EntityType).map(v => <option key={v} value={v}>{v.replace('_',' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Service</label>
              <select value={serviceId} onChange={e=>setServiceId(e.target.value)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
                {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
              </select>
            </div>
            {selectedService?.category === 'MORTGAGE' && (
              <div>
                <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Secured Amount</label>
                <input type="number" value={securedAmount} onChange={e=>setSecuredAmount(Number(e.target.value))} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white" />
              </div>
            )}
            {selectedService?.id === 'RETURN_FILING' && (
              <div>
                <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Years Late</label>
                <input type="number" value={yearsLate} onChange={e=>setYearsLate(Number(e.target.value))} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white" />
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="p-6">
          <h2 className="text-lg font-black text-[#181818] mb-4">Calculation Results</h2>
          {feeResult ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-[#e7f5ec] border border-[#b8dfc6] p-4 rounded-xl">
                <div className="text-sm">
                  <div className="font-black text-[#234a32]">Total Govt Fee</div>
                  <div className="text-[#44765b] text-xs font-bold mt-0.5">Based on Rule {feeResult.ruleId}</div>
                </div>
                <div className="font-black text-[#181818] font-mono text-xl">
                  ৳³ {feeResult.totalFee.toLocaleString()}
                </div>
              </div>
              <div className="space-y-2 mt-4 text-sm font-bold text-[#4b4d47]">
                 <p>Source: {feeResult.sourceReference}</p>
              </div>
            </div>
          ) : (
            <EmptyState title="Manual Review Needed" message="No automated rule exists for this combination. Fallback to manual source review." icon={AlertTriangle} />
          )}
        </ContentCard>
      </div>
    </div>
  );
}
