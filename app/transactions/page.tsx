"use client";

import { useEffect, useState } from "react";
import { getTransactions } from "../../lib/api/transactions";

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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-2">View collection and payments.</p>
        </div>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted">
            <tr>
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No transactions found.</td></tr>
            ) : transactions.map((txn) => (
              <tr key={txn.id} className="border-t">
                <td className="p-3">{txn.transaction_date}</td>
                <td className="p-3 font-medium">{txn.transaction_type}</td>
                <td className="p-3">৳ {parseFloat(txn.amount).toLocaleString()}</td>
                <td className="p-3">{txn.reference || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
