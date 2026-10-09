"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileClock,
  Search,
  ShieldCheck,
} from "lucide-react";

import {
  ContentCard,
  EmptyState,
  LoadingState,
  PageHeader,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/SharedUI";
import {
  getAuditLogs,
  type AuditLogItem,
} from "@/lib/api/audit";


export default function AuditLogPage() {
  const [rows, setRows] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      setRows(
        await getAuditLogs({
          action: action === "ALL" ? undefined : action,
          limit: 200,
        })
      );
    } catch (err: any) {
      setError(err.message || "Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (!q) return true;

      return (
        row.entity_type.toLowerCase().includes(q) ||
        row.entity_id.toLowerCase().includes(q) ||
        (row.performed_by_name || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ShieldCheck}
        title="Audit Trail"
        subtitle="Immutable history of protected system changes."
      />

      <ContentCard>
        <div className="flex flex-col gap-3 border-b border-[#ece5d9] bg-[#fffdf7] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b4d47]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entity, ID or user..."
              className="w-full rounded-xl border border-[#d9e3df] py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#79b993]"
            />
          </div>

          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-sm"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>
        </div>

        {error ? (
          <div className="p-6 text-sm font-bold text-[#a03c2a]">
            {error}
          </div>
        ) : loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No audit records"
            message="Protected changes will appear here."
            icon={FileClock}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Entity</Th>
                <Th>Action</Th>
                <Th>Changes</Th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <Td>
                    <div className="font-bold text-[#181818]">
                      {new Date(row.created_at).toLocaleString()}
                    </div>
                  </Td>

                  <Td>
                    <div className="font-bold">
                      {row.performed_by_name || "Authenticated User"}
                    </div>
                    <div className="mt-1 max-w-[160px] truncate text-[10px] text-[#8a8f89]">
                      {row.performed_by || "-"}
                    </div>
                  </Td>

                  <Td>
                    <div className="font-black text-[#181818]">
                      {row.entity_type}
                    </div>
                    <div className="mt-1 max-w-[170px] truncate text-[10px] text-[#6c7671]">
                      {row.entity_id}
                    </div>
                  </Td>

                  <Td>
                    <StatusBadge status={row.action} />
                  </Td>

                  <Td>
                    <details className="max-w-md">
                      <summary className="cursor-pointer text-xs font-bold text-[#447a5d]">
                        View changes
                      </summary>

                      <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-[#f5f4ee] p-3 text-[10px] leading-relaxed text-[#4b4d47]">
                        {JSON.stringify(
                          {
                            old: row.old_values,
                            new: row.new_values,
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>
    </div>
  );
}
