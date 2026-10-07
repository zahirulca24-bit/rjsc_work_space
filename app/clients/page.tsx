"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  Search,
  Plus,
  FolderOpen,
  BriefcaseBusiness,
  CircleDollarSign,
  Users,
  ChevronRight,
} from "lucide-react";

const clients = [
  {
    id: "RJSC-0001",
    name: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    regNo: "C-118168",
    type: "Private Company",
    assigned: "Noyon",
    status: "Active",
    openWorks: 1,
    totalBill: 5500,
    due: 2500,
  },
  {
    id: "RJSC-0002",
    name: "Bangladesh Film Club Limited",
    regNo: "—",
    type: "Private Limited",
    assigned: "Noyon",
    status: "Active",
    openWorks: 0,
    totalBill: 0,
    due: 0,
  },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(
      (c) =>
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.regNo.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Client Management
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Clients
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage RJSC clients, registrations, engagements and outstanding balances.
          </p>
        </div>

        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800">
          <Plus size={17} />
          Add Client
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<Users size={18} />}
          label="Total Clients"
          value="2"
          hint="Client master"
        />

        <Metric
          icon={<Building2 size={18} />}
          label="Active Clients"
          value="2"
          hint="100% active"
          accent
        />

        <Metric
          icon={<BriefcaseBusiness size={18} />}
          label="Open Works"
          value="1"
          hint="Across all clients"
        />

        <Metric
          icon={<CircleDollarSign size={18} />}
          label="Outstanding Due"
          value="৳ 2,500"
          hint="Requires follow-up"
          warning
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">

        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <h2 className="font-semibold text-slate-900">
              Client Directory
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {filtered.length} client{filtered.length === 1 ? "" : "s"} found
            </p>
          </div>

          <div className="relative w-full lg:w-[340px]">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search client, ID or RJSC no..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full">
            <thead>
              <tr className="bg-slate-50/80">
                <Th>Client</Th>
                <Th>RJSC Registration</Th>
                <Th>Entity</Th>
                <Th>Assigned</Th>
                <Th>Open Work</Th>
                <Th>Total Bill</Th>
                <Th>Due</Th>
                <Th>Status</Th>
                <Th></Th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="group bg-white transition hover:bg-slate-50/80"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100">
                        <Building2 size={19} />
                      </div>

                      <div className="min-w-0">
                        <div className="max-w-[360px] truncate text-sm font-semibold text-slate-900">
                          {client.name}
                        </div>

                        <div className="mt-1 text-xs font-medium text-slate-400">
                          {client.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <Td>{client.regNo}</Td>
                  <Td>{client.type}</Td>

                  <td className="px-5 py-4">
                    <div className="inline-flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                        N
                      </div>
                      <span className="text-sm text-slate-700">
                        {client.assigned}
                      </span>
                    </div>
                  </td>

                  <Td>{client.openWorks}</Td>

                  <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                    ৳ {client.totalBill.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={
                        client.due > 0
                          ? "text-sm font-bold text-amber-700"
                          : "text-sm font-semibold text-emerald-700"
                      }
                    >
                      ৳ {client.due.toLocaleString()}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  </td>

                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      Open
                      <ChevronRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50/60 px-5 py-3">
          <span className="text-xs text-slate-500">
            Showing {filtered.length} of {clients.length} clients
          </span>

          <button className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            <FolderOpen size={14} />
            Client folders
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  accent = false,
  warning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
  warning?: boolean;
}) {
  const box =
    warning
      ? "border-amber-200 bg-amber-50/70"
      : accent
      ? "border-emerald-200 bg-emerald-50/60"
      : "border-slate-200 bg-white";

  const iconBox =
    warning
      ? "bg-amber-100 text-amber-700"
      : accent
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${box}`}>
      <div className="flex items-start justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${iconBox}`}>
          {icon}
        </div>

        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Live
        </span>
      </div>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {value}
      </div>

      <div className="mt-1.5 text-xs text-slate-500">
        {hint}
      </div>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
      {children}
    </td>
  );
}

