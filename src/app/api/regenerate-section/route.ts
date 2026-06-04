import { NextResponse } from "next/server";
import { regenerateSpecificationSection } from "@/lib/sectionRegenerateService";
import { parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
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
    requireOpenAiCredentials(credentials);

    const sectionType = body.sectionType ?? sectionIdToType(body.sectionId);
    const sectionTitle = body.sectionTitle ?? sectionIdToTitle(body.sectionId);

    const content = await regenerateSpecificationSection(
      {
        sectionType,
        sectionTitle,
        currentContent: body.currentContent,
        analysis: body.analysis,
        relatedClaims: body.relatedClaims,
        userInstruction: body.userInstruction,
        drawingContext: body.drawingContext,
        inventionMakingEnabled: body.inventionMakingEnabled,
        chemicalInventionEnabled: body.chemicalInventionEnabled,
        chemicalEmbodimentAnalysis: body.chemicalEmbodimentAnalysis ?? null,
        chemicalFormulaCatalog: body.chemicalFormulaCatalog ?? []
      },
      credentials
    );

    return NextResponse.json({ content, sectionId: body.sectionId, sectionType });
  } catch (error) {
    return apiErrorResponse(error, "섹션 재작성 중 오류가 발생했습니다.");
  }
}
