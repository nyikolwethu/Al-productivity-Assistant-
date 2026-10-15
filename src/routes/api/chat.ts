import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, type UIMessage } from "ai";

const INSTRUCTIONS =
  "You are RootHR AI, a friendly workplace assistant for HR professionals. Help with HR policies, people management, communication, workplace wellbeing, productivity and task organization. Use concise markdown. You have no live web access and cannot see company-specific policies unless the user shares them; say so when relevant. Never fabricate laws, sources or URLs; recommend verifying legal matters with qualified counsel.";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[] };
        const messages = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
        if (!messages.length) return new Response("No messages", { status: 400 });
        const { createResponsesCall } = await import("@/lib/ai/responses.server");
        const call = createResponsesCall(request, await convertToModelMessages(messages), INSTRUCTIONS, "low");
        return call.response(messages);
      },
    },
  },
});
