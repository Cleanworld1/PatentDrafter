import "server-only";

/** Nano Banana 2 (Gemini 3.1 Flash Image). 미지원 시 .env에서 다른 이미지 모델로 변경 */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export function getGeminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key && key.length > 0 ? key : null;
}

export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;
}

export function isGeminiDrawingConfigured(): boolean {
  return getGeminiApiKey() !== null;
}
