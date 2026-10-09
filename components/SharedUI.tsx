import React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export function PageHeader({ 
  icon: Icon, 
  title, 
  subtitle, 
  actionLabel, 
  actionHref,
  actionOnClick
}: {
  icon: any,
  title: string,
  subtitle?: string,
  actionLabel?: string,
  actionHref?: string,
  actionOnClick?: () => void
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#79b993] text-white shadow-sm">
          <Icon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-[#181818] tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm font-medium text-[#4b4d47] mt-1">{subtitle}</p>}
        </div>
      </div>
      {actionLabel && (
        actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]"
          >
            <Plus size={18} />
            {actionLabel}
          </Link>
        ) : (
          <button
            onClick={actionOnClick}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]"
          >
            <Plus size={18} />
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}

export function ContentCard({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`rounded-[20px] border border-[#d9e3df] bg-[#fffaf0] shadow-[0_10px_30px_rgba(39,60,53,.05)] overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon,
  trend,
  color = "sage" // "sage", "coral", "aqua", "yellow"
}: { 
  title: string, 
  value: React.ReactNode, 
  icon: any, 
  trend?: React.ReactNode,
  color?: "sage" | "coral" | "aqua" | "yellow" 
}) {
  const colorMap = {
    sage: { bg: "bg-[#e7f5ec]", border: "border-[#b8dfc6]", iconBg: "bg-[#92cfa7]", iconText: "text-[#234a32]" },
    coral: { bg: "bg-[#fce9e4]", border: "border-[#f0d7d0]", iconBg: "bg-[#eb7b67]", iconText: "text-white" },
    aqua: { bg: "bg-[#e8f7f9]", border: "border-[#bee4e9]", iconBg: "bg-[#72c9d4]", iconText: "text-white" },
    yellow: { bg: "bg-[#fff6ce]", border: "border-[#f0da88]", iconBg: "bg-[#f7c928]", iconText: "text-[#54460b]" }
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-[20px] border ${c.border} ${c.bg} p-4 flex flex-col justify-between`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-bold text-[#44765b] uppercase tracking-wider">{title}</div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${c.iconBg} ${c.iconText}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-3xl font-black tracking-tight text-[#181818]">{value}</div>
        {trend && <div className="mt-1 text-xs font-semibold text-[#5b9f75]">{trend}</div>}
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  let color = "bg-[#dff1e7] text-[#44765b]";
  const lower = (status || "").toLowerCase();
  
  if (lower.includes("progress") || lower.includes("issued")) {
    color = "bg-[#fff6ce] text-[#54460b]";
  } else if (lower.includes("missing") || lower.includes("pending") || lower.includes("draft") || lower.includes("unclassified")) {
    color = "bg-[#fce9e4] text-[#a03c2a]";
  } else if (lower.includes("completed") || lower.includes("paid") || lower.includes("verified") || lower.includes("received")) {
    color = "bg-[#dff1e7] text-[#44765b]";
  } else if (lower.includes("review") || lower.includes("partially")) {
    color = "bg-[#e8f7f9] text-[#2c747d]";
  }

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${color}`}>
      {status || "Unknown"}
    </span>
  );
}

export function EmptyState({ title, message, icon: Icon }: { title: string, message: string, icon: any }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-[#eef7f3] text-[#79b993] mb-4">
        <Icon size={32} />
      </div>
      <h3 className="text-lg font-bold text-[#181818] mb-1">{title}</h3>
      <p className="text-sm font-medium text-[#6c7671] max-w-sm">{message}</p>
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#dff1e7] border-t-[#447a5d]" />
    </div>
  );
}

export function Table({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <table className="w-full text-left text-sm font-medium">
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <th className={`bg-[#dcefe7] px-4 py-3 font-bold text-[#234a32] ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <td className={`border-t border-[#ece5d9] bg-[#fffdf7] px-4 py-3 text-[#4b4d47] transition hover:bg-[#f7f7ec] ${className}`}>
      {children}
    </td>
  );
}
