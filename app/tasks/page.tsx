"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  ContentCard,
  EmptyState,
  LoadingState,
  PageHeader,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/SharedUI";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getUsers } from "@/lib/api/users";
import { getWorks } from "@/lib/api/works";
import {
  createTask,
  getTasks,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
  updateTask,
} from "@/lib/api/tasks";

const STATUS_OPTIONS: TaskStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
];

const PRIORITY_OPTIONS: TaskPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

function deadlineLabel(state: TaskItem["deadline_state"]) {
  switch (state) {
    case "OVERDUE":
      return "Overdue";
    case "DUE_TODAY":
      return "Due Today";
    case "DUE_SOON":
      return "Due Soon";
    case "UPCOMING":
      return "Upcoming";
    case "COMPLETED":
      return "Completed";
    default:
      return "No Due Date";
  }
}

export default function TasksPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [mineOnly, setMineOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    work_id: "",
    title: "",
    description: "",
    assigned_user_id: "",
    priority: "MEDIUM" as TaskPriority,
    due_date: "",
    reminder_at: "",
  });

  const canCreate =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "SENIOR";

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [taskRows, workRows] = await Promise.all([
        getTasks({ assigned_to_me: mineOnly }),
        getWorks(),
      ]);

      setTasks(taskRows);
      setWorks(workRows);

      if (canCreate) {
        try {
          setUsers(await getUsers());
        } catch {
          setUsers([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [mineOnly, canCreate]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch =
        !q ||
        task.title.toLowerCase().includes(q) ||
        (task.work_code || "").toLowerCase().includes(q) ||
        (task.assigned_user_name || "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" || task.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const overdue = tasks.filter(
    (task) => task.deadline_state === "OVERDUE"
  ).length;

  const dueSoon = tasks.filter((task) =>
    ["DUE_TODAY", "DUE_SOON"].includes(task.deadline_state)
  ).length;

  const completed = tasks.filter(
    (task) => task.status === "COMPLETED"
  ).length;

  const resetForm = () => {
    setForm({
      work_id: "",
      title: "",
      description: "",
      assigned_user_id: "",
      priority: "MEDIUM",
      due_date: "",
      reminder_at: "",
    });
    setFormError("");
  };

  const submitTask = async () => {
    if (!form.work_id || !form.title.trim()) {
      setFormError("Work and title are required.");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      await createTask({
        work_id: form.work_id,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assigned_user_id: form.assigned_user_id || null,
        priority: form.priority,
        due_date: form.due_date || null,
        reminder_at: form.reminder_at
          ? new Date(form.reminder_at).toISOString()
          : null,
      });

      setModalOpen(false);
      resetForm();
      await load();
    } catch (error: any) {
      setFormError(error.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (task: TaskItem, status: TaskStatus) => {
    try {
      await updateTask(task.id, { status });
      await load();
    } catch (error: any) {
      alert(error.message || "Failed to update task");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={ClipboardList}
        title="Tasks & Deadlines"
        subtitle="Assign work, track due dates, and surface reminders."
        actionLabel={canCreate ? "New Task" : undefined}
        actionOnClick={canCreate ? () => setModalOpen(true) : undefined}
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          title="Total Tasks"
          value={tasks.length}
          icon={ClipboardList}
          color="aqua"
        />
        <StatCard
          title="Overdue"
          value={overdue}
          icon={AlertTriangle}
          color="coral"
        />
        <StatCard
          title="Due Soon"
          value={dueSoon}
          icon={Clock3}
          color="yellow"
        />
        <StatCard
          title="Completed"
          value={completed}
          icon={CheckCircle2}
          color="sage"
        />
      </div>

      <ContentCard>
        <div className="flex flex-col gap-3 border-b border-[#ece5d9] bg-[#fffdf7] p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4b4d47]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search task, work or assignee..."
              className="w-full rounded-xl border border-[#d9e3df] py-2 pl-9 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#79b993]"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-sm"
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <button
              onClick={() => setMineOnly((value) => !value)}
              className={
                mineOnly
                  ? "rounded-xl bg-[#447a5d] px-4 py-2 text-sm font-bold text-white"
                  : "rounded-xl border border-[#d9e3df] bg-white px-4 py-2 text-sm font-bold text-[#44765b]"
              }
            >
              My Tasks
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No tasks found"
            message="Create a task or change the filters."
            icon={ClipboardList}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Task / Work</Th>
                <Th>Assigned</Th>
                <Th>Priority</Th>
                <Th>Deadline</Th>
                <Th>Status</Th>
                <Th>Reminder</Th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((task) => (
                <tr key={task.id}>
                  <Td>
                    <div className="font-black text-[#181818]">
                      {task.title}
                    </div>
                    <div className="mt-1 text-xs font-bold text-[#447a5d]">
                      {task.work_code || task.work_id}
                    </div>
                  </Td>

                  <Td>
                    {task.assigned_user_name || "Unassigned"}
                  </Td>

                  <Td>
                    <StatusBadge status={task.priority} />
                  </Td>

                  <Td>
                    <div className="font-bold">
                      {task.due_date || "No due date"}
                    </div>
                    <div className="mt-1 text-xs">
                      <StatusBadge status={deadlineLabel(task.deadline_state)} />
                    </div>
                  </Td>

                  <Td>
                    <select
                      value={task.status}
                      onChange={(e) =>
                        changeStatus(task, e.target.value as TaskStatus)
                      }
                      className="rounded-lg border border-[#d9e3df] bg-white px-2 py-1 text-xs font-bold"
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  </Td>

                  <Td>
                    {task.reminder_due ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#fce9e4] px-2.5 py-1 text-xs font-bold text-[#a03c2a]">
                        <Bell size={12} />
                        Due
                      </span>
                    ) : task.reminder_at ? (
                      <span className="text-xs font-bold text-[#6c7671]">
                        {new Date(task.reminder_at).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-[#8a8f89]">None</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#181818]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[#d9e3df] bg-[#fffaf0] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#ece5d9] bg-white p-5">
              <div>
                <h2 className="text-xl font-black text-[#181818]">
                  New Task
                </h2>
                <p className="mt-1 text-sm text-[#6c7671]">
                  Due dates are operational dates. Legal deadlines are not inferred here.
                </p>
              </div>

              <button
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="rounded-full bg-[#fce9e4] p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              {formError && (
                <div className="md:col-span-2 rounded-xl bg-[#fce9e4] px-4 py-3 text-sm font-bold text-[#a03c2a]">
                  {formError}
                </div>
              )}

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold">Work</span>
                <select
                  value={form.work_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      work_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                >
                  <option value="">Select work</option>
                  {works.map((work) => (
                    <option key={work.id} value={work.id}>
                      {work.work_code} ? {work.service_id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold">Title</span>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-1 block text-sm font-bold">
                  Description
                </span>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold">Assign To</span>
                <select
                  value={form.assigned_user_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      assigned_user_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter((item) => item.is_active)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ? {item.role}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold">Priority</span>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: e.target.value as TaskPriority,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold">Due Date</span>
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                />
              </label>

              <label>
                <span className="mb-1 block text-sm font-bold">Reminder</span>
                <input
                  type="datetime-local"
                  value={form.reminder_at}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reminder_at: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2"
                />
              </label>

              <div className="md:col-span-2 flex justify-end gap-2 border-t border-[#e6dfcf] pt-4">
                <button
                  onClick={() => {
                    setModalOpen(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-[#d9e3df] bg-white px-4 py-2 text-sm font-bold"
                >
                  Cancel
                </button>

                <button
                  disabled={saving}
                  onClick={submitTask}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#447a5d] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                >
                  <Plus size={16} />
                  {saving ? "Saving..." : "Create Task"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
