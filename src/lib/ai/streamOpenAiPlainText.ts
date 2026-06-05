import type { OpenAiContentPart } from "@/lib/ai/multimodalRequestBuilder";
import { applyChatCompletionLimits } from "@/lib/ai/openAiCompletionParams";
import { messageFromOpenAiHttpError } from "@/lib/ai/openAiHttpError";
import { buildOpenAiAuthHeaders } from "@/lib/ai/openAiRequestHeaders";

const PLAIN_SYSTEM =
  "You are a Korean patent drafting assistant. Output only the requested Korean specification section body as plain text. No JSON objects, no JSON keys, no markdown code fences, no ``` blocks.";

export async function streamOpenAiPlainText(
  apiKey: string,
  model: string,
  scope: { organizationId?: string; projectId?: string } | undefined,
  parts: OpenAiContentPart[],
  onDelta: (accumulated: string) => void
): Promise<string> {
  const messages = [
    { role: "system", content: PLAIN_SYSTEM },
    { role: "user", content: parts }
  ];
  const body = applyChatCompletionLimits(
    {
      model,
      messages,
      stream: true
    },
    model
  );

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildOpenAiAuthHeaders(apiKey, scope)
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(messageFromOpenAiHttpError(response.status, errBody, model));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("OpenAI 스트리밍 응답 본문이 없습니다.");

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          full += delta;
          onDelta(full);
        }
      } catch {
        /* ignore malformed sse chunks */
      }
    }
  }

  if (!full.trim()) throw new Error("OpenAI 스트리밍 응답에 content가 없습니다.");
  return full;
}

/** dev mock: 글자 단위로 흘려보냄 */
export async function streamMockPlainText(
  source: string,
  onDelta: (accumulated: string) => void,
  chunkSize = 8,
  delayMs = 24
): Promise<string> {
  let full = "";
  for (let i = 0; i < source.length; i += chunkSize) {
    full += source.slice(i, i + chunkSize);
    onDelta(full);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return full;
}
