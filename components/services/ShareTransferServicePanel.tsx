"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileText, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert,
  ArrowRight, Users, RefreshCw, Save, Check, Plus, ExternalLink
} from "lucide-react";
import {
  getWorkShareTransfer, saveShareTransferProposal, applyShareTransferToMaster,
  WorkShareTransferResponse, ShareholderBalanceState
} from "@/lib/api/share-transfers";
import { ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";

interface ShareTransferServicePanelProps {
  workId: string;
  onSaved?: () => void;
}

export default function ShareTransferServicePanel({ workId, onSaved }: ShareTransferServicePanelProps) {
  const [data, setData] = useState<WorkShareTransferResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [applySuccess, setApplySuccess] = useState("");

  // Transfer Proposal State
  const [transferorName, setTransferorName] = useState("");
  const [transferorAddress, setTransferorAddress] = useState("");
  const [transfereeType, setTransfereeType] = useState<"EXISTING" | "NEW">("NEW");
  const [selectedTransferee, setSelectedTransferee] = useState("");
  const [newTransfereeName, setNewTransfereeName] = useState("");
  const [transfereeAddress, setTransfereeAddress] = useState("");
  const [shareCount, setShareCount] = useState<number>(100);
  const [nominalValue, setNominalValue] = useState<number>(100);
  const [considerationAmount, setConsiderationAmount] = useState<number>(10000);
  const [distinctiveFrom, setDistinctiveFrom] = useState<number | "">("");
  const [distinctiveTo, setDistinctiveTo] = useState<number | "">("");
  const [executionDate, setExecutionDate] = useState("");
  const [boardApprovalDate, setBoardApprovalDate] = useState("");
  const [transferNo, setTransferNo] = useState("1");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!workId) return;
    try {
      setLoading(true);
      const res = await getWorkShareTransfer(workId);
      setData(res);

      if (res.active_transfer) {
        const at = res.active_transfer;
        setTransferorName(at.transferor_name);
        setTransferorAddress(at.transferor_address || "");
        setShareCount(at.share_count);
        setNominalValue(at.nominal_value);
        setConsiderationAmount(at.consideration_amount);
        setDistinctiveFrom(at.distinctive_from ?? "");
        setDistinctiveTo(at.distinctive_to ?? "");
        setExecutionDate(at.execution_date || "");
        setBoardApprovalDate(at.board_approval_date || "");
        setTransferNo(at.transfer_no || "1");
        setNotes(at.notes || "");

        // Determine if transferee is existing
        const isExisting = res.current_shareholders.some(
          (s) => s.shareholder_name.toLowerCase() === at.transferee_name.toLowerCase()
        );
        if (isExisting) {
          setTransfereeType("EXISTING");
          setSelectedTransferee(at.transferee_name);
        } else {
          setTransfereeType("NEW");
          setNewTransfereeName(at.transferee_name);
        }
        setTransfereeAddress(at.transferee_address || "");
      } else if (res.current_shareholders.length > 0) {
        setTransferorName(res.current_shareholders[0].shareholder_name);
      }
    } catch (err) {
      console.error("Failed to load share transfer data", err);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeTransfereeName = transfereeType === "EXISTING" ? selectedTransferee : newTransfereeName;

  // Live client-side simulation of reconciliation
  const reconciliation = useMemo(() => {
    if (!data || !data.current_shareholders || !transferorName) return null;
    const totalBefore = data.total_company_shares;
    const transferor = data.current_shareholders.find(
      (s) => s.shareholder_name.toLowerCase() === transferorName.toLowerCase()
    );

    const isExceeded = transferor ? shareCount > transferor.share_count : true;

    const simulatedAfter: Array<{
      name: string;
      before: number;
      after: number;
      pctBefore: number;
      pctAfter: number;
    }> = [];

    const map: Record<string, { before: number; after: number }> = {};
    data.current_shareholders.forEach((s) => {
      map[s.shareholder_name] = { before: s.share_count, after: s.share_count };
    });

    if (transferor) {
      map[transferor.shareholder_name].after -= shareCount;
    }

    if (activeTransfereeName) {
      const matchKey = Object.keys(map).find(
        (k) => k.toLowerCase() === activeTransfereeName.trim().toLowerCase()
      );
      if (matchKey) {
        map[matchKey].after += shareCount;
      } else {
        map[activeTransfereeName.trim()] = { before: 0, after: shareCount };
      }
    }

    const totalAfter = Object.values(map).reduce((sum, item) => sum + item.after, 0);

    for (const [name, counts] of Object.entries(map)) {
      simulatedAfter.push({
        name,
        before: counts.before,
        after: counts.after,
        pctBefore: totalBefore > 0 ? (counts.before / totalBefore) * 100 : 0,
        pctAfter: totalAfter > 0 ? (counts.after / totalAfter) * 100 : 0
      });
    }

    return {
      isExceeded,
      totalBefore,
      totalAfter,
      isParity: Math.abs(totalBefore - totalAfter) < 0.001,
      rows: simulatedAfter
    };
  }, [data, transferorName, activeTransfereeName, shareCount]);

  const handleSaveProposal = async () => {
    if (!transferorName) {
      alert("Please select a transferor");
      return;
    }
    if (!activeTransfereeName) {
      alert("Please specify a transferee name");
      return;
    }
    if (shareCount <= 0) {
      alert("Share count must be greater than zero");
      return;
    }

    setSaving(true);
    setSaveSuccess("");
    try {
      await saveShareTransferProposal(workId, {
        transferor_name: transferorName,
        transferor_address: transferorAddress || undefined,
        transferee_name: activeTransfereeName,
        transferee_address: transfereeAddress || undefined,
        share_count: shareCount,
        nominal_value: nominalValue,
        paid_up_per_share: nominalValue,
        consideration_amount: considerationAmount,
        distinctive_from: distinctiveFrom === "" ? undefined : distinctiveFrom,
        distinctive_to: distinctiveTo === "" ? undefined : distinctiveTo,
        execution_date: executionDate || undefined,
        board_approval_date: boardApprovalDate || undefined,
        transfer_no: transferNo,
        notes: notes || undefined
      });
      setSaveSuccess("Share transfer proposal reconciled and saved as Draft.");
      loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save transfer proposal");
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToMaster = async () => {
    if (!confirm("AUTHORIZATION REQUIRED: Are you sure you want to commit this share transfer directly into the Client Master Shareholder Register? This will permanently update share balances.")) {
      return;
    }
    setApplying(true);
    try {
      const res = await applyShareTransferToMaster(workId);
      setApplySuccess(res.message || "Transfer successfully executed into Client Master Register!");
      loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to apply transfer to register");
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading share transfer records and balance register..." />;
  }

  if (!data) {
    return <ContentCard className="p-5 text-center text-[#6c7671]">No share transfer record found.</ContentCard>;
  }

  const isExecuted = data.active_transfer?.status === "EXECUTED_IN_REGISTER";

  return (
    <div className="space-y-6">
      {/* Service Header Banner */}
      <div className="rounded-2xl border border-[#447a5d]/30 bg-[#f4f7f5] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#447a5d] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Statutory Conveyance
              </span>
              <h2 className="text-lg font-black text-[#181818]">
                Share Transfer & Member Register Reconciliation (Form 117 / Sec 38)
              </h2>
            </div>
            <p className="text-xs text-[#447a5d] font-semibold mt-1">
              Transferor/Transferee conveyance with strict total share parity safeguard. Client Master updates only upon authorized execution.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isExecuted && (
              <span className="rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 border border-emerald-300">
                EXECUTED IN REGISTER
              </span>
            )}
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#181818] hover:bg-[#f9faf9]"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Transfer Particulars Form */}
        <div className="lg:col-span-7 space-y-5">
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Transfer Instrument Particulars</h3>
            <p className="text-xs text-[#6c7671] mb-4">
              Enter transferor, transferee, share quantity and consideration for Form 117 drafting.
            </p>

            <div className="space-y-4">
              {/* Transferor */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                  Transferor (Seller) — Current Shareholder
                </label>
                <select
                  disabled={isExecuted}
                  value={transferorName}
                  onChange={(e) => setTransferorName(e.target.value)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                >
                  {data.current_shareholders.map((s) => (
                    <option key={s.id} value={s.shareholder_name}>
                      {s.shareholder_name} (Holds {s.share_count.toLocaleString()} shares • {s.ownership_percentage ?? 0}%)
                    </option>
                  ))}
                </select>
              </div>

              {/* Transferee Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold uppercase text-[#6c7671]">
                    Transferee (Buyer)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isExecuted}
                      onClick={() => setTransfereeType("NEW")}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${transfereeType === "NEW" ? "bg-[#447a5d] text-white" : "bg-slate-100 text-[#6c7671]"}`}
                    >
                      New Transferee
                    </button>
                    <button
                      type="button"
                      disabled={isExecuted}
                      onClick={() => setTransfereeType("EXISTING")}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${transfereeType === "EXISTING" ? "bg-[#447a5d] text-white" : "bg-slate-100 text-[#6c7671]"}`}
                    >
                      Existing Shareholder
                    </button>
                  </div>
                </div>

                {transfereeType === "EXISTING" ? (
                  <select
                    disabled={isExecuted}
                    value={selectedTransferee}
                    onChange={(e) => setSelectedTransferee(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  >
                    <option value="">Select Existing Shareholder</option>
                    {data.current_shareholders.map((s) => (
                      <option key={s.id} value={s.shareholder_name}>
                        {s.shareholder_name} (Current: {s.share_count.toLocaleString()} shares)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled={isExecuted}
                    value={newTransfereeName}
                    onChange={(e) => setNewTransfereeName(e.target.value)}
                    placeholder="Full legal name of new transferee"
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                )}
              </div>

              {/* Share Count & Consideration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Shares Count
                  </label>
                  <input
                    type="number"
                    disabled={isExecuted}
                    value={shareCount}
                    onChange={(e) => setShareCount(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Consideration (BDT)
                  </label>
                  <input
                    type="number"
                    disabled={isExecuted}
                    value={considerationAmount}
                    onChange={(e) => setConsiderationAmount(Number(e.target.value))}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Form 117 Execution Date
                  </label>
                  <input
                    type="date"
                    disabled={isExecuted}
                    value={executionDate}
                    onChange={(e) => setExecutionDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Board Approval Meeting Date
                  </label>
                  <input
                    type="date"
                    disabled={isExecuted}
                    value={boardApprovalDate}
                    onChange={(e) => setBoardApprovalDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              </div>

              {/* Distinctive numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Distinctive From</label>
                  <input
                    type="number"
                    disabled={isExecuted}
                    value={distinctiveFrom}
                    onChange={(e) => setDistinctiveFrom(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 1"
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Distinctive To</label>
                  <input
                    type="number"
                    disabled={isExecuted}
                    value={distinctiveTo}
                    onChange={(e) => setDistinctiveTo(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 500"
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              </div>

              {saveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold">
                  {saveSuccess}
                </div>
              )}

              {applySuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold">
                  {applySuccess}
                </div>
              )}

              {/* Action Buttons */}
              {!isExecuted && (
                <div className="flex items-center justify-between pt-4 border-t border-[#ece5d9]">
                  <button
                    type="button"
                    onClick={handleSaveProposal}
                    disabled={saving || reconciliation?.isExceeded}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#34624a] transition disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save Transfer Proposal (Draft)"}
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyToMaster}
                    disabled={applying || !data.active_transfer}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {applying ? "Executing..." : "Apply to Shareholder Register"}
                  </button>
                </div>
              )}
            </div>
          </ContentCard>
        </div>

        {/* Right Column: Pre/Post Reconciliation Table */}
        <div className="lg:col-span-5 space-y-5">
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Shareholding Balance Reconciliation</h3>
            <p className="text-xs text-[#6c7671] mb-3">
              Mathematical parity check: Total company shares must remain constant.
            </p>

            {reconciliation && (
              <div className="space-y-4">
                {reconciliation.isExceeded && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 font-bold flex items-center gap-2">
                    <AlertTriangle size={15} />
                    Requested transfer exceeds transferor&apos;s current balance!
                  </div>
                )}

                <div className="rounded-xl border border-[#d9e3df] bg-[#f9faf9] p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="text-[#6c7671] block">Total Company Shares</span>
                    <strong className="text-sm font-black text-[#181818]">
                      {reconciliation.totalBefore.toLocaleString()} Shares
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#6c7671] block">Post-Transfer Total</span>
                    <strong className={`text-sm font-black ${reconciliation.isParity ? "text-emerald-700" : "text-red-700"}`}>
                      {reconciliation.totalAfter.toLocaleString()} Shares
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#6c7671] block">Parity Check</span>
                    <span className={`text-xs font-black ${reconciliation.isParity ? "text-emerald-700" : "text-red-700"}`}>
                      {reconciliation.isParity ? "Balanced" : "Mismatch"}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <thead>
                      <tr>
                        <Th>Shareholder</Th>
                        <Th className="text-right">Before</Th>
                        <Th className="text-right">After</Th>
                        <Th className="text-right">New %</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconciliation.rows.map((r) => {
                        const diff = r.after - r.before;
                        return (
                          <tr key={r.name}>
                            <Td className="font-semibold text-xs text-[#181818]">{r.name}</Td>
                            <Td className="text-right text-xs">{r.before.toLocaleString()}</Td>
                            <Td className="text-right text-xs font-bold">
                              {r.after.toLocaleString()}
                              {diff !== 0 && (
                                <span className={`text-[10px] ml-1 block ${diff > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                  {diff > 0 ? `+${diff.toLocaleString()}` : `${diff.toLocaleString()}`}
                                </span>
                              )}
                            </Td>
                            <Td className="text-right text-xs font-mono">{r.pctAfter.toFixed(1)}%</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
