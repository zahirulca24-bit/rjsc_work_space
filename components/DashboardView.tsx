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

const recentWorks = [
  {
    id: "DEMO-001",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    service: "Annual Return / Returns Filing",
    assigned: "Noyon",
    status: "In Progress",
    dueDate: "15-Oct-2026",
    bill: 5500,
    due: 2500,
  },
];

const reviewQueue = [
  {
    title: "Annual Return Working Paper",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    owner: "Noyon",
    state: "Manager Review",
  },
  {
    title: "AGM Minutes / Resolution",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    owner: "Noyon",
    state: "Missing Document",
  },
];

export default function DashboardView() {
  return (
    <div className="rjsc-dashboard space-y-4">

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
              value="1"
              label="Open Work"
              icon={<BriefcaseBusiness size={18} />}
            />

            <HeroTile
              tone="aqua"
              value="2"
              label="Active Clients"
              icon={<Users size={18} />}
            />

            <HeroTile
              tone="yellow"
              value="৳ 2,500"
              label="Outstanding"
              icon={<CircleDollarSign size={18} />}
            />

            <HeroTile
              tone="sage"
              value="40%"
              label="Document Progress"
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
          value="2"
          sub="Client master"
        />

        <Kpi
          tone="aqua"
          icon={<BriefcaseBusiness size={18} />}
          label="Open Jobs"
          value="1"
          sub="1 in progress"
        />

        <Kpi
          tone="yellow"
          icon={<ReceiptText size={18} />}
          label="Total Bill"
          value="৳ 5,500"
          sub="Current engagements"
        />

        <Kpi
          tone="coral"
          icon={<CircleDollarSign size={18} />}
          label="Client Due"
          value="৳ 2,500"
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
                  <Th>Bill</Th>
                  <Th>Due</Th>
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
                        {work.id}
                      </div>
                    </td>

                    <td className="max-w-[240px] px-5 py-4 text-sm font-semibold text-[#343530]">
                      {work.client}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#62655f]">
                      {work.service}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#62655f]">
                      {work.assigned}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[#dff2f5] px-2.5 py-1 text-[11px] font-bold text-[#397684]">
                        {work.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#555852]">
                      {work.dueDate}
                    </td>

                    <td className="px-5 py-4 text-sm font-bold text-[#363832]">
                      ৳ {work.bill.toLocaleString()}
                    </td>

                    <td className="px-5 py-4 text-sm font-black text-[#d36551]">
                      ৳ {work.due.toLocaleString()}
                    </td>
                  </tr>
                ))}
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
                  ৳ 3,000
                </div>

                <div className="mt-1 text-xs text-[#65786d]">
                  54.5% of billed amount collected
                </div>
              </div>

              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#79b993] text-white">
                <CircleDollarSign size={22} />
              </div>
            </div>

            <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/70">
              <div className="h-full w-[55%] rounded-full bg-[#5b9f75]" />
            </div>
          </div>

          <div className="dash-3d rounded-[20px] border border-[#f0d7d0] bg-[#fce9e4] p-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eb7b67] text-white">
                <Clock3 size={19} />
              </div>

              <div>
                <div className="font-black text-[#6c342a]">
                  Due this week
                </div>

                <div className="mt-1 text-sm text-[#8b5c53]">
                  DEMO-001 · Annual Return
                </div>

                <div className="mt-2 text-xs font-bold text-[#c95e4b]">
                  Due 15-Oct-2026
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
              {reviewQueue.length} items
            </span>
          </div>

          <div className="grid gap-3">
            {reviewQueue.map((item, index) => (
              <div
                key={item.title}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[#d4e4de] bg-white/80 p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div
                    className={
                      index === 0
                        ? "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f7c928] text-[#5f5013]"
                        : "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eb7b67] text-white"
                    }
                  >
                    {index === 0 ? (
                      <CheckCircle2 size={18} />
                    ) : (
                      <FileText size={18} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-black text-[#2b322e]">
                      {item.title}
                    </div>

                    <div className="mt-1 truncate text-xs text-[#75807a]">
                      {item.client}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-[#4f655a]">
                    {item.state}
                  </div>

                  <div className="mt-1 text-[11px] text-[#829087]">
                    {item.owner}
                  </div>
                </div>
              </div>
            ))}
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

