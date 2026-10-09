"use client";

import { useEffect, useState } from "react";
import { getFinanceSummary, getMonthlyAnalytics, getMomGrowth, getServiceGrowth, getClientGrowth, getOutstandingAging } from "../../lib/api/analytics";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, ReceiptText, CircleDollarSign, AlertTriangle, CheckCircle2, BriefcaseBusiness, Users } from "lucide-react";

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);

  const [fin, setFin] = useState<any>(null);
  const [clientGrowth, setClientGrowth] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [aging, setAging] = useState<any>(null);

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
  const monthlyData = data.monthly || [];
  const agingData = data.aging || {};
  const clientG = data.client || {};

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={BriefcaseBusiness}
        title="Analytics & Reports"
        subtitle="Business performance metrics."
      />

      {loading ? <LoadingState /> : (
        <>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard title="Total Billed" value={`৳ ${parseFloat(sum.total_billed || '0').toLocaleString()}`} icon={CircleDollarSign} color="aqua" />
            <StatCard title="Total Collected" value={`৳ ${parseFloat(sum.total_collected || '0').toLocaleString()}`} icon={CheckCircle2} color="sage" />
            <StatCard title="Outstanding" value={`৳ ${parseFloat(sum.total_outstanding || '0').toLocaleString()}`} icon={AlertTriangle} color="coral" />
            <StatCard title="New Clients" value={clientG.new_clients_this_month || 0} icon={Users} color="yellow" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ContentCard className="p-6">
               <h2 className="text-lg font-black text-[#181818] mb-4">Monthly Trend</h2>
               {monthlyData.length === 0 ? (
                 <div className="py-8 text-center bg-[#fffdf7] border border-[#ece5d9] rounded-xl text-[#6c7671] text-sm font-bold">
                   No monthly data available yet.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {monthlyData.map((m: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center p-3 bg-[#fffdf7] border border-[#ece5d9] rounded-xl">
                       <span className="font-bold text-[#44765b]">{m.month}</span>
                       <span className="font-mono font-black text-[#181818]">৳ {parseFloat(m.billed || '0').toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
               )}
            </ContentCard>
            <ContentCard className="p-6">
               <h2 className="text-lg font-black text-[#181818] mb-4">Outstanding Aging</h2>
               {Object.keys(agingData).length === 0 ? (
                 <div className="py-8 text-center bg-[#fffdf7] border border-[#ece5d9] rounded-xl text-[#6c7671] text-sm font-bold">
                   No outstanding invoices yet.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {Object.entries(agingData).map(([k, v]) => (
                     <div key={k} className="flex justify-between items-center p-3 bg-[#fffdf7] border border-[#ece5d9] rounded-xl">
                       <span className="font-bold text-[#44765b]">{k.replace(/_/g, ' ').toUpperCase()}</span>
                       <span className="font-mono font-black text-[#a03c2a]">৳ {parseFloat(v as string || '0').toLocaleString()}</span>
                     </div>
                   ))}
                 </div>
               )}
            </ContentCard>
          </div>
        </>
      )}
    </div>
  );
}