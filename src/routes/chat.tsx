import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Leaf, Loader2, RotateCcw, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/hr/task-bits";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "AI Workplace Chat — RootHR AI" },
      { name: "description", content: "Chat with an AI assistant about HR, policies and workplace productivity." },
      { property: "og:title", content: "AI Workplace Chat — RootHR AI" },
      { property: "og:description", content: "Chat with an AI assistant about HR, policies and workplace productivity." },
    ],
  }),
  component: Page,
});

const KEY = "roothr-chat-v1";
const STARTERS = ["How do I run a fair performance review?", "Draft a checklist for remote onboarding", "Tips for handling a conflict between two employees", "How can I reduce HR admin time?"];

function Page() {
  const [initial, setInitial] = useState<UIMessage[] | null>(null);
  useEffect(() => {
    try { setInitial(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch { setInitial([]); }
  }, []);
  return (
    <>
      <PageHeader title="AI Workplace Chat" subtitle="Your HR companion — saved in this browser" />
      {initial ? <ChatWindow initial={initial} /> : <div className="h-[60vh] animate-pulse rounded-2xl border bg-card" />}
    </>
  );
}

function ChatWindow({ initial }: { initial: UIMessage[] }) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const { messages, sendMessage, status, stop, setMessages } = useChat({
    id: "roothr-main",
    messages: initial,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (e) => toast.error(/402/.test(e.message) ? "AI credits exhausted." : /429/.test(e.message) ? "Too many requests — try again shortly." : "The assistant couldn't respond. Please try again."),
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (status === "ready" || status === "error") localStorage.setItem(KEY, JSON.stringify(messages));
    end.current?.scrollIntoView({ behavior: "smooth" });
    if (!busy) ref.current?.focus();
  }, [messages, status, busy]);

  const send = (t: string) => {
    if (!t.trim() || busy) return;
    sendMessage({ text: t.trim() });
    setInput("");
  };

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[480px] flex-col rounded-2xl border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Leaf className="h-4 w-4" /></span>
          <div><div className="text-sm font-semibold">Root</div><div className="text-[11px] text-muted-foreground">HR assistant · no live web access</div></div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setMessages([]); localStorage.removeItem(KEY); }}><RotateCcw className="h-3.5 w-3.5" />New conversation</Button>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 && (
          <div className="mx-auto max-w-lg pt-8 text-center">
            <h2 className="text-xl font-semibold">How can I help today?</h2>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STARTERS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-xl border p-3 text-left text-sm hover:bg-secondary">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] text-sm", m.role === "user" ? "rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-primary-foreground" : "prose-hr")}>
              {m.parts.map((p, i) => (p.type === "text" ? (m.role === "user" ? <span key={i} className="whitespace-pre-wrap">{p.text}</span> : <ReactMarkdown key={i}>{p.text}</ReactMarkdown>) : null))}
            </div>
          </div>
        ))}
        {status === "submitted" && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Thinking…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t p-3">
        <div className="flex items-end gap-2 rounded-2xl border bg-background p-2">
          <Textarea
            ref={ref}
            autoFocus
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about policies, people issues, productivity…"
            className="max-h-40 min-h-[40px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={stop} aria-label="Stop" className="shrink-0 rounded-full"><Square className="h-4 w-4" /></Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send" className="shrink-0 rounded-full"><ArrowUp className="h-4 w-4" /></Button>
          )}
        </div>
      </form>
    </div>
  );
}
