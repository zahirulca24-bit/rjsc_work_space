"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, Download, CheckCircle2, AlertTriangle, ShieldCheck,
  ShieldAlert, RefreshCw, Printer, Clock, Eye, Layers, ChevronRight,
  ExternalLink, UserCheck, Check
} from "lucide-react";
import {
  TemplateInfo, PreflightResult, GeneratedFormRecord,
  getTemplateCatalog, getFormPreflight, generateFormPdf,
  getWorkGeneratedForms, reviewGeneratedForm, getDownloadUrl
} from "@/lib/api/forms-lab";
import { ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { useAuth } from "@/lib/auth/AuthProvider";

interface FormsLabWorkspaceProps {
  workId: string;
}

const PRIMARY_FORMS = [
  { code: "FORM_XII", label: "Form XII", sub: "Particulars of Directors & Managers", live: true },
  { code: "SCHEDULE_X", label: "Schedule X", sub: "Annual Summary of Share Capital & Members", live: true },
  { code: "FORM_117", label: "Form 117", sub: "Instrument of Transfer of Shares (Sec 38)", live: true },
  { code: "FORM_XVIII", label: "Form XVIII", sub: "Particulars of Mortgages & Charges (Sec 159)", live: true },
  { code: "FORM_XIX", label: "Form XIX", sub: "Modification of Mortgage or Charge (Sec 160)", live: true },
  { code: "FORM_XXVIII", label: "Form XXVIII", sub: "Satisfaction of Mortgage or Charge (Sec 169)", live: true },
  { code: "FORM_23B", label: "Form 23B", sub: "Notice by Statutory Auditor", live: true },
  { code: "FORM_VI", label: "Form VI", sub: "Situation of Registered Office", live: true },
];

export default function FormsLabWorkspace({ workId }: FormsLabWorkspaceProps) {
  const { user } = useAuth();
  const [selectedCode, setSelectedCode] = useState<string>("FORM_XII");
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [history, setHistory] = useState<GeneratedFormRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genSuccess, setGenSuccess] = useState<GeneratedFormRecord | null>(null);

  // Editable working parameters for PDF generation
  const [filingBy, setFilingBy] = useState("Zahir & Associate (Chartered Accountants)");
  const [datedStr, setDatedStr] = useState(new Date().toISOString().split("T")[0]);
  const [actualAgmDate, setActualAgmDate] = useState("");
  const [auditorName, setAuditorName] = useState("Zahir & Associate (Chartered Accountants)");
  const [registeredOffice, setRegisteredOffice] = useState("");

  // Form 117 Specific parameters
  const [transferorName, setTransferorName] = useState("");
  const [transferorAddress, setTransferorAddress] = useState("");
  const [transfereeName, setTransfereeName] = useState("");
  const [transfereeAddress, setTransfereeAddress] = useState("");
  const [shareCount, setShareCount] = useState<number | "">("");
  const [considerationAmount, setConsiderationAmount] = useState<number | "">("");
  const [distinctiveFrom, setDistinctiveFrom] = useState<number | "">("");
  const [distinctiveTo, setDistinctiveTo] = useState<number | "">("");
  const [transferNo, setTransferNo] = useState("1");
  const [boardApprovalDate, setBoardApprovalDate] = useState("");

  // Mortgage / Charge Specific parameters
  const [lender, setLender] = useState("");
  const [securedAmount, setSecuredAmount] = useState<number | "">("");
  const [instrumentType, setInstrumentType] = useState("Deed of Mortgage / Hypothecation");
  const [instrumentDate, setInstrumentDate] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");
  const [modificationDate, setModificationDate] = useState("");
  const [modificationDetails, setModificationDetails] = useState("");
  const [satisfactionDate, setSatisfactionDate] = useState("");

  // Review modal / action state
  const [reviewingRecordId, setReviewingRecordId] = useState<string | null>(null);
  const [reviewTargetStatus, setReviewTargetStatus] = useState<string>("REVIEWED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadData = useCallback(async () => {
    if (!workId) return;
    try {
      setLoading(true);
      const [tmplList, histList, pre] = await Promise.all([
        getTemplateCatalog().catch(() => []),
        getWorkGeneratedForms(workId).catch(() => []),
        getFormPreflight(workId, selectedCode).catch(() => null)
      ]);
      setTemplates(tmplList);
      setHistory(histList);
      setPreflight(pre);
      if (pre?.snapshot_preview?.registered_office) {
        setRegisteredOffice(pre.snapshot_preview.registered_office);
      }
    } catch (err: any) {
      console.error("Failed to load forms lab data", err);
    } finally {
      setLoading(false);
    }
  }, [workId, selectedCode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectForm = async (code: string) => {
    setSelectedCode(code);
    setGenError("");
    setGenSuccess(null);
    try {
      const pre = await getFormPreflight(workId, code);
      setPreflight(pre);
    } catch (err: any) {
      console.error("Failed to fetch preflight for " + code, err);
    }
  };

  const handleGeneratePdf = async () => {
    setGenerating(true);
    setGenError("");
    setGenSuccess(null);
    try {
      const payload: any = {
        filing_by: filingBy,
        dated_str: datedStr,
        actual_agm_date: actualAgmDate || undefined,
        auditor_name: auditorName || undefined,
        overrides: {
          registered_office: registeredOffice || undefined
        }
      };

      if (selectedCode === "FORM_117") {
        if (transferorName) payload.transferor_name = transferorName;
        if (transferorAddress) payload.transferor_address = transferorAddress;
        if (transfereeName) payload.transferee_name = transfereeName;
        if (transfereeAddress) payload.transferee_address = transfereeAddress;
        if (shareCount !== "") payload.share_count = Number(shareCount);
        if (considerationAmount !== "") payload.consideration_amount = Number(considerationAmount);
        if (distinctiveFrom !== "") payload.distinctive_from = Number(distinctiveFrom);
        if (distinctiveTo !== "") payload.distinctive_to = Number(distinctiveTo);
        if (transferNo) payload.transfer_no = transferNo;
        if (boardApprovalDate) payload.board_approval_date = boardApprovalDate;
      }

      if (selectedCode === "FORM_XVIII" || selectedCode === "FORM_XIX" || selectedCode === "FORM_XXVIII") {
        if (lender) payload.lender = lender;
        if (securedAmount !== "") payload.secured_amount = Number(securedAmount);
        if (instrumentType) payload.instrument_type = instrumentType;
        if (instrumentDate) payload.instrument_date = instrumentDate;
        if (propertyDescription) payload.property_description = propertyDescription;
        if (modificationDate) payload.modification_date = modificationDate;
        if (modificationDetails) payload.modification_details = modificationDetails;
        if (satisfactionDate) payload.satisfaction_date = satisfactionDate;
      }

      const res = await generateFormPdf(workId, selectedCode, payload);
      setGenSuccess(res);
      // Reload history
      const hist = await getWorkGeneratedForms(workId);
      setHistory(hist);
    } catch (err: any) {
      setGenError(err.message || "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleReviewAction = async (recordId: string) => {
    setSubmittingReview(true);
    try {
      await reviewGeneratedForm(recordId, {
        new_status: reviewTargetStatus,
        review_notes: reviewNotes
      });
      setReviewingRecordId(null);
      setReviewNotes("");
      const hist = await getWorkGeneratedForms(workId);
      setHistory(hist);
    } catch (err: any) {
      alert("Review action failed: " + err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const isSeniorOrAdmin = user?.role === "ADMIN" || user?.role === "SENIOR" || user?.role === "MANAGER";

  return (
    <div className="space-y-6">
      {/* Official Lab Header & Safety Banner */}
      <div className="rounded-2xl border border-[#d9e3df] bg-[#fffdfa] p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#181818] flex items-center gap-2">
              <Layers className="text-[#447a5d]" size={20} />
              RJSC Forms Lab & Official PDF Generation
            </h2>
            <p className="text-xs text-[#6c7671] mt-0.5">
              Generates pixel-aligned, upload-ready statutory PDFs directly onto approved RJSC vector templates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-800">
              <ShieldCheck size={14} /> Official Template Overlay
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-700" />
          <div>
            <strong>Manual Portal Submission Model:</strong> PDFs produced here are strictly upload-ready vector outputs for staff to review and manually upload to the official RJSC online portal. The application never automates portal login or external credential handling.
          </div>
        </div>
      </div>

      {/* Form Selection Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRIMARY_FORMS.map((f) => (
          <button
            key={f.code}
            type="button"
            onClick={() => handleSelectForm(f.code)}
            className={`p-3.5 rounded-xl border text-left transition ${
              selectedCode === f.code
                ? "border-[#447a5d] bg-[#f2f8f5] ring-1 ring-[#447a5d]"
                : "border-[#d9e3df] bg-white hover:border-[#447a5d] hover:bg-[#faf9f5]"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm text-[#181818]">{f.label}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Live Ready
              </span>
            </div>
            <div className="text-[11px] text-[#6c7671] mt-1 line-clamp-1">{f.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols): Pre-flight check & Generator Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* Pre-flight Card */}
          <ContentCard className="p-5">
            <div className="flex items-center justify-between border-b border-[#ece5d9] pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-[#181818]">
                  Pre-flight Verification: {preflight?.form_title || selectedCode}
                </h3>
                <p className="text-xs text-[#6c7671]">Verifying verified Client Master data before PDF generation.</p>
              </div>
              <button
                type="button"
                onClick={loadData}
                className="text-xs font-bold text-[#447a5d] hover:text-[#2d523e] inline-flex items-center gap-1"
              >
                <RefreshCw size={13} /> Re-check
              </button>
            </div>

            {loading ? (
              <LoadingState />
            ) : (
              <div className="space-y-4">
                {/* Verified Fields */}
                <div>
                  <h4 className="text-xs font-black uppercase text-[#24523c] tracking-wider mb-2 flex items-center gap-1">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Evidenced Master Fields
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {preflight?.verified_fields.map((v, i) => (
                      <div key={i} className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-2 text-xs">
                        <span className="text-[#6c7671] font-medium">{v.field.replace("_", " ")}: </span>
                        <span className="font-bold text-[#181818]">{v.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Data Warnings */}
                {preflight?.missing_fields && preflight.missing_fields.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase text-amber-700 tracking-wider mb-2 flex items-center gap-1">
                      <AlertTriangle size={14} /> Missing Required Data
                    </h4>
                    <div className="space-y-1">
                      {preflight.missing_fields.map((m, i) => (
                        <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 font-medium">
                          • {m}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Statutory Caveats */}
                {preflight?.warnings && preflight.warnings.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                    <strong>Statutory Advisory:</strong>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      {preflight.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ContentCard>

          {/* Generator Parameters & Working Values */}
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Working Values & Filing Parameters</h3>
            <p className="text-xs text-[#6c7671] mb-4">
              Staff overrides apply strictly to this generated PDF without altering permanent Client Master.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Presented for Filing By</label>
                <input
                  type="text"
                  value={filingBy}
                  onChange={(e) => setFilingBy(e.target.value)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Dated of Filing / Return</label>
                <input
                  type="date"
                  value={datedStr}
                  onChange={(e) => setDatedStr(e.target.value)}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              {selectedCode === "SCHEDULE_X" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">
                    Evidenced AGM Date (Sec 36)
                  </label>
                  <input
                    type="date"
                    value={actualAgmDate}
                    onChange={(e) => setActualAgmDate(e.target.value)}
                    placeholder="YYYY-MM-DD"
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                  <span className="text-[10px] text-[#6c7671]">Must match evidenced shareholder meeting.</span>
                </div>
              )}

              {selectedCode === "FORM_23B" && (
                <div>
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Statutory Auditor Firm</label>
                  <input
                    type="text"
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              )}

              {selectedCode === "FORM_117" && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Transfer Instrument No.</label>
                    <input
                      type="text"
                      value={transferNo}
                      onChange={(e) => setTransferNo(e.target.value)}
                      placeholder="e.g. 1"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Board Approval Resolution Date</label>
                    <input
                      type="date"
                      value={boardApprovalDate}
                      onChange={(e) => setBoardApprovalDate(e.target.value)}
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                    <span className="text-[10px] text-[#6c7671]">Date board passed resolution approving transfer.</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Transferor (Seller) Name</label>
                    <input
                      type="text"
                      value={transferorName}
                      onChange={(e) => setTransferorName(e.target.value)}
                      placeholder="Leave blank to use primary shareholder"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Transferor Residential Address</label>
                    <input
                      type="text"
                      value={transferorAddress}
                      onChange={(e) => setTransferorAddress(e.target.value)}
                      placeholder="Address of transferor"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Transferee (Buyer) Name</label>
                    <input
                      type="text"
                      value={transfereeName}
                      onChange={(e) => setTransfereeName(e.target.value)}
                      placeholder="Full legal name of transferee"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Transferee Address</label>
                    <input
                      type="text"
                      value={transfereeAddress}
                      onChange={(e) => setTransfereeAddress(e.target.value)}
                      placeholder="Address of transferee"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Shares Count Transferred</label>
                    <input
                      type="number"
                      value={shareCount}
                      onChange={(e) => setShareCount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Total Consideration (BDT)</label>
                    <input
                      type="number"
                      value={considerationAmount}
                      onChange={(e) => setConsiderationAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="Sum in Taka (e.g. 50000)"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Distinctive No. From</label>
                    <input
                      type="number"
                      value={distinctiveFrom}
                      onChange={(e) => setDistinctiveFrom(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 1"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Distinctive No. To</label>
                    <input
                      type="number"
                      value={distinctiveTo}
                      onChange={(e) => setDistinctiveTo(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 500"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>
                </>
              )}

              {selectedCode === "FORM_VI" && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Registered Office Address</label>
                  <input
                    type="text"
                    value={registeredOffice}
                    onChange={(e) => setRegisteredOffice(e.target.value)}
                    className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                  />
                </div>
              )}

              {(selectedCode === "FORM_XVIII" || selectedCode === "FORM_XIX" || selectedCode === "FORM_XXVIII") && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Mortgagee / Lender Bank</label>
                    <input
                      type="text"
                      value={lender}
                      onChange={(e) => setLender(e.target.value)}
                      placeholder="e.g. Sonali Bank PLC / Eastern Bank PLC"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Amount Secured (BDT)</label>
                    <input
                      type="number"
                      value={securedAmount}
                      onChange={(e) => setSecuredAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 25000000"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Instrument Type</label>
                    <input
                      type="text"
                      value={instrumentType}
                      onChange={(e) => setInstrumentType(e.target.value)}
                      placeholder="e.g. Deed of Mortgage / Hypothecation"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Instrument Date (Sec 159 21-day limit)</label>
                    <input
                      type="date"
                      value={instrumentDate}
                      onChange={(e) => setInstrumentDate(e.target.value)}
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Property Description</label>
                    <textarea
                      rows={2}
                      value={propertyDescription}
                      onChange={(e) => setPropertyDescription(e.target.value)}
                      placeholder="Brief particulars of property mortgaged or charged"
                      className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                    />
                  </div>

                  {selectedCode === "FORM_XIX" && (
                    <>
                      <div>
                        <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Modification Deed Date</label>
                        <input
                          type="date"
                          value={modificationDate}
                          onChange={(e) => setModificationDate(e.target.value)}
                          className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Modification Particulars</label>
                        <textarea
                          rows={2}
                          value={modificationDetails}
                          onChange={(e) => setModificationDetails(e.target.value)}
                          placeholder="Details of variation in terms or enhancement of credit limit"
                          className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                        />
                      </div>
                    </>
                  )}

                  {selectedCode === "FORM_XXVIII" && (
                    <div>
                      <label className="block text-xs font-bold uppercase text-[#6c7671] mb-1">Satisfaction Date (Bank NOC)</label>
                      <input
                        type="date"
                        value={satisfactionDate}
                        onChange={(e) => setSatisfactionDate(e.target.value)}
                        className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-semibold text-[#181818] outline-none focus:border-[#447a5d]"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Error & Success Messages */}
            {genError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-900 font-bold">
                Error: {genError}
              </div>
            )}

            {genSuccess && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    Generated Upload-ready PDF (v{genSuccess.version})
                  </div>
                  <div className="text-[11px] text-[#6c7671] mt-0.5">
                    {genSuccess.file_name} • {(genSuccess.file_size / 1024).toFixed(1)} KB • {genSuccess.page_count} pages
                  </div>
                </div>
                <a
                  href={getDownloadUrl(genSuccess.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#34624a] transition"
                >
                  <Download size={14} /> Download PDF
                </a>
              </div>
            )}

            {/* Generate Action Button */}
            <div className="mt-5 pt-4 border-t border-[#ece5d9] flex justify-end">
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#34624a] transition disabled:opacity-50"
              >
                {generating ? <RefreshCw size={15} className="animate-spin" /> : <FileText size={15} />}
                Generate Upload-Ready PDF ({selectedCode})
              </button>
            </div>
          </ContentCard>
        </div>

        {/* Right Column: Version History & Review Sign-off */}
        <div className="space-y-6">
          <ContentCard className="p-5">
            <h3 className="text-base font-black text-[#181818] mb-1">Generated PDF History</h3>
            <p className="text-xs text-[#6c7671] mb-4">Versioned files generated for this work order.</p>

            {history.length === 0 ? (
              <div className="text-center p-8 border border-dashed rounded-xl text-[#6c7671] text-xs">
                No forms generated yet. Click Generate to produce your first upload-ready PDF draft.
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-xl border border-[#d9e3df] bg-[#fcfbf7] p-3.5 space-y-2 hover:border-[#447a5d] transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-xs text-[#181818]">
                          {rec.form_code} (v{rec.version})
                        </div>
                        <div className="text-[10px] text-[#6c7671]">
                          {new Date(rec.created_at).toLocaleString()} • {(rec.file_size / 1024).toFixed(0)} KB • {rec.page_count} pg
                        </div>
                      </div>
                      <StatusBadge status={rec.status} />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#ece5d9]">
                      <a
                        href={getDownloadUrl(rec.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#447a5d] hover:underline"
                      >
                        <Download size={13} /> Download
                      </a>

                      {isSeniorOrAdmin && rec.status !== "APPROVED_FOR_PORTAL_UPLOAD" && (
                        <button
                          type="button"
                          onClick={() => setReviewingRecordId(rec.id)}
                          className="text-[11px] font-bold text-[#234a32] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-lg transition"
                        >
                          Sign Off / Approve
                        </button>
                      )}
                    </div>

                    {/* Inline Review Panel if active */}
                    {reviewingRecordId === rec.id && (
                      <div className="mt-3 p-3 rounded-lg border border-emerald-200 bg-white space-y-2">
                        <div className="text-xs font-bold text-[#181818]">Sign-off Generated PDF v{rec.version}</div>
                        <select
                          value={reviewTargetStatus}
                          onChange={(e) => setReviewTargetStatus(e.target.value)}
                          className="w-full text-xs p-1.5 rounded border border-[#d9e3df]"
                        >
                          <option value="REVIEWED">Mark REVIEWED (Internal QA Passed)</option>
                          <option value="APPROVED_FOR_PORTAL_UPLOAD">Approve for Manual Portal Upload</option>
                        </select>
                        <textarea
                          placeholder="Review notes or cross-check reference..."
                          value={reviewNotes}
                          onChange={(e) => setReviewNotes(e.target.value)}
                          className="w-full text-xs p-2 rounded border border-[#d9e3df] h-14"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setReviewingRecordId(null)}
                            className="text-xs px-2 py-1 text-[#6c7671]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewAction(rec.id)}
                            disabled={submittingReview}
                            className="text-xs px-3 py-1 bg-[#447a5d] text-white font-bold rounded"
                          >
                            Submit Sign-off
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </div>
      </div>
    </div>
  );
}
