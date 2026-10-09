import { fetchApi } from "./fetchApi";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export type TaskStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "COMPLETED"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TaskItem {
  id: string;
  work_id: string;
  work_code: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_user_id: string | null;
  assigned_user_name: string | null;
  created_by_user_id: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  deadline_state:
    | "NO_DUE_DATE"
    | "OVERDUE"
    | "DUE_TODAY"
    | "DUE_SOON"
    | "UPCOMING"
    | "COMPLETED";
  reminder_at: string | null;
  reminder_due: boolean;
  reminder_acknowledged_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTasks(params?: {
  work_id?: string;
  assigned_to_me?: boolean;
  status?: string;
}): Promise<TaskItem[]> {
  const qs = new URLSearchParams();

  if (params?.work_id) qs.set("work_id", params.work_id);
  if (params?.assigned_to_me) qs.set("assigned_to_me", "true");
  if (params?.status) qs.set("status", params.status);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const res = await fetchApi(`${API_BASE}/api/tasks${suffix}`);

  if (!res.ok) {
    throw new Error("Failed to fetch tasks");
  }

  return res.json();
}

export async function getTaskReminders(): Promise<TaskItem[]> {
  const res = await fetchApi(`${API_BASE}/api/tasks/reminders`);

  if (!res.ok) {
    throw new Error("Failed to fetch task reminders");
  }

  return res.json();
}

export async function createTask(payload: {
  work_id: string;
  title: string;
  description?: string;
  assigned_user_id?: string | null;
  priority: TaskPriority;
  due_date?: string | null;
  reminder_at?: string | null;
}): Promise<TaskItem> {
  const res = await fetchApi(`${API_BASE}/api/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to create task");
  }

  return res.json();
}

export async function updateTask(
  taskId: string,
  payload: Partial<{
    title: string;
    description: string | null;
    assigned_user_id: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    due_date: string | null;
    reminder_at: string | null;
  }>
): Promise<TaskItem> {
  const res = await fetchApi(`${API_BASE}/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to update task");
  }

  return res.json();
}

export async function acknowledgeTaskReminder(
  taskId: string
): Promise<TaskItem> {
  const res = await fetchApi(
    `${API_BASE}/api/tasks/${taskId}/acknowledge-reminder`,
    { method: "POST" }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to acknowledge reminder");
  }

  return res.json();
}
