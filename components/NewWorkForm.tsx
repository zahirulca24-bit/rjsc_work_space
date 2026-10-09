import { useMemo, useState, useEffect } from "react";
import { BriefcaseBusiness, FileText, CircleDollarSign } from "lucide-react";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getRequiredDocuments } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { getClients } from "@/lib/api/clients";
import { createWork } from "@/lib/api/works";
import { ContentCard } from "@/components/SharedUI";

interface NewWorkFormProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export function NewWorkForm({ onSuccess, onCancel }: NewWorkFormProps) {
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState("");
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [serviceId, setServiceId] = useState(services[4].id);
  const [fee, setFee] = useState(5000);
  const [other, setOther] = useState(300);
  const [securedAmount, setSecuredAmount] = useState(0);
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
      onSuccess();
    } catch (err) {
      alert("Error creating work.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ContentCard className="p-6">
       <h2 className="text-lg font-black text-[#181818] mb-4">Client & Service</h2>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
           <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Select Client</label>
           <select value={clientId} onChange={e => {
             const cl = clients.find(c => c.id === e.target.value);
             setClientId(e.target.value);
             if (cl) setEntityType(cl.entity_type);
           }} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
              {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
           </select>
         </div>
         <div>
           <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Entity Type Override</label>
           <select value={currentEntity} onChange={e=>setEntityType(e.target.value as EntityType)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
              {availableEntities.map(x => <option key={x} value={x}>{x.replace('_',' ')}</option>)}
           </select>
         </div>
         <div className="md:col-span-2">
           <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Service Type</label>
           <select value={serviceId} onChange={e=>setServiceId(e.target.value)} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white">
              {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
           </select>
         </div>
         {selectedService?.category === 'MORTGAGE' && (
           <div className="md:col-span-2">
             <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Secured Amount (for Mortgage fee)</label>
             <input type="number" value={securedAmount} onChange={e=>setSecuredAmount(Number(e.target.value))} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white"/>
           </div>
         )}
       </div>
      </ContentCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ContentCard className="p-6 flex flex-col">
         <h2 className="text-lg font-black text-[#181818] mb-4">Documentation Check</h2>
         <div className="flex-1 space-y-2 bg-[#fffdf7] p-4 rounded-xl border border-[#ece5d9]">
           {docs.length === 0 ? <p className="text-[#6c7671] text-sm font-bold italic">No specific documents required.</p> :
             docs.map((d, i) => (
              <div key={i} className="flex gap-3 text-sm font-bold text-[#4b4d47] items-center">
                <FileText className="w-4 h-4 text-[#79b993] shrink-0"/>
                <span>{typeof d === "string" ? d : d.documentName || JSON.stringify(d)}</span>
              </div>
             ))
           }
         </div>
        </ContentCard>

        <ContentCard className="p-6">
          <h2 className="text-lg font-black text-[#181818] mb-4">Cost Structure</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-[#e7f5ec] border border-[#b8dfc6] p-4 rounded-xl">
              <div className="text-sm">
                <div className="font-black text-[#234a32]">Govt. Fee (Rule {feeResult?.ruleId || 'N/A'})</div>
                <div className="text-[#44765b] text-xs font-bold mt-0.5">Based on actual RJSC logic</div>
              </div>
              <div className="font-black text-[#181818] font-mono text-lg">
                {rjscFee !== null ? `৳ ${rjscFee.toLocaleString()}` : <span className="text-[#a03c2a] text-sm">Unknown / Manual</span>}
              </div>
            </div>

            <div>
             <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Professional Fee</label>
             <input type="number" value={fee} onChange={e=>setFee(Number(e.target.value))} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white"/>
            </div>
            <div>
             <label className="block text-sm font-bold text-[#44765b] uppercase tracking-wider mb-2">Other/Misc Cost</label>
             <input type="number" value={other} onChange={e=>setOther(Number(e.target.value))} className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white"/>
            </div>

            <div className="pt-4 mt-2 border-t border-[#ece5d9] flex justify-between items-center">
              <div className="font-black text-[#181818] uppercase tracking-wider text-sm">Total Billed</div>
              <div className="font-black text-[#447a5d] text-2xl font-mono">
                {rjscFee !== null ? `৳ ${(rjscFee + fee + other).toLocaleString()}` : <span className="text-[#a03c2a] text-sm">Unknown Govt Fee</span>}
              </div>
            </div>
          </div>
        </ContentCard>
      </div>

      <div className="flex justify-end pt-4 gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#d9e3df] bg-white px-6 text-sm font-bold text-[#4b4d47] shadow-sm transition hover:bg-[#fffdf7]">
            Cancel
          </button>
        )}
        <button disabled={isCreating} type="submit" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-6 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]">
          {isCreating ? "Creating..." : "Save Work & Snapshot Rules"}
        </button>
      </div>
    </form>
  )
}
