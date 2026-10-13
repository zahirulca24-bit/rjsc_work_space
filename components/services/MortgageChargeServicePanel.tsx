"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, AlertTriangle, ShieldAlert, ShieldCheck,
  RefreshCw, Save, Check, Plus, ExternalLink, Calendar, Building2
} from "lucide-react";
import {
  getWorkMortgageCharge, saveMortgageChargeProposal, applyMortgageChargeToMaster,
  WorkMortgageChargeResponse
} from "@/lib/api/mortgage-charges";
import { ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";

interface MortgageChargeServicePanelProps {
  workId: string;
  onSaved?: () => void;
}

export default function MortgageChargeServicePanel({ workId, onSaved }: MortgageChargeServicePanelProps) {
  const [data, setData] = useState<WorkMortgageChargeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [commitSuccess, setCommitSuccess] = useState("");

  // Charge Particulars State
  const [chargeType, setChargeType] = useState<"CREATION" | "MODIFICATION" | "SATISFACTION">("CREATION");
  const [lender, setLender] = useState("");
  const [securedAmount, setSecuredAmount] = useState<number>(10000000);
  const [instrumentType, setInstrumentType] = useState("Deed of Mortgage / Letter of Hypothecation");
  const [instrumentDate, setInstrumentDate] = useState("");
  const [originalInstrumentDate, setOriginalInstrumentDate] = useState("");
  const [registrationDate, setRegistrationDate] = useState("");
  const [filingReference, setFilingReference] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [modificationDetails, setModificationDetails] = useState("");
  const [satisfactionDate, setSatisfactionDate] = useState("");
  const [satisfactionNocRef, setSatisfactionNocRef] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!workId) return;
    try {
      setLoading(true);
      const res = await getWorkMortgageCharge(workId);
      setData(res);

      if (res.active_charge) {
        const ac = res.active_charge;
        setChargeType(ac.charge_type);
        setLender(ac.lender);
        setSecuredAmount(ac.secured_amount);
        setInstrumentType(ac.instrument_type || "Deed of Mortgage / Letter of Hypothecation");
        setInstrumentDate(ac.instrument_date || "");
        setOriginalInstrumentDate(ac.creation_date || "");
        setRegistrationDate(ac.registration_date || "");
        setFilingReference(ac.filing_reference || "");
        setPropertyDescription(ac.property_description || "");
        setModificationDetails(ac.modification_details || "");
        setSatisfactionDate(ac.satisfaction_date || "");
        setSatisfactionNocRef(ac.satisfaction_noc_ref || "");
        setNotes(ac.notes || "");
      }
    } catch (err) {
      console.error("Failed to load mortgage charge particulars", err);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveParticulars = async () => {
    if (!lender.trim()) {
      alert("Please provide the lender bank name");
      return;
    }
    if (securedAmount <= 0) {
      alert("Secured amount must be greater than zero");
      return;
    }

    setSaving(true);
    setSaveSuccess("");
    try {
      const res = await saveMortgageChargeProposal(workId, {
        charge_type: chargeType,
        lender,
        secured_amount: securedAmount,
        instrument_type: instrumentType || undefined,
        instrument_date: instrumentDate || undefined,
        original_instrument_date: chargeType === "MODIFICATION" ? originalInstrumentDate || undefined : undefined,
        modification_date: chargeType === "MODIFICATION" ? instrumentDate || undefined : undefined,
        registration_date: registrationDate || undefined,
        filing_reference: filingReference || undefined,
        property_description: propertyDescription || undefined,
        modification_details: modificationDetails || undefined,
        satisfaction_date: satisfactionDate || undefined,
        satisfaction_noc_ref: satisfactionNocRef || undefined,
        notes: notes || undefined
      });
      setSaveSuccess("Mortgage/Charge particulars saved successfully.");
      loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to save mortgage particulars");
    } finally {
      setSaving(false);
    }
  };

  const handleCommitToMaster = async () => {
    if (chargeType !== "SATISFACTION") {
      if (!registrationDate && !data?.active_charge?.registration_date) {
        alert("Cannot commit to Register: Actual RJSC registration date is missing. Substitution of today's date is strictly prohibited.");
        return;
      }
      if (!filingReference && !data?.active_charge?.filing_reference) {
        alert("Cannot commit to Register: Source-backed registration evidence (filing reference / certificate number) is required.");
        return;
      }
    } else {
      if (!satisfactionDate && !data?.active_charge?.satisfaction_date) {
        alert("Cannot commit satisfaction: Actual satisfaction date is missing.");
        return;
      }
      if (!satisfactionNocRef && !data?.active_charge?.satisfaction_noc_ref && !filingReference && !data?.active_charge?.filing_reference) {
        alert("Cannot commit satisfaction: Source-backed evidence (Bank NOC reference or filing reference) is required.");
        return;
      }
    }

    if (!confirm("AUTHORIZATION REQUIRED: Commit this charge registration to the permanent Client Master Register of Mortgages & Charges?")) {
      return;
    }
    setCommitting(true);
    try {
      const res = await applyMortgageChargeToMaster(workId);
      setCommitSuccess(res.message || "Charge committed to Client Master!");
      loadData();
      if (onSaved) onSaved();
    } catch (err: any) {
      alert(err.message || "Failed to commit charge");
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading mortgage and charge records..." />;
  }

  if (!data) {
    return <ContentCard className="p-5 text-center text-[#6c7671]">No charge records found.</ContentCard>;
  }

  const compliance = data.statutory_compliance;

  return (
    <div className="space-y-6">
      {/* Service Header Banner */}
      <div className="rounded-2xl border border-[#447a5d]/30 bg-[#f4f7f5] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[#447a5d] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                Statutory Security
              </span>
              <h2 className="text-lg font-black text-[#181818]">
                Mortgage & Registration of Charge (Sec 159, 160 & 169)
              </h2>
            </div>
            <p className="text-xs text-[#447a5d] font-semibold mt-1">
              Statutory 21-calendar-day filing deadline tracking from instrument date. High Court condonation detection (Sec 171).
            </p>
          </div>
          <button
            onClick={loadData}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#181818] hover:bg-[#f9faf9]"
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Statutory Alert Banner */}
      {compliance.high_court_condonation_required ? (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-900 flex items-start gap-3">
          <ShieldAlert size={22} className="text-red-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-red-800">
              High Court Condonation of Delay Required (Section 171)
            </h4>
            <p className="text-xs mt-1 leading-relaxed">
              {compliance.message}
            </p>
          </div>
        </div>
      ) : compliance.statutory_deadline ? (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 flex items-start gap-3">
          <ShieldCheck size={22} className="text-emerald-700 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
              Within Statutory Filing Period
            </h4>
            <p className="text-xs mt-1">
              {compliance.message}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Charge Particulars Form */}
        <div className="lg:col-span-7 space-y-5">
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Mortgage / Charge Particulars</h3>
            <p className="text-xs text-[#6c7671] mb-4">
              Select charge action and enter instrument details for Form XVIII, XIX, or XXVIII generation.
            </p>

            <div className="space-y-4">
              {/* Charge Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Service Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setChargeType("CREATION")}
                    className={`rounded-xl border p-2 text-xs font-bold transition text-center ${chargeType === "CREATION" ? "border-[#447a5d] bg-[#447a5d] text-white" : "border-[#d9e3df] bg-white text-[#6c7671]"}`}
                  >
                    Creation (Form XVIII)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeType("MODIFICATION")}
                    className={`rounded-xl border p-2 text-xs font-bold transition text-center ${chargeType === "MODIFICATION" ? "border-[#447a5d] bg-[#447a5d] text-white" : "border-[#d9e3df] bg-white text-[#6c7671]"}`}
                  >
                    Modification (Form XIX)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChargeType("SATISFACTION")}
                    className={`rounded-xl border p-2 text-xs font-bold transition text-center ${chargeType === "SATISFACTION" ? "border-[#447a5d] bg-[#447a5d] text-white" : "border-[#d9e3df] bg-white text-[#6c7671]"}`}
                  >
                    Satisfaction (Form XXVIII)
                  </button>
                </div>
              </div>

              {/* Lender */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                  Mortgagee / Lender Bank PLC
                </label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  placeholder="e.g. Sonali Bank PLC / Eastern Bank PLC"
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              {/* Amount Secured */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                  Amount Secured (BDT)
                </label>
                <input
                  type="number"
                  value={securedAmount}
                  onChange={(e) => setSecuredAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              {/* Instrument Type & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Instrument Type</label>
                  <input
                    type="text"
                    value={instrumentType}
                    onChange={(e) => setInstrumentType(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Instrument Date (Sec 159 limit)
                  </label>
                  <input
                    type="date"
                    value={instrumentDate}
                    onChange={(e) => setInstrumentDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              </div>

              {chargeType === "MODIFICATION" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Original Mortgage Deed Date (not modification date)
                  </label>
                  <input
                    type="date"
                    value={originalInstrumentDate}
                    onChange={(e) => setOriginalInstrumentDate(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818]"
                  />
                </div>
              )}

              {/* Property Description */}
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Property Description</label>
                <textarea
                  rows={2}
                  value={propertyDescription}
                  onChange={(e) => setPropertyDescription(e.target.value)}
                  placeholder="Brief description of mortgaged land, buildings or floating charge"
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              {/* Modification Particulars */}
              {chargeType === "MODIFICATION" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Modification Details (Supplementary Sanction)
                  </label>
                  <textarea
                    rows={2}
                    value={modificationDetails}
                    onChange={(e) => setModificationDetails(e.target.value)}
                    placeholder="Details of variation in loan limit or security terms"
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              )}

              {/* Satisfaction Date */}
              {chargeType === "SATISFACTION" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Satisfaction Date</label>
                    <input
                      type="date"
                      value={satisfactionDate}
                      onChange={(e) => setSatisfactionDate(e.target.value)}
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Bank NOC Reference</label>
                    <input
                      type="text"
                      value={satisfactionNocRef}
                      onChange={(e) => setSatisfactionNocRef(e.target.value)}
                      placeholder="e.g. NOC-2024-5544"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>
                </div>
              )}

              {/* Actual RJSC Registration Evidence (Required for Master Commit) */}
              <div className="rounded-xl border border-[#d9e3df] bg-[#f9faf9] p-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#181818]">
                  <ShieldCheck size={14} className="text-[#447a5d]" />
                  <span>RJSC Registration & Evidence Particulars (Required for Commit)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                      Actual RJSC Registration Date
                    </label>
                    <input
                      type="date"
                      value={registrationDate}
                      onChange={(e) => setRegistrationDate(e.target.value)}
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                      Registration / Certificate Ref
                    </label>
                    <input
                      type="text"
                      value={filingReference}
                      onChange={(e) => setFilingReference(e.target.value)}
                      placeholder="e.g. RJSC-CHG-2024-5544"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>
                </div>
              </div>

              {saveSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold">
                  {saveSuccess}
                </div>
              )}

              {commitSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 font-bold">
                  {commitSuccess}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#ece5d9] space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleSaveParticulars}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#34624a] transition disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? "Saving..." : "Save Particulars"}
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitToMaster}
                    disabled={committing || !data.active_charge}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    {committing ? "Committing..." : "Commit to Mortgage Register"}
                  </button>
                </div>
                <p className="text-[11px] text-[#6c7671]">
                  * Statutory Audit Rule: Actual RJSC registration date and certificate reference are strictly required before committing to the Client Master. Today&apos;s date will never be auto-substituted.
                </p>
              </div>
            </div>
          </ContentCard>
        </div>

        {/* Right Column: Existing Charges History */}
        <div className="lg:col-span-5 space-y-5">
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Company Mortgage & Charge Register</h3>
            <p className="text-xs text-[#6c7671] mb-3">
              Historical and active encumbrances on company assets.
            </p>

            {data.all_charges_history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d9e3df] p-4 text-center text-xs text-[#6c7671]">
                No prior mortgages or charges recorded for this company.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Lender</Th>
                      <Th>Secured (BDT)</Th>
                      <Th>Type</Th>
                      <Th>Status</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.all_charges_history.map((c) => (
                      <tr key={c.id}>
                        <Td className="font-semibold text-xs text-[#181818]">{c.lender}</Td>
                        <Td className="text-xs font-mono">৳{c.secured_amount.toLocaleString()}</Td>
                        <Td className="text-[10px] font-bold text-[#6c7671]">{c.charge_type}</Td>
                        <Td>
                          <StatusBadge status={c.status} />
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
