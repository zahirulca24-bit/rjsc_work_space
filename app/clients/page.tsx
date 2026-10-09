"use client";

import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
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
import { AddClientModal } from "./add-client-modal";
import { getClients } from "@/lib/api/clients";
import { PageHeader, ContentCard, StatCard, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getClients();
      setClients(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(
      (c) =>
        !q ||
        c.legal_name?.toLowerCase().includes(q) ||
        c.client_code?.toLowerCase().includes(q) ||
        c.registration_no?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={Building2}
        title="Client Master"
        subtitle="Manage corporate clients and basic profiles."
        actionLabel="Add Client"
        actionOnClick={() => setIsAddModalOpen(true)}
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <StatCard title="Total Clients" value={clients.length} icon={Building2} color="aqua" />
        <StatCard title="Private Companies" value={clients.filter(c => c.entity_type === 'PRIVATE_COMPANY').length} icon={BriefcaseBusiness} color="yellow" />
        <StatCard title="Societies & Others" value={clients.filter(c => c.entity_type !== 'PRIVATE_COMPANY').length} icon={Users} color="sage" />
      </div>

      <ContentCard>
        <div className="p-4 border-b border-[#ece5d9] bg-[#fffdf7]">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4b4d47]" />
            <input
              type="text"
              placeholder="Search clients by name, ID, or Reg No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white"
            />
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-[#a03c2a] font-bold bg-[#fce9e4] m-4 rounded-xl">{error}</div>
        ) : loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
           <EmptyState title="No clients found" message="Add a new client or adjust your search filter." icon={Building2} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Client Name</Th>
                <Th>Client ID</Th>
                <Th>Reg. No</Th>
                <Th>Type</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/clients/${c.id}`} className="font-black text-[#181818] hover:text-[#447a5d] hover:underline">
                      {c.legal_name}
                    </Link>
                  </Td>
                  <Td>
                    <span className="font-bold text-[#44765b] bg-[#dff1e7] px-2 py-1 rounded-md text-[11px] uppercase tracking-wider">{c.client_code || '-'}</span>
                  </Td>
                  <Td className="font-mono font-medium">{c.registration_no || '-'}</Td>
                  <Td>
                    <span className="font-bold text-[#6c7671] text-xs uppercase tracking-wider">{c.entity_type?.replace('_', ' ')}</span>
                  </Td>
                  <Td>
                    <Link href={`/clients/${c.id}`} className="inline-flex items-center gap-1 text-[#447a5d] hover:text-[#294d45] font-bold text-sm">
                      View Profile <ChevronRight className="w-4 h-4" />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      <AddClientModal
        isOpen={isAddModalOpen}
        existingClients={clients}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchClients();
        }}
      />
    </div>
  );
}
