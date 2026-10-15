import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export const CATEGORIES = [
  "Recruitment & Hiring",
  "Employee Onboarding",
  "Training & Development",
  "Payroll & Benefits",
  "Employee Relations",
  "Performance Reviews",
  "Leave & Attendance",
  "HR Administration",
  "Meetings & Follow-ups",
  "Compliance & Policies",
] as const;
export const PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export const STATUSES = ["To Do", "In Progress", "Completed"] as const;
export const DEPARTMENTS = ["Human Resources", "Finance", "Engineering", "Sales", "Operations", "Marketing", "Legal"] as const;

export const CURRENT_USER = { name: "Nyiko Shipalana", role: "HR Business Partner", initials: "NS" };
export const EMPLOYEES = [CURRENT_USER.name, "Thandi Mokoena", "Daniel Pretorius", "Aisha Patel", "Sipho Ndlovu", "Megan van Wyk"];

export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];
export type Task = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  startDate: string;
  dueDate: string;
  dueTime: string;
  assignee: string;
  department: string;
  notes: string;
  createdAt: number;
};
export type Activity = { id: string; text: string; at: number; kind: "created" | "completed" | "updated" | "assigned" | "deleted" };
export type SavedItem = { id: string; title: string; at: number; content: string; kind: "meeting" | "research" | "plan" };
export type Notification = { id: string; text: string; at: number; read: boolean };

export const uid = () => Math.random().toString(36).slice(2, 10);
export function dayStr(offset = 0, base = new Date()) {
  const d = new Date(base);
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export const today = () => dayStr(0);
export const isOverdue = (t: Task) => t.status !== "Completed" && t.dueDate < today();

function seed(): Task[] {
  const now = Date.now();
  const mk = (
    title: string, category: string, priority: Priority, status: Status, due: number, time: string, assignee: string, department: string, description = "",
  ): Task => ({
    id: uid(), title, description, category, priority, status, startDate: dayStr(Math.min(due, 0) - 2), dueDate: dayStr(due), dueTime: time,
    assignee, department, notes: "", createdAt: now - Math.abs(due + 5) * 3600_000,
  });
  return [
    mk("Screen applicants for Senior Data Analyst", "Recruitment & Hiring", "High", "In Progress", 0, "11:00", CURRENT_USER.name, "Engineering", "Shortlist top 8 CVs from the careers portal."),
    mk("Prepare onboarding pack for 3 new starters", "Employee Onboarding", "Urgent", "To Do", 0, "14:00", CURRENT_USER.name, "Sales", "Laptops, access cards, welcome letters and buddy assignments."),
    mk("Approve pending leave requests", "Leave & Attendance", "Medium", "Completed", 0, "09:30", CURRENT_USER.name, "Operations"),
    mk("Follow up on Q3 engagement survey", "Meetings & Follow-ups", "Medium", "To Do", 0, "16:00", "Thandi Mokoena", "Human Resources"),
    mk("Finalize October payroll adjustments", "Payroll & Benefits", "Urgent", "In Progress", 1, "12:00", "Daniel Pretorius", "Finance"),
    mk("Schedule mid-year performance reviews", "Performance Reviews", "High", "To Do", 2, "10:00", CURRENT_USER.name, "Engineering"),
    mk("Update remote work policy draft", "Compliance & Policies", "High", "In Progress", 3, "15:00", "Aisha Patel", "Legal"),
    mk("Book leadership workshop facilitator", "Training & Development", "Low", "To Do", 5, "11:30", "Sipho Ndlovu", "Human Resources"),
    mk("Mediate team conflict — Ops floor", "Employee Relations", "High", "To Do", -1, "13:00", CURRENT_USER.name, "Operations"),
    mk("File POPIA compliance checklist", "Compliance & Policies", "Medium", "To Do", -2, "17:00", "Megan van Wyk", "Legal"),
    mk("Archive exited employee records", "HR Administration", "Low", "Completed", -1, "10:00", "Megan van Wyk", "Human Resources"),
    mk("Interview: Marketing Coordinator (2nd round)", "Recruitment & Hiring", "Medium", "Completed", -3, "14:30", CURRENT_USER.name, "Marketing"),
    mk("Benefits enrolment reminder email", "Payroll & Benefits", "Low", "Completed", -4, "09:00", "Thandi Mokoena", "Finance"),
    mk("Design 30-60-90 day plan template", "Employee Onboarding", "Medium", "In Progress", 6, "12:00", "Aisha Patel", "Human Resources"),
    mk("Monthly HR team sync", "Meetings & Follow-ups", "Medium", "To Do", 7, "09:00", CURRENT_USER.name, "Human Resources"),
    mk("Compliance training rollout — Sales", "Training & Development", "High", "To Do", 9, "10:30", "Sipho Ndlovu", "Sales"),
  ];
}

type State = { tasks: Task[]; activity: Activity[]; saved: SavedItem[]; notifications: Notification[] };
function initial(): State {
  const now = Date.now();
  return {
    tasks: seed(),
    activity: [
      { id: uid(), text: "You completed “Approve pending leave requests”", at: now - 40 * 60_000, kind: "completed" },
      { id: uid(), text: "Daniel Pretorius started “Finalize October payroll adjustments”", at: now - 2 * 3600_000, kind: "updated" },
      { id: uid(), text: "“Update remote work policy draft” assigned to Aisha Patel", at: now - 5 * 3600_000, kind: "assigned" },
      { id: uid(), text: "You created “Prepare onboarding pack for 3 new starters”", at: now - 20 * 3600_000, kind: "created" },
    ],
    saved: [],
    notifications: [
      { id: uid(), text: "2 tasks are overdue", at: now - 30 * 60_000, read: false },
      { id: uid(), text: "Payroll adjustments due tomorrow", at: now - 3 * 3600_000, read: false },
      { id: uid(), text: "Aisha Patel commented on the remote work policy", at: now - 26 * 3600_000, read: true },
    ],
  };
}

type Ctx = State & {
  addTask: (t: Omit<Task, "id" | "createdAt">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  saveItem: (i: Omit<SavedItem, "id" | "at">) => void;
  removeSaved: (id: string) => void;
  markNotificationsRead: () => void;
  resetData: () => void;
  taskDialog: { open: boolean; task: Task | null; prefill?: Partial<Task> };
  openTaskDialog: (task?: Task | null, prefill?: Partial<Task>) => void;
  closeTaskDialog: () => void;
  search: string;
  setSearch: (s: string) => void;
};

const StoreCtx = createContext<Ctx | null>(null);
const KEY = "roothr-state-v1";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const loaded = useRef(false);
  const [taskDialog, setTaskDialog] = useState<Ctx["taskDialog"]>({ open: false, task: null });
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (loaded.current) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state]);

  const log = (s: State, text: string, kind: Activity["kind"]): State => ({
    ...s,
    activity: [{ id: uid(), text, at: Date.now(), kind }, ...s.activity].slice(0, 40),
  });

  const addTask = useCallback((t: Omit<Task, "id" | "createdAt">) => {
    const task: Task = { ...t, id: uid(), createdAt: Date.now() };
    setState((s) => log({ ...s, tasks: [task, ...s.tasks] }, `You created “${task.title}”`, "created"));
    return task;
  }, []);
  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setState((s) => {
      const old = s.tasks.find((t) => t.id === id);
      if (!old) return s;
      const next = { ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) };
      if (patch.status === "Completed" && old.status !== "Completed") return log(next, `You completed “${old.title}”`, "completed");
      if (patch.assignee && patch.assignee !== old.assignee) return log(next, `“${old.title}” assigned to ${patch.assignee}`, "assigned");
      return log(next, `You updated “${old.title}”`, "updated");
    });
  }, []);
  const deleteTask = useCallback((id: string) => {
    setState((s) => {
      const old = s.tasks.find((t) => t.id === id);
      return log({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }, `You deleted “${old?.title}”`, "deleted");
    });
  }, []);
  const toggleComplete = useCallback(
    (id: string) => {
      setState((s) => {
        const t = s.tasks.find((x) => x.id === id);
        if (!t) return s;
        const status: Status = t.status === "Completed" ? "To Do" : "Completed";
        const next = { ...s, tasks: s.tasks.map((x) => (x.id === id ? { ...x, status } : x)) };
        return log(next, status === "Completed" ? `You completed “${t.title}”` : `You reopened “${t.title}”`, status === "Completed" ? "completed" : "updated");
      });
    },
    [],
  );
  const saveItem = useCallback((i: Omit<SavedItem, "id" | "at">) => {
    setState((s) => ({ ...s, saved: [{ ...i, id: uid(), at: Date.now() }, ...s.saved] }));
  }, []);
  const removeSaved = useCallback((id: string) => setState((s) => ({ ...s, saved: s.saved.filter((x) => x.id !== id) })), []);
  const markNotificationsRead = useCallback(
    () => setState((s) => ({ ...s, notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    [],
  );
  const resetData = useCallback(() => setState(initial()), []);

  const value = useMemo<Ctx>(
    () => ({
      ...state, addTask, updateTask, deleteTask, toggleComplete, saveItem, removeSaved, markNotificationsRead, resetData,
      taskDialog,
      openTaskDialog: (task = null, prefill) => setTaskDialog({ open: true, task, prefill }),
      closeTaskDialog: () => setTaskDialog({ open: false, task: null }),
      search, setSearch,
    }),
    [state, addTask, updateTask, deleteTask, toggleComplete, saveItem, removeSaved, markNotificationsRead, resetData, taskDialog, search],
  );
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}

export function timeAgo(at: number) {
  const m = Math.round((Date.now() - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
