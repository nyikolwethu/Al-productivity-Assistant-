import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Eraser, Loader2, RefreshCw, Sparkle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/hr/task-bits";
import { runAI } from "@/lib/ai.functions";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/email")({
  validateSearch: (s: Record<string, unknown>): { context?: string } => (typeof s.context === "string" ? { context: s.context } : {}),
  head: () => ({
    meta: [
      { title: "AI Email Generator — RootHR AI" },
      { name: "description", content: "Draft professional HR emails in seconds with AI." },
      { property: "og:title", content: "AI Email Generator — RootHR AI" },
      { property: "og:description", content: "Draft professional HR emails in seconds with AI." },
    ],
  }),
  component: Page,
});

const RECIPIENTS = ["Employee", "Manager", "Client", "HR Team", "Job Applicant", "External Partner"];
const TONES = ["Professional", "Formal", "Friendly", "Informal", "Persuasive", "Empathetic"];
const LENGTHS = ["Short", "Medium", "Detailed"];
const TEMPLATES: { label: string; purpose: string; recipient: string; tone: string }[] = [
  { label: "Interview invitation", purpose: "Invite a candidate to a second-round interview, include date/time placeholders and what to prepare.", recipient: "Job Applicant", tone: "Friendly" },
  { label: "Onboarding instructions", purpose: "Welcome a new starter and share first-day instructions, arrival time, what to bring and who to meet.", recipient: "Employee", tone: "Friendly" },
  { label: "Meeting request", purpose: "Request a 30-minute meeting to discuss team workload and upcoming priorities.", recipient: "Manager", tone: "Professional" },
  { label: "Performance review reminder", purpose: "Remind managers that mid-year performance reviews must be completed and submitted.", recipient: "Manager", tone: "Professional" },
  { label: "Leave approval", purpose: "Confirm approval of an employee's annual leave request with date placeholders.", recipient: "Employee", tone: "Friendly" },
  { label: "Policy update", purpose: "Announce an update to the remote work policy and where to read it.", recipient: "Employee", tone: "Formal" },
  { label: "Employee follow-up", purpose: "Follow up with an employee after a wellbeing check-in conversation.", recipient: "Employee", tone: "Empathetic" },
];

function Sel({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: string[] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-card"><SelectValue /></SelectTrigger>
        <SelectContent>{items.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function Page() {
  const { context } = Route.useSearch();
  const { tasks } = useStore();
  const run = useServerFn(runAI);
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("Employee");
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Medium");
  const [points, setPoints] = useState("");
  const [subject, setSubject] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (context) setPurpose(context);
  }, [context]);

  const generate = async () => {
    if (!purpose.trim()) return toast.error("Describe the purpose of the email first.");
    setLoading(true);
    const r = await run({ data: { kind: "email", payload: { purpose, recipient, tone, length, points, subject, seed: Math.random().toString(36).slice(2, 6) } } });
    setLoading(false);
    if (r.ok) setDraft(r.text.trim());
    else toast.error(r.error);
  };
  const clear = () => { setPurpose(""); setPoints(""); setSubject(""); setDraft(""); };

  return (
    <>
      <PageHeader title="AI Email Generator" subtitle="Context-aware HR emails tailored to recipient and tone" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft">
          <div>
            <Label className="mb-2 block">Templates</Label>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <button key={t.label} onClick={() => { setPurpose(t.purpose); setRecipient(t.recipient); setTone(t.tone); }} className="rounded-full border px-3 py-1 text-xs font-semibold hover:bg-secondary">{t.label}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email purpose or context *</Label>
            <Textarea rows={4} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="What should this email achieve?" />
          </div>
          <div className="space-y-1.5">
            <Label>Or start from a task</Label>
            <Select onValueChange={(id) => { const t = tasks.find((x) => x.id === id); if (t) setPurpose(`Regarding the task "${t.title}" (${t.category}), due ${t.dueDate}. ${t.description}`); }}>
              <SelectTrigger className="bg-card"><SelectValue placeholder="Choose a task…" /></SelectTrigger>
              <SelectContent>{tasks.slice(0, 30).map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Sel label="Recipient" value={recipient} onChange={setRecipient} items={RECIPIENTS} />
            <Sel label="Tone" value={tone} onChange={setTone} items={TONES} />
            <Sel label="Length" value={length} onChange={setLength} items={LENGTHS} />
          </div>
          <div className="space-y-1.5">
            <Label>Key points to include (optional)</Label>
            <Textarea rows={2} value={points} onChange={(e) => setPoints(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Subject line preference (optional)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={generate} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}Generate email</Button>
            <Button variant="outline" onClick={clear}><Eraser className="h-4 w-4" />Clear</Button>
          </div>
        </div>

        <div className="flex flex-col rounded-2xl border bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Draft</h2>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={generate} disabled={loading || !draft}><RefreshCw className="h-3.5 w-3.5" />Regenerate</Button>
              <Button size="sm" variant="ghost" disabled={!draft} onClick={() => { navigator.clipboard.writeText(draft); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" />Copy</Button>
            </div>
          </div>
          {loading && !draft ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Writing your email…</div>
          ) : (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Your generated email appears here — fully editable." className="min-h-[420px] flex-1 font-sans leading-relaxed" />
          )}
        </div>
      </div>
    </>
  );
}
