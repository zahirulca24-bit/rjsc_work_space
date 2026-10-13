"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Search, FolderOpen, BriefcaseBusiness, CheckCircle2, CircleDollarSign, X } from "lucide-react";
import { getWorks } from "@/lib/api/works";
import { getClients } from "@/lib/api/clients";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { StepWorkCreation } from "@/components/StepWorkCreation";
import { ReviewModal } from "@/components/ReviewModal";


export default function WorkRegisterPage() {
  const [works, setWorks] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewWork, setReviewWork] = useState<any>(null);

  const fetchAll = useCallback(() => {
    Promise.all([getWorks(), getClients()]).then(([w, c]) => {
       setWorks(w);
       setClients(c);
       setLoading(false);
    });
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Prevent background scroll
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isModalOpen]);

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

  const inPrep = works.filter(w => w.status === "In Progress" || w.status === "In Preparation").length;
  const pendingReview = works.filter(w => w.status === "Pending Check" || w.status === "Under Review" || w.status === "Ready for Submission").length;
  const submitted = works.filter(w => w.status === "Submitted" || w.status === "Query/Follow-up").length;
  const closedDelivered = works.filter(w => w.status === "Delivered" || w.status === "Closed" || w.status === "Completed").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={FolderOpen}
        title="Work Register"
        subtitle="Track all active and completed service requests."
        actionLabel="Start New Work"
        actionOnClick={() => setIsModalOpen(true)}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Works" value={works.length} icon={BriefcaseBusiness} color="aqua" />
        <StatCard title="In Preparation" value={inPrep} icon={CircleDollarSign} color="yellow" />
        <StatCard title="Under Review" value={pendingReview} icon={FolderOpen} color="coral" />
        <StatCard title="Submitted / Query" value={submitted} icon={CheckCircle2} color="sage" />
      </div>

      <ContentCard>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#fffdf7] p-4 border-b border-[#ece5d9]">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4d47]" />
            <input
              type="text"
              placeholder="Search by ID, client, or service..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993]"
            />
          </div>

          <div className="flex gap-2">
             <select
               value={statusFilter}
               onChange={e => setStatusFilter(e.target.value)}
               className="px-3 py-2 text-sm border border-[#d9e3df] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#79b993]"
             >
               <option value="All">All Statuses</option>
               <option value="In Preparation">In Preparation</option>
               <option value="Under Review">Under Review</option>
               <option value="Ready for Submission">Ready for Submission</option>
               <option value="Submitted">Submitted (RJSC Portal)</option>
               <option value="Query/Follow-up">Query / Follow-up</option>
               <option value="Delivered">Delivered to Client</option>
               <option value="Closed">Closed</option>
             </select>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No works found" message="Try adjusting your filters or search query." icon={FolderOpen} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Work ID & Client</Th>
                <Th>Service</Th>
                <Th>Assigned</Th>
                <Th>Status & Review</Th>
                <Th>Govt Fee</Th>
                <Th>Total Bill</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w) => (
                <tr key={w.id} className="hover:bg-[#f7fdfa] transition">
                  <Td>
                    <Link href={`/work-register/${w.id}`} className="font-black text-[#181818] hover:text-[#447a5d] hover:underline flex items-center gap-1.5">
                      {w.work_code}
                    </Link>
                    <Link href={`/clients/${w.client_id}`} className="text-[#447a5d] text-xs hover:underline font-bold mt-0.5 inline-block">
                      {clientMap[w.client_id] || "Unknown Client"}
                    </Link>
                  </Td>
                  <Td>
                    <div className="font-bold text-[#181818]">{w.service_id}</div>
                    <div className="text-[#6c7671] text-[11px] uppercase tracking-wider font-bold mt-0.5">{w.entity_type.replace('_', ' ')}</div>
                  </Td>
                  <Td>
                    <span className="font-bold">{w.assigned_to || "-"}</span>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={w.status} />
                      {w.review_status && w.review_status !== "DRAFT" && (
                        <span className="text-[10px] font-bold text-[#447a5d] bg-[#eef7f3] px-2 py-0.5 rounded-full">
                          {w.review_status.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td className="font-mono">
                    {w.government_fee !== null ? `৳ ${parseFloat(w.government_fee).toLocaleString()}` : 'Unknown'}
                  </Td>
                  <Td className="font-mono font-black text-[#181818]">
                    {w.total_bill !== null ? `৳ ${parseFloat(w.total_bill).toLocaleString()}` : 'Pending'}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/work-register/${w.id}`}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#eef7f3] px-3 py-1.5 text-xs font-bold text-[#447a5d] hover:bg-[#dff1e7] transition"
                    >
                      Manage Work
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181818]/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-[1100px] bg-[#fffaf0] rounded-2xl shadow-xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-[#ece5d9] bg-white sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-[#181818]">Start New Work</h2>
                <p className="text-[#6c7671] text-sm mt-1">Calculate fees, check documents, and generate rules.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-[#6c7671] hover:text-[#181818] transition bg-[#fce9e4] hover:bg-[#eac4bc] p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-transparent">
              <StepWorkCreation
                onSuccess={() => {
                  setIsModalOpen(false);
                  fetchAll();
                }}
                onCancel={() => setIsModalOpen(false)}
              />

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
