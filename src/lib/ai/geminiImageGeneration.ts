import "server-only";

import {
  getGeminiApiKey,
  getGeminiImageModel
} from "@/lib/ai/resolveGeminiCredentials";

export class GeminiNotConfiguredError extends Error {
  readonly code = "GEMINI_NOT_CONFIGURED" as const;

  constructor() {
    super("GEMINI_API_KEY가 설정되지 않았습니다.");
    this.name = "GeminiNotConfiguredError";
  }
}

export class GeminiImageGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiImageGenerationError";
  }
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
  error?: { message?: string; status?: string };
}

/** API 응답에서 첫 번째 이미지 파트 추출 (테스트·런타임 공용) */
export function extractImageFromGeminiResponse(
  body: GeminiGenerateResponse
): { mimeType: string; dataBase64: string } | null {
  for (const candidate of body.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const data = part.inlineData?.data;
      if (data) {
        return {
          mimeType: part.inlineData?.mimeType?.trim() || "image/png",
          dataBase64: data
        };
      }
    }
  }
  return null;
}

function sanitizeGeminiErrorMessage(raw: string): string {
  return raw
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "[API_KEY]")
    .slice(0, 500);
}

/** Google API quota/billing 오류를 사용자용 한국어로 요약 */
export function formatGeminiApiErrorForUser(raw: string, model: string): string {
  const text = sanitizeGeminiErrorMessage(raw);
  const lower = text.toLowerCase();

  if (
    lower.includes("quota") ||
    lower.includes("free_tier") ||
    lower.includes("rate-limit") ||
    lower.includes("billing")
  ) {
    return (
      `선택한 이미지 모델(${model})은 무료 API 할당량이 없습니다(limit: 0). ` +
      "Google AI Studio에서 결제(유료 플랜)를 연결하거나, " +
      "`.env`의 `GEMINI_IMAGE_MODEL`을 `gemini-2.5-flash-image` 등 무료·저가 티어가 있는 모델로 바꾼 뒤 서버를 재시작하세요. " +
      "당분간은 「도면 생성」으로 AI Studio에 붙여넣는 방식을 사용할 수 있습니다."
    );
  }

  return text;
}

export async function generateGeminiDrawingImage(
  prompt: string
): Promise<{ mimeType: string; dataBase64: string }> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new GeminiNotConfiguredError();
  }

  const model = getGeminiImageModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    })
  });

  const rawText = await response.text();
  let body: GeminiGenerateResponse;
  try {
    body = JSON.parse(rawText) as GeminiGenerateResponse;
  } catch {
    throw new GeminiImageGenerationError(
      sanitizeGeminiErrorMessage(
        response.ok ? "Gemini 응답을 해석하지 못했습니다." : rawText || `HTTP ${response.status}`
      )
    );
  }

  if (!response.ok) {
    const rawMsg =
      body.error?.message ||
      sanitizeGeminiErrorMessage(rawText) ||
      `Gemini API 오류 (HTTP ${response.status})`;
    throw new GeminiImageGenerationError(formatGeminiApiErrorForUser(rawMsg, model));
  }

  const image = extractImageFromGeminiResponse(body);
  if (!image) {
    throw new GeminiImageGenerationError(
      "이미지가 생성되지 않았습니다. 모델·결제 설정을 확인하거나 프롬프트를 조정해 주세요."
    );
  }

  return image;
}
