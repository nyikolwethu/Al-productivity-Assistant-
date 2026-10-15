import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Copy, Download, Feather, ListPlus, Loader2, Mail, Save, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/hr/task-bits";
import { runAI } from "@/lib/ai.functions";
import { CURRENT_USER, downloadText, timeAgo, today, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "AI Research Assistant — RootHR AI" },
      { name: "description", content: "Understand complex workplace topics quickly with structured AI research." },
      { property: "og:title", content: "AI Research Assistant — RootHR AI" },
      { property: "og:description", content: "Understand complex workplace topics quickly with structured AI research." },
    ],
  }),
  component: Page,
});

const DEPTHS = ["Quick Overview", "Detailed Analysis", "Comprehensive Report"];

function Page() {
  const run = useServerFn(runAI);
  const navigate = useNavigate();
  const { addTask, saveItem, saved, removeSaved } = useStore();
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [depth, setDepth] = useState(DEPTHS[0]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState<"" | "research" | "simplify">("");
  const reports = saved.filter((s) => s.kind === "research");

  const go = async () => {
    if (!topic.trim()) return toast.error("Enter a research question.");
    setLoading("research");
    const r = await run({ data: { kind: "research", payload: { topic, text, depth } } });
    setLoading("");
    if (r.ok) setResult(r.text);
    else toast.error(r.error);
  };
  const simplify = async () => {
    setLoading("simplify");
    const r = await run({ data: { kind: "simplify", payload: { text: result } } });
    setLoading("");
    if (r.ok) setResult(r.text);
    else toast.error(r.error);
  };
  const recsToTasks = () => {
    const m = result.match(/##\s*Practical Recommendations([\s\S]*?)(\n##\s|$)/i);
    const items = (m?.[1] ?? "").split("\n").map((l) => l.replace(/^\s*([-*]|\d+\.)\s*/, "").replace(/\*\*/g, "").trim()).filter((l) => l.length > 5).slice(0, 8);
    if (!items.length) return toast.error("No recommendations found to convert.");
    items.forEach((i) => addTask({ title: i.slice(0, 110), description: `From research: ${topic}`, category: "HR Administration", priority: "Medium", status: "To Do", startDate: today(), dueDate: today(), dueTime: "17:00", assignee: CURRENT_USER.name, department: "Human Resources", notes: "" }));
    toast.success(`${items.length} tasks created`);
  };

  return (
    <>
      <PageHeader title="AI Research Assistant" subtitle="Structured insight from your documents or general AI knowledge" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="space-y-1.5"><Label>Research question or topic *</Label><Textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Best practices for a 4-day work week pilot" /></div>
          <div className="space-y-1.5"><Label>Paste article, report or document (optional)</Label><Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} /></div>
          <div>
            <Label className="mb-2 block">Depth</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEPTHS.map((d) => <button key={d} onClick={() => setDepth(d)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold", depth === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary")}>{d}</button>)}
            </div>
          </div>
          <Button onClick={go} disabled={!!loading} className="w-full">{loading === "research" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Research</Button>
          <p className="text-[11px] text-muted-foreground">Live web search isn't connected. Results come from your pasted text or the AI's general knowledge, and no sources are invented.</p>
          {reports.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Saved reports</h3>
              <ul className="space-y-1.5">
                {reports.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <button className="flex-1 truncate text-left hover:underline" onClick={() => { setResult(h.content); setTopic(h.title); }}>{h.title}</button>
                    <span className="text-xs text-muted-foreground">{timeAgo(h.at)}</span>
                    <button onClick={() => removeSaved(h.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-3">
          {!result && !loading && <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">Findings will appear here.</div>}
          {loading && <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />{loading === "simplify" ? "Simplifying…" : "Researching…"}</div>}
          {result && !loading && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={simplify}><Feather className="h-3.5 w-3.5" />Simplify this</Button>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => { saveItem({ kind: "research", title: topic.slice(0, 80) || "Research", content: result }); toast.success("Report saved"); }}><Save className="h-3.5 w-3.5" />Save</Button>
                <Button size="sm" variant="outline" onClick={() => downloadText("research-report.md", result)}><Download className="h-3.5 w-3.5" />Download</Button>
                <Button size="sm" variant="outline" onClick={recsToTasks}><ListPlus className="h-3.5 w-3.5" />Recommendations → tasks</Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/email", search: { context: `Share research findings on "${topic}" with the team:\n${result.slice(0, 2500)}` } })}><Mail className="h-3.5 w-3.5" />Email findings</Button>
              </div>
              <div className="prose-hr text-sm"><ReactMarkdown>{result}</ReactMarkdown></div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
