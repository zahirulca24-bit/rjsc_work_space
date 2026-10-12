"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, CheckCircle2, AlertTriangle, Clock, RefreshCw, Plus,
  ShieldCheck, ShieldAlert, ArrowRight, ExternalLink, Calendar, Layers
} from "lucide-react";
import {
  getAnnualReturnAssessment, createAnnualReturnWork,
  AnnualReturnAssessmentResponse, AnnualReturnAssessmentYear
} from "@/lib/api/annual-returns";
import { ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";

interface AnnualReturnServicePanelProps {
  clientId: string;
  currentWorkId?: string;
  onWorkCreated?: (workId: string) => void;
}

export default function AnnualReturnServicePanel({
  clientId,
  currentWorkId,
  onWorkCreated
}: AnnualReturnServicePanelProps) {
  const [data, setData] = useState<AnnualReturnAssessmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [creatingWork, setCreatingWork] = useState(false);
  const [workNotes, setWorkNotes] = useState("");

  const loadAssessment = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      const res = await getAnnualReturnAssessment(clientId);
      setData(res);
    } catch (err) {
      console.error("Failed to load annual return assessment", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAssessment();
  }, [loadAssessment]);

  const toggleYear = (fy: string) => {
    if (selectedYears.includes(fy)) {
      setSelectedYears(selectedYears.filter((y) => y !== fy));
    } else {
      setSelectedYears([...selectedYears, fy]);
    }
  };

  const handleCreateWork = async () => {
    if (selectedYears.length === 0) {
      alert("Please select at least one financial year to initiate a Work Order.");
      return;
    }
    setCreatingWork(true);
    try {
      const res = await createAnnualReturnWork(clientId, {
        financial_years: selectedYears,
        notes: workNotes || undefined
      });
      alert(res.message || "Annual Return Work Order created successfully!");
      if (onWorkCreated) onWorkCreated(res.work_id);
      loadAssessment();
      setSelectedYears([]);
    } catch (err: any) {
      alert(err.message || "Failed to create Annual Return Work Order");
    } finally {
      setCreatingWork(false);
    }
  };

  if (loading) {
    return <LoadingState message="Analyzing statutory Annual Return compliance & financial years..." />;
  }

  if (!data) {
    return (
      <ContentCard className="p-6 text-center text-[#6c7671]">
        Unable to load Annual Return assessment for this client.
      </ContentCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statutory Header Banner */}
      <div className="rounded-2xl border border-[#447a5d]/30 bg-[#f4f7f5] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#447a5d] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Statutory Service
              </span>
              <h2 className="text-lg font-black text-[#181818]">
                Annual Return Lifecycle Assessment (Schedule X & Form XII)
              </h2>
            </div>
            <p className="text-xs text-[#447a5d] font-semibold mt-1">
              {data.statutory_rule}
            </p>
          </div>
          <button
            onClick={loadAssessment}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#181818] hover:bg-[#f9faf9]"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard title="Years Assessed" value={data.total_years_assessed} />
        <StatCard title="Filed & Closed" value={data.filed_count} icon={<CheckCircle2 size={16} className="text-emerald-700" />} />
        <StatCard title="Pending Filing" value={data.pending_count} icon={<Clock size={16} className="text-blue-700" />} />
        <StatCard title="Overdue (Sec 36)" value={data.overdue_count} icon={<AlertTriangle size={16} className="text-amber-700" />} />
        <StatCard title="Evidence Pending" value={data.uncertain_count} icon={<ShieldAlert size={16} className="text-rose-700" />} />
      </div>

      {/* Assessment Table */}
      <ContentCard className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-black text-[#181818]">Financial Year-wise Filing Status</h3>
            <p className="text-xs text-[#6c7671]">
              Select pending or overdue years to bundle into an integrated Work Order without duplicating Client Master.
            </p>
          </div>

          {selectedYears.length > 0 && (
            <button
              onClick={handleCreateWork}
              disabled={creatingWork}
              className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#34624a] transition"
            >
              <Plus size={14} />
              {creatingWork ? "Creating..." : `Initiate Work Order (${selectedYears.length} Years)`}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th className="w-10">Select</Th>
                <Th>Financial Year</Th>
                <Th>Actual AGM Date</Th>
                <Th>Audit DVC Ref</Th>
                <Th>Sec 36 Deadline</Th>
                <Th>RJSC Filed Date</Th>
                <Th>Filing Status</Th>
                <Th>Statutory Delay / Fee</Th>
                <Th>Bundled Forms</Th>
              </tr>
            </thead>
            <tbody>
              {data.assessment.map((row) => {
                const isSelected = selectedYears.includes(row.financial_year);
                return (
                  <tr key={row.financial_year} className={isSelected ? "bg-[#f4f7f5]" : ""}>
                    <Td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleYear(row.financial_year)}
                        className="rounded border-[#d9e3df] text-[#447a5d] focus:ring-[#447a5d]"
                      />
                    </Td>
                    <Td className="font-bold text-[#181818]">{row.financial_year}</Td>
                    <Td>
                      {row.actual_agm_date ? (
                        <span className="font-semibold text-emerald-800">{row.actual_agm_date}</span>
                      ) : (
                        <span className="text-xs text-[#9aa49f] italic">Pending Signed Minutes</span>
                      )}
                    </Td>
                    <Td>
                      {row.dvc_code ? (
                        <span className="font-mono text-xs text-[#181818] bg-slate-100 px-1.5 py-0.5 rounded">
                          {row.dvc_code}
                        </span>
                      ) : (
                        <span className="text-xs text-[#9aa49f]">—</span>
                      )}
                    </Td>
                    <Td>
                      {row.due_date ? (
                        <span className="font-mono text-xs">{row.due_date}</span>
                      ) : (
                        <span className="text-xs text-[#9aa49f]">Pending AGM</span>
                      )}
                    </Td>
                    <Td>
                      {row.filed_date ? (
                        <span className="font-semibold text-emerald-800">{row.filed_date}</span>
                      ) : (
                        <span className="text-xs text-[#9aa49f]">Not Filed</span>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge status={row.filing_status} />
                      {row.evidence_status === "REVIEW_REQUIRED" && (
                        <span className="mt-1 block text-[9px] font-bold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 text-center">
                          Evidence Review
                        </span>
                      )}
                    </Td>
                    <Td>
                      {row.delay_days > 0 ? (
                        <div className="text-xs">
                          <span className="font-bold text-amber-700">{row.delay_days} days</span>
                          <span className="text-[10px] text-[#6c7671] block">
                            Late fee:{" "}
                            {typeof row.statutory_late_fee === "number"
                              ? `৳${row.statutory_late_fee}`
                              : (
                                <span className="font-bold text-amber-700">
                                  {row.statutory_late_fee || "REVIEW_REQUIRED"}
                                </span>
                              )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium">On Schedule</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1 flex-wrap">
                        {row.bundled_forms.map((f) => (
                          <span
                            key={f}
                            className="rounded bg-[#ece5d9]/60 px-1.5 py-0.5 text-[9px] font-bold text-[#6c7671]"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </ContentCard>
    </div>
  );
}
