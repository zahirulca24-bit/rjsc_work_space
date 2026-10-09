"use client";

import { useEffect, useState } from "react";
import { getTransactions } from "../../lib/api/transactions";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users } from "lucide-react";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTransactions().then((res) => {
      setTransactions(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div className="p-8">Loading transactions...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={CircleDollarSign}
        title="Transactions"
        subtitle="Manage operational finance transactions."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Transactions" value={transactions.length} icon={CircleDollarSign} color="aqua" />
        <StatCard title="Collections" value={transactions.filter(t => t.transaction_type === 'COLLECTION').length} icon={CheckCircle2} color="sage" />
      </div>

      <ContentCard>
        {loading ? <LoadingState /> : transactions.length === 0 ? <EmptyState title="No transactions found" message="No transactions recorded yet." icon={CircleDollarSign} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Type</Th>
                <Th>Date</Th>
                <Th>Reference</Th>
                <Th>Amount</Th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <Td><StatusBadge status={t.transaction_type} /></Td>
                  <Td>{t.transaction_date}</Td>
                  <Td>{t.reference || '-'}</Td>
                  <Td className="font-mono font-black text-[#447a5d]">৳³ {parseFloat(t.amount).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>
    </div>
  );

}
