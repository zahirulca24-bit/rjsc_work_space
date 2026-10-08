"use client";
import { useMemo, useState, useEffect } from "react";
import { PageTitle, Card, fieldClass, PrimaryButton, SectionTitle, Badge } from "@/components/UI";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getRequiredDocuments, getLegalReferences } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { BriefcaseBusiness, ClipboardCheck, FileText, ReceiptText, Sparkles, AlertTriangle } from "lucide-react";
import { getClients } from "@/lib/api/clients";
import { createWork } from "@/lib/api/works";
import { useRouter } from "next/navigation";

export default function Page(){
 const [clients, setClients] = useState<any[]>([]);
 const [clientId, setClientId] = useState("");
 const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
 const [serviceId, setServiceId] = useState(services[4].id);
 const [fee, setFee] = useState(5000);
 const [other, setOther] = useState(300);
 const [securedAmount, setSecuredAmount] = useState(0);
 const router = useRouter();
 const [isCreating, setIsCreating] = useState(false);

 useEffect(() => {
   getClients().then(data => {
     setClients(data);
     if (data.length > 0) {
       setClientId(data[0].id);
       setEntityType(data[0].entity_type);
     }
   });
 }, []);

 const selectedService = services.find(x => x.id === serviceId);
 const availableEntities = selectedService?.entityTypes || [];
 const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

 const feeResult = useMemo(() => calculateRJSCFee({
   serviceId,
   entityType: currentEntity,
   securedAmount: securedAmount
 }), [serviceId, currentEntity, securedAmount]);

 const docs = getRequiredDocuments(serviceId, currentEntity);
 const rjscFee = feeResult ? feeResult.totalFee : null;

 const handleSubmit = async (e: React.FormEvent) => {
   e.preventDefault();
   setIsCreating(true);
   try {
     const payload = {
       client_id: clientId,
       service_id: serviceId,
       entity_type: currentEntity,
       status: "Pending Check",
       professional_fee: fee,
       government_fee: rjscFee,
       other_cost: other,
       rule_snapshot: {
         service_id: serviceId,
         entity_type: currentEntity,
         fee_rule_id: feeResult?.ruleId,
         fee_source_reference: feeResult?.sourceReference,
         fee_breakdown_snapshot: feeResult?.breakdown
       }
     };
     await createWork(payload);
     router.push("/work-register");
   } catch (err) {
     alert("Error creating work.");
   } finally {
     setIsCreating(false);
   }
 };

 return (
   <form className="max-w-4xl mx-auto space-y-6" onSubmit={handleSubmit}>
     <PageTitle title="Start New Work" desc="Calculate fees, checklist, and rules automatically." />

     <Card className="p-6">
      <SectionTitle title="Client & Service" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Client</label>
          <select value={clientId} onChange={e => {
            const cl = clients.find(c => c.id === e.target.value);
            setClientId(e.target.value);
            if (cl) setEntityType(cl.entity_type);
          }} className={fieldClass}>
             {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type Override</label>
          <select value={currentEntity} onChange={e=>setEntityType(e.target.value as EntityType)} className={fieldClass}>
             {availableEntities.map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Service Type</label>
          <select value={serviceId} onChange={e=>setServiceId(e.target.value)} className={fieldClass}>
             {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
          </select>
        </div>
        {selectedService?.category === 'MORTGAGE' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Secured Amount (for Mortgage fee)</label>
            <input type="number" value={securedAmount} onChange={e=>setSecuredAmount(Number(e.target.value))} className={fieldClass}/>
          </div>
        )}
      </div>
     </Card>

     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <Card className="p-6">
        <SectionTitle title="Documentation Check" />
        <div className="mt-4 space-y-2">
          {docs.length === 0 ? <p className="text-slate-500 text-sm italic">No specific documents required.</p> :
            docs.map((d, i) => (
             <div key={i} className="flex gap-2 text-sm bg-slate-50 p-2 rounded">
               <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5"/>
               <span>{typeof d === "string" ? d : d.documentName || JSON.stringify(d)}</span>
             </div>
            ))
          }
        </div>
       </Card>
       <Card className="p-6">
         <SectionTitle title="Cost Structure" />
         <div className="mt-4 space-y-4">
           <div className="flex justify-between items-center bg-slate-50 p-3 rounded">
             <div className="text-sm">
               <div className="font-semibold text-slate-800">Govt. Fee (Rule {feeResult?.ruleId || 'N/A'})</div>
               <div className="text-slate-500 text-xs">Based on actual RJSC logic</div>
             </div>
             <div className="font-bold text-slate-800 font-mono text-lg">
               {rjscFee !== null ? `৳ ${rjscFee.toLocaleString()}` : <span className="text-amber-600 text-sm">Unknown / Manual</span>}
             </div>
           </div>

           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Professional Fee</label>
            <input type="number" value={fee} onChange={e=>setFee(Number(e.target.value))} className={fieldClass}/>
           </div>
           <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Other/Misc Cost</label>
            <input type="number" value={other} onChange={e=>setOther(Number(e.target.value))} className={fieldClass}/>
           </div>

           <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
             <div className="font-bold text-slate-900">Total Billed</div>
             <div className="font-bold text-emerald-600 text-xl font-mono">
               {rjscFee !== null ? `৳ ${(rjscFee + fee + other).toLocaleString()}` : <span className="text-amber-600 text-sm">Unknown Govt Fee</span>}
             </div>
           </div>
         </div>
       </Card>
     </div>

     <div className="flex justify-end pt-4">
       <PrimaryButton  disabled={isCreating}>
         {isCreating ? "Creating..." : "Save Work & Snapshot Rules"}
       </PrimaryButton>
     </div>
   </form>
 )
}
