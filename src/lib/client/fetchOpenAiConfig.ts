import type { OpenAiReasoningEffort } from "@/lib/ai/openAiCompletionParams";
import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";

export interface OpenAiConfigResponse {
  suggestedModel: string;
  configuredReasoningEffort: OpenAiReasoningEffort | null;
  activeReasoningEffort: OpenAiReasoningEffort | null;
  reasoningEffortSupported: boolean;
  serverFallbackAvailable: boolean;
  devMockAllowed: boolean;
  envProjectConfigured?: boolean;
  envOrganizationConfigured?: boolean;
}

export async function fetchOpenAiConfig(): Promise<OpenAiConfigResponse> {
  const response = await fetch("/api/openai/config", {
    cache: "no-store",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`설정 API 오류 (HTTP ${response.status})`);
  }

  const data = (await response.json()) as Partial<OpenAiConfigResponse>;
  return {
    suggestedModel: data.suggestedModel?.trim() || FALLBACK_DEFAULT_MODEL,
    configuredReasoningEffort: data.configuredReasoningEffort ?? null,
    activeReasoningEffort: data.activeReasoningEffort ?? null,
    reasoningEffortSupported: Boolean(data.reasoningEffortSupported),
    serverFallbackAvailable: Boolean(data.serverFallbackAvailable),
    devMockAllowed: Boolean(data.devMockAllowed),
    envProjectConfigured: Boolean(data.envProjectConfigured),
    envOrganizationConfigured: Boolean(data.envOrganizationConfigured)
  };
}
