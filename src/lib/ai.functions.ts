import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE =
  "You are RootHR AI, an assistant for HR professionals. Be practical, warm and professional. Never fabricate facts, sources, URLs, decisions, deadlines or people.";

const inputSchema = z.object({
  kind: z.enum(["email", "meeting", "plan", "research", "simplify", "suggestion"]),
  payload: z.record(z.string(), z.unknown()),
});

function s(v: unknown, max = 20000) {
  return String(v ?? "").slice(0, max);
}

function build(kind: z.infer<typeof inputSchema>["kind"], p: Record<string, unknown>) {
  switch (kind) {
    case "email":
      return {
        instructions: `${BASE} You write HR emails. Output plain text only. First line must be "Subject: <subject>", then a blank line, then greeting, body, closing and a sign-off placeholder "[Your name]". No markdown.`,
        prompt: `Purpose/context: ${s(p.purpose)}\nRecipient type: ${s(p.recipient)}\nTone: ${s(p.tone)}\nLength: ${s(p.length)}\nKey points: ${s(p.points) || "none"}\nSubject preference: ${s(p.subject) || "none"}\nVariation seed: ${s(p.seed)}`,
      };
    case "meeting":
      return {
        instructions: `${BASE} Summarize meeting notes. Use ONLY information in the notes. Where an owner, deadline or decision is not stated, write "Unspecified". Respond with JSON only (no code fences) matching: {"executiveSummary":string,"keyPoints":string[],"decisions":string[],"actionItems":[{"task":string,"owner":string,"due":string,"status":string}],"responsibilities":string[],"deadlines":string[],"followUps":string[]}`,
        prompt: `Title: ${s(p.title)}\nDate: ${s(p.date)}\nAttendees: ${s(p.attendees)}\n\nNotes:\n${s(p.notes, 40000)}`,
      };
    case "plan":
      return {
        instructions: `${BASE} You are a scheduling assistant. Build a realistic schedule within the working hours, prioritizing urgent/high priority and nearest deadlines, with breaks and 5-10 minute transitions. Respond with JSON only (no code fences): {"days":[{"date":"YYYY-MM-DD","blocks":[{"start":"HH:MM","end":"HH:MM","title":string,"type":"task"|"break"|"meeting","taskId":string|null,"priority":string|null}]}],"overloaded":string[],"atRisk":string[],"suggestions":string[],"rationale":string}`,
        prompt: `View: ${s(p.view)}\nStart date: ${s(p.startDate)}\nWorking hours: ${s(p.hours)}\nPreferred focus hours: ${s(p.preferred)}\nBreaks/meetings: ${s(p.breaks) || "none"}\nTasks (JSON): ${s(p.tasks, 30000)}`,
      };
    case "research":
      return {
        instructions: `${BASE} You are an HR research assistant WITHOUT live web access. Clearly state at the top in italics whether the analysis is based on supplied text or general model knowledge. Never invent URLs or citations; under "Sources and References" only list sources explicitly present in supplied text, otherwise say none were provided. Use markdown with these ## headings: Topic Overview, Executive Summary, Key Findings, Important Insights, Opportunities and Risks, Practical Recommendations, Suggested Next Steps, Sources and References.`,
        prompt: `Question/topic: ${s(p.topic)}\nDepth: ${s(p.depth)}\nSupplied text:\n${s(p.text, 40000) || "(none)"}`,
      };
    case "simplify":
      return {
        instructions: `${BASE} Rewrite the content in plain, simple language anyone can understand. Keep markdown headings. Do not add new facts.`,
        prompt: s(p.text, 40000),
      };
    case "suggestion":
      return {
        instructions: `${BASE} Give ONE short, specific productivity suggestion (max 2 sentences) for today based on the task snapshot. No preamble.`,
        prompt: s(p.snapshot, 8000),
      };
  }
}

export const runAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }) => {
    const { generateTextOnce } = await import("./ai/responses.server");
    const { instructions, prompt } = build(data.kind, data.payload);
    try {
      const text = await generateTextOnce(prompt, instructions);
      if (!text.trim()) return { ok: false as const, error: "The AI returned an empty response. Please try again." };
      return { ok: true as const, text };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/402|credit/i.test(msg)) return { ok: false as const, error: "AI credits are exhausted. Please add credits to continue." };
      if (/429|rate/i.test(msg)) return { ok: false as const, error: "Too many requests right now. Please wait a moment and try again." };
      console.error("AI error", msg);
      return { ok: false as const, error: "The AI request failed. Please try again." };
    }
  });

export function parseJSON<T>(text: string): T | null {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b < a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1)) as T;
  } catch {
    return null;
  }
}
