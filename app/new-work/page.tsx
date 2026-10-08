"use client";
import { useMemo, useState } from "react";
import { PageTitle, Card, fieldClass, PrimaryButton, SectionTitle, Badge } from "@/components/UI";
import { clients } from "@/lib/mock";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getRequiredDocuments, getLegalReferences } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { BriefcaseBusiness, ClipboardCheck, FileText, ReceiptText, Sparkles, AlertTriangle } from "lucide-react";

export default function Page(){
 const [client, setClient] = useState(clients[0].name);
 const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
 const [serviceId, setServiceId] = useState(services[4].id);
 const [fee, setFee] = useState(5000); 
 const [other, setOther] = useState(300);
 const [securedAmount, setSecuredAmount] = useState(0);

 const selectedService = services.find(x => x.id === serviceId);
 const availableEntities = selectedService?.entityTypes || [];
 const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

 const feeResult = useMemo(() => calculateRJSCFee({
   serviceId,
   entityType: currentEntity,
   securedAmount: securedAmount
 }), [serviceId, currentEntity, securedAmount]);

 const docs = getRequiredDocuments(serviceId, currentEntity);
 const rjscFee = feeResult ? feeResult.totalFee : 0;
 const refs = getLegalReferences(serviceId, currentEntity);
 const needsReview = selectedService?.sourceStatus === 'NEEDS_SOURCE_REVIEW' || docs.length === 0;

 return <>
  <PageTitle title="Create New Work" desc="Create an RJSC job and prepare its workflow automatically."/>
  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
   <Card className="p-0 overflow-hidden">
    <div className="border-b border-slate-100 bg-[#fbfcfc] px-5 py-4">
      <SectionTitle title="Work Information" desc="Choose the client and service. The automation preview updates instantly."/>
    </div>
    <div className="p-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Client<select value={client} onChange={e=>setClient(e.target.value)} className={fieldClass}>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Entity Type<select value={currentEntity} onChange={e=>setEntityType(e.target.value as EntityType)} className={fieldClass}>{availableEntities.map(e=><option key={e} value={e}>{e.replace('_', ' ')}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">RJSC Service<select value={serviceId} onChange={e=>setServiceId(e.target.value)} className={fieldClass}>{services.map(x=><option key={x.id} value={x.id}>{x.serviceName}</option>)}</select></label>
      {serviceId === 'mortgage-charge-registration' && (
        <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Secured Amount<input type="number" value={securedAmount} onChange={e=>setSecuredAmount(Number(e.target.value))} className={fieldClass}/></label>
      )}
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Period / Year<input defaultValue="FY 2025-26" className={fieldClass}/></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Assigned To<select className={fieldClass}><option>Noyon</option><option>Hemadry Roy</option><option>Md. Bayezid</option></select></label>
      <div className="hidden md:block"></div>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Professional Fee<input type="number" value={fee} onChange={e=>setFee(Number(e.target.value))} className={fieldClass}/></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Other Cost<input type="number" value={other} onChange={e=>setOther(Number(e.target.value))} className={fieldClass}/></label>
    </div>
    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5"><div className="text-xs text-slate-400">Draft mode • No backend write yet</div><PrimaryButton>Create Work</PrimaryButton></div>
   </div></Card>

   <div className="space-y-5">
    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle title="Automation Preview" desc="Generated from selected service"/>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Sparkles size={18}/></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <ReceiptText size={16} className={feeResult ? "text-emerald-700" : "text-amber-500"}/>
        <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Govt / RJSC Fee</div>
        {feeResult ? (
          <div className="mt-1 text-lg font-bold">৳ {rjscFee.toLocaleString()}</div>
        ) : (
          <div className="mt-1 text-xs font-bold text-amber-600">Needs Source Review</div>
        )}
      </div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
        <BriefcaseBusiness size={16} className="text-emerald-700"/>
        <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Bill</div>
        {feeResult ? (
          <div className="mt-1 text-lg font-bold">৳ {(fee + other + rjscFee).toLocaleString()}</div>
        ) : (
          <div className="mt-1 text-xs font-bold text-amber-600">Incomplete — Government Fee Pending</div>
        )}
      </div>
      <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Next Action</div>
        <div className="mt-1.5 text-sm font-medium leading-6 text-slate-700">
          {selectedService?.nextAction || "Needs Source Review"}
        </div>
      </div>
    </div></Card>

    <Card>
      <div className="flex items-center justify-between">
        <SectionTitle title="Checklist / Requisition" desc={`${docs.length} requirements detected`}/>
        {needsReview ? <Badge tone="warning">Needs Source Review</Badge> : <Badge tone="info">Auto generated</Badge>}
      </div>
      <div className="mt-4">
        {docs.length > 0 ? (
          <div className="space-y-2">
            {docs.map((d,i)=> (
              <label key={d.id} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-[#fbfcfc] p-3 text-sm transition hover:border-emerald-200 hover:bg-emerald-50/30">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700"/>
                <div className="flex-1">
                  <div className="font-medium text-slate-700">{d.documentName}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">Requirement {i+1} • {d.sourceReference}</div>
                </div>
                {i===0?<ClipboardCheck size={16} className="mt-1 text-slate-300"/>:<FileText size={16} className="mt-1 text-slate-300"/>}
              </label>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-amber-800 flex items-center gap-3">
            <AlertTriangle size={18} />
            <div className="text-sm font-semibold">No verified document rule loaded yet.</div>
          </div>
        )}
      </div>
      
      {refs.length > 0 && (
        <div className="mt-5 border-t pt-4">
          <div className="text-xs font-bold text-slate-400 uppercase mb-2">Legal References</div>
          <ul className="text-xs text-slate-600 space-y-1">
            {refs.map(r => (
              <li key={r.id}>
                <strong>{r.lawName}</strong> - {r.section} ({r.effectiveDate || 'Active'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
   </div>
  </div>
 </>
}
