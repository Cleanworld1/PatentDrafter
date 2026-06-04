import type { OpenAiCredentialInput, ResolvedOpenAiCredentials } from "@/types/openAiCredentials";

import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";
import { sanitizeOpenAiApiKey } from "@/lib/ai/sanitizeOpenAiApiKey";
import { getOpenAiKeySetupMessage } from "@/lib/openAiSetupMessage";

export class OpenAiKeyRequiredError extends Error {
  constructor(message = getOpenAiKeySetupMessage()) {
    super(message);
    this.name = "OpenAiKeyRequiredError";
  }
}

/** .env.local OPENAI_API_KEY (있으면 항상 서버에서 사용) */
export function getServerEnvApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY?.trim();
  if (!raw) return undefined;
  const key = sanitizeOpenAiApiKey(raw);
  return key || undefined;
}

export function isServerOpenAiConfigured(): boolean {
  return Boolean(getServerEnvApiKey());
}

/** @deprecated getServerEnvApiKey 사용 */
export function isServerDefaultOpenAiKeyAllowed(): boolean {
  return isServerOpenAiConfigured();
}

/** @deprecated getServerEnvApiKey 사용 */
export function getServerDefaultApiKeyIfAllowed(): string | undefined {
  return getServerEnvApiKey();
}

/** 개발 환경: Key 없을 때 mock 분석 허용 (프로덕션에서는 false 유지) */
export function isDevMockWithoutKeyAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.ALLOW_MOCK_WITHOUT_OPENAI_KEY !== "false";
}

export function getDefaultModelName(): string {
  return process.env.OPENAI_MODEL?.trim() || FALLBACK_DEFAULT_MODEL;
}

function getEnvOrganizationId(): string | undefined {
  return (
    process.env.OPENAI_ORG_ID?.trim() ||
    process.env.OPENAI_ORGANIZATION?.trim() ||
    undefined
  );
}

function getEnvProjectId(): string | undefined {
  return (
    process.env.OPENAI_PROJECT_ID?.trim() ||
    process.env.OPENAI_PROJECT?.trim() ||
    undefined
  );
}

/** 인증 정보는 .env.local만 사용. 요청 body의 Key·scope 필드는 무시합니다. */
export function resolveOpenAiCredentials(
  input?: OpenAiCredentialInput
): ResolvedOpenAiCredentials | null {
  const apiKey = getServerEnvApiKey();
  if (!apiKey) return null;

  return {
    apiKey,
    // UI·요청 body의 model 은 무시 — .env.local OPENAI_MODEL 만 사용
    model: getDefaultModelName(),
    source: "server_env",
    organizationId: getEnvOrganizationId(),
    projectId: getEnvProjectId()
  };
}

export function requireOpenAiCredentials(
  input?: OpenAiCredentialInput
): ResolvedOpenAiCredentials {
  const resolved = resolveOpenAiCredentials(input);
  if (!resolved) {
    throw new OpenAiKeyRequiredError();
  }
  return resolved;
}
