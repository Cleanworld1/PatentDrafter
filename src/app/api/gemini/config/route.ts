import { NextResponse } from "next/server";
import {
  DEFAULT_GEMINI_IMAGE_MODEL,
  getGeminiImageModel,
  isGeminiDrawingConfigured
} from "@/lib/ai/resolveGeminiCredentials";
import { getNanoBananaStudioUrl } from "@/lib/nanoBananaDrawing";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    drawingConfigured: isGeminiDrawingConfigured(),
    imageModel: isGeminiDrawingConfigured() ? getGeminiImageModel() : DEFAULT_GEMINI_IMAGE_MODEL,
    defaultImageModel: DEFAULT_GEMINI_IMAGE_MODEL,
    studioUrl: getNanoBananaStudioUrl()
  });
}
