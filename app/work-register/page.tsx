"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
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
import { getWorks } from "@/lib/api/works";
import { getClients } from "@/lib/api/clients";

export default function WorkRegisterPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorks(), getClients()]).then(([w, c]) => {
       setWorks(w);
       setClients(c);
       setLoading(false);
    });
  }, []);

  const clientMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.legal_name;
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return works.filter((w) => {
      const cname = clientMap[w.client_id]?.toLowerCase() || "";
      const matchesSearch = !q || w.work_code?.toLowerCase().includes(q) || w.service_id.toLowerCase().includes(q) || cname.includes(q);
      const matchesStatus = statusFilter === "All" || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, works, clientMap]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-emerald-600" />
            Work Register
          </h1>
          <p className="text-slate-500 mt-1">Track all active and completed service requests.</p>
        </div>
        <Link
          href="/new-work"
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Start New Work
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, client, or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-2">
             <select
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
             >
               <option value="All">All Statuses</option>
               <option value="Pending Check">Pending Check</option>
               <option value="In Progress">In Progress</option>
               <option value="Completed">Completed</option>
             </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Work ID & Client</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Assigned</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Govt Fee</th>
                <th className="px-6 py-4">Total Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading works...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No works found.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{w.work_code}</div>
                      <Link href={`/clients/${w.client_id}`} className="text-emerald-600 text-xs hover:underline mt-0.5 inline-block">
                        {clientMap[w.client_id] || "Unknown Client"}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{w.service_id}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{w.entity_type.replace('_', ' ')}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {w.assigned_to || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {w.government_fee !== null ? `৳ ${parseFloat(w.government_fee).toLocaleString()}` : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-emerald-700 font-mono font-medium">
                      {w.total_bill !== null ? `৳ ${parseFloat(w.total_bill).toLocaleString()}` : 'Pending'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
