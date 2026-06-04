import { getConfiguredOpenAiScope } from "@/lib/ai/openAiRequestHeaders";
import {
  getDefaultModelName,
  isDevMockWithoutKeyAllowed,
  isServerOpenAiConfigured
} from "@/lib/ai/resolveOpenAiCredentials";

/** 클라이언트에 노출해도 되는 OpenAI 설정 요약 (API Key 제외) */
export interface OpenAiPublicConfig {
  suggestedModel: string;
  serverFallbackAvailable: boolean;
  devMockAllowed: boolean;
  envProjectConfigured: boolean;
  envOrganizationConfigured: boolean;
}

export function getOpenAiPublicConfig(): OpenAiPublicConfig {
  const scope = getConfiguredOpenAiScope();
  return {
    suggestedModel: getDefaultModelName(),
    serverFallbackAvailable: isServerOpenAiConfigured(),
    devMockAllowed: isDevMockWithoutKeyAllowed(),
    envProjectConfigured: scope.hasProject,
    envOrganizationConfigured: scope.hasOrganization
  };
}
