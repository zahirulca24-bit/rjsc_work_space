"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Search,
  Plus,
  SlidersHorizontal,
  CalendarDays,
  FileText,
  FolderOpen,
  ChevronRight,
  BriefcaseBusiness,
  Clock3,
  CheckCircle2,
  CircleDollarSign,
} from "lucide-react";

const works = [
  {
    id: "DEMO-001",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    service: "Annual Return / Returns Filing",
    assigned: "Noyon",
    priority: "High",
    status: "In Progress",
    dueDate: "15-Oct-2026",
    checklist: "3/8",
    documents: 3,
    wp: "Under Review",
    bill: 5500,
    collection: 3000,
    due: 2500,
  },
];

export default function WorkRegisterPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return works.filter((w) => {
      const searchMatch =
        !q ||
        w.id.toLowerCase().includes(q) ||
        w.client.toLowerCase().includes(q) ||
        w.service.toLowerCase().includes(q);

      const statusMatch = status === "All" || w.status === status;
      const priorityMatch = priority === "All" || w.priority === priority;

      return searchMatch && statusMatch && priorityMatch;
    });
  }, [search, status, priority]);

  return (
    <div className="work-page space-y-5">

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#47765a]">
            Operations
          </div>

          <h1 className="text-3xl font-black tracking-tight text-[#1c2622]">
            Work Register
          </h1>

          <p className="mt-2 text-sm text-[#6e7973]">
            Track every RJSC engagement, deadline, document and financial status.
          </p>
        </div>

        <Link
          href="/new-work"
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#47765a] px-5 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#38634a] hover:shadow-lg"
        >
          <Plus size={17} />
          New Work
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          tone="coral"
          icon={<BriefcaseBusiness size={18} />}
          label="Open Work"
          value="1"
          sub="Current workload"
        />

        <Metric
          tone="aqua"
          icon={<Clock3 size={18} />}
          label="In Progress"
          value="1"
          sub="Being processed"
        />

        <Metric
          tone="sage"
          icon={<CheckCircle2 size={18} />}
          label="Completed"
          value="0"
          sub="Current period"
        />

        <Metric
          tone="yellow"
          icon={<CircleDollarSign size={18} />}
          label="Outstanding"
          value="৳ 2,500"
          sub="Client due"
        />
      </div>

      <section className="work-panel overflow-hidden rounded-[22px] border border-[#d7e2de]">

        <div className="work-toolbar flex flex-col gap-3 border-b border-[#ddd9cb] p-4 xl:flex-row xl:items-center">

          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b918c]"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Work ID, client or service..."
              className="h-10 w-full rounded-xl border border-[#dad7cb] bg-white/80 pl-10 pr-3 text-sm outline-none transition focus:border-[#79b993] focus:ring-4 focus:ring-[#e7f5ec]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-2 rounded-xl border border-[#dad7cb] bg-white/70 px-3">
              <SlidersHorizontal size={15} className="text-[#708078]" />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="h-10 bg-transparent text-sm font-semibold text-[#555d58] outline-none"
              >
                <option>All</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>Waiting Client</option>
              </select>
            </div>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-10 rounded-xl border border-[#dad7cb] bg-white/70 px-3 text-sm font-semibold text-[#555d58] outline-none"
            >
              <option>All</option>
              <option>Urgent</option>
              <option>High</option>
              <option>Normal</option>
              <option>Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1350px] w-full">
            <thead>
              <tr className="work-table-head">
                <Th>Work</Th>
                <Th>Client</Th>
                <Th>Service</Th>
                <Th>Assigned</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
                <Th>Due Date</Th>
                <Th>Checklist</Th>
                <Th>Docs</Th>
                <Th>Working Paper</Th>
                <Th>Bill</Th>
                <Th>Due</Th>
                <Th></Th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((work) => (
                <tr key={work.id} className="work-row">

                  <td className="px-4 py-4">
                    <div className="font-black text-[#243a31]">
                      {work.id}
                    </div>
                  </td>

                  <td className="max-w-[260px] px-4 py-4">
                    <div className="font-bold text-[#303630]">
                      {work.client}
                    </div>
                  </td>

                  <Td>{work.service}</Td>

                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-[#315f55] text-[10px] font-black text-white">
                        N
                      </div>

                      <span className="text-sm text-[#555d58]">
                        {work.assigned}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#fce9e4] px-2.5 py-1 text-[11px] font-black text-[#ba624f]">
                      {work.priority}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-full bg-[#dff4f7] px-2.5 py-1 text-[11px] font-black text-[#397684]">
                      {work.status}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#555d58]">
                      <CalendarDays size={14} />
                      {work.dueDate}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-lg bg-[#e7f5ec] px-2.5 py-1 text-xs font-black text-[#47765a]">
                      {work.checklist}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-1.5 text-sm font-bold text-[#397684]">
                      <FolderOpen size={14} />
                      {work.documents}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="rounded-lg bg-[#fff0ad] px-2.5 py-1 text-[11px] font-black text-[#7b6508]">
                      {work.wp}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-sm font-black text-[#313831]">
                    ৳ {work.bill.toLocaleString()}
                  </td>

                  <td className="px-4 py-4 text-sm font-black text-[#d36551]">
                    ৳ {work.due.toLocaleString()}
                  </td>

                  <td className="px-4 py-4 text-right">
                    <button className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#d8d9ce] bg-white/80 px-3 text-xs font-black text-[#4a5b52] transition hover:-translate-y-0.5 hover:bg-[#dff1e7]">
                      Open
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#ddd9cb] bg-[#e7f2ee] px-4 py-3">
          <div className="text-xs text-[#6f7d76]">
            {filtered.length} work item(s)
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#47765a]">
            <FileText size={14} />
            RJSC Work Register
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({
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
    sage: "border-[#b8dfc6] bg-[#e7f5ec]",
    aqua: "border-[#bee4e9] bg-[#e8f7f9]",
    yellow: "border-[#f0da88] bg-[#fff6ce]",
    coral: "border-[#efc5bc] bg-[#fcebe7]",
  };

  return (
    <div className={`dash-3d rounded-[18px] border p-4 ${styles[tone]}`}>
      <div className="flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/70 text-[#3f6755]">
          {icon}
        </div>
      </div>

      <div className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-[#6d7771]">
        {label}
      </div>

      <div className="mt-1 text-[22px] font-black text-[#222622]">
        {value}
      </div>

      <div className="mt-1 text-xs text-[#747c76]">
        {sub}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.11em] text-[#38584d]">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-4 text-sm text-[#5c655f]">
      {children}
    </td>
  );
}
