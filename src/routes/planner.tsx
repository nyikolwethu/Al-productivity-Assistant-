import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Coffee, ListPlus, Loader2, RefreshCw, Save, Sparkle, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, PriorityBadge } from "@/components/hr/task-bits";
import { parseJSON, runAI } from "@/lib/ai.functions";
import { CURRENT_USER, dayStr, today, useStore, type Priority } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "AI Task Planner — RootHR AI" },
      { name: "description", content: "Generate a realistic daily or weekly HR schedule with AI." },
      { property: "og:title", content: "AI Task Planner — RootHR AI" },
      { property: "og:description", content: "Generate a realistic daily or weekly HR schedule with AI." },
    ],
  }),
  component: Page,
});

type Block = { start: string; end: string; title: string; type: "task" | "break" | "meeting"; taskId: string | null; priority: string | null; done?: boolean };
type Plan = { days: { date: string; blocks: Block[] }[]; overloaded: string[]; atRisk: string[]; suggestions: string[]; rationale: string };

function Page() {
  const run = useServerFn(runAI);
  const { tasks, toggleComplete, addTask, saveItem } = useStore();
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const [hours, setHours] = useState("08:00-17:00");
  const [preferred, setPreferred] = useState("09:00-12:00 deep work");
  const [breaks, setBreaks] = useState("Lunch 12:30-13:15");
  const [durations, setDurations] = useState<Record<string, number>>({});
  const open = useMemo(() => tasks.filter((t) => t.status !== "Completed" && t.assignee === CURRENT_USER.name), [tasks]);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = open.filter((t) => picked.size === 0 || picked.has(t.id));

  const generate = async () => {
    if (!selected.length) return toast.error("No open tasks to plan.");
    setLoading(true);
    const payload = selected.map((t) => ({ id: t.id, title: t.title, priority: t.priority, due: `${t.dueDate} ${t.dueTime}`, estimatedMinutes: durations[t.id] ?? 60 }));
    const r = await run({ data: { kind: "plan", payload: { view: view === "daily" ? "single day" : "5 working days", startDate: today(), hours, preferred, breaks, tasks: JSON.stringify(payload) } } });
    setLoading(false);
    if (!r.ok) return toast.error(r.error);
    const p = parseJSON<Plan>(r.text);
    if (!p?.days) return toast.error("Couldn't read the plan. Please regenerate.");
    setPlan({ ...p, overloaded: p.overloaded ?? [], atRisk: p.atRisk ?? [], suggestions: p.suggestions ?? [] });
  };

  const editBlock = (di: number, bi: number, patch: Partial<Block>) =>
    setPlan((p) => p && { ...p, days: p.days.map((d, i) => (i !== di ? d : { ...d, blocks: d.blocks.map((b, j) => (j === bi ? { ...b, ...patch } : b)) })) });

  const planText = () => plan ? plan.days.map((d) => `${d.date}\n${d.blocks.map((b) => `  ${b.start}-${b.end}  ${b.title}`).join("\n")}`).join("\n\n") + `\n\nWhy: ${plan.rationale}` : "";

  return (
    <>
      <PageHeader title="AI Task Planner" subtitle="A realistic schedule built from your tasks, deadlines and hours">
        <div className="flex rounded-lg border bg-card p-0.5">
          {(["daily", "weekly"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold capitalize", view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{v}</button>
          ))}
        </div>
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Available hours</Label><Input value={hours} onChange={(e) => setHours(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Preferred hours</Label><Input value={preferred} onChange={(e) => setPreferred(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Breaks & meetings</Label><Textarea rows={2} value={breaks} onChange={(e) => setBreaks(e.target.value)} /></div>
          <div>
            <Label className="mb-2 block">Tasks to schedule ({picked.size || "all"} selected)</Label>
            <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {open.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <Checkbox checked={picked.has(t.id)} onCheckedChange={(c) => setPicked((s) => { const n = new Set(s); if (c) n.add(t.id); else n.delete(t.id); return n; })} />
                  <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{t.title}</div><div className="text-[11px] text-muted-foreground">Due {t.dueDate}</div></div>
                  <PriorityBadge p={t.priority} />
                  <Input type="number" min={15} step={15} value={durations[t.id] ?? 60} onChange={(e) => setDurations((d) => ({ ...d, [t.id]: Number(e.target.value) }))} className="h-7 w-16 text-xs" title="Minutes" />
                </div>
              ))}
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}Generate {view} plan</Button>
          <p className="text-[11px] text-muted-foreground">Plans stay in RootHR AI — they are not synced to an external calendar.</p>
        </div>

        <div className="space-y-4 lg:col-span-3">
          {!plan && !loading && <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-dashed text-sm text-muted-foreground">Your schedule will appear here.</div>}
          {loading && <div className="flex min-h-[300px] items-center justify-center rounded-2xl border text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Planning your {view === "daily" ? "day" : "week"}…</div>}
          {plan && !loading && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={generate}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
                <Button size="sm" variant="outline" onClick={() => { saveItem({ kind: "plan", title: `${view} plan ${today()}`, content: planText() }); toast.success("Plan saved"); }}><Save className="h-3.5 w-3.5" />Save plan</Button>
              </div>
              {plan.rationale && <div className="rounded-xl bg-sage-soft p-4 text-sm"><span className="font-semibold">Why this order: </span>{plan.rationale}</div>}
              {(plan.atRisk.length > 0 || plan.overloaded.length > 0) && (
                <div className="rounded-xl bg-warning-soft p-4 text-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-warning"><AlertTriangle className="h-4 w-4" />Heads up</div>
                  <ul className="list-disc pl-5">{[...plan.overloaded.map((o) => `Overloaded: ${o}`), ...plan.atRisk.map((r) => `At risk: ${r}`)].map((x, i) => <li key={i}>{x}</li>)}</ul>
                </div>
              )}
              {plan.days.map((d, di) => (
                <div key={d.date + di} className="rounded-2xl border bg-card p-4 shadow-soft">
                  <h3 className="mb-3 font-semibold">{new Date(d.date + "T00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</h3>
                  <div className="space-y-1.5">
                    {d.blocks.map((b, bi) => {
                      const task = b.taskId ? tasks.find((t) => t.id === b.taskId) : undefined;
                      const done = task ? task.status === "Completed" : b.done;
                      return (
                        <div key={bi} className={cn("flex items-center gap-2 rounded-lg border-l-4 p-2", b.type === "break" ? "border-sage bg-muted/50" : b.type === "meeting" ? "border-brown bg-brown-soft/50" : "border-primary bg-secondary/50", done && "opacity-60")}>
                          <Input value={b.start} onChange={(e) => editBlock(di, bi, { start: e.target.value })} className="h-7 w-16 px-1 text-center text-xs" />
                          <span className="text-xs">–</span>
                          <Input value={b.end} onChange={(e) => editBlock(di, bi, { end: e.target.value })} className="h-7 w-16 px-1 text-center text-xs" />
                          {b.type === "break" ? <Coffee className="h-4 w-4 text-sage" /> : b.type === "meeting" ? <Users className="h-4 w-4 text-brown" /> : <Checkbox checked={!!done} onCheckedChange={() => (task ? toggleComplete(task.id) : editBlock(di, bi, { done: !b.done }))} />}
                          <span className={cn("flex-1 truncate text-sm font-medium", done && "line-through")}>{b.title}</span>
                          {b.priority && <PriorityBadge p={b.priority as Priority} />}
                          {b.type !== "break" && !task && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Add to tasks" onClick={() => { addTask({ title: b.title, description: "Added from AI planner", category: "HR Administration", priority: "Medium", status: "To Do", startDate: d.date, dueDate: d.date, dueTime: b.end, assignee: CURRENT_USER.name, department: "Human Resources", notes: "" }); toast.success("Added to tasks"); }}>
                              <ListPlus className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {plan.suggestions.length > 0 && (
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="mb-1 text-sm font-semibold">Postpone, delegate or group</h3>
                  <ul className="list-disc pl-5 text-sm">{plan.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <span className="hidden">{dayStr(0)}</span>
    </>
  );
}
