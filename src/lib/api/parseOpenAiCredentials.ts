import "server-only";

import type { OpenAiCredentialInput } from "@/types/openAiCredentials";

export function parseOpenAiFromFormData(formData: FormData): OpenAiCredentialInput {
  const model = String(formData.get("model") ?? "").trim();
  return {
    ...(model ? { model } : {})
  };
}

export function parseOpenAiFromJsonBody(
  body: Record<string, unknown>
): OpenAiCredentialInput {
  const model = typeof body.model === "string" ? body.model.trim() : undefined;
  return {
    ...(model ? { model } : {})
  };
}
