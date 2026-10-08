"use client";

import { useState, useMemo } from "react";
import { PageTitle, Card, Badge } from "@/components/UI";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getFeeRule } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";

export default function Page() {
  const [serviceId, setServiceId] = useState(services[4].id); // Annual Return
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [count, setCount] = useState(1);
  const [late, setLate] = useState(0);
  const [authCapital, setAuthCapital] = useState(0);
  const [certifiedType, setCertifiedType] = useState<'memorandum' | 'articles' | 'other' | 'incorporation' | 'commencement' | 'any' | 'comparison' | 'inspection'>('any');

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
    <>
      <PageTitle title="Fee Calculator" desc="Frontend estimate using RJSC Rule Master." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="grid gap-4">
            <label className="text-sm font-semibold">Service
              <select value={serviceId} onChange={e => setServiceId(e.target.value)} className="mt-2 w-full rounded-xl border p-3 font-normal">
                {services.map(x => <option key={x.id} value={x.id}>{x.serviceName}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Entity Type
              <select value={currentEntity} onChange={e => setEntityType(e.target.value as EntityType)} className="mt-2 w-full rounded-xl border p-3 font-normal">
                {availableEntities.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
              </select>
            </label>

            {isPerDoc && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">Document / Form Count
                  <input type="number" min={1} value={count} onChange={e => setCount(Number(e.target.value))} className="mt-2 w-full rounded-xl border p-3 font-normal" />
                </label>
                {hasLate && (
                  <label className="text-sm font-semibold">Years Late
                    <input type="number" min={0} value={late} onChange={e => setLate(Number(e.target.value))} className="mt-2 w-full rounded-xl border p-3 font-normal" />
                  </label>
                )}
              </div>
            )}

            {isComplexReg && (
              <label className="text-sm font-semibold">Authorized Capital (Tk)
                <input type="number" min={0} step={100000} value={authCapital} onChange={e => setAuthCapital(Number(e.target.value))} className="mt-2 w-full rounded-xl border p-3 font-normal" />
              </label>
            )}

            {isCertified && (
              <label className="text-sm font-semibold">Copy Type
                <select value={certifiedType} onChange={e => setCertifiedType(e.target.value as any)} className="mt-2 w-full rounded-xl border p-3 font-normal">
                  <option value="incorporation">Incorporation Certificate</option>
                  <option value="memorandum">Memorandum</option>
                  <option value="articles">Articles</option>
                  <option value="any">Copy of Any Document</option>
                  <option value="inspection">Record Inspection</option>
                </select>
              </label>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-xs uppercase text-slate-500">Estimated RJSC Fee</div>
          
          {result ? (
            <>
              <div className="mt-3 text-4xl font-bold">৳ {result.totalFee.toLocaleString()}</div>
              
              {Object.keys(result.breakdown).length > 0 && (
                <div className="mt-5 rounded-lg border bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500 mb-3">Calculation Breakdown</div>
                  <div className="space-y-2 text-sm">
                    {Object.entries(result.breakdown).map(([label, amount]) => (
                      <div key={label} className="flex justify-between border-b border-slate-200 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-medium">৳ {amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2 border-t pt-4 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Source Reference:</span>
                  <span className="font-medium text-slate-700">{result.sourceReference}</span>
                </div>
                {feeRule?.effectiveFrom && (
                  <div className="flex justify-between">
                    <span>Effective From:</span>
                    <span className="font-medium text-slate-700">{feeRule.effectiveFrom}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge>Active</Badge>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-xl bg-amber-50 p-5 text-amber-800 border border-amber-200">
              <div className="font-bold mb-1">Fee rule unavailable / Needs Source Review</div>
              <p className="text-sm">The calculation rule for this specific service and entity combination has not been structurally verified and loaded into the Rule Master.</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
