"use client";

import { useMemo, useState } from "react";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getLegalReferences, getFeeRule } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { PageHeader, ContentCard, StatCard, StatusBadge, Table, Th, Td } from "@/components/SharedUI";
import { ReceiptText, CheckCircle2, AlertTriangle, Building2, Calculator } from "lucide-react";

const bdt = (value: number) => "৳ " + value.toLocaleString("en-BD", { maximumFractionDigits: 2 });
const inputClass = "w-full rounded-xl border border-[#d9e3df] bg-white px-4 py-2.5 text-sm text-[#294f48] outline-none focus:ring-2 focus:ring-[#79b993]";
const certifiedTypes = [
  { value: "any", label: "Copy of any document" },
  { value: "memorandum", label: "Memorandum" },
  { value: "articles", label: "Articles" },
  { value: "other", label: "Other document" },
  { value: "incorporation", label: "Incorporation certificate" },
  { value: "commencement", label: "Commencement certificate" },
  { value: "comparison", label: "Comparison with original" },
  { value: "inspection", label: "Record inspection" }
] as const;

type CertifiedType = typeof certifiedTypes[number]["value"];

export default function Page() {
  const [serviceId, setServiceId] = useState(services[4].id);
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [documentCount, setDocumentCount] = useState(1);
  const [yearsLate, setYearsLate] = useState(0);
  const [authorizedCapital, setAuthorizedCapital] = useState(0);
  const [securedAmount, setSecuredAmount] = useState(0);
  const [certifiedCopyType, setCertifiedCopyType] = useState<CertifiedType>("any");
  const [professionalFee, setProfessionalFee] = useState(0);
  const [otherCost, setOtherCost] = useState(0);

  const selectedService = services.find(s => s.id === serviceId) || services[0];
  const supportedEntities = selectedService.entityTypes;
  const actualEntity = supportedEntities.includes(entityType) ? entityType : supportedEntities[0];
  const rule = getFeeRule(serviceId, actualEntity);
  const calculation = useMemo(() => calculateRJSCFee({
    serviceId,
    entityType: actualEntity,
    documentCount,
    yearsLate,
    authorizedCapital,
    securedAmount,
    certifiedCopyType
  }), [serviceId, actualEntity, documentCount, yearsLate, authorizedCapital, securedAmount, certifiedCopyType]);

  const needsReview = services.filter(s => s.sourceStatus === "NEEDS_SOURCE_REVIEW").length;
  const verified = services.length - needsReview;
  const configured = services.filter(s => s.entityTypes.some(e => getFeeRule(s.id, e) !== null)).length;
  const governmentFee = calculation?.totalFee ?? null;
  const grandTotal = governmentFee === null ? null : governmentFee + professionalFee + otherCost;
  const inputNumber = (value: string) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader icon={ReceiptText} title="Services & Fees" subtitle="RJSC service list, government fee calculator and client estimate — all in one place. Currency: BDT (৳)." />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Services" value={services.length} icon={ReceiptText} color="aqua" />
        <StatCard title="Configured" value={configured} icon={Building2} color="yellow" />
        <StatCard title="Needs Review" value={needsReview} icon={AlertTriangle} color="coral" />
        <StatCard title="Verified Sources" value={verified} icon={CheckCircle2} color="sage" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2" id="calculator">
        <ContentCard className="p-5 md:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-[#447a5d]" />
            <h2 className="text-lg font-black text-[#181818]">Calculate Service Fees</h2>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-[#44765b]">Service
              <select className={inputClass} value={serviceId} onChange={e => {
                const next = e.target.value;
                const nextService = services.find(s => s.id === next);
                setServiceId(next);
                if (nextService && !nextService.entityTypes.includes(entityType)) setEntityType(nextService.entityTypes[0]);
              }}>
                {services.map(s => <option key={s.id} value={s.id}>{s.serviceName}</option>)}
              </select>
            </label>
            <label className="block text-sm font-bold text-[#44765b]">Entity Type
              <select className={inputClass} value={actualEntity} onChange={e => setEntityType(e.target.value as EntityType)}>
                {supportedEntities.map(e => <option key={e} value={e}>{e.replaceAll("_", " ")}</option>)}
              </select>
            </label>
            {(rule?.calculationType === "PER_DOCUMENT" || rule?.calculationType === "PER_FORM" || rule?.perDocumentFee) && (
              <label className="block text-sm font-bold text-[#44765b]">Number of documents / forms
                <input className={inputClass} type="number" min={1} step={1} value={documentCount} onChange={e => setDocumentCount(Math.max(1, Math.floor(inputNumber(e.target.value))))} />
              </label>
            )}
            {rule?.lateFeeRules && (
              <label className="block text-sm font-bold text-[#44765b]">Years late
                <input className={inputClass} type="number" min={0} step={1} value={yearsLate} onChange={e => setYearsLate(Math.floor(inputNumber(e.target.value)))} />
              </label>
            )}
            {rule?.calculationType === "COMPLEX_COMPANY_REGISTRATION" && (
              <label className="block text-sm font-bold text-[#44765b]">Authorized Capital (৳)
                <input className={inputClass} type="number" min={0} value={authorizedCapital} onChange={e => setAuthorizedCapital(inputNumber(e.target.value))} />
              </label>
            )}
            {rule?.calculationType === "MORTGAGE_SLAB" && (
              <label className="block text-sm font-bold text-[#44765b]">Secured Amount (৳)
                <input className={inputClass} type="number" min={0} value={securedAmount} onChange={e => setSecuredAmount(inputNumber(e.target.value))} />
              </label>
            )}
            {rule?.calculationType === "CERTIFIED_COPY" && (
              <label className="block text-sm font-bold text-[#44765b]">Certified Copy Type
                <select className={inputClass} value={certifiedCopyType} onChange={e => setCertifiedCopyType(e.target.value as CertifiedType)}>
                  {certifiedTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold text-[#44765b]">Professional Fee (৳)
                <input className={inputClass} type="number" min={0} value={professionalFee} onChange={e => setProfessionalFee(inputNumber(e.target.value))} />
              </label>
              <label className="block text-sm font-bold text-[#44765b]">Other / Misc Cost (৳)
                <input className={inputClass} type="number" min={0} value={otherCost} onChange={e => setOtherCost(inputNumber(e.target.value))} />
              </label>
            </div>
            <p className="text-xs leading-relaxed text-[#6c7671]">This is a calculation preview only. It does not save a work, create an invoice or update accounting records.</p>
          </div>
        </ContentCard>

        <ContentCard className="p-5 md:p-6">
          <h2 className="mb-4 text-lg font-black text-[#181818]">Fee Estimate (BDT)</h2>
          {selectedService.sourceStatus === "NEEDS_SOURCE_REVIEW" && (
            <div className="mb-4 rounded-xl border border-[#f0d7d0] bg-[#fce9e4] p-3 text-xs font-semibold text-[#9e493a]">
              Source review pending for this service. Confirm government charges using the current official RJSC schedule before quoting or filing.
            </div>
          )}
          {calculation ? (
            <>
              <div className="rounded-xl border border-[#b8dfc6] bg-[#e7f5ec] p-4">
                <div className="flex items-center justify-between gap-3"><span className="font-bold text-[#234a32]">Government Fee</span><span className="text-xl font-black text-[#234a32]">{bdt(governmentFee ?? 0)}</span></div>
                <p className="mt-1 text-xs text-[#44765b]">Fee Rule: {calculation.ruleId}</p>
              </div>
              <div className="mt-4 space-y-2">
                {Object.entries(calculation.breakdown).map(([label, amount]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-[#ece5d9] pb-2 text-sm text-[#4b4d47]"><span>{label}</span><strong>{bdt(amount)}</strong></div>
                ))}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#f0d7d0] bg-[#fce9e4] p-4 text-sm text-[#a03c2a]">
              Government fee cannot be calculated for this combination. Manual source review is required; no government fee has been assumed.
            </div>
          )}
          <div className="mt-4 space-y-3 border-t border-[#ded7c8] pt-4 text-sm">
            <div className="flex justify-between gap-3"><span>Professional Fee</span><strong>{bdt(professionalFee)}</strong></div>
            <div className="flex justify-between gap-3"><span>Other / Misc Cost</span><strong>{bdt(otherCost)}</strong></div>
            <div className="flex justify-between gap-3 rounded-xl bg-[#dff1e7] p-4 text-[#294f48]"><span className="font-black">Grand Total</span><strong className="text-xl">{grandTotal === null ? "Manual review" : bdt(grandTotal)}</strong></div>
            {calculation && <p className="break-words text-xs text-[#6c7671]">Government fee source: {calculation.sourceReference}</p>}
          </div>
        </ContentCard>
      </div>

      <ContentCard>
        <div className="border-b border-[#ece5d9] p-5"><h2 className="text-lg font-black text-[#181818]">RJSC Service Master & Source References</h2><p className="mt-1 text-xs text-[#6c7671]">Select any service above to calculate its supported government fee.</p></div>
        <Table>
          <thead><tr><Th>Service & Category</Th><Th>Entity Types</Th><Th>Fee Rule Status</Th><Th>Requirements</Th><Th>Source & References</Th></tr></thead>
          <tbody>
            {services.map(s => {
              const isNeedsReview = s.sourceStatus === "NEEDS_SOURCE_REVIEW";
              const refs = getLegalReferences(s.id, s.entityTypes[0] || EntityType.PRIVATE_COMPANY);
              const hasFeeRule = s.entityTypes.some(e => getFeeRule(s.id, e) !== null);
              return (
                <tr key={s.id}>
                  <Td><div className="font-black text-[#181818]">{s.serviceName}</div><div className="mt-2"><StatusBadge status={s.category} /></div></Td>
                  <Td><div className="flex flex-wrap gap-2">{s.entityTypes.map(e => <span key={e} className="rounded-lg bg-[#e8f7f9] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#2c747d]">{e.replaceAll("_", " ")}</span>)}</div></Td>
                  <Td>{hasFeeRule ? <span className="text-sm font-bold text-[#447a5d]">Configured</span> : <span className="text-sm font-bold text-[#a03c2a]">Needs source review</span>}</Td>
                  <Td className="text-sm"><div>Docs: {s.requiredDocuments.length}</div><div>Checklist: {s.checklist.length}</div></Td>
                  <Td className="min-w-[240px]"><StatusBadge status={isNeedsReview ? "Needs Review" : "Verified"} />{refs.map(r => <div key={r.id} className="mt-2 text-xs"><strong>{r.lawName}</strong> — {r.section}</div>)}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </ContentCard>
    </div>
  );
}
