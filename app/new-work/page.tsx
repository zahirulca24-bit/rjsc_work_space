"use client";
import {useMemo,useState} from "react";
import {PageTitle,Card,fieldClass,PrimaryButton,SectionTitle,Badge} from "@/components/UI";
import {clients,services,requiredDocs} from "@/lib/mock";
import { BriefcaseBusiness, ClipboardCheck, FileText, ReceiptText, Sparkles } from "lucide-react";

export default function Page(){
 const [client,setClient]=useState(clients[0].name); const [service,setService]=useState("Annual Return / Returns Filing"); const [fee,setFee]=useState(5000); const [other,setOther]=useState(300);
 const s=useMemo(()=>services.find(x=>x.name===service)!,[service]); const docs=requiredDocs[service]||["Supporting documents as applicable","Previous RJSC filing / certified copy"];
 return <>
  <PageTitle title="Create New Work" desc="Create an RJSC job and prepare its workflow automatically."/>
  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
   <Card className="p-0 overflow-hidden"><div className="border-b border-slate-100 bg-[#fbfcfc] px-5 py-4"><SectionTitle title="Work Information" desc="Choose the client and service. The automation preview updates instantly."/></div><div className="p-5">
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Client<select value={client} onChange={e=>setClient(e.target.value)} className={fieldClass}>{clients.map(c=><option key={c.id}>{c.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">RJSC Service<select value={service} onChange={e=>setService(e.target.value)} className={fieldClass}>{services.map(x=><option key={x.name}>{x.name}</option>)}</select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Period / Year<input defaultValue="FY 2025-26" className={fieldClass}/></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Assigned To<select className={fieldClass}><option>Noyon</option><option>Hemadry Roy</option><option>Md. Bayezid</option></select></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Professional Fee<input type="number" value={fee} onChange={e=>setFee(Number(e.target.value))} className={fieldClass}/></label>
      <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Other Cost<input type="number" value={other} onChange={e=>setOther(Number(e.target.value))} className={fieldClass}/></label>
    </div>
    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5"><div className="text-xs text-slate-400">Draft mode • No backend write yet</div><PrimaryButton>Create Work</PrimaryButton></div>
   </div></Card>

   <div className="space-y-5">
    <Card><div className="flex items-center justify-between"><SectionTitle title="Automation Preview" desc="Generated from selected service"/><div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Sparkles size={18}/></div></div><div className="mt-5 grid grid-cols-2 gap-3">
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><ReceiptText size={16} className="text-emerald-700"/><div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Govt / RJSC Fee</div><div className="mt-1 text-lg font-bold">৳ {s.fee.toLocaleString()}</div></div>
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3"><BriefcaseBusiness size={16} className="text-emerald-700"/><div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">Total Bill</div><div className="mt-1 text-lg font-bold">৳ {(s.fee+fee+other).toLocaleString()}</div></div>
      <div className="col-span-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3"><div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">Next Action</div><div className="mt-1.5 text-sm font-medium leading-6 text-slate-700">{s.action}</div></div>
    </div></Card>

    <Card><div className="flex items-center justify-between"><SectionTitle title="Checklist / Requisition" desc={`${docs.length} requirements detected`}/><Badge tone="info">Auto generated</Badge></div><div className="mt-4 space-y-2">{docs.map((d,i)=><label key={d} className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-[#fbfcfc] p-3 text-sm transition hover:border-emerald-200 hover:bg-emerald-50/30"><input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-700"/><div className="flex-1"><div className="font-medium text-slate-700">{d}</div><div className="mt-0.5 text-[11px] text-slate-400">Requirement {i+1}</div></div>{i===0?<ClipboardCheck size={16} className="mt-1 text-slate-300"/>:<FileText size={16} className="mt-1 text-slate-300"/>}</label>)}</div></Card>
   </div>
  </div>
 </>
}
