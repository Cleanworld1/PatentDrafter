import { NextResponse } from "next/server";
import {
  GeminiImageGenerationError,
  GeminiNotConfiguredError,
  generateGeminiDrawingImage
} from "@/lib/ai/geminiImageGeneration";

export const runtime = "nodejs";
export const maxDuration = 120;

interface GenerateDrawingImageBody {
  prompt?: string;
}

export async function POST(request: Request) {
  let body: GenerateDrawingImageBody;
  try {
    body = (await request.json()) as GenerateDrawingImageBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt가 필요합니다." }, { status: 400 });
  }

  if (prompt.length > 120_000) {
    return NextResponse.json({ error: "프롬프트가 너무 깁니다." }, { status: 400 });
  }

  try {
    const image = await generateGeminiDrawingImage(prompt);
    return NextResponse.json({
      mimeType: image.mimeType,
      imageBase64: image.dataBase64
    });
  } catch (err) {
    if (err instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          fallback: "studio"
        },
        { status: 503 }
      );
    }
    if (err instanceof GeminiImageGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "도면 이미지 생성에 실패했습니다." }, { status: 500 });
  }
}
