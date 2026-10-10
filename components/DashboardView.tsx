"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderOpen,
  Plus,
  ReceiptText,
  Upload,
  Users,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";
import { getClients } from "@/lib/api/clients";
import { getWorks } from "@/lib/api/works";
import { getFinanceSummary } from "@/lib/api/analytics";

type Client = { id: string; legal_name: string; status: string };
type Work = {
  id: string;
  work_code: string | null;
  client_id: string;
  service_id: string;
  assigned_to: string | null;
  status: string;
  due_date: string | null;
  total_bill: string | number | null;
  created_at: string;
};
type Finance = { billed: string; collection: string; outstanding: string };
const money = (n: number) => "৳ " + n.toLocaleString("en-BD", { maximumFractionDigits: 2 });
const amount = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const completed = (s: string) => ["COMPLETED", "CANCELLED", "CANCELED"].includes(s.toUpperCase());
const dateLabel = (v: string | null) => v ? new Date(v).toLocaleDateString("en-GB") : "—";

export default function DashboardView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [finance, setFinance] = useState<Finance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = async () => {
    setLoading(true);
    setError("");
    try {
      const [clientRows, workRows, financeSummary] = await Promise.all([
        getClients(), getWorks(), getFinanceSummary()
      ]);
      if (!Array.isArray(clientRows) || !Array.isArray(workRows)) throw new Error("Invalid dashboard response");
      setClients(clientRows);
      setWorks(workRows);
      setFinance(financeSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void reload(); }, []);

  const openWorks = useMemo(() => works.filter(w => !completed(w.status)), [works]);
  const recentWorks = works.slice(0, 8);
  const clientNames = useMemo(() => new Map(clients.map(c => [c.id, c.legal_name])), [clients]);
  const activeClients = clients.filter(c => c.status.toUpperCase() === "ACTIVE").length;
  const completedWorks = works.filter(w => w.status.toUpperCase() === "COMPLETED").length;
  const billed = amount(finance?.billed);
  const collected = amount(finance?.collection);
  const outstanding = amount(finance?.outstanding);
  const collectionRate = billed > 0 ? Math.max(0, Math.min(100, collected / billed * 100)) : 0;
  const upcoming = openWorks.filter(w => w.due_date && new Date(w.due_date).getTime() >= Date.now()).sort((a,b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0];
  const attentionWorks = openWorks.filter(w => w.due_date && new Date(w.due_date).getTime() < Date.now()).slice(0, 5);

  return (

    <div className="rjsc-dashboard space-y-4">

      {loading && <div role="status" className="rounded-xl bg-[#eef7f3] px-4 py-3 text-sm text-[#315f55]">Loading real dashboard data...</div>}
      {error && <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>Dashboard could not load: {error}. Previous results may be outdated.</span><button type="button" onClick={() => void reload()} className="font-bold underline">Retry</button></div>}
      {!loading && !error && works.length === 0 && clients.length === 0 && <div className="rounded-xl border border-[#d9e3df] bg-white px-4 py-3 text-sm text-[#47765a]">No clients or works yet. Add a client to begin.</div>}
      {/* HERO */}
      <section className="dashboard-hero overflow-hidden rounded-[26px] border border-[#eadfca]">
        <div className="grid gap-5 p-5 xl:grid-cols-[1.15fr_.85fr] xl:p-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#dff1e7] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#44765b]">
              <span className="h-2 w-2 rounded-full bg-[#79b993]" />
              RJSC Operations
            </div>

            <h1 className="max-w-[760px] text-[29px] font-black tracking-[-0.035em] text-[#181818] xl:text-[36px] xl:leading-[1.05]">
              Manage compliance work
              <span className="block text-[#477a5c]">
                without losing control.
              </span>
            </h1>

            <p className="mt-3 max-w-[650px] text-[13px] leading-5 text-[#6f7069]">
              Clients, filings, required documents, working papers, fees,
              collections and review status — all from one internal workspace.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/new-work"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50]"
              >
                <Plus size={17} />
                Create New Work
              </Link>

              <Link
                href="/clients"
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#dccfb6] bg-white/70 px-5 text-sm font-bold text-[#4b4d47] transition hover:bg-white"
              >
                <Building2 size={17} />
                Client Directory
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HeroTile
              tone="coral"
              value={loading ? "…" : String(openWorks.length)}
              label="Open Work"
              icon={<BriefcaseBusiness size={18} />}
            />

            <HeroTile
              tone="aqua"
              value={loading ? "…" : String(activeClients)}
              label="Active Clients"
              icon={<Users size={18} />}
            />

            <HeroTile
              tone="yellow"
              value={loading ? "…" : money(outstanding)}
              label="Outstanding"
              icon={<CircleDollarSign size={18} />}
            />

            <HeroTile
              tone="sage"
              value={loading ? "…" : String(completedWorks)}
              label="Completed Jobs"
              icon={<FileText size={18} />}
            />
          </div>
        </div>
      </section>

      {/* KPI */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          tone="sage"
          icon={<Building2 size={18} />}
          label="Active Clients"
          value={loading ? "…" : String(activeClients)}
          sub="Client master"
        />

        <Kpi
          tone="aqua"
          icon={<BriefcaseBusiness size={18} />}
          label="Open Jobs"
          value={loading ? "…" : String(openWorks.length)}
          sub="Not completed/cancelled"
        />

        <Kpi
          tone="yellow"
          icon={<ReceiptText size={18} />}
          label="Total Bill"
          value={loading ? "…" : money(billed)}
          sub="Issued invoices"
        />

        <Kpi
          tone="coral"
          icon={<CircleDollarSign size={18} />}
          label="Client Due"
          value={loading ? "…" : money(outstanding)}
          sub="Follow-up required"
        />
      </section>

      {/* OPERATIONS */}
      <section className="grid gap-4 xl:grid-cols-[1.4fr_.6fr]">

        {/* RECENT WORKS */}
        <div className="dash-panel-3d rounded-[20px] border border-[#d9e3df] bg-[#fffaf0] shadow-[0_10px_30px_rgba(39,60,53,.05)]">
          <div className="flex items-center justify-between border-b border-[#e7dfd0] px-5 py-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#779084]">
                Operations
              </div>

              <h2 className="mt-1 text-lg font-black text-[#20201e]">
                Recent & Open Works
              </h2>
            </div>

            <Link
              href="/work-register"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4c7c61]"
            >
              View Register
              <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[850px] w-full">
              <thead>
                <tr className="bg-[#dcefe7]">
                  <Th>Work</Th>
                  <Th>Client</Th>
                  <Th>Service</Th>
                  <Th>Assigned</Th>
                  <Th>Status</Th>
                  <Th>Due Date</Th>
                  <Th>Est. Work Bill</Th>
                  <Th>Due Date</Th>
                </tr>
              </thead>

              <tbody>
                {recentWorks.map((work) => (
                  <tr
                    key={work.id}
                    className="border-t border-[#ece5d9] bg-[#fffdf7] transition hover:bg-[#f7f7ec]"
                  >
                    <td className="px-5 py-4">
                      <div className="font-black text-[#26362f]">
                        {work.work_code || work.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="max-w-[240px] px-5 py-4 text-sm font-semibold text-[#343530]">
                      {clientNames.get(work.client_id) || "Unknown client"}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#62655f]">
                      {work.service_id}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#62655f]">
                      {work.assigned_to || "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#dff2f5] px-2.5 py-1 text-[11px] font-bold text-[#397684]">
                        {work.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#555852]">
                      {dateLabel(work.due_date)}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-[#363832]">
                      {work.total_bill === null ? "Not estimated" : money(amount(work.total_bill))}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-[#d36551]">
                      {dateLabel(work.due_date)}
                    </td>
                  </tr>
                ))}
                {recentWorks.length === 0 && <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-[#75807a]">No works recorded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          <div className="dash-3d rounded-[20px] border border-[#d4e3de] bg-[#dff1e7] p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.13em] text-[#668775]">
                  Collection
                </div>

                <div className="mt-2 text-[30px] font-black tracking-tight text-[#244434]">
                  {loading ? "…" : money(collected)}
                </div>

                <div className="mt-1 text-xs text-[#65786d]">
                  {billed > 0 ? collectionRate.toFixed(1) + "% of issued invoices collected" : "No issued invoices yet"}
                </div>
              </div>

              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#79b993] text-white">
                <CircleDollarSign size={22} />
              </div>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/70">
              <div className="h-full rounded-full bg-[#5b9f75]" style={{ width: collectionRate + "%" }} />
            </div>
          </div>

          <div className="dash-3d rounded-[20px] border border-[#f0d7d0] bg-[#fce9e4] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eb7b67] text-white">
                <Clock3 size={19} />
              </div>

              <div>
                <div className="font-black text-[#6c342a]">
                  Next Due Work
                </div>

                <div className="mt-1 text-sm text-[#8b5c53]">
                  {upcoming ? (upcoming.work_code || upcoming.id.slice(0,8)) + " · " + upcoming.service_id : "No upcoming work"}
                </div>

                <div className="mt-2 text-xs font-bold text-[#c95e4b]">
                  {upcoming ? "Due " + dateLabel(upcoming.due_date) : "No date scheduled"}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* REVIEW + ACTIONS */}
      <section className="grid gap-4 xl:grid-cols-[1fr_.8fr]">

        <div className="dash-panel-3d rounded-[20px] border border-[#d7e5e1] bg-[#eef7f3] p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#708c80]">
                Review Workflow
              </div>

              <h2 className="mt-1 text-lg font-black text-[#22342d]">
                Pending Attention
              </h2>
            </div>

            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-[#4d7662]">
              {attentionWorks.length} overdue
            </span>
          </div>

          <div className="grid gap-3">
            {attentionWorks.map(work => (
              <Link key={work.id} href="/work-register" className="rounded-2xl border border-[#d4e4de] bg-white/80 p-4">
                <div className="font-bold text-sm text-[#2b322e]">{work.work_code || work.id.slice(0,8)} · {work.service_id}</div>
                <div className="mt-1 text-xs text-[#75807a]">{clientNames.get(work.client_id) || "Unknown client"}</div>
                <div className="mt-2 text-xs font-bold text-[#c95e4b]">Overdue: {dateLabel(work.due_date)}</div>
              </Link>
            ))}
            {attentionWorks.length === 0 && <p className="text-sm text-[#75807a]">No overdue works.</p>}
          </div>
        </div>

        <div className="dash-panel-3d rounded-[20px] border border-[#e9dfc9] bg-[#fff8e8] p-4">
          <div className="mb-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9b8968]">
              Shortcuts
            </div>

            <h2 className="mt-1 text-lg font-black text-[#342e23]">
              Quick Actions
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Action
              href="/new-work"
              tone="sage"
              icon={<Plus size={19} />}
              title="New Work"
            />

            <Action
              href="/clients"
              tone="aqua"
              icon={<Building2 size={19} />}
              title="Add Client"
            />

            <Action
              href="/documents"
              tone="coral"
              icon={<Upload size={19} />}
              title="Upload Document"
            />

            <Action
              href="/checklist-requisition"
              tone="yellow"
              icon={<FileText size={19} />}
              title="Requisition"
            />

            <Action
              href="/working-papers"
              tone="mint"
              icon={<FolderOpen size={19} />}
              title="Working Papers"
            />

            <Action
              href="/billing"
              tone="cream"
              icon={<ReceiptText size={19} />}
              title="Billing"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroTile({
  value,
  label,
  icon,
  tone,
}: {
  value: string;
  label: string;
  icon: React.ReactNode;
  tone: "coral" | "aqua" | "yellow" | "sage";
}) {
  const styles = {
    coral: "bg-[#eb7b67] text-white",
    aqua: "bg-[#72c9d4] text-white",
    yellow: "bg-[#f7c928] text-[#54460b]",
    sage: "bg-[#92cfa7] text-[#254834]",
  };

  return (
    <div className={`dash-3d rounded-[18px] p-3.5 ${styles[tone]}`}>
      <div className="flex items-start justify-between">
        <div className="text-[22px] font-black tracking-tight">
          {value}
        </div>

        <div className="rounded-xl bg-white/25 p-2">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-[11px] font-bold">
        {label}
      </div>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "sage" | "aqua" | "yellow" | "coral";
}) {
  const styles = {
    sage: {
      box: "border-[#b8dfc6] bg-[#e7f5ec]",
      icon: "bg-[#92cfa7] text-[#234a32]",
    },
    aqua: {
      box: "border-[#bee4e9] bg-[#e8f7f9]",
      icon: "bg-[#72c9d4] text-white",
    },
    yellow: {
      box: "border-[#f0da88] bg-[#fff6ce]",
      icon: "bg-[#f7c928] text-[#5f500c]",
    },
    coral: {
      box: "border-[#efc5bc] bg-[#fcebe7]",
      icon: "bg-[#eb7b67] text-white",
    },
  };

  return (
    <div className={`dash-3d rounded-[18px] border p-4 ${styles[tone].box}`}>
      <div className={`grid h-9 w-9 place-items-center rounded-xl ${styles[tone].icon}`}>
        {icon}
      </div>

      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#6b746e]">
        {label}
      </div>

      <div className="mt-1 text-[21px] font-black tracking-tight text-[#222522]">
        {value}
      </div>

      <div className="mt-1 text-xs text-[#747c76]">
        {sub}
      </div>
    </div>
  );
}

function Action({
  href,
  icon,
  title,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  tone: "sage" | "aqua" | "coral" | "yellow" | "mint" | "cream";
}) {
  const tones = {
    sage: "bg-[#dcefe4] text-[#37674c]",
    aqua: "bg-[#dff4f7] text-[#327382]",
    coral: "bg-[#f9e2dc] text-[#b75a49]",
    yellow: "bg-[#fff0ad] text-[#7c6507]",
    mint: "bg-[#e5f4e9] text-[#47765a]",
    cream: "bg-[#f3ead7] text-[#776445]",
  };

  return (
    <Link
      href={href}
      className={`dash-action group rounded-2xl p-3.5 transition ${tones[tone]}`}
    >
      <div className="flex items-center justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/70">
          {icon}
        </div>

        <ArrowUpRight
          size={15}
          className="opacity-45 transition group-hover:opacity-100"
        />
      </div>

      <div className="mt-5 text-sm font-black">
        {title}
      </div>
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-black uppercase tracking-[0.11em] text-[#4f6b60]">
      {children}
    </th>
  );
}

