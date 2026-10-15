import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/hr/task-bits";
import { useTheme } from "@/components/hr/app-shell";
import { CURRENT_USER, useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — RootHR AI" },
      { name: "description", content: "Manage your RootHR AI profile, appearance and data." },
      { property: "og:title", content: "Settings — RootHR AI" },
      { property: "og:description", content: "Manage your RootHR AI profile, appearance and data." },
    ],
  }),
  component: Page,
});

function Page() {
  const { dark, toggle } = useTheme();
  const { resetData } = useStore();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="max-w-2xl space-y-4">
        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brown text-lg font-bold text-primary-foreground">{CURRENT_USER.initials}</span>
          <div><div className="font-display text-lg font-semibold">{CURRENT_USER.name}</div><div className="text-sm text-muted-foreground">{CURRENT_USER.role}</div></div>
        </div>
        <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
          <div><div className="font-semibold">Dark mode</div><div className="text-sm text-muted-foreground">Deep forest tones for low-light work</div></div>
          <Switch checked={dark} onCheckedChange={toggle} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
          <div><div className="font-semibold">Reset sample data</div><div className="text-sm text-muted-foreground">Tasks are stored in this browser. Restore the original demo tasks.</div></div>
          <Button variant="outline" onClick={() => { resetData(); toast.success("Data reset"); }}>Reset</Button>
        </div>
      </div>
    </>
  );
}
