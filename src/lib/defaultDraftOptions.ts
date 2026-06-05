import type { DraftOptions } from "@/types/patentDraft";

export function defaultDraftOptions(): DraftOptions {
  return {
    claimCount: 5,
    drawingCount: 5,
    inventionType: "자동 판단",
    detailLevel: "normal",
    claimStyle: "balanced",
    autoRecommendDrawingType: true,
    generateAdditionalQuestions: true,
    inventionMakingEnabled: false,
    chemicalInventionEnabled: false
  };
}

export function mergeDraftOptions(partial?: Partial<DraftOptions>): DraftOptions {
  return { ...defaultDraftOptions(), ...partial };
}
