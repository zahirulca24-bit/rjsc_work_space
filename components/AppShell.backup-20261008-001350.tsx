"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ClipboardList, PlusCircle, BadgeDollarSign, Calculator, FolderOpen, ListChecks, FileText, ArrowLeftRight, ReceiptText, Users, BarChart3, Settings, ChevronRight, Bell, Search, ShieldCheck } from "lucide-react";

const groups = [
  {label:"Overview",items:[["/", "Dashboard", LayoutDashboard]]},
  {label:"Operations",items:[["/clients", "Clients", Building2],["/work-register", "Work Register", ClipboardList],["/new-work", "New Work", PlusCircle],["/checklist", "Checklist / Requisition", ListChecks],["/documents", "Documents", FolderOpen],["/working-papers", "Working Papers", FileText]]},
  {label:"Finance",items:[["/services-fees", "Services & Fees", BadgeDollarSign],["/fee-calculator", "Fee Calculator", Calculator],["/transactions", "Transactions", ArrowLeftRight],["/billing", "Billing", ReceiptText]]},
  {label:"Management",items:[["/team", "Team", Users],["/reports", "Reports", BarChart3],["/settings", "Settings", Settings]]}
] as const;

export default function AppShell({children}:{children:React.ReactNode}){
 const path=usePathname();
 return <div className="min-h-screen lg:grid lg:grid-cols-[276px_1fr]">
   <aside className="app-scrollbar fixed inset-y-0 left-0 z-30 hidden w-[276px] overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,#0f3833_0%,#0a2b27_100%)] text-white lg:block">
     <div className="border-b border-white/10 px-5 py-5">
       <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 ring-1 ring-white/10"><ShieldCheck size={21}/></div><div><div className="text-[17px] font-bold tracking-tight">RJSC Office</div><div className="mt-0.5 text-[11px] text-white/55">Internal Automation System</div></div></div>
     </div>
     <nav className="px-3 py-4">{groups.map(g=><div className="mb-5" key={g.label}><div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">{g.label}</div><div className="space-y-1">{g.items.map(([href,label,Icon])=>{const active=path===href||(href!=="/"&&path.startsWith(href));return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition ${active?"bg-white text-[#113c36] shadow-sm font-bold":"text-white/72 hover:bg-white/[.07] hover:text-white"}`}><Icon size={17}/><span className="flex-1">{label}</span>{active&&<ChevronRight size={14} className="opacity-55"/>}</Link>})}</div></div>)}</nav>
     <div className="mx-3 mb-4 rounded-2xl border border-white/10 bg-white/[.055] p-4"><div className="text-xs font-bold">FAMES & R</div><div className="mt-1 text-[11px] leading-5 text-white/50">RJSC Department<br/>Internal use only</div></div>
   </aside>
   <main className="min-w-0 lg:col-start-2">
     <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"><div className="flex h-[72px] items-center justify-between gap-4 px-5 lg:px-7"><div><div className="text-sm font-bold text-[#102725]">FAMES & R Chartered Accountants</div><div className="mt-0.5 text-xs text-slate-500">RJSC Department • Internal Use Only</div></div><div className="flex items-center gap-2"><button className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-500 shadow-sm md:flex"><Search size={14}/>Search</button><button className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"><Bell size={16}/></button><div className="ml-1 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-3 shadow-sm"><div className="grid h-8 w-8 place-items-center rounded-lg bg-[#103d37] text-xs font-bold text-white">ZI</div><div className="hidden sm:block"><div className="text-xs font-bold text-slate-700">Md. Zahirul Islam</div><div className="text-[10px] text-slate-400">Manager</div></div></div></div></div></header>
     <div className="p-5 lg:p-7 xl:p-8">{children}</div>
   </main>
 </div>
}
