import { NextResponse } from "next/server";
import { parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import { generateDrawingFigureDescription } from "@/lib/sectionFigureDescription";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";

export const runtime = "nodejs";

interface FigureDescriptionBody {
  figureNumber: number;
  drawingMaterial: string;
  analysis: InventionAnalysis;
  relatedClaims?: ClaimDraft[];
  priorFigureDescriptions?: string[];
  drawingPrompt?: DrawingPrompt;
  model?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FigureDescriptionBody;
    const credentials = parseOpenAiFromJsonBody(body as FigureDescriptionBody & Record<string, unknown>);
    requireOpenAiCredentials(credentials);

    const content = await generateDrawingFigureDescription(
      {
        figureNumber: body.figureNumber,
        drawingMaterial: body.drawingMaterial,
        analysis: body.analysis,
        relatedClaims: body.relatedClaims ?? [],
        priorFigureDescriptions: body.priorFigureDescriptions ?? [],
        drawingPrompt: body.drawingPrompt
      },
      credentials
    );

    return NextResponse.json({ content, figureNumber: body.figureNumber });
  } catch (error) {
    return apiErrorResponse(error, "도면별 상세 설명 생성 중 오류가 발생했습니다.");
  }
}
