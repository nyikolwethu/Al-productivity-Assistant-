import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CATEGORIES, EMPLOYEES, PRIORITIES, STATUSES, dayStr, isOverdue, today, useStore, type Status, type Task } from "@/lib/store";
import { Avatar, PriorityBadge, TaskRow, fmtDate } from "./task-bits";

type View = "list" | "kanban" | "calendar";
const pRank = { Urgent: 0, High: 1, Medium: 2, Low: 3 } as const;

function F({ value, onChange, items, label }: { value: string; onChange: (v: string) => void; items: readonly string[]; label: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] bg-card text-xs"><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function TaskBoard({ filter, showAssigneeFilter = true }: { filter?: (t: Task) => boolean; showAssigneeFilter?: boolean }) {
  const { tasks, search, setSearch, updateTask, openTaskDialog } = useStore();
  const [view, setView] = useState<View>("list");
  const [cat, setCat] = useState("all");
  const [pri, setPri] = useState("all");
  const [st, setSt] = useState("all");
  const [who, setWho] = useState("all");
  const [due, setDue] = useState("all");
  const [sort, setSort] = useState("due");

  const list = useMemo(() => {
    const q = search.toLowerCase().trim();
    const t0 = today();
    const week = dayStr(7);
    return tasks
      .filter((t) => (filter ? filter(t) : true))
      .filter((t) => !q || [t.title, t.description, t.category, t.assignee, t.department].some((x) => x.toLowerCase().includes(q)))
      .filter((t) => cat === "all" || t.category === cat)
      .filter((t) => pri === "all" || t.priority === pri)
      .filter((t) => st === "all" || t.status === st)
      .filter((t) => who === "all" || t.assignee === who)
      .filter((t) =>
        due === "all" ? true : due === "Today" ? t.dueDate === t0 : due === "This week" ? t.dueDate >= t0 && t.dueDate <= week : isOverdue(t),
      )
      .sort((a, b) =>
        sort === "priority" ? pRank[a.priority] - pRank[b.priority] : sort === "recent" ? b.createdAt - a.createdAt : (a.dueDate + a.dueTime).localeCompare(b.dueDate + b.dueTime),
      );
  }, [tasks, filter, search, cat, pri, st, who, due, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border bg-card p-0.5">
          {([["list", List, "List"], ["kanban", Columns3, "Board"], ["calendar", CalendarDays, "Calendar"]] as const).map(([v, Icon, l]) => (
            <button key={v} onClick={() => setView(v)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="h-3.5 w-3.5" />{l}
            </button>
          ))}
        </div>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="h-9 w-44 bg-card text-xs" />
        <F value={cat} onChange={setCat} items={CATEGORIES} label="Categories" />
        <F value={pri} onChange={setPri} items={PRIORITIES} label="Priorities" />
        <F value={st} onChange={setSt} items={STATUSES} label="Statuses" />
        {showAssigneeFilter && <F value={who} onChange={setWho} items={EMPLOYEES} label="Assignees" />}
        <F value={due} onChange={setDue} items={["Today", "This week", "Overdue"]} label="Due dates" />
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="h-9 w-auto bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="due">Sort: Due date</SelectItem>
            <SelectItem value="priority">Sort: Priority</SelectItem>
            <SelectItem value="recent">Sort: Recently created</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{list.length} task{list.length === 1 ? "" : "s"}</p>

      {view === "list" && (
        <div className="space-y-2">
          {list.length === 0 && <Empty onNew={() => openTaskDialog()} />}
          {list.map((t) => <TaskRow key={t.id} task={t} />)}
        </div>
      )}
      {view === "kanban" && <Kanban tasks={list} onMove={(id, s) => updateTask(id, { status: s })} />}
      {view === "calendar" && <CalendarView tasks={list} />}
    </div>
  );
}

function Empty({ onNew }: { onNew: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
      No tasks match. <button className="font-semibold text-primary underline" onClick={onNew}>Create one</button>
    </div>
  );
}

function Kanban({ tasks, onMove }: { tasks: Task[]; onMove: (id: string, s: Status) => void }) {
  const { openTaskDialog } = useStore();
  const [over, setOver] = useState<Status | null>(null);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {STATUSES.map((s) => {
        const col = tasks.filter((t) => t.status === s);
        return (
          <div
            key={s}
            onDragOver={(e) => { e.preventDefault(); setOver(s); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => { e.preventDefault(); setOver(null); onMove(e.dataTransfer.getData("text/plain"), s); }}
            className={cn("min-h-[300px] rounded-2xl bg-secondary/60 p-3 transition", over === s && "ring-2 ring-ring")}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="font-display text-sm font-semibold">{s}</h3>
              <span className="rounded-full bg-card px-2 text-xs font-semibold">{col.length}</span>
            </div>
            <div className="space-y-2">
              {col.map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)}
                  onClick={() => openTaskDialog(t)}
                  className={cn("cursor-grab rounded-xl border bg-card p-3 shadow-soft active:cursor-grabbing", t.status === "Completed" && "opacity-60")}
                >
                  <div className={cn("text-sm font-semibold", t.status === "Completed" && "line-through")}>{t.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{t.category}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <PriorityBadge p={t.priority} />
                    <div className="flex items-center gap-2">
                      <span className={cn("text-xs", isOverdue(t) ? "font-semibold text-destructive" : "text-muted-foreground")}>{fmtDate(t.dueDate)}</span>
                      <Avatar name={t.assignee} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CalendarView({ tasks }: { tasks: Task[] }) {
  const { openTaskDialog } = useStore();
  const [offset, setOffset] = useState(0);
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + offset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const startPad = (base.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((startPad + days) / 7) * 7 }, (_, i) => i - startPad + 1);
  const t0 = today();
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">{base.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <div className="flex gap-1">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setOffset((o) => o - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="sm" variant="outline" className="h-8" onClick={() => setOffset(0)}>Today</Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setOffset((o) => o + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d < 1 || d > days) return <div key={i} className="min-h-[90px] rounded-lg bg-muted/40" />;
          const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const items = tasks.filter((t) => t.dueDate === ds);
          return (
            <div key={i} className={cn("min-h-[90px] rounded-lg border p-1.5 text-left", ds === t0 && "border-primary bg-sage-soft/50")}>
              <div className="text-xs font-semibold">{d}</div>
              <div className="mt-1 space-y-1">
                {items.slice(0, 3).map((t) => (
                  <button key={t.id} onClick={() => openTaskDialog(t)} className={cn("block w-full truncate rounded bg-secondary px-1 py-0.5 text-left text-[10px] font-medium", t.status === "Completed" && "line-through opacity-60")}>
                    {t.title}
                  </button>
                ))}
                {items.length > 3 && <div className="text-[10px] text-muted-foreground">+{items.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
