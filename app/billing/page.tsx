"use client";

import { useEffect, useState } from "react";
import { getInvoices } from "../../lib/api/invoices";

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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
          <p className="text-muted-foreground mt-2">Manage service revenue and invoices.</p>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">Invoice No.</th>
              <th className="p-3">Date</th>
              <th className="p-3">Total Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No invoices found.</td></tr>
            ) : invoices.map((inv) => (
              <tr key={inv.id} className="border-t">
                <td className="p-3 font-medium">{inv.invoice_no}</td>
                <td className="p-3">{inv.invoice_date}</td>
                <td className="p-3">৳ {parseFloat(inv.total_amount).toLocaleString()}</td>
                <td className="p-3">{inv.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
