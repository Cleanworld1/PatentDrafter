import { parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import { createSseTextResponse } from "@/lib/server/sseTextStream";
import { generateDrawingFigureDescriptionStreaming } from "@/lib/sectionFigureDescription";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";

export const runtime = "nodejs";
export const maxDuration = 300;

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

    return createSseTextResponse((emit) =>
      generateDrawingFigureDescriptionStreaming(
        {
          figureNumber: body.figureNumber,
          drawingMaterial: body.drawingMaterial,
          analysis: body.analysis,
          relatedClaims: body.relatedClaims ?? [],
          priorFigureDescriptions: body.priorFigureDescriptions ?? [],
          drawingPrompt: body.drawingPrompt
        },
        credentials,
        emit
      )
    );
  } catch (error) {
    return apiErrorResponse(error, "도면별 상세 설명 스트리밍 생성 중 오류가 발생했습니다.");
  }
}
