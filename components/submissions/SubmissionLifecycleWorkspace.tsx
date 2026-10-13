"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert,
  Send, RefreshCw, Clock, ArrowRight, UserCheck, Check, Plus,
  Calendar, RotateCcw, Building2, ExternalLink, HelpCircle, AlertCircle,
  Truck, Archive, BadgeCheck, XCircle, ChevronDown, ChevronUp
} from "lucide-react";
import {
  PreSubmissionReview, WorkSubmissionRecord, WorkQueryRecord,
  WorkDeliveryRecord, SubmissionLifecycleHistory,
  getPreSubmissionReview, recordManualSubmission,
  getSubmissionLifecycleHistory, recordRjscQuery,
  updateRjscQuery, recordResubmission, recordFinalDecisionAndDelivery
} from "@/lib/api/submissions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ContentCard, StatCard, StatusBadge, LoadingState } from "@/components/SharedUI";

interface SubmissionLifecycleWorkspaceProps {
  workId: string;
  onWorkUpdated?: () => void;
}

export default function SubmissionLifecycleWorkspace({
  workId,
  onWorkUpdated
}: SubmissionLifecycleWorkspaceProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [preReview, setPreReview] = useState<PreSubmissionReview | null>(null);
  const [history, setHistory] = useState<SubmissionLifecycleHistory | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"readiness" | "timeline" | "queries" | "delivery">("timeline");

  // Modals
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [selectedSubForQuery, setSelectedSubForQuery] = useState<string | null>(null);
  const [resubModalOpen, setResubModalOpen] = useState(false);
  const [selectedParentSub, setSelectedParentSub] = useState<WorkSubmissionRecord | null>(null);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  // Form states - Initial Submission
  const [subDate, setSubDate] = useState(new Date().toISOString().slice(0, 16));
  const [subStaff, setSubStaff] = useState(user?.name || user?.email || "");
  const [subTrackingNo, setSubTrackingNo] = useState("");
  const [subAckRef, setSubAckRef] = useState("");
  const [subChallanRef, setSubChallanRef] = useState("");
  const [subNotes, setSubNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subError, setSubError] = useState("");

  // Form states - Query / Objection
  const [queryDate, setQueryDate] = useState(new Date().toISOString().slice(0, 10));
  const [queryRef, setQueryRef] = useState("");
  const [querySubject, setQuerySubject] = useState("");
  const [queryDesc, setQueryDesc] = useState("");
  const [queryStaff, setQueryStaff] = useState(user?.name || "");
  const [queryDeadline, setQueryDeadline] = useState("");
  const [createTask, setCreateTask] = useState(true);
  const [savingQuery, setSavingQuery] = useState(false);
  const [queryError, setQueryError] = useState("");

  // Form states - Resubmission
  const [resubDate, setResubDate] = useState(new Date().toISOString().slice(0, 16));
  const [resubStaff, setResubStaff] = useState(user?.name || user?.email || "");
  const [resubTrackingNo, setResubTrackingNo] = useState("");
  const [resubAckRef, setResubAckRef] = useState("");
  const [resubQueryId, setResubQueryId] = useState("");
  const [resubResolutionNotes, setResubResolutionNotes] = useState("");
  const [resubNotes, setResubNotes] = useState("");
  const [resubmittingAction, setResubmittingAction] = useState(false);
  const [resubError, setResubError] = useState("");

  // Form states - Delivery & Outcome
  const [delOutcome, setDelOutcome] = useState<"APPROVED" | "CERTIFIED_COPY_ISSUED" | "REJECTED">("APPROVED");
  const [delOutcomeDate, setDelOutcomeDate] = useState(new Date().toISOString().slice(0, 10));
  const [delApprovalRef, setDelApprovalRef] = useState("");
  const [delCertDocName, setDelCertDocName] = useState("");
  const [delDate, setDelDate] = useState(new Date().toISOString().slice(0, 16));
  const [delStaff, setDelStaff] = useState(user?.name || user?.email || "");
  const [delMethod, setDelMethod] = useState<string>("HAND_DELIVERY");
  const [delClientAckRef, setDelClientAckRef] = useState("");
  const [delNotes, setDelNotes] = useState("");
  const [delCloseWork, setDelCloseWork] = useState(true);
  const [savingDelivery, setSavingDelivery] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");

  const loadData = useCallback(async () => {
    if (!workId) return;
    try {
      setLoading(true);
      const [pr, hist] = await Promise.all([
        getPreSubmissionReview(workId).catch(() => null),
        getSubmissionLifecycleHistory(workId).catch(() => null)
      ]);
      setPreReview(pr);
      setHistory(hist);
      if (hist && hist.submissions.length > 0) {
        setActiveSubTab("timeline");
      } else {
        setActiveSubTab("readiness");
      }
    } catch (err) {
      console.error("Failed to load submission data", err);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Initial Manual Submission
  const handleRecordSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubError("");
    if (!subTrackingNo.trim()) {
      setSubError("RJSC filing/tracking number is required.");
      return;
    }
    setSubmitting(true);
    try {
      await recordManualSubmission(workId, {
        submitted_at: new Date(subDate).toISOString(),
        submitted_by: subStaff.trim() || user?.email || "Office Staff",
        rjsc_tracking_no: subTrackingNo.trim(),
        portal_ack_ref: subAckRef.trim() || undefined,
        govt_fee_challan_ref: subChallanRef.trim() || undefined,
        notes: subNotes.trim() || undefined,
      });
      setSubModalOpen(false);
      setSubTrackingNo("");
      setSubAckRef("");
      setSubChallanRef("");
      setSubNotes("");
      await loadData();
      if (onWorkUpdated) onWorkUpdated();
    } catch (err: any) {
      setSubError(err.message || "Failed to record submission");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Query / Objection Recording
  const handleRecordQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    setQueryError("");
    if (!selectedSubForQuery) {
      setQueryError("No submission selected.");
      return;
    }
    if (!querySubject.trim() || !queryDesc.trim()) {
      setQueryError("Subject and query description are required.");
      return;
    }
    setSavingQuery(true);
    try {
      await recordRjscQuery(selectedSubForQuery, {
        submission_id: selectedSubForQuery,
        query_date: queryDate,
        query_reference: queryRef.trim() || undefined,
        query_subject: querySubject.trim(),
        query_description: queryDesc.trim(),
        assigned_to: queryStaff.trim() || undefined,
        deadline_date: queryDeadline || undefined,
        create_correction_task: createTask,
      });
      setQueryModalOpen(false);
      setQuerySubject("");
      setQueryDesc("");
      setQueryRef("");
      setQueryDeadline("");
      await loadData();
      if (onWorkUpdated) onWorkUpdated();
    } catch (err: any) {
      setQueryError(err.message || "Failed to record query");
    } finally {
      setSavingQuery(false);
    }
  };

  // Handle Resubmission
  const handleRecordResubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    setResubError("");
    if (!selectedParentSub) {
      setResubError("No parent submission selected.");
      return;
    }
    if (!resubTrackingNo.trim()) {
      setResubError("Resubmission tracking number is required.");
      return;
    }
    setResubmittingAction(true);
    try {
      await recordResubmission(workId, {
        parent_submission_id: selectedParentSub.id,
        submitted_at: new Date(resubDate).toISOString(),
        submitted_by: resubStaff.trim() || user?.email || "Office Staff",
        rjsc_tracking_no: resubTrackingNo.trim(),
        portal_ack_ref: resubAckRef.trim() || undefined,
        resolves_query_id: resubQueryId || undefined,
        resolution_notes: resubResolutionNotes.trim() || undefined,
        notes: resubNotes.trim() || undefined,
      });
      setResubModalOpen(false);
      setResubTrackingNo("");
      setResubAckRef("");
      setResubResolutionNotes("");
      setResubNotes("");
      await loadData();
      if (onWorkUpdated) onWorkUpdated();
    } catch (err: any) {
      setResubError(err.message || "Failed to record resubmission");
    } finally {
      setResubmittingAction(false);
    }
  };

  // Handle Delivery & Outcome
  const handleRecordDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryError("");
    setSavingDelivery(true);
    try {
      await recordFinalDecisionAndDelivery(workId, {
        outcome: delOutcome,
        outcome_date: delOutcomeDate,
        rjsc_approval_ref: delApprovalRef.trim() || undefined,
        certified_copy_document_name: delCertDocName.trim() || undefined,
        delivered_to_client_at: delDate ? new Date(delDate).toISOString() : undefined,
        delivered_by: delStaff.trim() || undefined,
        delivery_method: delMethod,
        client_ack_ref: delClientAckRef.trim() || undefined,
        notes: delNotes.trim() || undefined,
        close_work_operationally: delCloseWork,
      });
      setDeliveryModalOpen(false);
      await loadData();
      if (onWorkUpdated) onWorkUpdated();
    } catch (err: any) {
      setDeliveryError(err.message || "Failed to record delivery");
    } finally {
      setSavingDelivery(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12">
        <LoadingState />
      </div>
    );
  }

  const submissions = history?.submissions || [];
  const activeQueries: WorkQueryRecord[] = history?.active_queries || [];
  const resolvedQueries: WorkQueryRecord[] = history?.resolved_queries || [];
  const delivery = history?.delivery;

  return (
    <div className="space-y-6">
      {/* Scope Notice Banner */}
      <div className="rounded-xl border border-[#b2d5c3] bg-[#f0f9f4] p-4 text-xs text-[#204933] flex items-start gap-3 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-[#447a5d] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-sm text-[#181818]">
            Internal RJSC Submission Records & Follow-up Desk
          </div>
          <div>
            ZA Corporate Desk prepares forms and tracks office compliance records. <strong>Staff manually uploads generated PDFs to the RJSC portal.</strong> This workspace logs real submission dates, RJSC tracking references, objections/queries, resubmissions, and final certified copy delivery.
          </div>
        </div>
      </div>

      {/* Top Status & Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#d9e3df] bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-[#6c7671] uppercase">Pre-Submission Readiness</div>
          <div className="mt-2 flex items-center gap-2">
            {preReview?.is_submission_ready ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#234a32] bg-[#dff1e7] px-2.5 py-1 rounded-full">
                <CheckCircle2 size={14} /> Ready for Manual Filing
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#8a5d1b] bg-[#fef3dd] px-2.5 py-1 rounded-full">
                <AlertTriangle size={14} /> Review / Docs Pending
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-[#6c7671]">
            Checklist: {preReview?.completed_checklist_count}/{preReview?.total_checklist_count} items
          </div>
        </div>

        <div className="rounded-xl border border-[#d9e3df] bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-[#6c7671] uppercase">Total Submissions</div>
          <div className="mt-2 text-2xl font-black font-mono text-[#181818]">
            {submissions.length}
          </div>
          <div className="mt-1 text-xs text-[#6c7671]">
            {submissions.length === 0 ? "Not yet submitted to RJSC" : `Latest: ${submissions[submissions.length - 1].submission_type}`}
          </div>
        </div>

        <div className="rounded-xl border border-[#d9e3df] bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-[#6c7671] uppercase">RJSC Objections / Queries</div>
          <div className="mt-2 text-2xl font-black font-mono text-[#181818]">
            {activeQueries.length} <span className="text-xs font-normal text-[#a03c2a]">Active</span>
          </div>
          <div className="mt-1 text-xs text-[#6c7671]">
            {resolvedQueries.length} resolved / answered
          </div>
        </div>

        <div className="rounded-xl border border-[#d9e3df] bg-white p-4 shadow-sm">
          <div className="text-xs font-bold text-[#6c7671] uppercase">Client Delivery & Closure</div>
          <div className="mt-2 flex items-center gap-1">
            {delivery ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#234a32] bg-[#dff1e7] px-2.5 py-1 rounded-full">
                <BadgeCheck size={14} /> {delivery.outcome}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-full">
                <Clock size={14} /> In Progress
              </span>
            )}
          </div>
          <div className="mt-2 text-xs text-[#6c7671]">
            {delivery?.delivered_to_client_at ? `Delivered: ${delivery.delivery_method || 'Yes'}` : "Delivery Pending"}
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-[#d9e3df] gap-2 overflow-x-auto bg-[#fffaf0] p-1 rounded-xl">
        {[
          { key: "timeline", label: `Submission Trail (${submissions.length})`, icon: Clock },
          { key: "readiness", label: "Pre-Submission Review", icon: ShieldCheck },
          { key: "queries", label: `Objections & Queries (${activeQueries.length})`, icon: AlertTriangle },
          { key: "delivery", label: "Outcome & Client Delivery", icon: Truck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#447a5d] text-white shadow-sm"
                  : "text-[#6c7671] hover:bg-[#eef7f3] hover:text-[#234a32]"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUBMISSION TRAIL (TIMELINE) */}
      {activeSubTab === "timeline" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#181818]">Manual RJSC Filing History</h3>
              <p className="text-xs text-[#6c7671]">
                Immutable record of portal submissions, government challans, and tracking numbers.
              </p>
            </div>
            <button
              onClick={() => {
                setSubStaff(user?.name || user?.email || "");
                setSubModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#356149] transition shadow-sm"
            >
              <Send size={14} /> Record Manual Portal Submission
            </button>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9e3df] bg-white p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-[#6c7671]/40 mb-3" />
              <h4 className="text-sm font-bold text-[#181818]">No Portal Submission Recorded Yet</h4>
              <p className="mt-1 text-xs text-[#6c7671] max-w-md mx-auto">
                Once staff completes the pre-submission review and manually submits the PDF files on the RJSC portal, click <strong>"Record Manual Portal Submission"</strong> to log the filing date and tracking number.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setActiveSubTab("readiness")}
                  className="rounded-xl border border-[#d9e3df] bg-white px-4 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa]"
                >
                  View Readiness Checklist
                </button>
                <button
                  onClick={() => setSubModalOpen(true)}
                  className="rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#356149]"
                >
                  Record Filing Now
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub, idx) => {
                const subQueries = (sub.queries || []).concat(
                  activeQueries.filter((q: WorkQueryRecord) => q.submission_id === sub.id)
                );
                return (
                  <div
                    key={sub.id}
                    className="rounded-xl border border-[#d9e3df] bg-white p-5 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-[#ece5d9] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef7f3] text-xs font-black font-mono text-[#447a5d]">
                          #{sub.submission_number}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-[#181818]">
                              {sub.submission_type === "INITIAL" ? "Initial RJSC Portal Submission" : `Resubmission #${sub.submission_number}`}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              sub.status === "SUBMITTED" ? "bg-[#dff1e7] text-[#234a32]" :
                              sub.status === "QUERY_RAISED" ? "bg-[#fce9e4] text-[#a03c2a]" :
                              sub.status === "ACCEPTED" ? "bg-[#e8f7f9] text-[#2c747d]" : "bg-gray-100 text-gray-700"
                            }`}>
                              {sub.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#6c7671]">
                            Submitted on {new Date(sub.submitted_at).toLocaleString()} by <strong className="text-[#181818]">{sub.submitted_by}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubForQuery(sub.id);
                            setQueryModalOpen(true);
                          }}
                          className="rounded-lg border border-[#f5b3a6] bg-[#fdf2ef] px-3 py-1.5 text-xs font-bold text-[#a03c2a] hover:bg-[#fae4df] transition"
                        >
                          Log RJSC Objection
                        </button>
                        <button
                          onClick={() => {
                            setSelectedParentSub(sub);
                            setResubTrackingNo("");
                            setResubModalOpen(true);
                          }}
                          className="rounded-lg border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
                        >
                          Resubmit Forms
                        </button>
                      </div>
                    </div>

                    {/* Submission Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-[#fbf9f5] p-3 rounded-lg">
                      <div>
                        <div className="text-[#6c7671] font-semibold">RJSC Filing / Tracking No</div>
                        <div className="font-mono font-bold text-sm text-[#181818] select-all mt-0.5">
                          {sub.rjsc_tracking_no}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#6c7671] font-semibold">Portal Ack Reference</div>
                        <div className="font-mono text-[#181818] mt-0.5">
                          {sub.portal_ack_ref || "None specified"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#6c7671] font-semibold">Govt Fee Challan Ref</div>
                        <div className="font-mono text-[#181818] mt-0.5">
                          {sub.govt_fee_challan_ref || "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Forms Snapshot */}
                    {sub.forms_submitted && sub.forms_submitted.length > 0 && (
                      <div>
                        <div className="text-xs font-bold text-[#6c7671] mb-2 uppercase">Forms Submitted In This Attempt</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {sub.forms_submitted.map((f, fIdx) => (
                            <div
                              key={fIdx}
                              className="flex items-center justify-between rounded-lg border border-[#ece5d9] bg-white px-3 py-2 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-[#447a5d]" />
                                <div>
                                  <div className="font-bold text-[#181818]">{f.form_code}</div>
                                  <div className="text-[11px] text-[#6c7671]">{f.form_title}</div>
                                </div>
                              </div>
                              <span className="font-mono text-[11px] text-[#6c7671] bg-gray-100 px-2 py-0.5 rounded">
                                v{f.version || 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {sub.notes && (
                      <div className="text-xs text-[#6c7671] border-l-2 border-[#447a5d] pl-3 py-0.5 italic">
                        "{sub.notes}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRE-SUBMISSION READINESS */}
      {activeSubTab === "readiness" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-[#d9e3df] bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#181818]">Filing Readiness Assessment</h3>
                <p className="text-xs text-[#6c7671]">
                  Checks management review sign-off, generated forms in Forms Lab, and document checklist before submission.
                </p>
              </div>
              <div>
                {preReview?.is_submission_ready ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#234a32] bg-[#dff1e7] px-3 py-1.5 rounded-full">
                    <CheckCircle2 size={14} /> Ready for Manual Filing
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#a03c2a] bg-[#fce9e4] px-3 py-1.5 rounded-full">
                    <AlertTriangle size={14} /> Requirements Incomplete
                  </span>
                )}
              </div>
            </div>

            {/* Warnings */}
            {preReview?.readiness_warnings && preReview.readiness_warnings.length > 0 && (
              <div className="rounded-xl border border-[#f5b3a6] bg-[#fdf2ef] p-4 text-xs text-[#a03c2a] space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} /> Action Required Before Submission:
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  {preReview.readiness_warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Approved Forms List */}
            <div>
              <h4 className="text-xs font-bold text-[#6c7671] uppercase mb-2">
                Forms Lab Generated Forms ({preReview?.latest_generated_forms.length || 0})
              </h4>
              {preReview?.latest_generated_forms && preReview.latest_generated_forms.length > 0 ? (
                <div className="divide-y divide-[#ece5d9] border border-[#d9e3df] rounded-xl overflow-hidden">
                  {preReview.latest_generated_forms.map((f) => (
                    <div key={f.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <FileText size={16} className="text-[#447a5d]" />
                        <div>
                          <div className="font-bold text-[#181818]">{f.form_code} — {f.form_title}</div>
                          <div className="text-[11px] text-[#6c7671]">
                            File: {f.file_name} • Version: v{f.version}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          f.status === "APPROVED_FOR_PORTAL_UPLOAD" ? "bg-[#dff1e7] text-[#234a32]" : "bg-[#fef3dd] text-[#8a5d1b]"
                        }`}>
                          {f.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#d9e3df] p-4 text-center text-xs text-[#6c7671]">
                  No statutory forms generated yet in Forms Lab. Switch to the <strong>Working Papers</strong> tab to generate Form XII and Schedule X.
                </div>
              )}
            </div>

            {/* Checklist items */}
            <div>
              <h4 className="text-xs font-bold text-[#6c7671] uppercase mb-2">
                Mandatory Statutory Checklist ({preReview?.completed_checklist_count}/{preReview?.total_checklist_count})
              </h4>
              <div className="divide-y divide-[#ece5d9] border border-[#d9e3df] rounded-xl overflow-hidden">
                {(preReview?.required_checklist_items || []).map((c) => {
                  const isDone = c.status === "COMPLETED" || c.status === "VERIFIED" || c.status === "RECEIVED";
                  return (
                    <div key={c.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <CheckCircle2 size={16} className="text-[#447a5d]" />
                        ) : (
                          <Clock size={16} className="text-gray-400" />
                        )}
                        <span className={isDone ? "text-[#181818] font-medium" : "text-[#6c7671]"}>
                          {c.item_text}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isDone ? "bg-[#dff1e7] text-[#234a32]" : "bg-gray-100 text-gray-600"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ready CTA */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSubModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#356149] transition shadow-sm"
              >
                <Send size={14} /> Proceed to Record Manual Submission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: QUERIES & OBJECTIONS DESK */}
      {activeSubTab === "queries" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#181818]">RJSC Objection & Query Desk</h3>
              <p className="text-xs text-[#6c7671]">
                Manage officer queries, tracking deadlines, and assigned correction tasks.
              </p>
            </div>
            {submissions.length > 0 && (
              <button
                onClick={() => {
                  setSelectedSubForQuery(submissions[submissions.length - 1].id);
                  setQueryModalOpen(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#a03c2a] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#853223] transition shadow-sm"
              >
                <Plus size={14} /> Log RJSC Objection
              </button>
            )}
          </div>

          {activeQueries.length === 0 && resolvedQueries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#d9e3df] bg-white p-8 text-center text-xs text-[#6c7671]">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#447a5d] mb-2" />
              <div className="font-bold text-sm text-[#181818]">No Objections or Queries Raised</div>
              <p className="mt-1 text-xs">All submissions are proceeding without open RJSC queries.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Queries */}
              {activeQueries.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-[#a03c2a] uppercase flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Active Queries Awaiting Response ({activeQueries.length})
                  </div>
                  {activeQueries.map((q: WorkQueryRecord) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[#f5b3a6] bg-white p-5 shadow-sm space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#181818]">{q.query_subject}</h4>
                            <span className="rounded-full bg-[#fce9e4] px-2 py-0.5 text-[10px] font-bold text-[#a03c2a] uppercase">
                              {q.status}
                            </span>
                          </div>
                          <div className="text-xs text-[#6c7671] mt-0.5">
                            Query Date: {q.query_date} • Ref: <span className="font-mono font-bold text-[#181818]">{q.query_reference || "N/A"}</span>
                          </div>
                        </div>

                        {q.deadline_date && (
                          <div className="rounded-lg bg-[#fff4f2] border border-[#f5b3a6] px-3 py-1.5 text-xs text-right">
                            <div className="text-[10px] font-bold text-[#a03c2a] uppercase">Reply Deadline</div>
                            <div className="font-mono font-bold text-[#181818]">{q.deadline_date}</div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs bg-[#fbf9f5] p-3 rounded-lg text-[#181818] whitespace-pre-wrap">
                        {q.query_description}
                      </div>

                      <div className="flex flex-wrap justify-between items-center text-xs text-[#6c7671] pt-2 border-t border-[#ece5d9]">
                        <div>
                          Assigned to: <strong className="text-[#181818]">{q.assigned_to || "Unassigned"}</strong>
                          {q.linked_task_id && (
                            <span className="ml-2 text-[#447a5d] font-semibold">• Linked Correction Task Created</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              const notes = prompt("Enter resolution explanation / waiver notes:");
                              if (notes !== null) {
                                await updateRjscQuery(q.id, {
                                  status: "RESOLVED",
                                  resolution_notes: notes || "Resolved directly by compliance team."
                                });
                                await loadData();
                                if (onWorkUpdated) onWorkUpdated();
                              }
                            }}
                            className="rounded-lg border border-[#b2d5c3] bg-[#f0f9f4] px-3 py-1.5 text-xs font-bold text-[#204933] hover:bg-[#e2f4eb]"
                          >
                            Mark Resolved
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Resolved Queries */}
              {resolvedQueries.length > 0 && (
                <div className="space-y-3 pt-4">
                  <div className="text-xs font-bold text-[#447a5d] uppercase flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Resolved Objections ({resolvedQueries.length})
                  </div>
                  {resolvedQueries.map((q: WorkQueryRecord) => (
                    <div
                      key={q.id}
                      className="rounded-xl border border-[#d9e3df] bg-[#fdfdfd] p-4 text-xs space-y-2 opacity-90"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-[#181818]">{q.query_subject}</span>
                        <span className="rounded-full bg-[#dff1e7] px-2 py-0.5 text-[10px] font-bold text-[#234a32] uppercase">
                          Resolved
                        </span>
                      </div>
                      <div className="text-[#6c7671]">
                        {q.resolution_notes || "Resolved upon portal resubmission."}
                      </div>
                      <div className="text-[11px] text-[#6c7671]">
                        Resolved on {q.resolved_at ? new Date(q.resolved_at).toLocaleDateString() : 'N/A'} by {q.resolved_by || 'Staff'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: FINAL OUTCOME & CLIENT DELIVERY */}
      {activeSubTab === "delivery" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-base font-bold text-[#181818]">RJSC Final Decision & Client Delivery</h3>
              <p className="text-xs text-[#6c7671]">
                Record certified copy issuance, physical/email handover to client, and operational closure.
              </p>
            </div>
            <button
              onClick={() => setDeliveryModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#356149] transition shadow-sm"
            >
              <Truck size={14} /> Record Decision & Delivery
            </button>
          </div>

          {delivery ? (
            <div className="rounded-xl border border-[#d9e3df] bg-white p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-[#ece5d9] pb-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck size={20} className="text-[#447a5d]" />
                  <span className="font-bold text-base text-[#181818]">
                    Outcome: {delivery.outcome.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="rounded-full bg-[#dff1e7] text-[#234a32] font-bold text-xs px-3 py-1">
                  Effective: {delivery.outcome_date}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs bg-[#fbf9f5] p-4 rounded-xl">
                <div>
                  <div className="text-[#6c7671] font-semibold">RJSC Approval Reference</div>
                  <div className="font-mono font-bold text-sm text-[#181818] mt-0.5">
                    {delivery.rjsc_approval_ref || "None recorded"}
                  </div>
                </div>
                <div>
                  <div className="text-[#6c7671] font-semibold">Certified Copy Document</div>
                  <div className="font-bold text-[#181818] mt-0.5">
                    {delivery.certified_copy_document_name || "Certified Copy Issued"}
                  </div>
                </div>
                <div>
                  <div className="text-[#6c7671] font-semibold">Corporate History Filing</div>
                  <div className="text-[#447a5d] font-bold mt-0.5">
                    {delivery.corporate_history_filing_id ? "Synced to Client History" : "Manual Record"}
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="border-t border-[#ece5d9] pt-4 text-xs space-y-2">
                <div className="font-bold text-sm text-[#181818] flex items-center gap-2">
                  <Truck size={16} className="text-[#447a5d]" /> Client Delivery Status
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[#6c7671]">Delivered On:</span>{" "}
                    <strong>{delivery.delivered_to_client_at ? new Date(delivery.delivered_to_client_at).toLocaleString() : "Pending"}</strong>
                  </div>
                  <div>
                    <span className="text-[#6c7671]">Method:</span>{" "}
                    <strong>{delivery.delivery_method?.replace(/_/g, ' ') || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-[#6c7671]">Client Ack Reference:</span>{" "}
                    <strong>{delivery.client_ack_ref || "None"}</strong>
                  </div>
                </div>
                {delivery.notes && (
                  <div className="italic text-[#6c7671] pt-1">
                    "{delivery.notes}"
                  </div>
                )}
              </div>

              {/* Operational Closure */}
              <div className="border-t border-[#ece5d9] pt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[#6c7671]">Operational Status:</span>{" "}
                  <strong className="text-[#234a32]">Operationally Closed</strong>{" "}
                  <span className="text-[#6c7671]">(Separate from billing / invoice settlement)</span>
                </div>
                <div className="text-[#6c7671]">
                  Closed by: {delivery.closed_by || "Admin"}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#d9e3df] bg-white p-8 text-center text-xs text-[#6c7671]">
              <Truck className="mx-auto h-8 w-8 text-[#6c7671]/40 mb-2" />
              <div className="font-bold text-sm text-[#181818]">Awaiting RJSC Decision & Client Delivery</div>
              <p className="mt-1">
                Once RJSC issues the final approval or certified copies, record the outcome here to automatically update Client Corporate History and mark operational delivery.
              </p>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: RECORD MANUAL SUBMISSION */}
      {subModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d9e3df] bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#ece5d9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#181818]">Record Manual RJSC Submission</h3>
                <p className="text-xs text-[#6c7671]">Enter portal filing evidence and tracking number.</p>
              </div>
              <button
                onClick={() => setSubModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {subError && (
              <div className="rounded-lg bg-[#fdf2ef] border border-[#f5b3a6] p-3 text-xs text-[#a03c2a]">
                {subError}
              </div>
            )}

            <form onSubmit={handleRecordSubmission} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#181818] mb-1">
                  RJSC Filing / Tracking / Application Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RJSC-DHAKA-2026-998822"
                  value={subTrackingNo}
                  onChange={(e) => setSubTrackingNo(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 font-mono text-sm focus:border-[#447a5d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Submission Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={subDate}
                    onChange={(e) => setSubDate(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Submitting Staff Member *</label>
                  <input
                    type="text"
                    required
                    value={subStaff}
                    onChange={(e) => setSubStaff(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Portal Ack Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. ACK-2026-5511"
                    value={subAckRef}
                    onChange={(e) => setSubAckRef(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Govt Fee Challan Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. SONALI-CHALLAN-0044"
                    value={subChallanRef}
                    onChange={(e) => setSubChallanRef(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#181818] mb-1">Submission Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on portal upload, fee payment or submission details..."
                  value={subNotes}
                  onChange={(e) => setSubNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#ece5d9]">
                <button
                  type="button"
                  onClick={() => setSubModalOpen(false)}
                  className="rounded-xl border border-[#d9e3df] px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-[#447a5d] px-5 py-2 font-bold text-white hover:bg-[#356149] disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Submission Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG RJSC QUERY / OBJECTION */}
      {queryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d9e3df] bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#ece5d9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#181818]">Log RJSC Query / Objection</h3>
                <p className="text-xs text-[#6c7671]">Record official communication from RJSC officer.</p>
              </div>
              <button
                onClick={() => setQueryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {queryError && (
              <div className="rounded-lg bg-[#fdf2ef] border border-[#f5b3a6] p-3 text-xs text-[#a03c2a]">
                {queryError}
              </div>
            )}

            <form onSubmit={handleRecordQuery} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Query Date *</label>
                  <input
                    type="date"
                    required
                    value={queryDate}
                    onChange={(e) => setQueryDate(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Query Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. RJSC/OBJ/2026/0491"
                    value={queryRef}
                    onChange={(e) => setQueryRef(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#181818] mb-1">Query Subject / Heading *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clarification on Director e-TIN certificate"
                  value={querySubject}
                  onChange={(e) => setQuerySubject(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#181818] mb-1">Query Details / Remarks *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Exact objection or question raised by the RJSC reviewing officer..."
                  value={queryDesc}
                  onChange={(e) => setQueryDesc(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Assigned Staff</label>
                  <input
                    type="text"
                    value={queryStaff}
                    onChange={(e) => setQueryStaff(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">RJSC Reply Deadline Date</label>
                  <input
                    type="date"
                    value={queryDeadline}
                    onChange={(e) => setQueryDeadline(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="createTaskChk"
                  checked={createTask}
                  onChange={(e) => setCreateTask(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#447a5d] focus:ring-[#447a5d]"
                />
                <label htmlFor="createTaskChk" className="text-xs text-[#181818] font-medium">
                  Automatically create high-priority correction Task with this deadline
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#ece5d9]">
                <button
                  type="button"
                  onClick={() => setQueryModalOpen(false)}
                  className="rounded-xl border border-[#d9e3df] px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingQuery}
                  className="rounded-xl bg-[#a03c2a] px-5 py-2 font-bold text-white hover:bg-[#853223] disabled:opacity-50"
                >
                  {savingQuery ? "Logging..." : "Log RJSC Objection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RESUBMIT FORMS */}
      {resubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d9e3df] bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#ece5d9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#181818]">Record Resubmission to RJSC</h3>
                <p className="text-xs text-[#6c7671]">
                  Earlier submission #{selectedParentSub?.submission_number} remains preserved in the audit trail.
                </p>
              </div>
              <button
                onClick={() => setResubModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {resubError && (
              <div className="rounded-lg bg-[#fdf2ef] border border-[#f5b3a6] p-3 text-xs text-[#a03c2a]">
                {resubError}
              </div>
            )}

            <form onSubmit={handleRecordResubmission} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#181818] mb-1">
                  Resubmission Tracking / Filing Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. RJSC-RESUB-2026-7788"
                  value={resubTrackingNo}
                  onChange={(e) => setResubTrackingNo(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 font-mono text-sm outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Resubmission Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={resubDate}
                    onChange={(e) => setResubDate(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Submitting Staff Member *</label>
                  <input
                    type="text"
                    required
                    value={resubStaff}
                    onChange={(e) => setResubStaff(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {activeQueries.length > 0 && (
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Resolves RJSC Objection</label>
                  <select
                    value={resubQueryId}
                    onChange={(e) => setResubQueryId(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none bg-white"
                  >
                    <option value="">-- None / General Resubmission --</option>
                    {activeQueries.map((q: WorkQueryRecord) => (
                      <option key={q.id} value={q.id}>
                        {q.query_subject} (Ref: {q.query_reference || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {resubQueryId && (
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Objection Resolution Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Attached certified copy of updated TIN and board resolution"
                    value={resubResolutionNotes}
                    onChange={(e) => setResubResolutionNotes(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#181818] mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes on updated attachments or portal confirmation..."
                  value={resubNotes}
                  onChange={(e) => setResubNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#ece5d9]">
                <button
                  type="button"
                  onClick={() => setResubModalOpen(false)}
                  className="rounded-xl border border-[#d9e3df] px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resubmittingAction}
                  className="rounded-xl bg-[#447a5d] px-5 py-2 font-bold text-white hover:bg-[#356149] disabled:opacity-50"
                >
                  {resubmittingAction ? "Saving..." : "Record Resubmission"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: RECORD FINAL DECISION & CLIENT DELIVERY */}
      {deliveryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#d9e3df] bg-white p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[#ece5d9] pb-3">
              <div>
                <h3 className="text-base font-bold text-[#181818]">Record RJSC Approval & Delivery</h3>
                <p className="text-xs text-[#6c7671]">Updates Client Corporate History and operational closure.</p>
              </div>
              <button
                onClick={() => setDeliveryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {deliveryError && (
              <div className="rounded-lg bg-[#fdf2ef] border border-[#f5b3a6] p-3 text-xs text-[#a03c2a]">
                {deliveryError}
              </div>
            )}

            <form onSubmit={handleRecordDelivery} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">RJSC Final Outcome *</label>
                  <select
                    value={delOutcome}
                    onChange={(e: any) => setDelOutcome(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none bg-white font-bold"
                  >
                    <option value="APPROVED">APPROVED (Accepted by RJSC)</option>
                    <option value="CERTIFIED_COPY_ISSUED">CERTIFIED COPY ISSUED</option>
                    <option value="REJECTED">REJECTED / CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Decision / Issuance Date *</label>
                  <input
                    type="date"
                    required
                    value={delOutcomeDate}
                    onChange={(e) => setDelOutcomeDate(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#181818] mb-1">RJSC Approval Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. RJSC-APPROVAL-2026-99"
                    value={delApprovalRef}
                    onChange={(e) => setDelApprovalRef(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#181818] mb-1">Certified Copy Document Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Certified_Form_XII.pdf"
                    value={delCertDocName}
                    onChange={(e) => setDelCertDocName(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-[#ece5d9] pt-3">
                <div className="font-bold text-[#181818] mb-2 uppercase text-[11px] text-[#447a5d]">
                  Client Delivery Handover
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#181818] mb-1">Delivery Date & Time</label>
                    <input
                      type="datetime-local"
                      value={delDate}
                      onChange={(e) => setDelDate(e.target.value)}
                      className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#181818] mb-1">Delivery Method</label>
                    <select
                      value={delMethod}
                      onChange={(e) => setDelMethod(e.target.value)}
                      className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none bg-white"
                    >
                      <option value="HAND_DELIVERY">Hand Delivery (Physical Handover)</option>
                      <option value="EMAIL">Email to Authorized Representative</option>
                      <option value="COURIER">Courier / Registered Post</option>
                      <option value="CLIENT_PORTAL">Client Document Portal</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block font-bold text-[#181818] mb-1">Client Receipt / Acknowledgement Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. Signed Delivery Challan #0482 or Email Confirmation"
                    value={delClientAckRef}
                    onChange={(e) => setDelClientAckRef(e.target.value)}
                    className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#181818] mb-1">Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding handover or file archiving..."
                  value={delNotes}
                  onChange={(e) => setDelNotes(e.target.value)}
                  className="w-full rounded-lg border border-[#d9e3df] px-3 py-2 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="closeWorkChk"
                  checked={delCloseWork}
                  onChange={(e) => setDelCloseWork(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#447a5d] focus:ring-[#447a5d]"
                />
                <label htmlFor="closeWorkChk" className="text-xs text-[#181818] font-medium">
                  Mark work operationally closed (Work status = Closed). Invoicing remains independent.
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#ece5d9]">
                <button
                  type="button"
                  onClick={() => setDeliveryModalOpen(false)}
                  className="rounded-xl border border-[#d9e3df] px-4 py-2 font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDelivery}
                  className="rounded-xl bg-[#447a5d] px-5 py-2 font-bold text-white hover:bg-[#356149] disabled:opacity-50"
                >
                  {savingDelivery ? "Saving..." : "Save Delivery & Outcome"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
