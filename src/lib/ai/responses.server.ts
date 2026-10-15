import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const MODEL = "openai/gpt-6-astra";

function getKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured.");
  return key;
}

export function createResponsesCall(
  request: Request | undefined,
  messages: ModelMessage[],
  instructions?: string,
  effort: "low" | "medium" = "low",
) {
  const apiKey = getKey();
  const runIdFetch = createLovableAiGatewayRunIdFetch(request ? getLovableAiGatewayRunId(request) : undefined);
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses(MODEL),
    ...(instructions ? { instructions } : {}),
    messages,
    abortSignal: request?.signal,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: effort,
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return {
    result,
    response: (originalMessages?: unknown[]) =>
      withLovableAiGatewayRunIdHeader(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.toUIMessageStreamResponse({ sendReasoning: true, originalMessages: originalMessages as any }),
        runIdFetch,
      ),
  };
}

/** One-shot generation: streams from the gateway and returns the final text. */
export async function generateTextOnce(prompt: string, instructions: string) {
  const { result } = createResponsesCall(undefined, [{ role: "user", content: prompt }], instructions);
  return await result.text;
}
