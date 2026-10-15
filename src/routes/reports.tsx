import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/hr/task-bits";
import { CATEGORIES, EMPLOYEES, PRIORITIES, STATUSES, isOverdue, useStore } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — RootHR AI" },
      { name: "description", content: "Track HR task completion, workload and priorities." },
      { property: "og:title", content: "Reports & Analytics — RootHR AI" },
      { property: "og:description", content: "Track HR task completion, workload and priorities." },
    ],
  }),
  component: Page,
});

const C = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function Page() {
  const { tasks } = useStore();
  const byCat = useMemo(() => CATEGORIES.map((c) => ({ name: c.split(" ")[0], total: tasks.filter((t) => t.category === c).length, done: tasks.filter((t) => t.category === c && t.status === "Completed").length })), [tasks]);
  const byStatus = STATUSES.map((s) => ({ name: s, value: tasks.filter((t) => t.status === s).length }));
  const byPri = PRIORITIES.map((p) => ({ name: p, value: tasks.filter((t) => t.priority === p).length }));
  const byPerson = EMPLOYEES.map((e) => ({ name: e.split(" ")[0], open: tasks.filter((t) => t.assignee === e && t.status !== "Completed").length, overdue: tasks.filter((t) => t.assignee === e && isOverdue(t)).length }));
  const done = tasks.filter((t) => t.status === "Completed").length;

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border bg-card p-5 shadow-soft"><h2 className="mb-3 text-lg font-semibold">{title}</h2><div className="h-64">{children}</div></div>
  );
  const axis = { fontSize: 11, fill: "var(--muted-foreground)" };

  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle={`${tasks.length} tasks · ${tasks.length ? Math.round((done / tasks.length) * 100) : 0}% complete · ${tasks.filter(isOverdue).length} overdue`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Tasks by category">
          <ResponsiveContainer><BarChart data={byCat}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={axis} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Bar dataKey="total" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /><Bar dataKey="done" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Workload by team member">
          <ResponsiveContainer><BarChart data={byPerson}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="name" tick={axis} /><YAxis tick={axis} allowDecimals={false} /><Tooltip /><Bar dataKey="open" fill="var(--chart-3)" radius={[6, 6, 0, 0]} /><Bar dataKey="overdue" fill="var(--destructive)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </Card>
        <Card title="Status breakdown">
          <ResponsiveContainer><PieChart><Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} label>{byStatus.map((_, i) => <Cell key={i} fill={C[i]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </Card>
        <Card title="Priority mix">
          <ResponsiveContainer><BarChart data={byPri} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" tick={axis} allowDecimals={false} /><YAxis type="category" dataKey="name" tick={axis} width={60} /><Tooltip /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{byPri.map((_, i) => <Cell key={i} fill={C[i]} />)}</Bar></BarChart></ResponsiveContainer>
        </Card>
      </div>
    </>
  );
}
