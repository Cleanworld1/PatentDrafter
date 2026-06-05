import { parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import { createSseTextResponse } from "@/lib/server/sseTextStream";
import { regenerateSpecificationSectionStreaming } from "@/lib/sectionRegenerateService";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type { ChemicalFormulaImageRef } from "@/types/chemicalFormulaImage";
import type { ClaimDraft, InventionAnalysis } from "@/types/patentDraft";
import { sectionIdToTitle, sectionIdToType } from "@/types/specificationSection";
import type { SpecificationSectionType } from "@/types/specificationSection";

export const runtime = "nodejs";
export const maxDuration = 300;

interface RegenerateSectionBody {
  sectionId: string;
  sectionType?: SpecificationSectionType;
  sectionTitle?: string;
  currentContent: string;
  analysis: InventionAnalysis;
  relatedClaims?: ClaimDraft[];
  specificationSections?: Array<{ section_id: string; content: string }>;
  userInstruction?: string;
  drawingContext?: CurrentDrawingContext;
  inventionMakingEnabled?: boolean;
  chemicalInventionEnabled?: boolean;
  chemicalEmbodimentAnalysis?: ChemicalEmbodimentAnalysis | null;
  chemicalFormulaCatalog?: ChemicalFormulaImageRef[];
  openAiApiKey?: string;
  model?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegenerateSectionBody;
    const credentials = parseOpenAiFromJsonBody(body as RegenerateSectionBody & Record<string, unknown>);

    const sectionType = body.sectionType ?? sectionIdToType(body.sectionId);
    const sectionTitle = body.sectionTitle ?? sectionIdToTitle(body.sectionId);

    return createSseTextResponse((emit) =>
      regenerateSpecificationSectionStreaming(
        {
          sectionType,
          sectionTitle,
          sectionId: body.sectionId,
          currentContent: body.currentContent,
          analysis: body.analysis,
          relatedClaims: body.relatedClaims,
          specificationSections: body.specificationSections,
          userInstruction: body.userInstruction,
          drawingContext: body.drawingContext,
          inventionMakingEnabled: body.inventionMakingEnabled,
          chemicalInventionEnabled: body.chemicalInventionEnabled,
          chemicalEmbodimentAnalysis: body.chemicalEmbodimentAnalysis ?? null,
          chemicalFormulaCatalog: body.chemicalFormulaCatalog ?? []
        },
        credentials,
        emit
      )
    );
  } catch (error) {
    return apiErrorResponse(error, "섹션 스트리밍 재작성 중 오류가 발생했습니다.");
  }
}
