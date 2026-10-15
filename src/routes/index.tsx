import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { AlertTriangle, Bot, CalendarClock, CheckCircle2, ClipboardList, FileText, Loader2, Leaf, Mail, Telescope, Timer, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CURRENT_USER, isOverdue, timeAgo, today, useStore } from "@/lib/store";
import { PriorityBadge, TaskRow, fmtDate } from "@/components/hr/task-bits";
import { runAI } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — RootHR AI" },
      { name: "description", content: "Your HR day at a glance: tasks, deadlines, progress and AI productivity tips." },
      { property: "og:title", content: "RootHR AI — Simplify HR. Organize Work. Empower People." },
      { property: "og:description", content: "AI-powered HR task management for modern people teams." },
    ],
  }),
  component: Dashboard,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { tasks, activity } = useStore();
  const run = useServerFn(runAI);
  const [tip, setTip] = useState("Tackle the urgent onboarding pack before lunch, then batch your candidate screening into one focused block.");
  const [loadingTip, setLoadingTip] = useState(false);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === "Completed").length;
    return {
      total: tasks.length,
      done,
      progress: tasks.filter((t) => t.status === "In Progress").length,
      overdue: tasks.filter(isOverdue).length,
      pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    };
  }, [tasks]);
  const todays = tasks.filter((t) => t.dueDate === today()).sort((a, b) => a.dueTime.localeCompare(b.dueTime));
  const upcoming = tasks.filter((t) => t.dueDate > today() && t.status !== "Completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
  const dist = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + 1));
    return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [tasks]);

  const refreshTip = async () => {
    setLoadingTip(true);
    const snapshot = JSON.stringify(tasks.filter((t) => t.status !== "Completed").slice(0, 20).map((t) => ({ t: t.title, p: t.priority, due: t.dueDate, s: t.status })));
    const r = await run({ data: { kind: "suggestion", payload: { snapshot: `Today is ${today()}. Open tasks: ${snapshot}` } } });
    setLoadingTip(false);
    if (r.ok) setTip(r.text.trim());
    else toast.error(r.error);
  };

  const cards = [
    { label: "Total Tasks", value: stats.total, icon: ClipboardList, tone: "bg-secondary text-primary", note: `${stats.total - stats.done} open` },
    { label: "Tasks Completed", value: stats.done, icon: CheckCircle2, tone: "bg-sage-soft text-primary", note: `${stats.pct}% of all tasks` },
    { label: "In Progress", value: stats.progress, icon: Timer, tone: "bg-brown-soft text-brown", note: "actively being worked" },
    { label: "Overdue", value: stats.overdue, icon: AlertTriangle, tone: "bg-danger-soft text-destructive", note: stats.overdue ? "need attention" : "all on track" },
  ];

  const quick = [
    { to: "/email", label: "Write an email", icon: Mail },
    { to: "/meetings", label: "Summarize notes", icon: FileText },
    { to: "/planner", label: "Plan my day", icon: CalendarClock },
    { to: "/research", label: "Research a topic", icon: Telescope },
    { to: "/chat", label: "Ask the assistant", icon: Bot },
  ] as const;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-hero p-6 text-primary-foreground md:p-8">
        <Leaf className="absolute -right-6 -top-6 h-40 w-40 rotate-12 opacity-10" />
        <p className="text-sm opacity-80">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        <h1 className="mt-1 text-3xl font-semibold md:text-4xl">{greeting()}, {CURRENT_USER.name.split(" ")[0]}!</h1>
        <p className="mt-1 opacity-90">Ready to make today productive?</p>
        <div className="mt-5 max-w-md">
          <div className="mb-1.5 flex justify-between text-xs font-semibold"><span>Overall completion</span><span>{stats.pct}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-foreground/20">
            <div className="h-full rounded-full bg-sage transition-all duration-700" style={{ width: `${stats.pct}%` }} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{c.label}</span>
              <span className={cn("rounded-lg p-1.5", c.tone)}><c.icon className="h-4 w-4" /></span>
            </div>
            <div className="mt-2 font-display text-3xl font-semibold">{c.value}</div>
            <div className="text-xs text-muted-foreground">{c.note}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's Tasks</h2>
            <Link to="/tasks" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          {todays.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nothing due today 🌿</p> : todays.map((t) => <TaskRow key={t.id} task={t} compact />)}
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-secondary p-1.5 text-primary"><Wand2 className="h-4 w-4" /></span>
            <h2 className="text-lg font-semibold">AI Productivity Assistant</h2>
          </div>
          <p className="mt-3 rounded-xl bg-sage-soft p-3 text-sm leading-relaxed">{tip}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={refreshTip} disabled={loadingTip}>
            {loadingTip ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} New suggestion
          </Button>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {quick.map((q) => (
              <Link key={q.to} to={q.to} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-secondary">
                <q.icon className="h-3.5 w-3.5 text-brown" />{q.label}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold">Upcoming Deadlines</h2>
          <div className="space-y-3">
            {upcoming.map((t) => (
              <div key={t.id} className="flex items-start gap-3">
                <div className="w-12 shrink-0 rounded-lg bg-brown-soft py-1 text-center text-brown">
                  <div className="text-[10px] font-bold uppercase">{fmtDate(t.dueDate).split(" ")[0]}</div>
                  <div className="font-display text-lg font-semibold leading-none">{fmtDate(t.dueDate).split(" ")[1]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.category} · {t.dueTime}</div>
                </div>
                <PriorityBadge p={t.priority} />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-1 text-lg font-semibold">Task Distribution</h2>
          <div className="h-44">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={dist} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
                  {dist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1 text-xs">
            {dist.slice(0, 5).map((d, i) => (
              <li key={d.name} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 truncate">{d.name}</span><span className="font-semibold">{d.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-soft">
          <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
          <ul className="space-y-3">
            {activity.slice(0, 7).map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", a.kind === "completed" ? "bg-primary" : a.kind === "deleted" ? "bg-destructive" : "bg-brown")} />
                <div><div>{a.text}</div><div className="text-xs text-muted-foreground">{timeAgo(a.at)}</div></div>
              </li>
            ))}
          </ul>
          <Progress value={stats.pct} className="mt-4 h-1.5" />
        </section>
      </div>
    </div>
  );
}
