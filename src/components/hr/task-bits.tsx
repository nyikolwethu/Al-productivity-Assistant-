import { Calendar, Pencil, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isOverdue, useStore, type Priority, type Status, type Task } from "@/lib/store";

const pStyles: Record<Priority, string> = {
  Low: "bg-sage-soft text-primary",
  Medium: "bg-brown-soft text-brown",
  High: "bg-warning-soft text-warning",
  Urgent: "bg-danger-soft text-destructive",
};
const sStyles: Record<Status, string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-brown-soft text-brown",
  Completed: "bg-sage-soft text-primary",
};

export function PriorityBadge({ p }: { p: Priority }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", pStyles[p])}>{p}</span>;
}
export function StatusBadge({ s }: { s: Status }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", sStyles[s])}>{s}</span>;
}
export function Avatar({ name, className }: { name: string; className?: string }) {
  const ini = name.split(" ").map((x) => x[0]).slice(0, 2).join("");
  return (
    <span className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brown text-[10px] font-bold text-primary-foreground", className)} title={name}>
      {ini}
    </span>
  );
}
export function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function TaskRow({ task, compact }: { task: Task; compact?: boolean }) {
  const { toggleComplete, openTaskDialog, deleteTask } = useStore();
  const done = task.status === "Completed";
  const overdue = isOverdue(task);
  return (
    <div className={cn("group flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 transition hover:shadow-soft", done && "opacity-60")}>
      <Checkbox checked={done} onCheckedChange={() => toggleComplete(task.id)} aria-label={`Complete ${task.title}`} />
      <button className="min-w-0 flex-1 text-left" onClick={() => openTaskDialog(task)}>
        <div className={cn("truncate text-sm font-semibold", done && "line-through")}>{task.title}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{task.category}</span>
          <span className={cn("inline-flex items-center gap-1", overdue && "font-semibold text-destructive")}>
            <Calendar className="h-3 w-3" />
            {fmtDate(task.dueDate)} {task.dueTime}
            {overdue && " · Overdue"}
          </span>
        </div>
      </button>
      <div className="hidden items-center gap-2 sm:flex">
        <PriorityBadge p={task.priority} />
        {!compact && <StatusBadge s={task.status} />}
        <Avatar name={task.assignee} />
      </div>
      {!compact && (
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openTaskDialog(task)} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteTask(task.id)} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
