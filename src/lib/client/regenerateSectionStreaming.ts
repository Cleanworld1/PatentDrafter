import { buildJsonWithOpenAi } from "@/lib/client/appendOpenAiFields";
import { consumePlainTextSseStream } from "@/lib/client/consumePlainTextStream";
import { buildChemicalFormulaCatalog } from "@/lib/chemicalFormulaCatalog";
import { buildCurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import {
  buildLiveClaimsFromSections,
  resolveSectionConciseInstruction,
  resolveSectionRewriteInstruction
} from "@/lib/regenerateSectionContext";
import {
  pruneAnalysisForRegenerate,
  pruneClaimsForRegenerate,
  pruneDrawingContextForRegenerate,
  pruneSpecificationSectionsForRequest,
  shouldIncludeChemicalEmbodiment,
  shouldIncludeChemicalFormulaCatalog
} from "@/lib/regeneratePromptPruning";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type {
  ClaimDraft,
  DraftOptions,
  DrawingPrompt,
  InventionAnalysis,
  SpecificationSection,
  UploadedFile
} from "@/types/patentDraft";
import { sectionIdToType } from "@/types/specificationSection";

export type SectionRegenerateMode = "rewrite" | "concise" | "elaborate" | "supplement";

export interface RegenerateSectionStateSlice {
  analysis: InventionAnalysis;
  specificationSections: SpecificationSection[];
  claims: ClaimDraft[];
  drawingPrompts: DrawingPrompt[];
  options: DraftOptions;
  chemicalEmbodimentAnalysis: ChemicalEmbodimentAnalysis | null;
  uploadedFiles: UploadedFile[];
}

export interface StreamRegenerateSectionOptions {
  mode: SectionRegenerateMode;
  /** replaceFresh=true일 때 concise·rewrite용 이전 본문 */
  previousContent?: string;
  userInstruction?: string;
  contentPrefix?: string;
}

export function shouldReplaceSectionFresh(mode: SectionRegenerateMode): boolean {
  return mode === "rewrite" || mode === "concise";
}

export function resolveRegenerateUserInstruction(
  sectionId: string,
  state: RegenerateSectionStateSlice,
  options: StreamRegenerateSectionOptions
): string {
  if (options.userInstruction) return options.userInstruction;

  const slice = { ...state, analysis: state.analysis };

  if (options.mode === "supplement") {
    return resolveSectionRewriteInstruction(sectionId, slice, "rewrite");
  }
  if (options.mode === "concise") {
    return resolveSectionConciseInstruction(
      sectionId,
      slice,
      options.previousContent ?? ""
    );
  }
  if (options.mode === "elaborate") {
    return resolveSectionRewriteInstruction(sectionId, slice, "elaborate");
  }
  return resolveSectionRewriteInstruction(sectionId, slice, "rewrite");
}

export function buildRegenerateSectionRequestBody(
  state: RegenerateSectionStateSlice,
  sectionId: string,
  userInstruction: string,
  options: { replaceFresh: boolean; currentContent: string }
) {
  const sectionType = sectionIdToType(sectionId);
  const liveClaims = buildLiveClaimsFromSections(state.specificationSections, state.claims);
  const prunedClaims = pruneClaimsForRegenerate(sectionId, liveClaims);
  const rawSections = state.specificationSections.map((s) => ({
    section_id: s.section_id,
    content: s.section_id === sectionId && options.replaceFresh ? "" : s.content
  }));

  const includeChemicalEmbodiment = shouldIncludeChemicalEmbodiment(sectionType);
  const includeFormulaCatalog =
    shouldIncludeChemicalFormulaCatalog(sectionType) &&
    isChemicalInventionEnabled(state.options.chemicalInventionEnabled);

  return {
    sectionId,
    sectionType,
    currentContent: options.replaceFresh ? "" : options.currentContent,
    analysis: pruneAnalysisForRegenerate(sectionType, state.analysis),
    relatedClaims: prunedClaims,
    specificationSections: pruneSpecificationSectionsForRequest(rawSections, sectionId),
    userInstruction,
    drawingContext: pruneDrawingContextForRegenerate(
      buildCurrentDrawingContext(state.specificationSections, state.drawingPrompts),
      sectionId
    ),
    inventionMakingEnabled: state.options.inventionMakingEnabled,
    chemicalInventionEnabled: state.options.chemicalInventionEnabled,
    chemicalEmbodimentAnalysis: includeChemicalEmbodiment ? state.chemicalEmbodimentAnalysis : null,
    chemicalFormulaCatalog: includeFormulaCatalog
      ? buildChemicalFormulaCatalog(state.uploadedFiles)
      : []
  };
}

export async function streamRegenerateSectionRequest(
  state: RegenerateSectionStateSlice,
  sectionId: string,
  options: StreamRegenerateSectionOptions,
  onContent: (display: string) => void
): Promise<string> {
  const current = state.specificationSections.find((s) => s.section_id === sectionId);
  if (!current) throw new Error(`섹션 ${sectionId} 없음`);

  const replaceFresh = shouldReplaceSectionFresh(options.mode);
  const previousContent = options.previousContent ?? current.content;
  const userInstruction = resolveRegenerateUserInstruction(sectionId, state, {
    ...options,
    previousContent
  });
  const prefix = options.contentPrefix?.trimEnd() ?? "";

  const response = await fetch("/api/regenerate-section/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: buildJsonWithOpenAi(
      buildRegenerateSectionRequestBody(state, sectionId, userInstruction, {
        replaceFresh,
        currentContent: current.content
      })
    )
  });

  return consumePlainTextSseStream(response, (streamed) => {
    const display = prefix ? `${prefix}\n${streamed}` : streamed;
    onContent(display);
  });
}
