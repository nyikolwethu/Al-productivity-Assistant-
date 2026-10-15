import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, ListPlus, Loader2, Mail, Save, Sparkle, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/hr/task-bits";
import { parseJSON, runAI } from "@/lib/ai.functions";
import { CURRENT_USER, EMPLOYEES, downloadText, timeAgo, today, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/meetings")({
  head: () => ({
    meta: [
      { title: "Meeting Summarizer — RootHR AI" },
      { name: "description", content: "Turn meeting notes into decisions, action items and follow-ups." },
      { property: "og:title", content: "Meeting Summarizer — RootHR AI" },
      { property: "og:description", content: "Turn meeting notes into decisions, action items and follow-ups." },
    ],
  }),
  component: Page,
});

type Summary = {
  executiveSummary: string; keyPoints: string[]; decisions: string[];
  actionItems: { task: string; owner: string; due: string; status: string }[];
  responsibilities: string[]; deadlines: string[]; followUps: string[];
};

function toText(title: string, date: string, s: Summary) {
  const l = (h: string, a: string[]) => `\n${h}\n${a.length ? a.map((x) => `- ${x}`).join("\n") : "- None noted"}\n`;
  return `${title} — ${date}\n\nEXECUTIVE SUMMARY\n${s.executiveSummary}\n${l("KEY DISCUSSION POINTS", s.keyPoints)}${l("DECISIONS MADE", s.decisions)}\nACTION ITEMS\n${s.actionItems.map((a) => `- ${a.task} | ${a.owner} | ${a.due} | ${a.status}`).join("\n") || "- None"}\n${l("ASSIGNED RESPONSIBILITIES", s.responsibilities)}${l("DEADLINES", s.deadlines)}${l("FOLLOW-UP QUESTIONS", s.followUps)}`;
}

const isUnspec = (v: string) => !v || /unspecified/i.test(v);

function Page() {
  const run = useServerFn(runAI);
  const navigate = useNavigate();
  const { addTask, saveItem, saved, removeSaved } = useStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today());
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [text, setText] = useState("");
  const history = saved.filter((s) => s.kind === "meeting");

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.(txt|md|csv)$/i.test(f.name) && !f.type.startsWith("text/")) return toast.error("Please upload a .txt, .md or .csv text file.");
    if (f.size > 500_000) return toast.error("File is too large (max 500 KB).");
    setNotes(await f.text());
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
    toast.success(`Loaded ${f.name}`);
  };

  const summarize = async () => {
    if (notes.trim().length < 30) return toast.error("Please add meeting notes (at least a few sentences).");
    setLoading(true);
    const r = await run({ data: { kind: "meeting", payload: { title, date, attendees, notes } } });
    setLoading(false);
    if (!r.ok) return toast.error(r.error);
    const s = parseJSON<Summary>(r.text);
    if (!s) return toast.error("Couldn't read the AI summary. Please try again.");
    const norm: Summary = { executiveSummary: s.executiveSummary ?? "", keyPoints: s.keyPoints ?? [], decisions: s.decisions ?? [], actionItems: s.actionItems ?? [], responsibilities: s.responsibilities ?? [], deadlines: s.deadlines ?? [], followUps: s.followUps ?? [] };
    setSummary(norm);
    setText(toText(title || "Meeting", date, norm));
  };

  const toTasks = () => {
    if (!summary?.actionItems.length) return;
    summary.actionItems.forEach((a) => {
      const owner = EMPLOYEES.find((e) => a.owner.toLowerCase().includes(e.split(" ")[0].toLowerCase())) ?? CURRENT_USER.name;
      const due = /^\d{4}-\d{2}-\d{2}$/.test(a.due) ? a.due : today();
      addTask({ title: a.task, description: `From meeting: ${title || "Untitled"}. Owner noted: ${a.owner}. Due noted: ${a.due}.`, category: "Meetings & Follow-ups", priority: "Medium", status: "To Do", startDate: today(), dueDate: due < today() ? today() : due, dueTime: "17:00", assignee: owner, department: "Human Resources", notes: "" });
    });
    toast.success(`${summary.actionItems.length} tasks created`);
  };

  const Section = ({ h, items }: { h: string; items: string[] }) => (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{h}</h3>
      {items.length ? <ul className="list-disc space-y-1 pl-5 text-sm">{items.map((x, i) => <li key={i} className={cn(isUnspec(x) && "text-muted-foreground italic")}>{x}</li>)}</ul> : <p className="text-sm italic text-muted-foreground">None noted</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Meeting Notes Summarizer" subtitle="Only what's in your notes — missing details are flagged as unspecified" />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
          <div className="space-y-1.5"><Label>Meeting title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Weekly HR sync" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Attendees</Label><Input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Names, comma-separated" /></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Notes or transcript *</Label>
              <label className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary">
                <Upload className="h-3.5 w-3.5" />Upload text file
                <input type="file" accept=".txt,.md,.csv,text/plain" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
            <Textarea rows={12} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your meeting notes here…" />
          </div>
          <Button onClick={summarize} disabled={loading} className="w-full">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkle className="h-4 w-4" />}Summarize meeting</Button>

          {history.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-2 text-sm font-semibold">Meeting history</h3>
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="flex items-center gap-2 text-sm">
                    <button className="flex-1 truncate text-left hover:underline" onClick={() => { setText(h.content); setSummary(null); }}>{h.title}</button>
                    <span className="text-xs text-muted-foreground">{timeAgo(h.at)}</span>
                    <button onClick={() => removeSaved(h.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-soft lg:col-span-3">
          {!text && !loading && <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-muted-foreground">Your structured summary will appear here.</div>}
          {loading && <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Reading your notes…</div>}
          {text && !loading && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}><Copy className="h-3.5 w-3.5" />Copy</Button>
                <Button size="sm" variant="outline" onClick={() => downloadText(`${title || "meeting"}-summary.txt`, text)}><Download className="h-3.5 w-3.5" />Download</Button>
                <Button size="sm" variant="outline" onClick={() => { saveItem({ kind: "meeting", title: title || `Meeting ${date}`, content: text }); toast.success("Saved to history"); }}><Save className="h-3.5 w-3.5" />Save</Button>
                {summary && summary.actionItems.length > 0 && <Button size="sm" variant="outline" onClick={toTasks}><ListPlus className="h-3.5 w-3.5" />Action items → tasks</Button>}
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/email", search: { context: `Follow-up email to attendees of "${title || "the meeting"}" (${date}) summarizing outcomes and action items:\n${text.slice(0, 2500)}` } })}><Mail className="h-3.5 w-3.5" />Follow-up email</Button>
              </div>
              {summary && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-sage-soft p-4"><h3 className="mb-1 text-sm font-semibold">Executive Summary</h3><p className="text-sm leading-relaxed">{summary.executiveSummary}</p></div>
                  <div className="grid gap-4 md:grid-cols-2"><Section h="Key Discussion Points" items={summary.keyPoints} /><Section h="Decisions Made" items={summary.decisions} /></div>
                  <div>
                    <h3 className="mb-2 text-sm font-semibold">Action Items</h3>
                    <div className="overflow-x-auto rounded-xl border">
                      <Table>
                        <TableHeader><TableRow><TableHead>Task</TableHead><TableHead>Responsible</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {summary.actionItems.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No action items found</TableCell></TableRow>}
                          {summary.actionItems.map((a, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{a.task}</TableCell>
                              <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isUnspec(a.owner) ? "bg-warning-soft text-warning" : "bg-sage-soft text-primary")}>{a.owner || "Unspecified"}</span></TableCell>
                              <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", isUnspec(a.due) ? "bg-warning-soft text-warning" : "bg-brown-soft text-brown")}>{a.due || "Unspecified"}</span></TableCell>
                              <TableCell className="text-xs">{a.status || "Open"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3"><Section h="Responsibilities" items={summary.responsibilities} /><Section h="Deadlines" items={summary.deadlines} /><Section h="Follow-up Questions" items={summary.followUps} /></div>
                </div>
              )}
              <div className="space-y-1.5 border-t pt-4">
                <Label>Editable summary</Label>
                <Textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} className="font-mono text-xs" />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
