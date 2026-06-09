import type { OpenAiContentPart } from "@/lib/ai/multimodalRequestBuilder";
import { messageFromOpenAiHttpError } from "@/lib/ai/openAiHttpError";
import {
  applyChatCompletionLimits,
  type OpenAiTaskProfile
} from "@/lib/ai/openAiCompletionParams";
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
  generateJsonFromParts(parts: OpenAiContentPart[], profile?: OpenAiTaskProfile): Promise<string>;
  /** 명세서 항목 재작성 등 — JSON response_format 미사용 */
  generatePlainText(prompt: string, profile?: OpenAiTaskProfile): Promise<string>;
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

  async generatePlainText(prompt: string, profile: OpenAiTaskProfile = "draft"): Promise<string> {
    return this.generatePlainTextFromParts([{ type: "text", text: prompt }], profile);
  }

  async generateJsonFromParts(
    parts: OpenAiContentPart[],
    profile: OpenAiTaskProfile = "default"
  ): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildOpenAiAuthHeaders(this.apiKey, this.scope)
      },
      body: JSON.stringify(buildChatCompletionBody(this.model, parts, "json", profile))
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(messageFromOpenAiHttpError(response.status, errBody, this.model));
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(emptyOpenAiContentMessage(profile));
    }
    return content;
  }

  async generatePlainTextFromParts(
    parts: OpenAiContentPart[],
    profile: OpenAiTaskProfile = "draft"
  ): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildOpenAiAuthHeaders(this.apiKey, this.scope)
      },
      body: JSON.stringify(buildChatCompletionBody(this.model, parts, "plain", profile))
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(messageFromOpenAiHttpError(response.status, errBody, this.model));
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(emptyOpenAiContentMessage(profile));
    }
    return content;
  }
}

type ChatCompletionOutputMode = "json" | "plain";

function emptyOpenAiContentMessage(profile: OpenAiTaskProfile): string {
  if (profile === "analyze") {
    return [
      "OpenAI가 발명 분석 JSON 본문을 반환하지 않았습니다.",
      "업로드 파일이 너무 크거나, reasoning 토큰만 소진된 경우일 수 있습니다.",
      "파일 수·용량을 줄이거나 dev 서버를 재시작한 뒤 다시 시도해 주세요."
    ].join(" ");
  }
  return [
    "OpenAI 응답 본문이 비어 있습니다.",
    "OPENAI_REASONING_EFFORT=high 설정 시 추론 토큰만 사용되어 본문이 비는 경우가 있습니다.",
    ".env.local 에서 medium 또는 low 로 낮추거나 잠시 후 다시 시도해 주세요."
  ].join(" ");
}

function buildChatCompletionBody(
  model: string,
  parts: OpenAiContentPart[],
  outputMode: ChatCompletionOutputMode = "json",
  profile: OpenAiTaskProfile = outputMode === "json" ? "default" : "draft"
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
  return applyChatCompletionLimits(base, model, 16384, profile);
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
