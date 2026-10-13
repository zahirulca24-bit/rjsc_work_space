"use client";

import { useMemo, useState, useEffect } from "react";
import { 
  BriefcaseBusiness, FileText, CheckCircle2, AlertTriangle, 
  ArrowRight, ArrowLeft, ShieldAlert, KeyRound, Calculator,
  Building2, HelpCircle
} from "lucide-react";
import { services } from "@/lib/rjsc/services";
import { calculateRJSCFee, getRequiredDocuments } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { getClients, getClientHistory } from "@/lib/api/clients";
import { listDocuments } from "@/lib/api/documents";
import { createWork } from "@/lib/api/works";
import { ContentCard } from "@/components/SharedUI";
import { computeDocumentCompleteness } from "@/lib/clients/document-completeness";

interface StepWorkCreationProps {
  onSuccess: () => void;
  onCancel?: () => void;
  initialClientId?: string;
}

type AccountAccessStatus = "AVAILABLE" | "RECOVERY_REQUIRED" | "UNKNOWN";

export function StepWorkCreation({ onSuccess, onCancel, initialClientId }: StepWorkCreationProps) {
  const [step, setStep] = useState<number>(1);
  const [clients, setClients] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string>(initialClientId || "");
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [serviceId, setServiceId] = useState<string>("annual-return");

  // Client Documents & History
  const [clientDocs, setClientDocs] = useState<any[]>([]);
  const [clientHistory, setClientHistory] = useState<any>(null);
  const [loadingData, setLoadingData] = useState<boolean>(false);

  // Annual Return Compliance Review State
  const [complianceAssessed, setComplianceAssessed] = useState<boolean>(false);
  const [missingYears, setMissingYears] = useState<string[]>([]);
  const [complianceNotes, setComplianceNotes] = useState<string>("");

  // Work Scope & Options
  const [numYearsFiling, setNumYearsFiling] = useState<number>(1);
  const [filingPeriod, setFilingPeriod] = useState<string>("");
  const [accountAccess, setAccountAccess] = useState<AccountAccessStatus>("UNKNOWN");
  const [portalRecoveryFee, setPortalRecoveryFee] = useState<number>(0);
  const [securedAmount, setSecuredAmount] = useState<number>(0);

  // Cost Breakdown Items (Separate & Itemized)
  const [manualGovtFee, setManualGovtFee] = useState<string>(""); // optional manual override if rules unverified
  const [profFee, setProfFee] = useState<number>(5000);
  const [billableDisbursements, setBillableDisbursements] = useState<number>(0);
  const [internalExpenses, setInternalExpenses] = useState<number>(300); // Staff, printing, misc (NOT billed to client)
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string>("");

  // Load clients on mount
  useEffect(() => {
    getClients().then(data => {
      setClients(data);
      if (data.length > 0) {
        const defaultId = initialClientId && data.some((c: any) => c.id === initialClientId)
          ? initialClientId
          : data[0].id;
        setClientId(defaultId);
        const sel = data.find((c: any) => c.id === defaultId);
        if (sel) setEntityType(sel.entity_type);

      }
    }).catch(console.error);
  }, [initialClientId]);

  // Load client's documents and corporate history whenever selected client changes
  useEffect(() => {
    if (!clientId) return;
    setLoadingData(true);
    Promise.all([
      listDocuments({ client_id: clientId }).catch(() => []),
      getClientHistory(clientId).catch(() => null)
    ]).then(([docs, hist]) => {
      setClientDocs(docs || []);
      setClientHistory(hist || null);
      setLoadingData(false);
    });
  }, [clientId]);

  const selectedClient = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);
  const selectedService = useMemo(() => services.find(s => s.id === serviceId) || services[4], [serviceId]);
  const availableEntities = selectedService?.entityTypes || [];
  const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

  // Document Completeness for this client
  const docCompleteness = useMemo(() => computeDocumentCompleteness(clientDocs), [clientDocs]);

  // Calculate RJSC Official Fee based on verified rules
  const feeResult = useMemo(() => {
    if (serviceId === "annual-return") {
      // Annual return documents count: 3 statutory docs per year (Schedule X, Balance Sheet, Form 23/XII)
      return calculateRJSCFee({
        serviceId,
        entityType: currentEntity,
        documentCount: numYearsFiling * 3,
      });
    }
    return calculateRJSCFee({
      serviceId,
      entityType: currentEntity,
      securedAmount
    });
  }, [serviceId, currentEntity, numYearsFiling, securedAmount]);

  const officialGovtFee = feeResult ? feeResult.totalFee : null;
  const effectiveGovtFee = manualGovtFee !== "" ? parseFloat(manualGovtFee) || 0 : officialGovtFee;

  // Billable total = Official Govt Fee (if known) + Professional Fee + Portal Recovery Fee + Billable Disbursements
  // NOTE: Internal Expenses (printing, travel, staff) are tracked separately and NOT added to client billable total.
  const totalClientBill = effectiveGovtFee !== null
    ? effectiveGovtFee + profFee + (accountAccess === "RECOVERY_REQUIRED" ? portalRecoveryFee : 0) + billableDisbursements
    : null;

  // Analysis of Corporate History for Annual Return
  const agmEvents = useMemo(() => {
    if (!clientHistory?.agm_history) return [];
    return clientHistory.agm_history;
  }, [clientHistory]);

  const returnEvents = useMemo(() => {
    if (!clientHistory?.annual_returns) return [];
    return clientHistory.annual_returns;
  }, [clientHistory]);

  // Handle Work Submission
  const handleSubmit = async () => {
    if (serviceId === "annual-return" && !/^\d{4}-\d{4}$/.test(filingPeriod.trim())) {
      setCreateError("Select an exact filing period (YYYY-YYYY) before creating an Annual Return work.");
      return;
    }
    setIsCreating(true);
    setCreateError("");
    try {
      const payload = {
        client_id: clientId,
        service_id: serviceId,
        period_or_year: serviceId === "annual-return" ? filingPeriod.trim() : undefined,
        entity_type: currentEntity,
        status: "Pending Check",
        professional_fee: profFee,
        government_fee: effectiveGovtFee,
        other_cost: billableDisbursements + (accountAccess === "RECOVERY_REQUIRED" ? portalRecoveryFee : 0),
        rule_snapshot: {
          service_id: serviceId,
          entity_type: currentEntity,
          compliance_review: {
            assessed: complianceAssessed,
            account_access: accountAccess,
            num_years_filing: numYearsFiling,
            missing_years: missingYears,
            compliance_notes: complianceNotes.trim() || undefined,
            internal_expenses_estimate: internalExpenses
          },
          fee_rule_id: feeResult?.ruleId,
          fee_source_reference: feeResult?.sourceReference,
          fee_breakdown_snapshot: feeResult?.breakdown,
          official_rate_applied: manualGovtFee === "",
          client_billable_disbursements: billableDisbursements,
          portal_recovery_charge: accountAccess === "RECOVERY_REQUIRED" ? portalRecoveryFee : 0,
          document_rule_snapshot: getRequiredDocuments(serviceId, currentEntity)
        }
      };

      await createWork(payload);
      onSuccess();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create work.");
    } finally {
      setIsCreating(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Client & Service" },
    { num: 2, label: "Documents" },
    { num: 3, label: "Compliance Review" },
    { num: 4, label: "Work Scope" },
    { num: 5, label: "Fees & Save" },
  ];

  return (
    <div className="space-y-6">
      {/* Step Progress Stepper */}
      <div className="bg-white border border-[#ece5d9] p-4 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto gap-2">
          {stepsList.map((s, idx) => {
            const isActive = step === s.num;
            const isPassed = step > s.num;
            return (
              <div key={s.num} className="flex items-center gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition ${
                    isActive
                      ? "bg-[#447a5d] text-white shadow-sm"
                      : isPassed
                      ? "bg-[#e7f5ec] text-[#234a32] hover:bg-[#d6eedf]"
                      : "bg-[#f4f7f5] text-[#6c7671] hover:bg-[#eef2ef]"
                  }`}
                >
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${
                    isActive ? "bg-white text-[#447a5d]" : isPassed ? "bg-[#79b993] text-white" : "bg-[#d9e3df] text-[#4b4d47]"
                  }`}>
                    {s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
                {idx < stepsList.length - 1 && (
                  <div className="h-0.5 w-6 bg-[#eef2f0] hidden sm:block" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {createError && (
        <div role="alert" className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{createError}</span>
        </div>
      )}

      {/* STEP 1: Select Client & Service */}
      {step === 1 && (
        <ContentCard className="p-6 space-y-6">
          <div className="border-b border-[#ece5d9] pb-4">
            <h2 className="text-lg font-black text-[#181818]">Step 1: Select Client & Service</h2>
            <p className="text-xs text-[#6c7671] mt-1">
              Select an existing client profile or create one first. Works always link to a permanent client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">Client Profile *</label>
              <select
                value={clientId}
                onChange={e => {
                  const cl = clients.find(c => c.id === e.target.value);
                  setClientId(e.target.value);
                  if (cl) setEntityType(cl.entity_type);
                }}
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white font-medium"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name} ({c.client_code || "No ID"})
                  </option>
                ))}
              </select>
              {selectedClient && (
                <div className="mt-3 p-3 rounded-xl bg-[#fffdf7] border border-[#ece5d9] text-xs space-y-1">
                  <div><span className="font-bold text-[#4b4d47]">Reg No:</span> {selectedClient.registration_no || "Not recorded"}</div>
                  <div><span className="font-bold text-[#4b4d47]">Entity:</span> {selectedClient.entity_type?.replace(/_/g, " ")}</div>
                  <div><span className="font-bold text-[#4b4d47]">Registered Office:</span> {selectedClient.registered_office_text || "Not recorded"}</div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">Service Type *</label>
              <select
                value={serviceId}
                onChange={e => setServiceId(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white font-medium"
              >
                {services.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.serviceName || s.id} ({s.category})
                  </option>
                ))}
              </select>
              <div className="mt-3 p-3 rounded-xl bg-[#eef7f3] border border-[#d9e3df] text-xs text-[#315f55]">
                <span className="font-bold">Description: </span>
                {selectedService?.description || "RJSC compliance & filing service."}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">Entity Type</label>
              <select
                value={currentEntity}
                onChange={e => setEntityType(e.target.value as EntityType)}
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white font-medium"
              >
                {availableEntities.map(x => (
                  <option key={x} value={x}>{x.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </div>
        </ContentCard>
      )}

      {/* STEP 2: Legal Documents Review */}
      {step === 2 && (
        <ContentCard className="p-6 space-y-6">
          <div className="border-b border-[#ece5d9] pb-4">
            <h2 className="text-lg font-black text-[#181818]">Step 2: Legal Documents Review</h2>
            <p className="text-xs text-[#6c7671] mt-1">
              Inspect availability of Certificate of Incorporation, Form XII, and Schedule X for {selectedClient?.legal_name}.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-[#d9e3df] bg-[#fffdf7]">
            <div className="flex justify-between items-center mb-3">
              <span className="font-black text-sm text-[#181818]">Primary Legal Core Status</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                docCompleteness.uploadedCount === 3
                  ? "bg-[#e7f5ec] text-[#234a32] border border-[#b8dfc6]"
                  : "bg-[#fff5df] text-[#715923] border border-[#f0dfb8]"
              }`}>
                {docCompleteness.scoreText} Received
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {docCompleteness.items.map(item => {
                const isMissing = item.status === "MISSING";
                const isVerified = item.status === "VERIFIED";
                return (
                  <div key={item.type} className="p-3 rounded-xl border bg-white space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-[#181818]">{item.label}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                        isMissing
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : isVerified
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                          : "bg-blue-50 text-blue-800 border border-blue-200"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    {item.documentDate && <p className="text-[10px] text-[#44765b]">Date: {item.documentDate}</p>}
                    {item.originalFilename && <p className="text-[10px] text-[#6c7671] truncate">{item.originalFilename}</p>}
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-[#6c7671] mt-4">
              Tip: Missing documents do not prevent saving a draft work, but will be required prior to filing.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-black text-sm text-[#181818]">All Uploaded Client Documents ({clientDocs.length})</h3>
            {clientDocs.length === 0 ? (
              <p className="text-xs text-[#6c7671] italic p-3 bg-[#f8faf9] rounded-xl">No documents uploaded to this client yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {clientDocs.map(d => (
                  <div key={d.id} className="p-2.5 rounded-lg border border-[#ece5d9] bg-white flex justify-between items-center text-xs">
                    <div className="truncate pr-2">
                      <div className="font-bold truncate text-[#181818]">{d.document_name}</div>
                      <div className="text-[10px] text-[#6c7671]">{d.category} · {d.status}</div>
                    </div>
                    {d.document_date && <span className="text-[10px] text-[#44765b] shrink-0 font-medium">{d.document_date}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {/* STEP 3: Compliance Review */}
      {step === 3 && (
        <ContentCard className="p-6 space-y-6">
          <div className="border-b border-[#ece5d9] pb-4">
            <h2 className="text-lg font-black text-[#181818]">Step 3: Annual Return Compliance History</h2>
            <p className="text-xs text-[#6c7671] mt-1">
              Review recorded AGM dates, Annual Return filing dates, financial years, and audit/DVC supporting evidence.
              Never assume compliance without verified records.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#e7f5ec] border border-[#b8dfc6] space-y-1">
              <span className="text-xs font-bold text-[#44765b] uppercase">Recorded AGMs ({agmEvents.length})</span>
              {agmEvents.length === 0 ? (
                <p className="text-xs text-[#6c7671] italic mt-2">No AGM dates recorded in history.</p>
              ) : (
                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {agmEvents.map((a: any, i: number) => (
                    <div key={i} className="text-xs text-[#234a32] flex justify-between">
                      <span>FY {a.financial_year}: {a.status}</span>
                      <span className="font-mono">{a.agm_date || "No date"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-[#e8f4f8] border border-[#b8e1ee] space-y-1">
              <span className="text-xs font-bold text-[#1c657d] uppercase">Recorded Annual Returns ({returnEvents.length})</span>
              {returnEvents.length === 0 ? (
                <p className="text-xs text-[#6c7671] italic mt-2">No Annual Return filings recorded in history.</p>
              ) : (
                <div className="space-y-1 mt-2 max-h-32 overflow-y-auto">
                  {returnEvents.map((r: any, i: number) => (
                    <div key={i} className="text-xs text-[#1c657d] flex justify-between">
                      <span>FY {r.financial_year}: {r.filing_status}</span>
                      <span className="font-mono">{r.filed_date || "Pending"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#fffdf7] border border-[#ece5d9] space-y-3">
            <h3 className="font-black text-sm text-[#181818]">Compliance Determination</h3>
            <p className="text-xs text-[#6c7671]">
              Audit reports and DVC certificates are supporting financial evidence, not proof of an AGM date.
              If evidence is insufficient, leave unverified and record for staff review.
            </p>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 text-xs font-bold text-[#181818]">
                <input
                  type="checkbox"
                  checked={complianceAssessed}
                  onChange={e => setComplianceAssessed(e.target.checked)}
                  className="rounded text-[#447a5d]"
                />
                Staff has reviewed corporate history & source filings for this period
              </label>

              <div>
                <label className="block text-xs font-bold text-[#44765b] uppercase mb-1">
                  Compliance Assessment Notes
                </label>
                <textarea
                  value={complianceNotes}
                  onChange={e => setComplianceNotes(e.target.value)}
                  placeholder="Record observations, e.g. 'FY 2023 AGM minutes verified from certified copy; FY 2024 pending accounts finalization.'"
                  rows={2}
                  className="w-full text-xs p-3 border border-[#d9e3df] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#79b993]"
                />
              </div>
            </div>
          </div>
        </ContentCard>
      )}

      {/* STEP 4: Work Scope & Portal Account */}
      {step === 4 && (
        <ContentCard className="p-6 space-y-6">
          <div className="border-b border-[#ece5d9] pb-4">
            <h2 className="text-lg font-black text-[#181818]">Step 4: Work Scope & Account Status</h2>
            <p className="text-xs text-[#6c7671] mt-1">
              Determine the exact scope of filing years and RJSC portal access requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">
                Number of Filing Years in this Work
              </label>
              <input
                type="text"
                value={filingPeriod}
                onChange={e => setFilingPeriod(e.target.value)}
                placeholder="Exact FY, e.g. 2025-2026"
                aria-label="Exact annual return financial year"
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl mb-3"
              />
              <input
                type="number"
                min={1}
                max={10}
                value={numYearsFiling}
                onChange={e => setNumYearsFiling(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white font-medium"
              />
              <p className="text-[11px] text-[#6c7671] mt-1">
                Each annual filing requires Schedule X + Balance sheet + Form 23/XII filings.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-2">
                RJSC Portal Account Access Status
              </label>
              <select
                value={accountAccess}
                onChange={e => setAccountAccess(e.target.value as AccountAccessStatus)}
                className="w-full px-4 py-2.5 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993] bg-white font-medium"
              >
                <option value="AVAILABLE">Available (Credentials on file)</option>
                <option value="RECOVERY_REQUIRED">Recovery Required (Authorized portal reset needed)</option>
                <option value="UNKNOWN">Unknown (Pending initial client confirmation)</option>
              </select>
            </div>

            {accountAccess === "RECOVERY_REQUIRED" && (
              <div className="md:col-span-2 p-4 rounded-xl bg-[#fff5df] border border-[#f0dfb8] space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#715923]">
                  <KeyRound className="w-4 h-4" />
                  <span>RJSC Portal Account Recovery Fee</span>
                </div>
                <p className="text-xs text-[#615b4c]">
                  Client authorized account recovery service charge. This is billed to client as professional recovery fee.
                </p>
                <input
                  type="number"
                  value={portalRecoveryFee}
                  onChange={e => setPortalRecoveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="e.g. 2500"
                  className="w-full max-w-xs px-3 py-2 text-sm border border-[#d9e3df] rounded-lg bg-white"
                />
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {/* STEP 5: Cost Structure & Save Work */}
      {step === 5 && (
        <ContentCard className="p-6 space-y-6">
          <div className="border-b border-[#ece5d9] pb-4">
            <h2 className="text-lg font-black text-[#181818]">Step 5: Itemized Cost Structure & Final Save</h2>
            <p className="text-xs text-[#6c7671] mt-1">
              Review separate itemized costs. Official government fees are calculated from verified statutory rules.
              Internal expenses are tracked for firm costing and NOT billed to the client.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Government Fees Section */}
            <div className="p-5 rounded-2xl bg-[#e7f5ec] border border-[#b8dfc6] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm font-black text-[#234a32]">Official Government Fees</div>
                  <div className="text-xs text-[#44765b] mt-0.5">
                    {feeResult ? `Rule ${feeResult.ruleId} (${feeResult.sourceReference})` : "Unverified rule"}
                  </div>
                </div>
                <div className="text-lg font-black font-mono text-[#181818]">
                  {effectiveGovtFee !== null ? `৳ ${effectiveGovtFee.toLocaleString()}` : "Manual / Review"}
                </div>
              </div>

              {feeResult?.breakdown && (
                <div className="text-xs text-[#44765b] space-y-0.5 pt-2 border-t border-[#b8dfc6]">
                  {Object.entries(feeResult.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className="font-mono">৳ {v.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <label className="block text-[11px] font-bold text-[#234a32] uppercase mb-1">
                  Manual Govt Fee Override (leave blank to use verified rule)
                </label>
                <input
                  type="number"
                  placeholder={officialGovtFee !== null ? String(officialGovtFee) : "Enter if rule unverified"}
                  value={manualGovtFee}
                  onChange={e => setManualGovtFee(e.target.value)}
                  className="w-full text-xs p-2 border border-[#b8dfc6] rounded-lg bg-white"
                />
              </div>
            </div>

            {/* Professional & Disbursement Charges */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-1">
                  Professional Service Charge (BDT)
                </label>
                <input
                  type="number"
                  value={profFee}
                  onChange={e => setProfFee(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#44765b] uppercase tracking-wider mb-1">
                  Client-Billable Disbursements (BDT)
                </label>
                <input
                  type="number"
                  value={billableDisbursements}
                  onChange={e => setBillableDisbursements(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Certified copies, stamps..."
                  className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl bg-white"
                />
                <p className="text-[10px] text-[#6c7671] mt-0.5">Direct client-chargeable out-of-pocket expenses.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6c7671] uppercase tracking-wider mb-1">
                  Internal Firm Expenses (BDT) — Internal Only
                </label>
                <input
                  type="number"
                  value={internalExpenses}
                  onChange={e => setInternalExpenses(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="Staff, printing, local transport..."
                  className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl bg-[#fffdf7]"
                />
                <p className="text-[10px] text-[#6c7671] mt-0.5">Firm operating overhead; excluded from invoice total.</p>
              </div>
            </div>
          </div>

          {/* Billing Total Summary */}
          <div className="p-5 rounded-2xl bg-[#fffaf0] border border-[#ece5d9] flex justify-between items-center">
            <div>
              <div className="text-xs font-bold text-[#6c7671] uppercase tracking-wider">Total Client Billable</div>
              <div className="text-xs text-[#44765b] mt-0.5">
                Govt Fees + Professional Services + Disbursements {accountAccess === "RECOVERY_REQUIRED" ? "+ Portal Recovery" : ""}
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-[#447a5d]">
              {totalClientBill !== null ? `৳ ${totalClientBill.toLocaleString()}` : "Pending Rule Review"}
            </div>
          </div>
        </ContentCard>
      )}

      {/* Navigation Buttons: Backward & Forward */}
      <div className="flex justify-between items-center pt-2">
        <div>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#d9e3df] bg-white text-xs font-bold text-[#4b4d47] hover:bg-[#fffdf7] transition shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" /> Previous Step
            </button>
          ) : (
            onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 rounded-xl border border-[#d9e3df] bg-white text-xs font-bold text-[#6c7671] hover:bg-[#fffdf7] transition"
              >
                Cancel
              </button>
            )
          )}
        </div>

        <div className="flex gap-3">
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#447a5d] text-xs font-bold text-white hover:bg-[#396a50] transition shadow-sm"
            >
              Next Step <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isCreating}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#447a5d] text-sm font-bold text-white hover:bg-[#396a50] transition shadow-md disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              {isCreating ? "Saving Work..." : "Save Work & Open Register"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
