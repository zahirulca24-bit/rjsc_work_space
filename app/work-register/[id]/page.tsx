"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FolderOpen, BriefcaseBusiness, CheckCircle2, Clock3, AlertTriangle,
  ArrowLeft, ArrowRight, UserCheck, ShieldAlert, FileText, Check, Plus,
  Trash2, RefreshCw, Send, RotateCcw, DollarSign, Calendar, ExternalLink,
  ChevronRight, ClipboardList, CheckSquare, Layers, Building2, Users
} from "lucide-react";
import {
  getWork, updateWork, getWorkChecklist, addWorkChecklistItem,
  updateWorkChecklistItem, deleteWorkChecklistItem, generateWorkChecklist,
  getWorkFinancialSummary, ChecklistItem
} from "@/lib/api/works";
import { getClient } from "@/lib/api/clients";
import { getTasks, createTask, updateTask, TaskItem, TaskPriority, TaskStatus } from "@/lib/api/tasks";
import { listDocuments } from "@/lib/api/documents";
import { getWorkReviews, postReviewAction } from "@/lib/api/reviews";
import { getUsers } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PageHeader, ContentCard, StatCard, StatusBadge, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import WorkingPaperWorkspace from "@/components/working-papers/WorkingPaperWorkspace";
import SubmissionLifecycleWorkspace from "@/components/submissions/SubmissionLifecycleWorkspace";
import AnnualReturnServicePanel from "@/components/services/AnnualReturnServicePanel";
import ShareTransferServicePanel from "@/components/services/ShareTransferServicePanel";
import MortgageChargeServicePanel from "@/components/services/MortgageChargeServicePanel";

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
  const [activeTab, setActiveTab] = useState<"overview" | "service-module" | "checklist" | "tasks" | "documents" | "working-papers" | "review" | "submission-lifecycle" | "finance">("overview");

  // Checklist Item Modal
  const [newChecklistText, setNewChecklistText] = useState("");
  const [newChecklistRef, setNewChecklistRef] = useState("");
  const [addingChecklist, setAddingChecklist] = useState(false);

  // Task Modal
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
      <div className="mx-auto max-w-7xl py-12">
        <LoadingState />
      </div>
    );
  }

  if (!work) {
    return (
      <div className="mx-auto max-w-7xl py-12 text-center">
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

  const serviceCategory = useMemo(() => {
    if (!work?.service_id) return null;
    const sid = work.service_id.toLowerCase();
    if (sid.includes("annual-return")) return "annual-return";
    if (sid.includes("share-transfer")) return "share-transfer";
    if (sid.includes("mortgage") || sid.includes("charge")) return "mortgage-charge";
    return null;
  }, [work?.service_id]);

  const serviceTabConfig = useMemo(() => {
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
  }, [serviceCategory]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-16">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ece5d9] pb-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#6c7671]">
          <Link href="/work-register" className="hover:text-[#181818] transition flex items-center gap-1">
            <FolderOpen size={16} /> Work Register
          </Link>
          <ChevronRight size={14} />
          <span className="text-[#181818] font-black">{work.work_code}</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/clients/${work.client_id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-1.5 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
          >
            <Building2 size={14} /> Client Master: {client?.legal_name || "Client Profile"}
          </Link>
        </div>
      </div>

      {/* Main Header Card */}
      <div className="rounded-2xl border border-[#d9e3df] bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xl font-black text-[#181818]">{work.work_code}</span>
              <StatusBadge status={work.status} />
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                reviewStatus === 'APPROVED' ? 'bg-[#dff1e7] text-[#234a32]' :
                reviewStatus.includes('RETURNED') ? 'bg-[#fce9e4] text-[#a03c2a]' :
                reviewStatus.includes('SUBMITTED') ? 'bg-[#e8f7f9] text-[#2c747d]' : 'bg-gray-100 text-gray-700'
              }`}>
                Review: {reviewStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-black text-[#181818]">
              {work.service_id.replace(/-/g, ' ').toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-[#6c7671] font-medium">
              Legal Entity: <span className="font-bold text-[#181818]">{work.entity_type.replace(/_/g, ' ')}</span> • Client: <span className="font-bold text-[#447a5d]">{client?.legal_name || "Unknown"}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="text-right mr-3">
              <div className="text-xs uppercase font-bold text-[#6c7671]">Total Billable</div>
              <div className="text-xl font-black font-mono text-[#181818]">
                {work.total_bill !== null ? `৳ ${parseFloat(work.total_bill).toLocaleString()}` : 'Pending Calc'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Progress Bar Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[#ece5d9] pt-4">
          <div>
            <div className="flex justify-between text-xs font-bold text-[#44765b] mb-1.5">
              <span>Document Checklist Progress</span>
              <span>{completedChecklist}/{totalChecklist} ({checklistPercent}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef7f3]">
              <div className="h-full bg-[#447a5d] transition-all" style={{ width: `${checklistPercent}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs font-bold text-[#44765b] mb-1.5">
              <span>Task Execution Progress</span>
              <span>{completedTasks}/{totalTasks} ({taskPercent}%)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef7f3]">
              <div className="h-full bg-[#72c9d4] transition-all" style={{ width: `${taskPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#d9e3df] gap-1 overflow-x-auto bg-[#fffaf0] p-1 rounded-xl">
        {[
          { key: "overview", label: "Overview & Details", icon: BriefcaseBusiness },
          ...(serviceTabConfig ? [{ key: "service-module", label: serviceTabConfig.label, icon: serviceTabConfig.icon }] : []),
          { key: "checklist", label: `Checklist (${completedChecklist}/${totalChecklist})`, icon: ClipboardList },
          { key: "tasks", label: `Tasks & Deadlines (${tasks.length})`, icon: CheckSquare },
          { key: "documents", label: `Documents (${documents.length})`, icon: FileText },
          { key: "working-papers", label: "Working Papers & Forms", icon: Layers },
          { key: "review", label: `Review & Approval (${reviews.length})`, icon: ShieldAlert },
          { key: "submission-lifecycle", label: "RJSC Submission & Tracking", icon: Send },
          { key: "finance", label: "Billing & Finance", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition whitespace-nowrap ${
                isActive
                  ? "bg-[#447a5d] text-white shadow-sm"
                  : "text-[#6c7671] hover:bg-[#f1ece1] hover:text-[#181818]"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {serviceTabConfig && (
            <div className="rounded-2xl border-2 border-[#79b993]/50 bg-[#f4f9f6] p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#447a5d] text-white shadow-sm">
                  <serviceTabConfig.icon size={22} />
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-wider text-[#44765b]">Specialized Statutory Workspace</div>
                  <h3 className="text-base font-black text-[#181818]">{serviceTabConfig.label}</h3>
                  <p className="text-xs text-[#6c7671] mt-0.5">{serviceTabConfig.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab("service-module")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#396a50] transition whitespace-nowrap"
              >
                Open {serviceTabConfig.label} <ArrowRight size={14} />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status & Lifecycle Flow */}
            <ContentCard className="p-6 md:col-span-2">
              <h2 className="text-base font-black text-[#181818] mb-4 flex items-center gap-2">
                <Clock3 size={18} className="text-[#447a5d]" /> Work Lifecycle Stage
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {LIFECYCLE_STATUSES.map((st) => {
                  const isCurrent = work.status === st;
                  return (
                    <button
                      key={st}
                      disabled={updatingStatus}
                      onClick={() => handleStatusChange(st)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        isCurrent
                          ? "border-[#447a5d] bg-[#e7f5ec] font-black text-[#234a32] shadow-sm"
                          : "border-[#d9e3df] bg-white text-[#6c7671] hover:border-[#79b993] hover:text-[#181818]"
                      }`}
                    >
                      <div className="text-[11px] uppercase tracking-wider text-[#6c7671]">Stage</div>
                      <div className="text-sm font-bold mt-1">{st}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-xl border border-dashed border-[#d9e3df] p-4 bg-[#fcfbf7]">
                <div className="text-xs font-bold text-[#6c7671] uppercase">Audit Timestamps</div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div>Created: <span className="font-bold text-[#181818]">{new Date(work.created_at).toLocaleDateString()}</span></div>
                  <div>Submitted: <span className="font-bold text-[#181818]">{work.submitted_at ? new Date(work.submitted_at).toLocaleDateString() : "Pending"}</span></div>
                  <div>Completed: <span className="font-bold text-[#181818]">{work.completed_at ? new Date(work.completed_at).toLocaleDateString() : "Active"}</span></div>
                </div>
              </div>
            </ContentCard>

            {/* Assignment & Operational Meta */}
            <ContentCard className="p-6">
              <h2 className="text-base font-black text-[#181818] mb-4 flex items-center gap-2">
                <UserCheck size={18} className="text-[#447a5d]" /> Staff & Parameters
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#6c7671] uppercase">Assigned Staff</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm font-bold text-[#181818] focus:border-[#447a5d] outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#6c7671] uppercase">Statutory / Office Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm font-bold text-[#181818] focus:border-[#447a5d] outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#6c7671] uppercase">Internal Instructions / Notes</label>
                  <textarea
                    rows={3}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Specific filing instructions or client requirements..."
                    className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2.5 text-sm text-[#181818] focus:border-[#447a5d] outline-none"
                  />
                </div>

                <button
                  onClick={handleSaveDetails}
                  disabled={savingDetails}
                  className="w-full rounded-xl bg-[#447a5d] py-2.5 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
                >
                  {savingDetails ? "Saving..." : "Save Work Parameters"}
                </button>
              </div>
            </ContentCard>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Specialized Statutory Service Workspace */}
      {activeTab === "service-module" && serviceCategory && (
        <div className="space-y-6">
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

      {/* TAB CONTENT: Checklist */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-[#181818]">Statutory Document Checklist & Requisition</h2>
              <p className="text-xs text-[#6c7671]">Requirements auto-matched from client master legal documents.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResyncChecklist}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
              >
                <RefreshCw size={14} /> Re-sync from Rules
              </button>
            </div>
          </div>

          <ContentCard>
            {checklist.length === 0 ? (
              <div className="p-8 text-center text-[#6c7671]">
                <ClipboardList className="mx-auto h-10 w-10 text-[#6c7671] mb-2" />
                <p className="font-bold">No checklist requirements recorded yet.</p>
                <button
                  onClick={handleResyncChecklist}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50]"
                >
                  <RefreshCw size={14} /> Generate Standard Checklist
                </button>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th className="w-12">Done</Th>
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
                            className={`grid h-6 w-6 place-items-center rounded-lg border transition ${
                              isDone
                                ? "border-[#447a5d] bg-[#447a5d] text-white"
                                : "border-[#d9e3df] bg-white text-transparent hover:border-[#447a5d]"
                            }`}
                          >
                            <Check size={14} />
                          </button>
                        </Td>
                        <Td>
                          <div className={`font-bold text-sm ${isDone ? "text-[#234a32]" : "text-[#181818]"}`}>
                            {item.item_text}
                          </div>
                          {item.item_code && (
                            <span className="font-mono text-[10px] text-[#6c7671] font-semibold">{item.item_code}</span>
                          )}
                        </Td>
                        <Td className="text-xs text-[#6c7671] font-medium">
                          {item.source_reference || "Statutory Office Requisition"}
                        </Td>
                        <Td>
                          <StatusBadge status={item.status} />
                        </Td>
                        <Td className="text-xs text-[#6c7671]">
                          {item.completed_by ? (
                            <div>
                              <span className="font-bold text-[#181818]">{item.completed_by}</span>
                              {item.completed_at && (
                                <div className="text-[10px]">{new Date(item.completed_at).toLocaleDateString()}</div>
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
                            <Trash2 size={16} />
                          </button>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}

            {/* Add Custom Requirement Inline Form */}
            <form onSubmit={handleAddChecklist} className="border-t border-[#ece5d9] bg-[#fcfbf7] p-4 flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                placeholder="Add specific required document or clearance..."
                value={newChecklistText}
                onChange={(e) => setNewChecklistText(e.target.value)}
                className="flex-1 rounded-xl border border-[#d9e3df] bg-white px-3.5 py-2 text-sm text-[#181818] focus:border-[#447a5d] outline-none"
              />
              <input
                type="text"
                placeholder="Source / Legal Reference (optional)"
                value={newChecklistRef}
                onChange={(e) => setNewChecklistRef(e.target.value)}
                className="w-full sm:w-64 rounded-xl border border-[#d9e3df] bg-white px-3.5 py-2 text-sm text-[#181818] focus:border-[#447a5d] outline-none"
              />
              <button
                type="submit"
                disabled={addingChecklist || !newChecklistText.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50"
              >
                <Plus size={16} /> Add Requirement
              </button>
            </form>
          </ContentCard>
        </div>
      )}

      {/* TAB CONTENT: Tasks */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-[#181818]">Work Order Tasks & Deadlines</h2>
              <p className="text-xs text-[#6c7671]">Operational milestones and deadline tracking for this work.</p>
            </div>
            <button
              onClick={() => setTaskModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition"
            >
              <Plus size={16} /> Create Task
            </button>
          </div>

          <ContentCard>
            {tasks.length === 0 ? (
              <div className="p-8 text-center text-[#6c7671]">
                <CheckSquare className="mx-auto h-10 w-10 text-[#6c7671] mb-2" />
                <p className="font-bold">No tasks assigned to this work order yet.</p>
                <button
                  onClick={() => setTaskModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50]"
                >
                  <Plus size={14} /> Add First Task
                </button>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th className="w-12">Done</Th>
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
                            className={`grid h-6 w-6 place-items-center rounded-lg border transition ${
                              isDone
                                ? "border-[#447a5d] bg-[#447a5d] text-white"
                                : "border-[#d9e3df] bg-white text-transparent hover:border-[#447a5d]"
                            }`}
                          >
                            <Check size={14} />
                          </button>
                        </Td>
                        <Td>
                          <div className={`font-bold text-sm ${isDone ? "line-through text-[#6c7671]" : "text-[#181818]"}`}>
                            {task.title}
                          </div>
                          {task.description && (
                            <div className="text-xs text-[#6c7671] mt-0.5">{task.description}</div>
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
                        <Td>
                          <StatusBadge status={task.status} />
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </ContentCard>
        </div>
      )}

      {/* TAB CONTENT: Documents */}
      {activeTab === "documents" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-[#181818]">Client & Work Documents</h2>
              <p className="text-xs text-[#6c7671]">All legal files attached to this client and work order.</p>
            </div>
            <Link
              href={`/clients/${work.client_id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
            >
              <ExternalLink size={14} /> Open Client File Repository
            </Link>
          </div>

          <ContentCard>
            {documents.length === 0 ? (
              <div className="p-8 text-center text-[#6c7671]">
                <FileText className="mx-auto h-10 w-10 text-[#6c7671] mb-2" />
                <p className="font-bold">No documents uploaded for this client yet.</p>
              </div>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Document Name</Th>
                    <Th>Category</Th>
                    <Th>Verification Status</Th>
                    <Th>Uploaded Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <Td>
                        <div className="font-bold text-sm text-[#181818]">{doc.document_name}</div>
                        {doc.original_filename && (
                          <div className="text-[11px] text-[#6c7671] font-mono">{doc.original_filename}</div>
                        )}
                      </Td>
                      <Td className="text-xs font-bold uppercase text-[#44765b]">
                        {doc.category || "General"}
                      </Td>
                      <Td>
                        <StatusBadge status={doc.status} />
                      </Td>
                      <Td className="text-xs text-[#6c7671]">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </ContentCard>
        </div>
      )}

      {/* TAB CONTENT: Working Papers Workspace */}
      {activeTab === "working-papers" && (
        <div className="space-y-6">
          <WorkingPaperWorkspace workId={work.id} />
        </div>
      )}

      {/* TAB CONTENT: Review & Approval */}
      {activeTab === "review" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-[#181818]">Office Review & Multi-Level Signoff</h2>
              <p className="text-xs text-[#6c7671]">Quality assurance workflow: Junior Preparation → Senior Review → Manager Approval.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Take Action Panel */}
            <ContentCard className="p-6 md:col-span-1">
              <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-3">Action Desk</h3>
              <p className="text-xs text-[#6c7671] mb-4">
                Current Role: <span className="font-black text-[#447a5d]">{userRole}</span> • Stage: <span className="font-black text-[#181818]">{reviewStatus}</span>
              </p>

              {reviewError && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-bold">
                  {reviewError}
                </div>
              )}

              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Review findings, audit notes or return feedback (mandatory for returning)..."
                  className="w-full rounded-xl border border-[#d9e3df] p-3 text-xs text-[#181818] focus:border-[#447a5d] outline-none"
                />

                {/* Junior Actions */}
                {(userRole === "JUNIOR" || userRole === "ADMIN") && ["DRAFT", "RETURNED_BY_SENIOR", "RETURNED_BY_MANAGER"].includes(reviewStatus) && (
                  <button
                    onClick={() => handleReviewAction("SUBMIT_TO_SENIOR")}
                    disabled={submittingReview}
                    className="w-full rounded-xl bg-[#447a5d] py-2.5 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Send size={14} /> Submit to Senior
                  </button>
                )}

                {/* Senior Actions */}
                {(userRole === "SENIOR" || userRole === "ADMIN" || userRole === "MANAGER") && reviewStatus === "SUBMITTED_TO_SENIOR" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleReviewAction("APPROVE_BY_SENIOR")}
                      disabled={submittingReview}
                      className="w-full rounded-xl bg-[#447a5d] py-2.5 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Approve & Escalate to Manager
                    </button>
                    <button
                      onClick={() => handleReviewAction("RETURN_BY_SENIOR")}
                      disabled={submittingReview}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Return to Junior for Revision
                    </button>
                  </div>
                )}

                {/* Manager Actions */}
                {(userRole === "MANAGER" || userRole === "ADMIN") && reviewStatus === "SUBMITTED_TO_MANAGER" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleReviewAction("FINAL_APPROVE")}
                      disabled={submittingReview}
                      className="w-full rounded-xl bg-[#234a32] py-2.5 text-xs font-bold text-white hover:bg-[#183523] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Grant Final Approval for Filing
                    </button>
                    <button
                      onClick={() => handleReviewAction("RETURN_BY_MANAGER")}
                      disabled={submittingReview}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw size={14} /> Return to Team with Queries
                    </button>
                  </div>
                )}

                {reviewStatus === "APPROVED" && (
                  <div className="rounded-xl bg-[#e7f5ec] p-3 text-center text-xs font-bold text-[#234a32]">
                    ✓ Work order fully approved for RJSC submission.
                  </div>
                )}
              </div>
            </ContentCard>

            {/* Review History Trail */}
            <ContentCard className="p-6 md:col-span-2">
              <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-4">Review Audit Log</h3>
              {reviews.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#6c7671]">No review submissions or returns logged yet.</div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r) => (
                    <div key={r.id} className="rounded-xl border border-[#ece5d9] bg-white p-4">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <span className="font-bold text-sm text-[#181818]">{r.reviewer_name}</span>
                          <span className="ml-2 rounded-full bg-[#eef7f3] px-2 py-0.5 text-[10px] font-bold text-[#44765b]">
                            {r.reviewer_role}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#6c7671]">{new Date(r.created_at).toLocaleString()}</span>
                      </div>
                      <div className="text-xs font-black text-[#447a5d] mt-1">{r.action.replace(/_/g, ' ')}</div>
                      {r.comment && (
                        <div className="mt-2 rounded-lg bg-[#fcfbf7] p-2 text-xs text-[#4b4d47] border border-[#ece5d9]">
                          {r.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ContentCard>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RJSC Submission & Tracking Lifecycle */}
      {activeTab === "submission-lifecycle" && (
        <div className="space-y-6">
          <SubmissionLifecycleWorkspace workId={work.id} onWorkUpdated={fetchData} />
        </div>
      )}

      {/* TAB CONTENT: Finance */}
      {activeTab === "finance" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-black text-[#181818]">Work Order Financial Statement</h2>
              <p className="text-xs text-[#6c7671]">Official government challan, professional fees, and billing status.</p>
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#f7fdfa] transition"
            >
              <ExternalLink size={14} /> Open Invoices Desk
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Professional Fee" value={`৳ ${parseFloat(work.professional_fee || 0).toLocaleString()}`} icon={BriefcaseBusiness} color="sage" />
            <StatCard title="Official Govt Fee" value={work.government_fee !== null ? `৳ ${parseFloat(work.government_fee).toLocaleString()}` : "Pending"} icon={DollarSign} color="aqua" />
            <StatCard title="Disbursements" value={`৳ ${parseFloat(work.other_cost || 0).toLocaleString()}`} icon={DollarSign} color="yellow" />
            <StatCard title="Total Work Bill" value={work.total_bill !== null ? `৳ ${parseFloat(work.total_bill).toLocaleString()}` : "Pending"} icon={DollarSign} color="coral" />
          </div>

          {financials && (
            <ContentCard className="p-6">
              <h3 className="text-sm font-black uppercase text-[#181818] tracking-wider mb-4">Invoicing & Collections</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#d9e3df] bg-white p-4">
                  <div className="text-xs font-bold text-[#6c7671]">Billed on Invoices</div>
                  <div className="mt-1 text-xl font-mono font-black text-[#181818]">
                    ৳ {parseFloat(financials.invoice_total || 0).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-[#d9e3df] bg-white p-4">
                  <div className="text-xs font-bold text-[#6c7671]">Collected to Date</div>
                  <div className="mt-1 text-xl font-mono font-black text-[#447a5d]">
                    ৳ {parseFloat(financials.collection_total || 0).toLocaleString()}
                  </div>
                </div>
                <div className="rounded-xl border border-[#d9e3df] bg-white p-4">
                  <div className="text-xs font-bold text-[#6c7671]">Outstanding Balance</div>
                  <div className="mt-1 text-xl font-mono font-black text-[#eb7b67]">
                    ৳ {parseFloat(financials.outstanding || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </ContentCard>
          )}
        </div>
      )}

      {/* Task Creation Modal */}
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
