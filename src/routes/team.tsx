import { createFileRoute } from "@tanstack/react-router";
import { EMPLOYEES, useStore } from "@/lib/store";
import { TaskBoard } from "@/components/hr/task-board";
import { Avatar, PageHeader } from "@/components/hr/task-bits";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team Tasks — RootHR AI" },
      { name: "description", content: "See and manage tasks across your HR team." },
      { property: "og:title", content: "Team Tasks — RootHR AI" },
      { property: "og:description", content: "See and manage tasks across your HR team." },
    ],
  }),
  component: Page,
});

function Page() {
  const { tasks } = useStore();
  return (
    <>
      <PageHeader title="Team Tasks" subtitle="Workload and progress across the team" />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EMPLOYEES.map((e) => {
          const mine = tasks.filter((t) => t.assignee === e);
          const done = mine.filter((t) => t.status === "Completed").length;
          return (
            <div key={e} className="flex items-center gap-3 rounded-2xl border bg-card p-4">
              <Avatar name={e} className="h-10 w-10 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{e}</div>
                <div className="mb-1.5 text-xs text-muted-foreground">{done}/{mine.length} completed</div>
                <Progress value={mine.length ? (done / mine.length) * 100 : 0} className="h-1.5" />
              </div>
            </div>
          );
        })}
      </div>
      <TaskBoard />
    </>
  );
}
