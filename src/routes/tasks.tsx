import { createFileRoute } from "@tanstack/react-router";
import { CURRENT_USER, type Task } from "@/lib/store";
import { TaskBoard } from "@/components/hr/task-board";
import { PageHeader } from "@/components/hr/task-bits";

type S = { scope?: "all" | "mine" };
export const Route = createFileRoute("/tasks")({
  validateSearch: (s: Record<string, unknown>): S => ({ scope: s.scope === "all" ? "all" : undefined }),
  head: () => ({
    meta: [
      { title: "My Tasks — RootHR AI" },
      { name: "description", content: "Your HR tasks in list, board and calendar views." },
      { property: "og:title", content: "My Tasks — RootHR AI" },
      { property: "og:description", content: "Your HR tasks in list, board and calendar views." },
    ],
  }),
  component: Page,
});

const mine = (t: Task) => t.assignee === CURRENT_USER.name;

function Page() {
  const { scope } = Route.useSearch();
  const all = scope === "all";
  return (
    <>
      <PageHeader title={all ? "All tasks" : "My Tasks"} subtitle={all ? "Search results across every task" : "Everything assigned to you"} />
      <TaskBoard filter={all ? undefined : mine} showAssigneeFilter={all} />
    </>
  );
}
