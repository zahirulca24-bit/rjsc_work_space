import { ArrowUpRight } from "lucide-react";

export function PageTitle({title,desc,action}:{title:string;desc?:string;action?:React.ReactNode}){
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-[28px] font-bold tracking-[-0.02em] text-[#102725]">{title}</h1>{desc&&<p className="mt-1.5 text-sm text-slate-500">{desc}</p>}</div>
    {action&&<div>{action}</div>}
  </div>
}

export function Card({children,className=""}:{children:React.ReactNode;className?:string}){
  return <div className={`rounded-[20px] border border-slate-200/90 bg-white p-5 shadow-[0_10px_30px_rgba(16,39,37,0.045)] ${className}`}>{children}</div>
}

export function Stat({label,value,sub,icon}:{label:string;value:string|number;sub?:string;icon?:React.ReactNode}){
  return <Card className="group relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(16,39,37,0.08)]">
    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-50/70 blur-2xl" />
    <div className="relative flex items-start justify-between gap-4">
      <div className="min-w-0"><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</div><div className="mt-2.5 text-[26px] font-bold tracking-[-0.03em] text-[#102725]">{value}</div>{sub&&<div className="mt-1 text-xs text-slate-400">{sub}</div>}</div>
      {icon&&<div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef8f4] text-[#167b5b]">{icon}</div>}
    </div>
  </Card>
}

export function Badge({children,tone="neutral"}:{children:React.ReactNode;tone?:"neutral"|"success"|"warning"|"danger"|"info"}){
  const cls={neutral:"bg-slate-100 text-slate-700",success:"bg-emerald-50 text-emerald-700 ring-emerald-100",warning:"bg-amber-50 text-amber-700 ring-amber-100",danger:"bg-rose-50 text-rose-700 ring-rose-100",info:"bg-sky-50 text-sky-700 ring-sky-100"}[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${cls}`}>{children}</span>
}

export function PrimaryButton({children}:{children:React.ReactNode}){
  return <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#103d37] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b312c] focus:outline-none focus:ring-4 focus:ring-emerald-100">{children}<ArrowUpRight size={15}/></button>
}

export const fieldClass="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50";

export function SectionTitle({title,desc}:{title:string;desc?:string}){
  return <div><h2 className="text-base font-bold text-[#102725]">{title}</h2>{desc&&<p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>}</div>
}
