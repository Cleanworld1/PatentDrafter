export interface GeminiConfigResponse {
  drawingConfigured: boolean;
  imageModel: string;
  defaultImageModel: string;
  studioUrl: string;
}

export async function fetchGeminiConfig(): Promise<GeminiConfigResponse> {
  const res = await fetch("/api/gemini/config", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Gemini 설정 조회 실패 (HTTP ${res.status})`);
  }
  return res.json() as Promise<GeminiConfigResponse>;
}
