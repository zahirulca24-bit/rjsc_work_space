"use client";

import { useEffect, useState } from "react";
import { getInvoices } from "../../lib/api/invoices";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users } from "lucide-react";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvoices().then((res) => {
      setInvoices(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  if (loading) return <div className="p-8">Loading invoices...</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ReceiptText}
        title="Billing & Invoices"
        subtitle="Manage service revenue and invoices."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Invoices" value={invoices.length} icon={ReceiptText} color="aqua" />
        <StatCard title="Paid Invoices" value={invoices.filter(i => i.status === 'PAID').length} icon={CheckCircle2} color="sage" />
        <StatCard title="Pending" value={invoices.filter(i => i.status !== 'PAID').length} icon={AlertTriangle} color="yellow" />
      </div>

      <ContentCard>
        {loading ? <LoadingState /> : invoices.length === 0 ? <EmptyState title="No invoices found" message="No invoices generated yet." icon={ReceiptText} /> : (
          <Table>
            <thead>
              <tr>
                <Th>Invoice Code</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th>Total Amount</Th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(i => (
                <tr key={i.id}>
                  <Td className="font-black text-[#181818]">{i.invoice_code}</Td>
                  <Td>{i.invoice_date}</Td>
                  <Td><StatusBadge status={i.status} /></Td>
                  <Td className="font-mono font-black text-[#447a5d]">৳³ {parseFloat(i.total_amount).toLocaleString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>
    </div>
  );

}
