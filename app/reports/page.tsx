"use client";

import { useEffect, useState } from "react";
import { getFinanceSummary, getMonthlyAnalytics, getMomGrowth, getServiceGrowth, getClientGrowth, getOutstandingAging } from "../../lib/api/analytics";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});

  useEffect(() => {
    async function load() {
      try {
        const [summary, monthly, mom, service, client, aging] = await Promise.all([
          getFinanceSummary(),
          getMonthlyAnalytics(new Date().getFullYear()),
          getMomGrowth(),
          getServiceGrowth(),
          getClientGrowth(),
          getOutstandingAging()
        ]);
        setData({ summary, monthly, mom, service, client, aging });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="p-8">Loading Analytics...</div>;

  const m = data.mom || {};
  const sum = data.summary || {};

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">RJSC Growth Analytics</h1>
        <p className="text-muted-foreground mt-2">Real-time financial and operational metrics.</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-md p-4">
          <div className="text-sm text-muted-foreground">Overall Billed</div>
          <div className="text-2xl font-bold">৳ {parseFloat(sum.billed || "0").toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            MoM: {m.billed_mom !== null ? `${(parseFloat(m.billed_mom) * 100).toFixed(1)}%` : 'N/A'} |
            YoY: {m.billed_yoy !== null ? `${(parseFloat(m.billed_yoy) * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-muted-foreground">Overall Collected</div>
          <div className="text-2xl font-bold">৳ {parseFloat(sum.collection || "0").toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            MoM: {m.collected_mom !== null ? `${(parseFloat(m.collected_mom) * 100).toFixed(1)}%` : 'N/A'} |
            YoY: {m.collected_yoy !== null ? `${(parseFloat(m.collected_yoy) * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-muted-foreground">Professional Fee</div>
          <div className="text-2xl font-bold">৳ {parseFloat(sum.professional_fee || "0").toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            MoM: {m.professional_fee_mom !== null ? `${(parseFloat(m.professional_fee_mom) * 100).toFixed(1)}%` : 'N/A'} |
            YoY: {m.professional_fee_yoy !== null ? `${(parseFloat(m.professional_fee_yoy) * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-muted-foreground">Outstanding</div>
          <div className="text-2xl font-bold text-destructive">৳ {parseFloat(sum.outstanding || "0").toLocaleString()}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Outstanding Aging */}
        <div className="border rounded-md p-4">
          <h2 className="text-xl font-bold mb-4">Outstanding Aging (Days)</h2>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr><th className="p-2">Age Since Invoice</th><th className="p-2">Invoices</th><th className="p-2">Amount</th></tr>
            </thead>
            <tbody>
              {data.aging?.map((a: any) => (
                <tr key={a.age_since_invoice} className="border-t">
                  <td className="p-2">{a.age_since_invoice}</td>
                  <td className="p-2">{a.invoice_count}</td>
                  <td className="p-2">৳ {parseFloat(a.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Monthly Trend */}
        <div className="border rounded-md p-4">
          <h2 className="text-xl font-bold mb-4">Monthly Trend ({new Date().getFullYear()})</h2>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr><th className="p-2">Month</th><th className="p-2">Billed</th><th className="p-2">Collected</th><th className="p-2">New Clients</th></tr>
            </thead>
            <tbody>
              {data.monthly?.map((m: any) => (
                <tr key={m.month} className="border-t">
                  <td className="p-2">{m.month}</td>
                  <td className="p-2">৳ {parseFloat(m.billed).toLocaleString()}</td>
                  <td className="p-2">৳ {parseFloat(m.collected).toLocaleString()}</td>
                  <td className="p-2">{m.new_clients}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Service Wise */}
        <div className="border rounded-md p-4">
          <h2 className="text-xl font-bold mb-4">Service-Wise Performance</h2>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr><th className="p-2">Service ID</th><th className="p-2">Works</th><th className="p-2">Billed</th></tr>
            </thead>
            <tbody>
              {data.service?.map((s: any) => (
                <tr key={s.service_id} className="border-t">
                  <td className="p-2">{s.service_id}</td>
                  <td className="p-2">{s.work_count}</td>
                  <td className="p-2">৳ {parseFloat(s.billed).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Client Activity */}
        <div className="border rounded-md p-4">
          <h2 className="text-xl font-bold mb-4">Top Client Activity</h2>
          <table className="w-full text-sm text-left">
            <thead className="bg-muted">
              <tr><th className="p-2">Client</th><th className="p-2">Works</th><th className="p-2">Outstanding</th></tr>
            </thead>
            <tbody>
              {data.client?.slice(0, 5).map((c: any) => (
                <tr key={c.client_id} className="border-t">
                  <td className="p-2 truncate max-w-xs">{c.legal_name}</td>
                  <td className="p-2">{c.work_count}</td>
                  <td className="p-2 text-destructive">৳ {parseFloat(c.outstanding).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
