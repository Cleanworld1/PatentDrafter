import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";

export interface OpenAiConfigResponse {
  suggestedModel: string;
  serverFallbackAvailable: boolean;
  devMockAllowed: boolean;
  envProjectConfigured?: boolean;
  envOrganizationConfigured?: boolean;
  hostedOnVercel?: boolean;
  analyzeTimeoutMs?: number;
  needsProTimeoutEnv?: boolean;
  proTimeoutEnvExample?: string;
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
    serverFallbackAvailable: Boolean(data.serverFallbackAvailable),
    devMockAllowed: Boolean(data.devMockAllowed),
    envProjectConfigured: Boolean(data.envProjectConfigured),
    envOrganizationConfigured: Boolean(data.envOrganizationConfigured),
    hostedOnVercel: Boolean(data.hostedOnVercel),
    analyzeTimeoutMs: data.analyzeTimeoutMs,
    needsProTimeoutEnv: Boolean(data.needsProTimeoutEnv),
    proTimeoutEnvExample: data.proTimeoutEnvExample
  };
}
