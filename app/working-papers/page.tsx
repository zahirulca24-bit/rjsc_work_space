"use client";

import { useMemo, useState } from "react";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users, Calculator, ClipboardList, Search } from "lucide-react";

type WPStatus = "Not Started" | "Prepared" | "Under Review" | "Final";

type WorkingPaper = {
  id: string;
  title: string;
  service: string;
  client: string;
  workId: string;
  preparedBy: string;
  reviewedBy: string;
  status: WPStatus;
  sourceDocs: string[];
  reviewerNote: string;
  conclusion: string;
};

const initialData: WorkingPaper[] = [
  {
    id: "WP-DEMO-001",
    title: "Annual Return Working Paper",
    service: "Annual Return / Returns Filing",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    workId: "DEMO-001",
    preparedBy: "Noyon",
    reviewedBy: "Md. Zahirul Islam",
    status: "Under Review",
    sourceDocs: [
      "Form-XII-2021.pdf",
      "Audited-FS-2025-26.xlsx",
      "AGM-Minutes.jpg",
    ],
    reviewerNote:
      "Verify latest Form XII and confirm whether any director change occurred after 13-Jun-2021.",
    conclusion:
      "Annual return working is in progress. Final conclusion pending latest director information and AGM verification.",
  },
];

export default function WorkingPapersPage() {
  const [items, setItems] = useState(initialData);
  const [selectedId, setSelectedId] = useState(initialData[0].id);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || items[0],
    [items, selectedId]
  );

  function updateField<K extends keyof WorkingPaper>(
    field: K,
    value: WorkingPaper[K]
  ) {
    setItems((prev) =>
      prev.map((x) =>
        x.id === selected.id ? { ...x, [field]: value } : x
      )
    );
  }


  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = items.filter(w => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || w.client.toLowerCase().includes(q) || w.id.toLowerCase().includes(q) || w.service.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "All" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const total = items.length;
  const draft = items.filter(w => w.status === "Not Started" || w.status === "Prepared").length;
  const underReview = items.filter(w => w.status === "Under Review").length;
  const completed = items.filter(w => w.status === "Final").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ClipboardList}
        title="Working Papers"
        subtitle="Prepare and review compliance filings."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Working Papers" value={total} icon={ClipboardList} color="aqua" />
        <StatCard title="Draft" value={draft} icon={FileText} color="yellow" />
        <StatCard title="Under Review" value={underReview} icon={FolderOpen} color="coral" />
        <StatCard title="Completed" value={completed} icon={CheckCircle2} color="sage" />
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
               <option value="Not Started">Not Started</option>
               <option value="Prepared">Prepared</option>
               <option value="Under Review">Under Review</option>
               <option value="Final">Final</option>
             </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No working papers found" message="Try adjusting your filters or search query." icon={ClipboardList} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>WP ID</Th>
                <Th>Client & Service</Th>
                <Th>Prepared By</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((w: any) => (
                <tr key={w.id}>
                  <Td className="font-black text-[#181818]">{w.id}</Td>
                  <Td>
                    <div className="font-bold text-[#447a5d]">{w.client}</div>
                    <div className="text-[#6c7671] text-xs font-bold mt-0.5 uppercase tracking-wider">{w.service}</div>
                  </Td>
                  <Td className="font-medium text-sm text-[#4b4d47]">{w.preparedBy}</Td>
                  <Td><StatusBadge status={w.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>
    </div>
  );
}