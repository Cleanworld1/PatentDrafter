import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";

export interface OpenAiConfigResponse {
  suggestedModel: string;
  serverFallbackAvailable: boolean;
  devMockAllowed: boolean;
  envProjectConfigured?: boolean;
  envOrganizationConfigured?: boolean;
}

const CONFIG_FETCH_TIMEOUT_MS = 12_000;

export async function fetchOpenAiConfig(): Promise<OpenAiConfigResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG_FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/openai/config", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "설정 API 응답 시간이 초과되었습니다. dev 서버가 실행 중인지 확인한 뒤 새로고침하세요."
      );
    }
    throw new Error(
      err instanceof Error
        ? `설정 API에 연결하지 못했습니다: ${err.message}`
        : "설정 API에 연결하지 못했습니다."
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`설정 API 오류 (HTTP ${response.status})`);
  }

  const data = (await response.json()) as Partial<OpenAiConfigResponse>;
  return {
    suggestedModel: data.suggestedModel?.trim() || FALLBACK_DEFAULT_MODEL,
    serverFallbackAvailable: Boolean(data.serverFallbackAvailable),
    devMockAllowed: Boolean(data.devMockAllowed),
    envProjectConfigured: Boolean(data.envProjectConfigured),
    envOrganizationConfigured: Boolean(data.envOrganizationConfigured)
  };
}
