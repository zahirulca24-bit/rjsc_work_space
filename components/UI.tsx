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

export function PrimaryButton({children, onClick, disabled}:{children:React.ReactNode; onClick?: () => void; disabled?: boolean}){
  return <button onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#103d37] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0b312c] focus:outline-none focus:ring-4 focus:ring-emerald-100 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}<ArrowUpRight size={15}/></button>
}

export const fieldClass="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50";

export function SectionTitle({title,desc}:{title:string;desc?:string}){
  return <div><h2 className="text-base font-bold text-[#102725]">{title}</h2>{desc&&<p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>}</div>
}

export function SecondaryButton({children, onClick, disabled}: {children:React.ReactNode; onClick?: () => void; disabled?: boolean}){
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-4 focus:ring-slate-100 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
}

export function Modal({isOpen, onClose, title, size = 'lg', children}: {isOpen: boolean, onClose: () => void, title: string, size?: 'md'|'lg'|'xl', children: React.ReactNode}) {
  if (!isOpen) return null;
  const sizeClass = size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-md';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizeClass} rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
