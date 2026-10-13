"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileText, CheckCircle2, AlertTriangle, Printer, RefreshCw, Save,
  Send, RotateCcw, ShieldCheck, ShieldAlert, Building2, Users,
  Calendar, Layers, Check, Plus, Trash2, ExternalLink, HelpCircle
} from "lucide-react";
import {
  WorkingPaper, CompanyData, DirectorRecord, ShareholderRecord,
  AgmAnalysisRow, getWorkingPaper, initWorkWorkingPaper, updateWorkingPaper,
  refreshWorkingPaperFromMaster, applyWorkingPaperReviewAction
} from "@/lib/api/working-papers";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ContentCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import FormXiiWorkingDraft from "./FormXiiWorkingDraft";
import ScheduleXWorkingDraft from "./ScheduleXWorkingDraft";
import FormsLabWorkspace from "@/components/forms-lab/FormsLabWorkspace";

interface WorkingPaperWorkspaceProps {
  workId: string;
  onSaved?: () => void;
}

export default function WorkingPaperWorkspace({ workId, onSaved }: WorkingPaperWorkspaceProps) {
  const { user } = useAuth();
  const [workingPaper, setWorkingPaper] = useState<WorkingPaper | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "company" | "directors-shares" | "agm-analysis" | "forms" | "forms-lab" | "review">("overview");

  // Selected Form in Forms tab
  const [selectedForm, setSelectedForm] = useState<"form_xii" | "schedule_x" | "form_23b">("form_xii");

  // Review action modal / notes
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // New Director row inline state
  const [newDirName, setNewDirName] = useState("");
  const [newDirDesig, setNewDirDesig] = useState("Director");
  const [newDirAppDate, setNewDirAppDate] = useState("");

  // New Shareholder row inline state
  const [newShareholderName, setNewShareholderName] = useState("");
  const [newShareCount, setNewShareCount] = useState<number>(1000);
  const [newShareValue, setNewShareValue] = useState<number>(100);

  // Load or initialize working paper for work
  const loadPaper = useCallback(async () => {
    if (!workId) return;
    try {
      const wp = await initWorkWorkingPaper(workId);
      setWorkingPaper(wp);
    } catch (err: any) {
      console.error("Failed to load working paper", err);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    loadPaper();
  }, [loadPaper]);

  // Save Working Paper changes
  const handleSaveDraft = async () => {
    if (!workingPaper) return;
    setSaving(true);
    try {
      const updated = await updateWorkingPaper(workingPaper.id, {
        company_data: workingPaper.company_data,
        directors_data: workingPaper.directors_data,
        shareholders_data: workingPaper.shareholders_data,
        agm_analysis: workingPaper.agm_analysis,
        forms_data: workingPaper.forms_data,
        notes: workingPaper.notes,
        filing_year: workingPaper.filing_year
      });
      setWorkingPaper(updated);
      if (onSaved) onSaved();
      alert("Working paper saved successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to save working paper");
    } finally {
      setSaving(false);
    }
  };

  // Re-sync from master non-destructively
  const handleRefreshMaster = async () => {
    if (!workingPaper) return;
    if (!confirm("Re-sync company and director records from Client Master? Any unsaved edits will be refreshed.")) return;
    setSaving(true);
    try {
      const refreshed = await refreshWorkingPaperFromMaster(workingPaper.id);
      setWorkingPaper(refreshed);
      alert("Refreshed data from Client Master.");
    } catch (err: any) {
      alert(err.message || "Failed to refresh from Client Master");
    } finally {
      setSaving(false);
    }
  };

  // Apply Review Action
  const handleReviewAction = async (action: "SUBMIT_FOR_REVIEW" | "APPROVE" | "RETURN_TO_DRAFT") => {
    if (!workingPaper) return;
    if (action === "RETURN_TO_DRAFT" && !reviewNotes.trim()) {
      setReviewError("Review notes are required when returning for revision.");
      return;
    }
    setReviewLoading(true);
    setReviewError("");
    try {
      const updated = await applyWorkingPaperReviewAction(workingPaper.id, {
        action,
        notes: reviewNotes.trim() || undefined
      });
      setWorkingPaper(updated);
      setReviewNotes("");
      alert(`Working paper status updated to ${updated.status}.`);
    } catch (err: any) {
      setReviewError(err.message || "Failed to update review status");
    } finally {
      setReviewLoading(false);
    }
  };

  // Company Data field changer
  const handleCompanyFieldChange = (field: keyof CompanyData, value: any) => {
    if (!workingPaper) return;
    setWorkingPaper({
      ...workingPaper,
      company_data: {
        ...workingPaper.company_data,
        [field]: value
      }
    });
  };

  // Add Director
  const handleAddDirector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingPaper || !newDirName.trim()) return;
    const newDir: DirectorRecord = {
      full_name: newDirName.trim(),
      designation: newDirDesig.trim() || "Director",
      appointment_date: newDirAppDate || "",
      is_current: true,
      nationality: "Bangladeshi",
      changes: "Newly Appointed / Added in Working Paper",
      source_document: "Manual Working Paper Entry"
    };
    setWorkingPaper({
      ...workingPaper,
      directors_data: [...workingPaper.directors_data, newDir]
    });
    setNewDirName("");
    setNewDirAppDate("");
  };

  // Remove Director
  const handleRemoveDirector = (index: number) => {
    if (!workingPaper) return;
    setWorkingPaper({
      ...workingPaper,
      directors_data: workingPaper.directors_data.filter((_, idx) => idx !== index)
    });
  };

  // Add Shareholder
  const handleAddShareholder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workingPaper || !newShareholderName.trim()) return;
    const newSh: ShareholderRecord = {
      shareholder_name: newShareholderName.trim(),
      share_count: Number(newShareCount) || 0,
      share_value: Number(newShareValue) || 100,
      total_value: (Number(newShareCount) || 0) * (Number(newShareValue) || 100),
      is_current: true,
      source_document: "Working Paper Entry"
    };
    setWorkingPaper({
      ...workingPaper,
      shareholders_data: [...workingPaper.shareholders_data, newSh]
    });
    setNewShareholderName("");
  };

  // Remove Shareholder
  const handleRemoveShareholder = (index: number) => {
    if (!workingPaper) return;
    setWorkingPaper({
      ...workingPaper,
      shareholders_data: workingPaper.shareholders_data.filter((_, idx) => idx !== index)
    });
  };

  // AGM analysis row updater
  const handleAgmRowChange = (index: number, field: keyof AgmAnalysisRow, value: any) => {
    if (!workingPaper) return;
    const updatedRows = [...workingPaper.agm_analysis];
    updatedRows[index] = {
      ...updatedRows[index],
      [field]: value
    };
    setWorkingPaper({
      ...workingPaper,
      agm_analysis: updatedRows
    });
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState />
      </div>
    );
  }

  if (!workingPaper) {
    return (
      <div className="p-8 text-center text-[#6c7671]">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500 mb-2" />
        <p className="font-bold">Unable to load working paper for this work order.</p>
      </div>
    );
  }

  const { company_data, directors_data, shareholders_data, agm_analysis, missing_fields } = workingPaper;
  const userRole = user?.role || "JUNIOR";

  return (
    <div className="space-y-6">
      {/* Workspace Top Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 rounded-2xl border border-[#d9e3df] bg-white p-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase text-[#447a5d] bg-[#eef7f3] px-2 py-0.5 rounded-md">
              {workingPaper.paper_type}
            </span>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              workingPaper.status === "APPROVED" ? "bg-[#dff1e7] text-[#234a32]" :
              workingPaper.status === "IN_REVIEW" ? "bg-[#e8f7f9] text-[#2c747d]" : "bg-amber-100 text-amber-800"
            }`}>
              {workingPaper.status.replace(/_/g, " ")}
            </span>
          </div>
          <h2 className="mt-1 text-lg font-black text-[#181818]">{workingPaper.title}</h2>
          <p className="text-xs text-[#6c7671]">
            Snapshot Filing Year: <span className="font-bold text-[#181818]">{workingPaper.filing_year || "Annual"}</span> • Prepared By: <span className="font-bold text-[#181818]">{workingPaper.prepared_by || "Staff"}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={handleRefreshMaster}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition disabled:opacity-50"
          >
            <RefreshCw size={14} /> Re-sync from Master
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Draft Snapshot"}
          </button>
        </div>
      </div>

      {/* Missing Information Alert Banner */}
      {missing_fields.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-black uppercase text-amber-900 tracking-wider">
                Attention Required: Missing Information or Source Gaps
              </h4>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {missing_fields.map((mf, idx) => (
                  <li key={idx}>
                    <span className="font-bold uppercase tracking-wide">[{mf.field}]:</span> {mf.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#d9e3df] gap-1 overflow-x-auto bg-[#fffaf0] p-1 rounded-xl">
        {[
          { key: "overview", label: "Overview & Summary", icon: FileText },
          { key: "company", label: "Company Data", icon: Building2 },
          { key: "directors-shares", label: `Directors & Shares (${directors_data.length} / ${shareholders_data.length})`, icon: Users },
          { key: "agm-analysis", label: `AGM/Return Analysis (${agm_analysis.length} Yrs)`, icon: Calendar },
          { key: "forms", label: "Interactive Drafts", icon: Layers },
          { key: "forms-lab", label: "RJSC Forms Lab (PDF Export)", icon: Printer },
          { key: "review", label: `Review & Signoff (${workingPaper.status})`, icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#447a5d] text-white shadow-sm"
                  : "text-[#6c7671] hover:bg-[#f1ece1] hover:text-[#181818]"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          <ContentCard className="p-5">
            <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-2">
              Work-Specific Snapshot Guarantee
            </h3>
            <p className="text-xs text-[#556e63] leading-relaxed">
              This working paper stores an independent, point-in-time snapshot of the client master data for <strong>{company_data.legal_name}</strong>.
              Subsequent changes made to the live Client Master (such as address updates, new director appointments, or name amendments) will <strong>NOT</strong> silently alter this working paper.
              This guarantees statutory integrity and audit readiness for the filed period.
            </p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#ece5d9] pt-4 text-xs">
              <div>
                <span className="font-bold text-[#181818]">Filing Year / Scope:</span>
                <input
                  type="text"
                  value={workingPaper.filing_year || ""}
                  onChange={(e) => setWorkingPaper({ ...workingPaper, filing_year: e.target.value })}
                  placeholder="e.g., 2023-2024"
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
                />
              </div>
              <div>
                <span className="font-bold text-[#181818]">Working Paper Notes:</span>
                <textarea
                  rows={2}
                  value={workingPaper.notes || ""}
                  onChange={(e) => setWorkingPaper({ ...workingPaper, notes: e.target.value })}
                  placeholder="Specific preparation guidelines or statutory citations..."
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2 text-xs outline-none focus:border-[#447a5d]"
                />
              </div>
            </div>
          </ContentCard>

          {/* Linked Supporting Documents */}
          <ContentCard className="p-5">
            <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-3">
              Linked Legal & Supporting Documents
            </h3>
            {workingPaper.linked_documents.length === 0 ? (
              <p className="text-xs text-[#6c7671]">No documents currently linked.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {workingPaper.linked_documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-[#ece5d9] bg-white">
                    <div>
                      <div className="font-bold text-xs text-[#181818]">{doc.document_name}</div>
                      <div className="text-[10px] text-[#6c7671] mt-0.5">
                        {doc.scope === "WORK_SUPPORTING_DOC" ? "Work Supporting Document" : "Master Legal Document"}
                      </div>
                    </div>
                    <span className="rounded-full bg-[#eef7f3] px-2 py-0.5 text-[10px] font-bold text-[#44765b]">
                      {doc.status || "ATTACHED"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ContentCard>
        </div>
      )}

      {/* TAB 2: Company Data */}
      {activeTab === "company" && (
        <div className="space-y-6">
          <ContentCard className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-black text-[#181818]">Company Legal Master Data</h3>
                <p className="text-xs text-[#6c7671]">Verified corporate identity attributes. Edits are isolated to this working paper draft.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Company Legal Name</label>
                <input
                  type="text"
                  value={company_data.legal_name}
                  onChange={(e) => handleCompanyFieldChange("legal_name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
                <div className="mt-1 text-[10px] text-[#6c7671]">Source: {company_data.sources?.legal_name || "Client Master"}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">RJSC Registration No.</label>
                <input
                  type="text"
                  value={company_data.registration_no || ""}
                  onChange={(e) => handleCompanyFieldChange("registration_no", e.target.value)}
                  placeholder="e.g., C-12345"
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
                <div className="mt-1 text-[10px] text-[#6c7671]">Source: {company_data.sources?.registration_no || "Registration Certificate"}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Entity Type</label>
                <input
                  type="text"
                  value={company_data.entity_type}
                  onChange={(e) => handleCompanyFieldChange("entity_type", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Incorporation Date</label>
                <input
                  type="date"
                  value={company_data.incorporation_date || ""}
                  onChange={(e) => handleCompanyFieldChange("incorporation_date", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
                <div className="mt-1 text-[10px] text-[#6c7671]">Source: {company_data.sources?.incorporation_date || "Certificate of Incorporation"}</div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-[#6c7671] uppercase">Registered Office Address</label>
                <textarea
                  rows={2}
                  value={company_data.registered_office || ""}
                  onChange={(e) => handleCompanyFieldChange("registered_office", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
                <div className="mt-1 text-[10px] text-[#6c7671]">Source: {company_data.sources?.registered_office || "Form VI Record"}</div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Authorized Capital (BDT)</label>
                <input
                  type="number"
                  value={company_data.authorized_capital || ""}
                  onChange={(e) => handleCompanyFieldChange("authorized_capital", Number(e.target.value) || null)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Paid-up Capital (BDT)</label>
                <input
                  type="number"
                  value={company_data.paid_up_capital || ""}
                  onChange={(e) => handleCompanyFieldChange("paid_up_capital", Number(e.target.value) || null)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">e-TIN</label>
                <input
                  type="text"
                  value={company_data.tin || ""}
                  onChange={(e) => handleCompanyFieldChange("tin", e.target.value)}
                  placeholder="12-digit TIN"
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">BIN / VAT Registration</label>
                <input
                  type="text"
                  value={company_data.bin || ""}
                  onChange={(e) => handleCompanyFieldChange("bin", e.target.value)}
                  placeholder="BIN"
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
                />
              </div>
            </div>
          </ContentCard>
        </div>
      )}

      {/* TAB 3: Directors & Shares */}
      {activeTab === "directors-shares" && (
        <div className="space-y-6">
          {/* Directors Section */}
          <ContentCard className="p-6">
            <h3 className="text-base font-black text-[#181818] mb-1">Directors & Management Register</h3>
            <p className="text-xs text-[#6c7671] mb-4">Current and historical directors for this filing period.</p>

            <Table>
              <thead>
                <tr>
                  <Th>Full Name</Th>
                  <Th>Designation</Th>
                  <Th>Appointment Date</Th>
                  <Th>Status / Changes</Th>
                  <Th>Source Reference</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {directors_data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-[#6c7671]">No director records found. Add director below.</td>
                  </tr>
                ) : (
                  directors_data.map((d, idx) => (
                    <tr key={idx}>
                      <Td className="font-bold text-[#181818]">{d.full_name}</Td>
                      <Td className="text-xs">{d.designation || "Director"}</Td>
                      <Td className="text-xs font-mono">{d.appointment_date || "—"}</Td>
                      <Td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          d.is_current ? "bg-[#dff1e7] text-[#234a32]" : "bg-gray-100 text-gray-700"
                        }`}>
                          {d.changes || (d.is_current ? "Continuing" : "Ceased")}
                        </span>
                      </Td>
                      <Td className="text-[11px] text-[#6c7671]">{d.source_document || "Form XII Record"}</Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDirector(idx)}
                          className="text-[#eb7b67] hover:text-red-700 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* Inline Add Director */}
            <form onSubmit={handleAddDirector} className="mt-4 border-t border-[#ece5d9] pt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Director Full Name"
                value={newDirName}
                onChange={(e) => setNewDirName(e.target.value)}
                className="flex-1 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <input
                type="text"
                placeholder="Designation (e.g. Managing Director)"
                value={newDirDesig}
                onChange={(e) => setNewDirDesig(e.target.value)}
                className="w-full sm:w-48 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <input
                type="date"
                value={newDirAppDate}
                onChange={(e) => setNewDirAppDate(e.target.value)}
                className="w-full sm:w-36 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <button
                type="submit"
                disabled={!newDirName.trim()}
                className="rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
              >
                Add Director
              </button>
            </form>
          </ContentCard>

          {/* Shareholders Section */}
          <ContentCard className="p-6">
            <h3 className="text-base font-black text-[#181818] mb-1">Shareholders & Member Register</h3>
            <p className="text-xs text-[#6c7671] mb-4">Equity structure and shareholding breakdown for Schedule X.</p>

            <Table>
              <thead>
                <tr>
                  <Th>Shareholder / Member Name</Th>
                  <Th className="text-right">Shares Held</Th>
                  <Th className="text-right">Share Value (BDT)</Th>
                  <Th className="text-right">Total Equity (BDT)</Th>
                  <Th className="text-right">Source</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {shareholders_data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-xs text-[#6c7671]">No shareholder records found. Add member below.</td>
                  </tr>
                ) : (
                  shareholders_data.map((s, idx) => (
                    <tr key={idx}>
                      <Td className="font-bold text-[#181818]">{s.shareholder_name}</Td>
                      <Td className="text-right font-mono text-xs">{s.share_count.toLocaleString()}</Td>
                      <Td className="text-right font-mono text-xs">৳ {s.share_value}</Td>
                      <Td className="text-right font-mono text-xs font-bold text-[#181818]">৳ {s.total_value.toLocaleString()}</Td>
                      <Td className="text-right text-[11px] text-[#6c7671]">{s.source_document || "Schedule X Register"}</Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveShareholder(idx)}
                          className="text-[#eb7b67] hover:text-red-700 text-xs font-bold"
                        >
                          Remove
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>

            {/* Inline Add Shareholder */}
            <form onSubmit={handleAddShareholder} className="mt-4 border-t border-[#ece5d9] pt-4 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Shareholder Full Name"
                value={newShareholderName}
                onChange={(e) => setNewShareholderName(e.target.value)}
                className="flex-1 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <input
                type="number"
                placeholder="Shares Count"
                value={newShareCount}
                onChange={(e) => setNewShareCount(Number(e.target.value))}
                className="w-full sm:w-32 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <input
                type="number"
                placeholder="Per Share Value"
                value={newShareValue}
                onChange={(e) => setNewShareValue(Number(e.target.value))}
                className="w-full sm:w-32 rounded-xl border border-[#d9e3df] p-2 text-xs font-bold outline-none focus:border-[#447a5d]"
              />
              <button
                type="submit"
                disabled={!newShareholderName.trim()}
                className="rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
              >
                Add Shareholder
              </button>
            </form>
          </ContentCard>
        </div>
      )}

      {/* TAB 4: AGM / Return Analysis */}
      {activeTab === "agm-analysis" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-2 text-xs text-blue-900">
              <HelpCircle className="h-4 w-4 shrink-0 text-blue-700 mt-0.5" />
              <div>
                <strong>Legal Rule Separation:</strong> AGM, Audit/DVC, and Annual Return filing are distinct statutory events.
                An audit report or ICAB DVC reference <em>does not prove</em> that an AGM was held. Filing deadlines are calculated
                only when the AGM date is independently evidenced (Sec 36: within 21 days after AGM).
              </div>
            </div>
          </div>

          <ContentCard className="p-6">
            <h3 className="text-base font-black text-[#181818] mb-1">Year-by-Year AGM, Audit/DVC & Return Analysis Worksheet</h3>
            <p className="text-xs text-[#6c7671] mb-4">Track statutory event dates, legal deadlines, and verification evidence.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-medium border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-[#dcefe7] bg-[#eef7f3]">
                    <th className="p-2.5 font-bold text-[#234a32]">Financial Year</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Prev. AGM</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Evidenced AGM Date</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Audit Report Date</th>
                    <th className="p-2.5 font-bold text-[#234a32]">DVC Ref & Date</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Return Filing Date</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Filing Deadline (Sec 36)</th>
                    <th className="p-2.5 font-bold text-[#234a32]">Compliance Assessment</th>
                  </tr>
                </thead>
                <tbody>
                  {agm_analysis.map((row, idx) => (
                    <tr key={idx} className="border-b border-[#ece5d9] hover:bg-[#fffdf7]">
                      <td className="p-2.5 font-black text-[#181818]">{row.financial_year}</td>
                      <td className="p-2.5 font-mono text-[#6c7671]">{row.previous_agm_date || "Unrecorded"}</td>
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={row.actual_agm_date || ""}
                          onChange={(e) => handleAgmRowChange(idx, "actual_agm_date", e.target.value)}
                          className="rounded-lg border border-[#d9e3df] p-1 text-xs font-bold outline-none"
                        />
                        {row.agm_evidence && (
                          <div className="text-[10px] text-[#447a5d] mt-0.5">{row.agm_evidence}</div>
                        )}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={row.audit_report_date || ""}
                          onChange={(e) => handleAgmRowChange(idx, "audit_report_date", e.target.value)}
                          className="rounded-lg border border-[#d9e3df] p-1 text-xs outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          placeholder="DVC Code"
                          value={row.dvc_reference || ""}
                          onChange={(e) => handleAgmRowChange(idx, "dvc_reference", e.target.value)}
                          className="w-24 rounded-lg border border-[#d9e3df] p-1 text-xs outline-none"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="date"
                          value={row.annual_return_filed_date || ""}
                          onChange={(e) => handleAgmRowChange(idx, "annual_return_filed_date", e.target.value)}
                          className="rounded-lg border border-[#d9e3df] p-1 text-xs outline-none"
                        />
                      </td>
                      <td className="p-2.5 font-mono font-bold text-[#181818]">
                        {row.statutory_filing_deadline || "Review Required"}
                      </td>
                      <td className="p-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          row.compliance_assessment === "COMPLIANT" ? "bg-[#dff1e7] text-[#234a32]" :
                          row.compliance_assessment === "PENDING_FILING" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"
                        }`}>
                          {row.compliance_assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ContentCard>
        </div>
      )}

      {/* TAB 5: Forms (Form XII, Schedule X) */}
      {activeTab === "forms" && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-[#d9e3df] pb-3">
            <button
              onClick={() => setSelectedForm("form_xii")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                selectedForm === "form_xii"
                  ? "bg-[#447a5d] text-white shadow-sm"
                  : "bg-white text-[#6c7671] border hover:text-[#181818]"
              }`}
            >
              Form XII (Directors & Changes)
            </button>
            <button
              onClick={() => setSelectedForm("schedule_x")}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                selectedForm === "schedule_x"
                  ? "bg-[#447a5d] text-white shadow-sm"
                  : "bg-white text-[#6c7671] border hover:text-[#181818]"
              }`}
            >
              Schedule X (Annual Return)
            </button>
          </div>

          <ContentCard className="p-6">
            {selectedForm === "form_xii" && (
              <FormXiiWorkingDraft />
            )}
            {selectedForm === "schedule_x" && (
              <ScheduleXWorkingDraft
                companyData={company_data}
                directors={directors_data}
                shareholders={shareholders_data}
                agmDate={agm_analysis[0]?.actual_agm_date || ""}
                financialYear={workingPaper.filing_year || "2023-2024"}
              />
            )}
          </ContentCard>
        </div>
      )}

      {/* TAB: Forms Lab (Official PDF Generation) */}
      {activeTab === "forms-lab" && (
        <FormsLabWorkspace workId={workId} />
      )}

      {/* TAB 6: Review & Signoff */}
      {activeTab === "review" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status & Review Controls */}
            <ContentCard className="p-6">
              <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-3">
                Working Paper Quality Review & Signoff
              </h3>
              <p className="text-xs text-[#6c7671] mb-4">
                Current Status: <span className="font-bold text-[#181818]">{workingPaper.status}</span> • Your Role: <span className="font-bold text-[#447a5d]">{userRole}</span>
              </p>

              {reviewError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-bold">
                  {reviewError}
                </div>
              )}

              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Review notes, verification findings, or audit remarks..."
                  className="w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs text-[#181818] outline-none focus:border-[#447a5d]"
                />

                <div className="flex flex-wrap gap-2">
                  {workingPaper.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={reviewLoading}
                      onClick={() => handleReviewAction("SUBMIT_FOR_REVIEW")}
                      className="rounded-xl bg-[#447a5d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send size={14} /> Submit Working Paper for Senior Review
                    </button>
                  )}

                  {workingPaper.status === "IN_REVIEW" && (
                    <>
                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewAction("APPROVE")}
                        className="rounded-xl bg-[#234a32] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#183523] transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Sign off & Approve Working Paper
                      </button>
                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => handleReviewAction("RETURN_TO_DRAFT")}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <RotateCcw size={14} /> Return to Draft for Revision
                      </button>
                    </>
                  )}

                  {workingPaper.status === "APPROVED" && (
                    <div className="rounded-xl bg-[#e7f5ec] p-3 text-xs font-bold text-[#234a32] w-full text-center">
                      ✓ Working paper officially signed off and approved by {workingPaper.approved_by || "Management"}.
                    </div>
                  )}
                </div>
              </div>
            </ContentCard>

            {/* Signoff Audit Trail */}
            <ContentCard className="p-6">
              <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-3">
                Signoff Audit Trail
              </h3>
              <div className="space-y-3 text-xs">
                <div className="rounded-xl border border-[#ece5d9] bg-white p-3">
                  <div className="font-bold text-[#181818]">Prepared By:</div>
                  <div className="text-[#6c7671] mt-0.5">{workingPaper.prepared_by || "Staff Member"}</div>
                  <div className="text-[10px] text-[#6c7671]">{new Date(workingPaper.created_at).toLocaleString()}</div>
                </div>

                <div className="rounded-xl border border-[#ece5d9] bg-white p-3">
                  <div className="font-bold text-[#181818]">Reviewed By:</div>
                  <div className="text-[#6c7671] mt-0.5">{workingPaper.reviewed_by || "Pending Review"}</div>
                  {workingPaper.reviewed_at && (
                    <div className="text-[10px] text-[#6c7671]">{new Date(workingPaper.reviewed_at).toLocaleString()}</div>
                  )}
                </div>

                <div className="rounded-xl border border-[#ece5d9] bg-white p-3">
                  <div className="font-bold text-[#181818]">Approved By:</div>
                  <div className="text-[#6c7671] mt-0.5">{workingPaper.approved_by || "Pending Signoff"}</div>
                </div>

                {workingPaper.notes && (
                  <div className="rounded-xl border border-[#ece5d9] bg-[#fcfbf7] p-3">
                    <div className="font-bold text-[#181818] mb-1">Audit Notes / History:</div>
                    <pre className="text-[11px] text-[#4b4d47] whitespace-pre-wrap font-sans">{workingPaper.notes}</pre>
                  </div>
                )}
              </div>
            </ContentCard>
          </div>
        </div>
      )}
    </div>
  );
}
