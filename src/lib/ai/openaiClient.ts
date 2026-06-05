import type { OpenAiContentPart } from "@/lib/ai/multimodalRequestBuilder";
import { messageFromOpenAiHttpError } from "@/lib/ai/openAiHttpError";
import { applyChatCompletionLimits } from "@/lib/ai/openAiCompletionParams";
import {
  getDefaultModelName,
  getServerEnvApiKey,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import { buildOpenAiAuthHeaders } from "@/lib/ai/openAiRequestHeaders";
import type { OpenAiCredentialInput, ResolvedOpenAiCredentials } from "@/types/openAiCredentials";

export interface LlmJsonClient {
  generateJson(prompt: string): Promise<string>;
}

export interface MultimodalLlmClient extends LlmJsonClient {
  generateJsonFromParts(parts: OpenAiContentPart[]): Promise<string>;
  /** 명세서 항목 재작성 등 — JSON response_format 미사용 */
  generatePlainText(prompt: string): Promise<string>;
}

export class MockLlmClient implements MultimodalLlmClient {
  async generateJson(prompt: string): Promise<string> {
    return JSON.stringify({ prompt_preview: prompt.slice(0, 120), mock: true });
  }

  async generateJsonFromParts(parts: OpenAiContentPart[]): Promise<string> {
    const textLen = parts.filter((p) => p.type === "text").length;
    const fileCount = parts.filter((p) => p.type === "file" || p.type === "image_url").length;
    return JSON.stringify({ mock: true, text_parts: textLen, file_parts: fileCount });
  }

  async generatePlainText(prompt: string): Promise<string> {
    return `[mock plain text]\n${prompt.slice(0, 200)}`;
  }
}

export class OpenAiMultimodalClient implements MultimodalLlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly scope?: { organizationId?: string; projectId?: string }
  ) {}

  async generateJson(prompt: string): Promise<string> {
    return this.generateJsonFromParts([{ type: "text", text: prompt }]);
  }

  async generatePlainText(prompt: string): Promise<string> {
    return this.generatePlainTextFromParts([{ type: "text", text: prompt }]);
  }

  async generateJsonFromParts(parts: OpenAiContentPart[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildOpenAiAuthHeaders(this.apiKey, this.scope)
      },
      body: JSON.stringify(buildChatCompletionBody(this.model, parts, "json"))
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(messageFromOpenAiHttpError(response.status, errBody, this.model));
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI 응답에 content가 없습니다.");
    return content;
  }

  async generatePlainTextFromParts(parts: OpenAiContentPart[]): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildOpenAiAuthHeaders(this.apiKey, this.scope)
      },
      body: JSON.stringify(buildChatCompletionBody(this.model, parts, "plain"))
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(messageFromOpenAiHttpError(response.status, errBody, this.model));
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("OpenAI 응답에 content가 없습니다.");
    return content;
  }
}

type ChatCompletionOutputMode = "json" | "plain";

function buildChatCompletionBody(
  model: string,
  parts: OpenAiContentPart[],
  outputMode: ChatCompletionOutputMode = "json"
): Record<string, unknown> {
  const systemContent =
    outputMode === "json"
      ? "You are a Korean patent drafting assistant. Analyze uploaded materials in their native format. Respond with valid JSON only, no markdown fences."
      : "You are a Korean patent drafting assistant. Output only the requested Korean specification section body as plain text. No JSON objects, no JSON keys, no markdown code fences, no ``` blocks.";

  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: parts }
  ];
  const base: Record<string, unknown> = { model, messages };
  if (outputMode === "json") {
    base.response_format = { type: "json_object" };
  }
  return applyChatCompletionLimits(base, model);
}

export function getOpenAiConfig() {
  return {
    apiKey: getServerEnvApiKey() ?? "",
    model: getDefaultModelName()
  };
}

export function createMultimodalLlmClientFromResolved(
  resolved: ResolvedOpenAiCredentials
): MultimodalLlmClient {
  return new OpenAiMultimodalClient(resolved.apiKey, resolved.model, {
    organizationId: resolved.organizationId,
    projectId: resolved.projectId
  });
}

export function createMultimodalLlmClient(
  input?: OpenAiCredentialInput
): MultimodalLlmClient {
  const resolved = resolveOpenAiCredentials(input);
  if (resolved) {
    return createMultimodalLlmClientFromResolved(resolved);
  }
  return new MockLlmClient();
}
