"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen, BriefcaseBusiness, CheckCircle2, Clock3, AlertTriangle,
  ArrowLeft, ArrowRight, UserCheck, ShieldAlert, FileText, Check, Plus,
  Trash2, RefreshCw, Send, RotateCcw, DollarSign, Calendar, ExternalLink,
  ChevronRight, ClipboardList, CheckSquare, Layers, Building2, Users,
  Scale, FileCheck, CheckCircle, Upload
} from "lucide-react";
import {
  getWork, updateWork, getWorkChecklist, addWorkChecklistItem,
  updateWorkChecklistItem, deleteWorkChecklistItem, generateWorkChecklist,
  getWorkFinancialSummary, ChecklistItem
} from "@/lib/api/works";
import { getClient } from "@/lib/api/clients";
import { getTasks, createTask, updateTask, TaskItem, TaskPriority, TaskStatus } from "@/lib/api/tasks";
import { listDocuments, uploadDocument } from "@/lib/api/documents";
import { getWorkReviews, postReviewAction } from "@/lib/api/reviews";
import { getUsers } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageHeader, ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import WorkingPaperWorkspace from "@/components/working-papers/WorkingPaperWorkspace";
import SubmissionLifecycleWorkspace from "@/components/submissions/SubmissionLifecycleWorkspace";
import AnnualReturnServicePanel from "@/components/services/AnnualReturnServicePanel";
import ShareTransferServicePanel from "@/components/services/ShareTransferServicePanel";
import MortgageChargeServicePanel from "@/components/services/MortgageChargeServicePanel";
import { computeDocumentCompleteness } from "@/lib/clients/document-completeness";

const LIFECYCLE_STATUSES = [
  "Pending Check",
  "Documents Pending",
  "In Preparation",
  "Under Review",
  "Ready for Submission",
  "Submitted",
  "Query/Follow-up",
  "Delivered",
  "Closed"
];

type PrimaryNavKey = "current-position" | "legal-analysis" | "working-papers" | "review-submission";

export default function WorkDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const workId = params.id as string;

  const [work, setWork] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Compact Card-Style 4-Section Navigation
  const [activeSection, setActiveSection] = useState<PrimaryNavKey>("current-position");

  // Sub-tab selectors for sections with multiple preserved views
  const [legalSubTab, setLegalSubTab] = useState<"service" | "checklist" | "tasks">("service");
  const [reviewSubTab, setReviewSubTab] = useState<"review" | "submission">("review");

  // Direct Document Upload state
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string>("");

  // Checklist Item State
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistRef, setNewChecklistRef] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);

  // Task Modal State
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("MEDIUM");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  // Review Action State
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Edit / Status update state
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [editAssignedTo, setEditAssignedTo] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  const fetchData = useCallback(async () => {
    if (!workId) return;
    try {
      const w = await getWork(workId);
      setWork(w);
      setEditAssignedTo(w.assigned_to || "");
      setEditDueDate(w.due_date ? w.due_date.split("T")[0] : "");
      setEditNotes(w.notes || "");

      const [c, chk, t, docs, rev, fin, uList] = await Promise.all([
        getClient(w.client_id).catch(() => null),
        getWorkChecklist(workId).catch(() => []),
        getTasks({ work_id: workId }).catch(() => []),
        listDocuments({ client_id: w.client_id }).catch(() => []),
        getWorkReviews(workId).catch(() => []),
        getWorkFinancialSummary(workId).catch(() => null),
        getUsers().catch(() => [])
      ]);

      setClient(c);
      setChecklist(chk);
      setTasks(t);
      setDocuments(docs);
      setReviews(rev);
      setFinancials(fin);
      setUsers(uList);
    } catch (err) {
      console.error("Failed to load work details", err);
    } finally {
      setLoading(false);
    }
  }, [workId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Checklist stats
  const totalChecklist = checklist.length;
  const completedChecklist = checklist.filter(
    (c) => c.status === "COMPLETED" || c.status === "VERIFIED" || c.status === "RECEIVED"
  ).length;
  const checklistPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

  // Task stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED").length;
  const taskPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Lifecycle status handler
  const handleStatusChange = async (newStatus: string) => {
    if (!work) return;
    setUpdatingStatus(true);
    try {
      const updated = await updateWork(work.id, { status: newStatus });
      setWork(updated);
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Save quick details
  const handleSaveDetails = async () => {
    if (!work) return;
    setSavingDetails(true);
    try {
      const payload: any = {
        assigned_to: editAssignedTo,
        notes: editNotes
      };
      if (editDueDate) {
        payload.due_date = editDueDate;
      }
      const updated = await updateWork(work.id, payload);
      setWork(updated);
      alert("Work details updated successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to save details");
    } finally {
      setSavingDetails(false);
    }
  };

  // Add checklist item
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setAddingChecklist(true);
    try {
      await addWorkChecklistItem(work.id, {
        item_text: newChecklistText.trim(),
        source_reference: newChecklistRef.trim() || undefined,
        status: "PENDING"
      });
      setNewChecklistText("");
      setNewChecklistRef("");
      const refreshed = await getWorkChecklist(work.id);
      setChecklist(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to add checklist item");
    } finally {
      setAddingChecklist(false);
    }
  };

  // Toggle checklist item
  const handleToggleChecklist = async (item: ChecklistItem) => {
    const nextStatus = item.status === "COMPLETED" || item.status === "VERIFIED" ? "PENDING" : "COMPLETED";
    try {
      await updateWorkChecklistItem(work.id, item.id, { status: nextStatus });
      const refreshed = await getWorkChecklist(work.id);
      setChecklist(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to update item");
    }
  };

  // Delete checklist item
  const handleDeleteChecklist = async (itemId: string) => {
    if (!confirm("Are you sure you want to remove this requirement?")) return;
    try {
      await deleteWorkChecklistItem(work.id, itemId);
      setChecklist(checklist.filter((c) => c.id !== itemId));
    } catch (err: any) {
      alert(err.message || "Failed to delete item");
    }
  };

  // Re-sync checklist
  const handleResyncChecklist = async () => {
    try {
      const generated = await generateWorkChecklist(work.id);
      setChecklist(generated);
    } catch (err: any) {
      alert(err.message || "Failed to generate checklist");
    }
  };

  // Create task for this work
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setSavingTask(true);
    try {
      await createTask({
        work_id: work.id,
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        priority: taskPriority,
        assigned_user_id: taskAssignee || undefined,
        due_date: taskDueDate || undefined
      });
      setTaskModalOpen(false);
      setTaskTitle("");
      setTaskDesc("");
      setTaskAssignee("");
      setTaskDueDate("");
      const refreshed = await getTasks({ work_id: work.id });
      setTasks(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to create task");
    } finally {
      setSavingTask(false);
    }
  };

  // Toggle task status
  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus: TaskStatus = task.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED";
    try {
      await updateTask(task.id, { status: nextStatus });
      const refreshed = await getTasks({ work_id: work.id });
      setTasks(refreshed);
    } catch (err: any) {
      alert(err.message || "Failed to update task");
    }
  };

  // Review Action
  const handleReviewAction = async (action: string) => {
    const isReturn = action === "RETURN_BY_SENIOR" || action === "RETURN_BY_MANAGER";
    if (isReturn && !reviewComment.trim()) {
      setReviewError("Comment is mandatory when returning work for revision.");
      return;
    }
    setReviewError("");
    setSubmittingReview(true);
    try {
      await postReviewAction(work.id, {
        action,
        comment: reviewComment.trim() || undefined
      });
      setReviewComment("");
      await fetchData();
    } catch (err: any) {
      setReviewError(err.message || "Failed to apply review action");
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8">
        <LoadingState />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-black text-[#181818]">Work Order Not Found</h2>
        <Link href="/work-register" className="mt-4 inline-flex items-center gap-2 font-bold text-[#447a5d] hover:underline">
          <ArrowLeft size={16} /> Return to Work Register
        </Link>
      </div>
    );
  }

  const reviewStatus = work.review_status || "DRAFT";
  const userRole = user?.role || "JUNIOR";

  const serviceId = String(work.service_id || "").toLowerCase();
  const serviceCategory =
    serviceId.includes("annual-return") ? "annual-return" :
    serviceId.includes("share-transfer") ? "share-transfer" :
    serviceId.includes("mortgage") || serviceId.includes("charge") ? "mortgage-charge" :
    null;

  const serviceTabConfig = (() => {
    if (serviceCategory === "annual-return") {
      return {
        label: "Annual Return Assessment",
        icon: Calendar,
        desc: "Multi-year statutory delay evaluation, Sec 36 AGM+21 days compliance, and late fee tracking."
      };
    }
    if (serviceCategory === "share-transfer") {
      return {
        label: "Share Transfer (Form 117)",
        icon: Users,
        desc: "Mathematical shareholding reconciliation, Form 117 generation, and authorized register updates."
      };
    }
    if (serviceCategory === "mortgage-charge") {
      return {
        label: "Mortgage & Charge",
        icon: Layers,
        desc: "Section 159 21-day deed deadline countdown, High Court condonation detection, and Forms XVIII/XIX/XXVIII."
      };
    }
    return null;
  })();

  const docCompleteness = computeDocumentCompleteness(documents);

  return (
    <div className="w-full space-y-4 px-3 sm:px-6 py-4 pb-16">
      {/* 1. COMPACT WORK HEADER */}
      <div className="rounded-xl border border-[#d9e3df] bg-[#FFF8E8]/30 p-4 shadow-xs">
        {/* Row 1: Breadcrumb + Work Code + Badges + Billable */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/work-register" className="text-xs font-bold text-[#6c7671] hover:text-[#181818] flex items-center gap-1 transition">
              <FolderOpen size={14} /> Work Register
            </Link>
            <ChevronRight size={12} className="text-[#9aa5a0]" />
            <span className="font-mono text-base font-black text-[#181818]">{work.work_code}</span>
            <StatusBadge status={work.status} />
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              reviewStatus === 'APPROVED' ? 'bg-[#E5F4EC] text-[#315F55] border border-[#9BD8B7]' :
              reviewStatus.includes('RETURNED') ? 'bg-[#fdf2f0] text-[#a03c2a] border border-[#EE806F]/40' :
              reviewStatus.includes('SUBMITTED') ? 'bg-[#e8f7f9] text-[#1d626c] border border-[#6CC6D3]/40' : 'bg-gray-100 text-gray-700'
            }`}>
              Review: {reviewStatus.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#E8BC63]/40 bg-[#FFF8E8] px-3.5 py-1.5 text-right shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#8a6814] block">Total Billable</span>
              <span className="text-lg font-black font-mono text-[#8a6814]">
                {work.total_bill !== null ? `৳ ${parseFloat(work.total_bill).toLocaleString()}` : 'Pending'}
              </span>
            </div>
            <Link
              href={`/clients/${work.client_id}`}
              className="inline-flex items-center gap-1 rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-bold text-[#315F55] hover:bg-[#E5F4EC] transition shadow-xs"
            >
              <Building2 size={13} /> {client?.legal_name || "Client Master"}
            </Link>
          </div>
        </div>

        {/* Row 2: Service Title + Entity Details + Compact Progress Bars */}
        <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-[#d9e3df]/60 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-black text-[#181818] text-sm tracking-tight">
              {work.service_id.replace(/-/g, ' ').toUpperCase()}
            </span>
            <span className="text-[#9aa5a0]">•</span>
            <span className="text-[#6c7671] font-semibold">{work.entity_type.replace(/_/g, ' ')}</span>
            <span className="text-[#9aa5a0]">•</span>
            <span className="text-[#6c7671]">Assigned: <strong className="text-[#181818]">{work.assigned_to || "Unassigned"}</strong></span>
            {work.due_date && (
              <>
                <span className="text-[#9aa5a0]">•</span>
                <span className="text-[#6c7671]">Due: <strong className="text-[#181818]">{new Date(work.due_date).toLocaleDateString()}</strong></span>
              </>
            )}
          </div>

          {/* Compact Inline Progress Counters */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-[#6c7671] text-[11px]">Checklist:</span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E5F4EC]">
                <div className="h-full bg-[#315F55] transition-all" style={{ width: `${checklistPercent}%` }} />
              </div>
              <span className="font-bold text-[#181818] text-[11px]">{completedChecklist}/{totalChecklist}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6c7671] text-[11px]">Tasks:</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#e8f7f9]">
                <div className="h-full bg-[#6CC6D3] transition-all" style={{ width: `${taskPercent}%` }} />
              </div>
              <span className="font-bold text-[#181818] text-[11px]">{completedTasks}/{totalTasks}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. COMPACT CARD-STYLE 4-SECTION NAVIGATION */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          {
            key: "current-position",
            label: "Current Position",
            sub: "Lifecycle, Parameters & Baseline",
            icon: Building2,
            activeCls: "border-[#315F55] bg-[#E5F4EC]/60 text-[#315F55] ring-1 ring-[#315F55]",
            iconActiveCls: "bg-[#315F55] text-white"
          },
          {
            key: "legal-analysis",
            label: "Legal / Compliance Analysis",
            sub: `${serviceTabConfig ? serviceTabConfig.label : "Statutory Assessment"} & Checklist`,
            icon: Scale,
            activeCls: "border-[#6CC6D3] bg-[#eaf6f8] text-[#1d626c] ring-1 ring-[#6CC6D3]",
            iconActiveCls: "bg-[#2c747d] text-white"
          },
          {
            key: "working-papers",
            label: "Working Papers & Forms",
            sub: "Working Drafts & Forms Lab PDF",
            icon: Layers,
            activeCls: "border-[#B8ACDF] bg-[#f4f2f9] text-[#4f4277] ring-1 ring-[#B8ACDF]",
            iconActiveCls: "bg-[#71619f] text-white"
          },
          {
            key: "review-submission",
            label: "Review, Submission & Completion",
            sub: `Signoff Gate & RJSC Portal Tracking`,
            icon: FileCheck,
            activeCls: "border-[#EE806F] bg-[#fdf2f0] text-[#933425] ring-1 ring-[#EE806F]",
            iconActiveCls: "bg-[#c85b4b] text-white"
          }
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.key;
          return (
            <button
              key={sec.key}
              onClick={() => setActiveSection(sec.key as PrimaryNavKey)}
              className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                isActive
                  ? sec.activeCls
                  : "border-[#d9e3df] bg-white text-[#6c7671] hover:border-[#b4c7be] hover:bg-[#fafaf7] hover:text-[#181818]"
              }`}
            >
              <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                isActive ? sec.iconActiveCls : "bg-[#f4f7f5] text-[#6c7671]"
              }`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className={`text-xs font-black truncate ${isActive ? "" : "text-[#181818]"}`}>
                  {sec.label}
                </div>
                <div className="text-[10px] text-[#6c7671] truncate mt-0.5">
                  {sec.sub}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. SECTION 1: CURRENT POSITION & WORK OVERVIEW */}
      {activeSection === "current-position" && (
        <div className="space-y-4">
          {/* Client Foundational Legal Scorecard with Direct Upload */}
          <ContentCard className="p-4 border-l-4 border-l-[#315F55]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-[#181818] text-sm">Client Foundational Legal Baseline</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    docCompleteness.uploadedCount === 3
                      ? "bg-[#E5F4EC] text-[#315F55] border border-[#9BD8B7]"
                      : docCompleteness.uploadedCount > 0
                      ? "bg-[#FFF8E8] text-[#8a6814] border border-[#E8BC63]/50"
                      : "bg-[#fdf2f0] text-[#a03c2a] border border-[#EE806F]/50"
                  }`}>
                    {docCompleteness.scoreText} Received
                  </span>
                </div>
                <p className="text-[11px] text-[#6c7671] mt-0.5">
                  Authoritative three onboarding documents: Certificate of Incorporation, Form XII, and Schedule X. Direct upload starts as <strong>RECEIVED</strong>.
                </p>
              </div>
              <Link
                href={`/clients/${work.client_id}`}
                className="text-xs font-bold text-[#315F55] hover:underline whitespace-nowrap bg-[#E5F4EC] px-2.5 py-1 rounded-lg border border-[#9BD8B7]/40"
              >
                Open Client Profile →
              </Link>
            </div>

            {uploadMessage && (
              <div className="mb-3 rounded-lg border border-[#9BD8B7] bg-[#E5F4EC] p-2 text-xs font-semibold text-[#315F55] flex items-center justify-between">
                <span>{uploadMessage}</span>
                <button
                  type="button"
                  onClick={() => setUploadMessage("")}
                  className="text-[10px] font-bold text-[#315F55] hover:underline ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {docCompleteness.items.map((item) => {
                const isUploading = uploadingCategory === item.type;
                return (
                  <div key={item.type} className="rounded-lg border border-[#e5ebe7] bg-[#fbfdfc] p-2.5 flex flex-col justify-between gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#181818] truncate">{item.label}</div>
                        <div className="text-[10px] text-[#6c7671] truncate">
                          {item.documentDate ? `Dated: ${item.documentDate}` : item.originalFilename || "No file uploaded"}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        item.status === 'VERIFIED' ? 'bg-[#E5F4EC] text-[#315F55]' :
                        item.status === 'UPLOADED' ? 'bg-[#FFF8E8] text-[#8a6814]' : 'bg-[#fdf2f0] text-[#a03c2a]'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#f0f4f1]">
                      <span className="text-[10px] text-[#9aa5a0]">
                        {item.status === 'VERIFIED' ? 'Verified evidence' : item.status === 'UPLOADED' ? 'Pending review' : 'Missing record'}
                      </span>
                      <label className="cursor-pointer inline-flex items-center gap-1 rounded-md border border-[#d9e3df] bg-white px-2 py-0.5 text-[11px] font-bold text-[#315F55] hover:bg-[#E5F4EC] hover:border-[#315F55] transition shadow-xs">
                        <Upload size={11} className={isUploading ? "animate-spin" : ""} />
                        <span>{isUploading ? "Uploading..." : item.status === 'MISSING' ? "Upload" : "Replace"}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          className="hidden"
                          disabled={isUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingCategory(item.type);
                            setUploadMessage("");
                            try {
                              await uploadDocument(
                                file,
                                item.type,
                                work.client_id,
                                work.id,
                                undefined,
                                `${item.label} uploaded from Work Detail`
                              );
                              setUploadMessage(`Uploaded "${file.name}" for ${item.label} as RECEIVED. Review in Documents before verifying.`);
                              await fetchData();
                            } catch (err: any) {
                              setUploadMessage(err.message || "Failed to upload document");
                            } finally {
                              setUploadingCategory(null);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </ContentCard>

          {/* 2-Column Responsive Layout: Lifecycle Stages (Left) + Parameters (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Status & Lifecycle Flow (8 cols) */}
            <ContentCard className="p-4 lg:col-span-7 xl:col-span-8">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-sm font-black text-[#181818] flex items-center gap-2">
                  <Clock3 size={16} className="text-[#315F55]" /> Work Lifecycle Stage
                </h2>
                <span className="text-[11px] text-[#6c7671]">
                  Current: <strong className="text-[#315F55]">{work.status}</strong>
                </span>
              </div>

              {/* Compact Horizontal Stage Tracker Stepper */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-[#f8fbf9] border border-[#e2ece6]">
                {LIFECYCLE_STATUSES.map((st, idx) => {
                  const isCurrent = work.status === st;
                  const currentIndex = LIFECYCLE_STATUSES.indexOf(work.status);
                  const isPast = currentIndex !== -1 && idx < currentIndex;

                  return (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(st)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition ${
                        isCurrent
                          ? "bg-[#315F55] text-white font-bold shadow-xs ring-1 ring-[#315F55]"
                          : isPast
                          ? "bg-[#E5F4EC] text-[#315F55] font-semibold border border-[#9BD8B7] hover:bg-[#d5eee0]"
                          : "bg-white text-[#6c7671] font-medium border border-[#d9e3df] hover:border-[#315F55] hover:text-[#181818]"
                      }`}
                      title={`Change status to: ${st}`}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        isCurrent
                          ? "bg-white text-[#315F55]"
                          : isPast
                          ? "bg-[#315F55] text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="truncate">{st}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-xl border border-dashed border-[#d9e3df] p-2.5 bg-[#FFF8E8]/40">
                <div className="text-[10px] font-bold text-[#8a6814] uppercase">Audit Timestamps</div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>Created: <span className="font-bold text-[#181818]">{new Date(work.created_at).toLocaleDateString()}</span></div>
                  <div>Submitted: <span className="font-bold text-[#181818]">{work.submitted_at ? new Date(work.submitted_at).toLocaleDateString() : "Pending"}</span></div>
                  <div>Completed: <span className="font-bold text-[#181818]">{work.completed_at ? new Date(work.completed_at).toLocaleDateString() : "Active"}</span></div>
                </div>
              </div>
            </ContentCard>

            {/* Assignment & Operational Meta (5 cols) */}
            <ContentCard className="p-4 lg:col-span-5 xl:col-span-4">
              <h2 className="text-sm font-black text-[#181818] mb-3 flex items-center gap-2">
                <UserCheck size={16} className="text-[#315F55]" /> Staff & Parameters
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#6c7671] uppercase">Assigned Staff</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs font-bold text-[#181818] focus:border-[#315F55] outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#6c7671] uppercase">Statutory / Office Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs font-bold text-[#181818] focus:border-[#315F55] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#6c7671] uppercase">Internal Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Specific filing instructions or client requirements..."
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs text-[#181818] focus:border-[#315F55] outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full rounded-xl bg-[#315F55] py-2 text-xs font-bold text-white hover:bg-[#274c44] transition disabled:opacity-50"
                >
                  {savingDetails ? "Saving..." : "Save Parameters"}
                </button>
              </div>
            </ContentCard>
          </div>

          {/* Documents Repository Overview */}
          <ContentCard className="p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-black text-[#181818] flex items-center gap-1.5">
                  <FileText size={16} className="text-[#447a5d]" /> Attached Client & Work Documents ({documents.length})
                </h3>
                <p className="text-[11px] text-[#6c7671]">Legal files uploaded to client master and this work order.</p>
              </div>
              <Link
                href={`/clients/${work.client_id}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#447a5d] hover:underline"
              >
                <ExternalLink size={12} /> Full Document Repository
              </Link>
            </div>

            {documents.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6c7671]">No documents uploaded for this client yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Document Name</Th>
                      <Th>Category</Th>
                      <Th>Status</Th>
                      <Th>Uploaded Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.slice(0, 5).map((doc) => (
                      <tr key={doc.id}>
                        <Td>
                          <div className="font-bold text-xs text-[#181818]">{doc.document_name}</div>
                          {doc.original_filename && (
                            <div className="text-[10px] text-[#6c7671] font-mono">{doc.original_filename}</div>
                          )}
                        </Td>
                        <Td className="text-[11px] font-bold uppercase text-[#44765b]">{doc.category || "General"}</Td>
                        <Td><StatusBadge status={doc.status} /></Td>
                        <Td className="text-xs text-[#6c7671]">{new Date(doc.created_at).toLocaleDateString()}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {documents.length > 5 && (
                  <div className="p-2 text-center text-xs text-[#6c7671] border-t">
                    Showing 5 of {documents.length} documents.
                  </div>
                )}
              </div>
            )}
          </ContentCard>
        </div>
      )}

      {/* 4. SECTION 2: LEGAL / COMPLIANCE ANALYSIS */}
      {activeSection === "legal-analysis" && (
        <div className="space-y-4">
          {/* Sub-navigation bar inside Legal Analysis */}
          <div className="flex border-b border-[#6CC6D3]/30 gap-1 overflow-x-auto bg-[#eaf6f8] p-1 rounded-xl">
            {serviceTabConfig && (
              <button
                onClick={() => setLegalSubTab("service")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                  legalSubTab === "service" ? "bg-[#2c747d] text-white shadow-xs" : "text-[#1d626c] hover:bg-white/60"
                }`}
              >
                <serviceTabConfig.icon size={14} />
                {serviceTabConfig.label}
              </button>
            )}
            <button
              onClick={() => setLegalSubTab("checklist")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                legalSubTab === "checklist" ? "bg-[#2c747d] text-white shadow-xs" : "text-[#1d626c] hover:bg-white/60"
              }`}
            >
              <ClipboardList size={14} />
              Statutory Checklist ({completedChecklist}/{totalChecklist})
            </button>
            <button
              onClick={() => setLegalSubTab("tasks")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                legalSubTab === "tasks" ? "bg-[#2c747d] text-white shadow-xs" : "text-[#1d626c] hover:bg-white/60"
              }`}
            >
              <CheckSquare size={14} />
              Milestone Tasks ({completedTasks}/{totalTasks})
            </button>
          </div>

          {/* Subtab 1: Specialized Service Workspace */}
          {legalSubTab === "service" && serviceCategory && (
            <div>
              {serviceCategory === "annual-return" && (
                <AnnualReturnServicePanel
                  clientId={work.client_id}
                  currentWorkId={work.id}
                />
              )}
              {serviceCategory === "share-transfer" && (
                <ShareTransferServicePanel
                  workId={work.id}
                  onSaved={fetchData}
                />
              )}
              {serviceCategory === "mortgage-charge" && (
                <MortgageChargeServicePanel
                  workId={work.id}
                  onSaved={fetchData}
                />
              )}
            </div>
          )}

          {/* Subtab 2: Statutory Checklist */}
          {legalSubTab === "checklist" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-base font-black text-[#181818]">Statutory Document Checklist & Requisition</h3>
                  <p className="text-xs text-[#6c7671]">Requirements derived from statutory regulations and matched from client files.</p>
                </div>
                <button
                  onClick={handleResyncChecklist}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
                >
                  <RefreshCw size={13} /> Re-sync from Rules
                </button>
              </div>

              <ContentCard>
                {checklist.length === 0 ? (
                  <div className="p-8 text-center text-[#6c7671]">
                    <ClipboardList className="mx-auto h-8 w-8 text-[#6c7671] mb-2" />
                    <p className="font-bold text-xs">No checklist requirements recorded yet.</p>
                    <button
                      onClick={handleResyncChecklist}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#396a50]"
                    >
                      <RefreshCw size={13} /> Generate Standard Checklist
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Th className="w-10">Done</Th>
                          <Th>Document / Requirement</Th>
                          <Th>Legal Reference</Th>
                          <Th>Status</Th>
                          <Th>Verified By</Th>
                          <Th className="text-right">Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {checklist.map((item) => {
                          const isDone = item.status === "COMPLETED" || item.status === "VERIFIED" || item.status === "RECEIVED";
                          return (
                            <tr key={item.id} className={isDone ? "bg-[#f8fdfa]" : ""}>
                              <Td>
                                <button
                                  onClick={() => handleToggleChecklist(item)}
                                  className={`grid h-5 w-5 place-items-center rounded-lg border transition ${
                                    isDone
                                      ? "border-[#447a5d] bg-[#447a5d] text-white"
                                      : "border-[#d9e3df] bg-white text-transparent hover:border-[#447a5d]"
                                  }`}
                                >
                                  <Check size={12} />
                                </button>
                              </Td>
                              <Td>
                                <div className={`font-bold text-xs ${isDone ? "text-[#234a32]" : "text-[#181818]"}`}>
                                  {item.item_text}
                                </div>
                                {item.item_code && (
                                  <span className="font-mono text-[9px] text-[#6c7671] font-semibold">{item.item_code}</span>
                                )}
                              </Td>
                              <Td className="text-xs text-[#6c7671]">
                                {item.source_reference || "Statutory Office Requisition"}
                              </Td>
                              <Td><StatusBadge status={item.status} /></Td>
                              <Td className="text-xs text-[#6c7671]">
                                {item.completed_by ? (
                                  <div>
                                    <span className="font-bold text-[#181818]">{item.completed_by}</span>
                                    {item.completed_at && (
                                      <div className="text-[9px]">{new Date(item.completed_at).toLocaleDateString()}</div>
                                    )}
                                  </div>
                                ) : "-"}
                              </Td>
                              <Td className="text-right">
                                <button
                                  onClick={() => handleDeleteChecklist(item.id)}
                                  className="text-[#eb7b67] hover:text-red-700 p-1 rounded-lg transition"
                                  title="Delete Item"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}

                {/* Inline Add Requirement */}
                <form onSubmit={handleAddChecklist} className="border-t border-[#ece5d9] bg-[#fcfbf7] p-3 flex flex-col sm:flex-row gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Add specific required document or clearance..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    className="flex-1 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs text-[#181818] focus:border-[#447a5d] outline-none w-full"
                  />
                  <input
                    type="text"
                    placeholder="Source / Legal Reference (optional)"
                    value={newChecklistRef}
                    onChange={(e) => setNewChecklistRef(e.target.value)}
                    className="w-full sm:w-60 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs text-[#181818] focus:border-[#447a5d] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={addingChecklist || !newChecklistText.trim()}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#447a5d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 whitespace-nowrap"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </form>
              </ContentCard>
            </div>
          )}

          {/* Subtab 3: Milestone Tasks */}
          {legalSubTab === "tasks" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-black text-[#181818]">Work Order Tasks & Deadlines</h3>
                  <p className="text-xs text-[#6c7671]">Operational milestones and deadline tracking for this work.</p>
                </div>
                <button
                  onClick={() => setTaskModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#396a50] transition"
                >
                  <Plus size={14} /> Create Task
                </button>
              </div>

              <ContentCard>
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-[#6c7671]">
                    <CheckSquare className="mx-auto h-8 w-8 text-[#6c7671] mb-2" />
                    <p className="font-bold text-xs">No tasks assigned to this work order yet.</p>
                    <button
                      onClick={() => setTaskModalOpen(true)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#396a50]"
                    >
                      <Plus size={13} /> Add First Task
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <thead>
                        <tr>
                          <Th className="w-10">Done</Th>
                          <Th>Task Title</Th>
                          <Th>Assignee</Th>
                          <Th>Priority</Th>
                          <Th>Due Date</Th>
                          <Th>Status</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => {
                          const isDone = task.status === "COMPLETED";
                          return (
                            <tr key={task.id} className={isDone ? "bg-[#f8fdfa]" : ""}>
                              <Td>
                                <button
                                  onClick={() => handleToggleTask(task)}
                                  className={`grid h-5 w-5 place-items-center rounded-lg border transition ${
                                    isDone
                                      ? "border-[#447a5d] bg-[#447a5d] text-white"
                                      : "border-[#d9e3df] bg-white text-transparent hover:border-[#447a5d]"
                                  }`}
                                >
                                  <Check size={12} />
                                </button>
                              </Td>
                              <Td>
                                <div className={`font-bold text-xs ${isDone ? "line-through text-[#6c7671]" : "text-[#181818]"}`}>
                                  {task.title}
                                </div>
                                {task.description && (
                                  <div className="text-[11px] text-[#6c7671] mt-0.5">{task.description}</div>
                                )}
                              </Td>
                              <Td className="text-xs font-bold text-[#181818]">
                                {task.assigned_user_name || task.assigned_to || "Unassigned"}
                              </Td>
                              <Td>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  task.priority === "URGENT" ? "bg-red-100 text-red-700" :
                                  task.priority === "HIGH" ? "bg-amber-100 text-amber-700" :
                                  task.priority === "MEDIUM" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                                }`}>
                                  {task.priority}
                                </span>
                              </Td>
                              <Td className="text-xs">
                                {task.due_date ? (
                                  <span className="font-bold text-[#181818]">{new Date(task.due_date).toLocaleDateString()}</span>
                                ) : (
                                  <span className="text-[#6c7671]">-</span>
                                )}
                              </Td>
                              <Td><StatusBadge status={task.status} /></Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>
                )}
              </ContentCard>
            </div>
          )}
        </div>
      )}

      {/* 5. SECTION 3: WORKING PAPERS & FORMS */}
      {activeSection === "working-papers" && (
        <div className="space-y-4">
          <WorkingPaperWorkspace workId={work.id} />
        </div>
      )}

      {/* 6. SECTION 4: REVIEW, SUBMISSION & COMPLETION */}
      {activeSection === "review-submission" && (
        <div className="space-y-4">
          {/* Sub-navigation bar inside Review & Submission */}
          <div className="flex border-b border-[#EE806F]/30 gap-1 overflow-x-auto bg-[#fdf2f0] p-1 rounded-xl">
            <button
              onClick={() => setReviewSubTab("review")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                reviewSubTab === "review" ? "bg-[#c85b4b] text-white shadow-xs" : "text-[#933425] hover:bg-white/60"
              }`}
            >
              <ShieldAlert size={14} />
              Office Review & Multi-Level Signoff ({reviews.length})
            </button>
            <button
              onClick={() => setReviewSubTab("submission")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition whitespace-nowrap ${
                reviewSubTab === "submission" ? "bg-[#c85b4b] text-white shadow-xs" : "text-[#933425] hover:bg-white/60"
              }`}
            >
              <Send size={14} />
              RJSC Portal Submission & Query Follow-up
            </button>
          </div>

          {/* Subtab 1: Review Desk & Audit Trail + Billing / Financial Statement */}
          {reviewSubTab === "review" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* Action Desk (5 cols) */}
                <ContentCard className="p-4 lg:col-span-5">
                  <h3 className="text-xs font-black uppercase text-[#181818] tracking-wider mb-2">Quality Review Desk</h3>
                  <p className="text-[11px] text-[#6c7671] mb-3">
                    Your Role: <span className="font-black text-[#447a5d]">{userRole}</span> • Stage: <span className="font-black text-[#181818]">{reviewStatus}</span>
                  </p>

                  {reviewError && (
                    <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 font-bold">
                      {reviewError}
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <textarea
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Review findings, audit notes or return feedback (mandatory for returning)..."
                      className="w-full rounded-xl border border-[#d9e3df] p-2.5 text-xs text-[#181818] focus:border-[#447a5d] outline-none"
                    />

                    {/* Junior Actions */}
                    {(userRole === "JUNIOR" || userRole === "ADMIN") && ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"].includes(reviewStatus) && (
                      <button
                        onClick={() => handleReviewAction("SUBMIT_TO_SENIOR")}
                        disabled={submittingReview}
                        className="w-full rounded-xl bg-[#447a5d] py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Send size={13} /> Submit to Senior
                      </button>
                    )}

                    {/* Senior Actions */}
                    {(userRole === "SENIOR" || userRole === "ADMIN" || userRole === "MANAGER") && reviewStatus === "SUBMITTED_TO_SENIOR" && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleReviewAction("APPROVE_BY_SENIOR")}
                          disabled={submittingReview}
                          className="w-full rounded-xl bg-[#447a5d] py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} /> Approve & Escalate to Manager
                        </button>
                        <button
                          onClick={() => handleReviewAction("RETURN_BY_SENIOR")}
                          disabled={submittingReview}
                          className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw size={13} /> Return to Junior for Revision
                        </button>
                      </div>
                    )}

                    {/* Manager Actions */}
                    {(userRole === "MANAGER" || userRole === "ADMIN") && reviewStatus === "SUBMITTED_TO_MANAGER" && (
                      <div className="space-y-2">
                        <button
                          onClick={() => handleReviewAction("FINAL_APPROVE")}
                          disabled={submittingReview}
                          className="w-full rounded-xl bg-[#234a32] py-2 text-xs font-bold text-white hover:bg-[#183523] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 size={13} /> Grant Final Approval for Filing
                        </button>
                        <button
                          onClick={() => handleReviewAction("RETURN_BY_MANAGER")}
                          disabled={submittingReview}
                          className="w-full rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw size={13} /> Return to Team with Queries
                        </button>
                      </div>
                    )}

                    {reviewStatus === "APPROVED" && (
                      <div className="rounded-xl bg-[#e7f5ec] p-2.5 text-center text-xs font-bold text-[#234a32]">
                        ✓ Work order fully approved for RJSC submission.
                      </div>
                    )}
                  </div>
                </ContentCard>

                {/* Review Audit Log (7 cols) */}
                <ContentCard className="p-4 lg:col-span-7">
                  <h3 className="text-xs font-black uppercase text-[#181818] tracking-wider mb-3">Review Audit Log</h3>
                  {reviews.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6c7671]">No review submissions or returns logged yet.</div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {reviews.map((r) => (
                        <div key={r.id} className="rounded-xl border border-[#ece5d9] bg-white p-3">
                          <div className="flex justify-between items-start mb-0.5">
                            <div>
                              <span className="font-bold text-xs text-[#181818]">{r.reviewer_name}</span>
                              <span className="ml-2 rounded-full bg-[#eef7f3] px-2 py-0.5 text-[9px] font-bold text-[#44765b]">
                                {r.reviewer_role}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#6c7671]">{new Date(r.created_at).toLocaleString()}</span>
                          </div>
                          <div className="text-xs font-black text-[#447a5d]">{r.action.replace(/_/g, ' ')}</div>
                          {r.comment && (
                            <div className="mt-1.5 rounded-lg bg-[#fcfbf7] p-2 text-xs text-[#4b4d47] border border-[#ece5d9]">
                              {r.comment}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ContentCard>
              </div>

              {/* Financial Statement & Invoicing Summary */}
              <ContentCard className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-black uppercase text-[#181818] tracking-wider flex items-center gap-1.5">
                    <DollarSign size={15} className="text-[#447a5d]" /> Work Order Financials & Invoicing
                  </h3>
                  <Link href="/billing" className="text-xs font-bold text-[#447a5d] hover:underline flex items-center gap-1">
                    <ExternalLink size={12} /> Open Billing Desk
                  </Link>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3">
                  <div className="rounded-xl border border-[#d9e3df] bg-[#fbfdfc] p-2.5">
                    <div className="text-[10px] font-bold text-[#6c7671] uppercase">Professional Fee</div>
                    <div className="text-sm font-mono font-black text-[#181818] mt-0.5">
                      ৳ {parseFloat(work.professional_fee || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#d9e3df] bg-[#fbfdfc] p-2.5">
                    <div className="text-[10px] font-bold text-[#6c7671] uppercase">Official Govt Fee</div>
                    <div className="text-sm font-mono font-black text-[#181818] mt-0.5">
                      {work.government_fee !== null ? `৳ ${parseFloat(work.government_fee).toLocaleString()}` : "Pending"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#d9e3df] bg-[#fbfdfc] p-2.5">
                    <div className="text-[10px] font-bold text-[#6c7671] uppercase">Disbursements</div>
                    <div className="text-sm font-mono font-black text-[#181818] mt-0.5">
                      ৳ {parseFloat(work.other_cost || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#E8BC63]/40 bg-[#FFF8E8] p-2.5">
                    <div className="text-[10px] font-bold text-[#8a6814] uppercase">Total Billable</div>
                    <div className="text-sm font-mono font-black text-[#8a6814] mt-0.5">
                      {work.total_bill !== null ? `৳ ${parseFloat(work.total_bill).toLocaleString()}` : "Pending"}
                    </div>
                  </div>
                </div>

                {financials && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 border-t border-[#ece5d9] pt-3">
                    <div className="text-xs">
                      <span className="text-[#6c7671]">Invoiced: </span>
                      <strong className="text-[#181818]">৳ {parseFloat(financials.invoice_total || 0).toLocaleString()}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-[#6c7671]">Collected: </span>
                      <strong className="text-[#447a5d]">৳ {parseFloat(financials.collection_total || 0).toLocaleString()}</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-[#6c7671]">Outstanding: </span>
                      <strong className="text-[#eb7b67]">৳ {parseFloat(financials.outstanding || 0).toLocaleString()}</strong>
                    </div>
                  </div>
                )}
              </ContentCard>
            </div>
          )}

          {/* Subtab 2: RJSC Submission Lifecycle Component */}
          {reviewSubTab === "submission" && (
            <div>
              <SubmissionLifecycleWorkspace workId={work.id} onWorkUpdated={fetchData} />
            </div>
          )}
        </div>
      )}

      {/* Task Creation Modal (Preserved exactly) */}
      {taskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-black text-[#181818] mb-4">Create Task for {work.work_code}</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Obtain signature on Form XII..."
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Description (optional)</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Task details or specific guidelines..."
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#6c7671] uppercase">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none bg-white"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#6c7671] uppercase">Due Date</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#6c7671] uppercase">Assign To</label>
                <select
                  value={taskAssignee}
                  onChange={(e) => setTaskAssignee(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9e3df] p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTaskModalOpen(false)}
                  className="rounded-xl border border-[#d9e3df] px-4 py-2 text-xs font-bold text-[#6c7671] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] disabled:opacity-50"
                >
                  {savingTask ? "Saving..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
