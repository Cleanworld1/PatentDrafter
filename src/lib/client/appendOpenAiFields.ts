import { getModelForRequest } from "@/store/sessionApiKeyStore";

export function appendOpenAiToFormData(formData: FormData): void {
  formData.append("model", getModelForRequest());
}

export function buildJsonWithOpenAi<T extends Record<string, unknown>>(payload: T): string {
  return JSON.stringify({
    model: getModelForRequest(),
    ...payload
  });
}
