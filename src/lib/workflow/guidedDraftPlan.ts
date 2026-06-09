import type { RefinementMode } from "@/lib/workflow/postFullDraftRefinement";
import type { DraftOptions } from "@/types/patentDraft";
import { sectionIdToTitle } from "@/types/specificationSection";

export type GuidedDraftStepKind =
  | "analyze"
  | "chemical_embodiment"
  | "bootstrap_workflow"
  | "refine_section"
  | "detailed_intro"
  | "detailed_figure"
  | "detailed_outro"
  | "finalize";

export interface GuidedDraftStep {
  id: string;
  kind: GuidedDraftStepKind;
  label: string;
  sectionId?: string;
  figureNumber?: number;
  mode?: RefinementMode;
}

const FRONT_REFINE_IDS = [
  "invention_title",
  "technical_field",
  "background_art",
  "problems_to_solve"
] as const;

const TAIL_REFINE_IDS = [
  "summary",
  "means_for_solving",
  "effects",
  "brief_description_of_drawings"
] as const;

export interface GuidedDraftSession {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  steps: GuidedDraftStep[];
  awaitingContinue: boolean;
  currentStepLabel: string;
  focusSectionId: string | null;
  figureDescriptions: string[];
  stopped: boolean;
}

export function buildGuidedDraftPlan(options: DraftOptions): GuidedDraftStep[] {
  const steps: GuidedDraftStep[] = [];
  const claimCount = Math.max(1, options.claimCount);
  const drawingCount = Math.max(1, options.drawingCount);

  steps.push({
    id: "analyze",
    kind: "analyze",
    label: "1단계: 발명 분석"
  });

  if (options.chemicalInventionEnabled) {
    steps.push({
      id: "chemical_embodiment",
      kind: "chemical_embodiment",
      label: "2단계: 실시예/비교예 분석"
    });
  }

  steps.push({
    id: "bootstrap_workflow",
    kind: "bootstrap_workflow",
    label: "초안 골격 생성 (청구항·도면·기본 명세)"
  });

  for (const sectionId of FRONT_REFINE_IDS) {
    steps.push({
      id: `refine-${sectionId}`,
      kind: "refine_section",
      sectionId,
      mode: "rewrite",
      label: `${sectionIdToTitle(sectionId)} — AI 작성·구체화`
    });
  }

  for (let i = 1; i <= claimCount; i += 1) {
    const sectionId = `claim_${i}`;
    steps.push({
      id: `refine-${sectionId}`,
      kind: "refine_section",
      sectionId,
      mode: "rewrite",
      label: `${sectionIdToTitle(sectionId)} — AI 작성·구체화`
    });
  }

  for (const sectionId of TAIL_REFINE_IDS) {
    steps.push({
      id: `refine-${sectionId}`,
      kind: "refine_section",
      sectionId,
      mode: "rewrite",
      label: `${sectionIdToTitle(sectionId)} — AI 작성·구체화`
    });
  }

  for (let i = 1; i <= drawingCount; i += 1) {
    const sectionId = `drawing_${i}`;
    steps.push({
      id: `refine-${sectionId}-rewrite`,
      kind: "refine_section",
      sectionId,
      mode: "rewrite",
      label: `${sectionIdToTitle(sectionId)} — AI 작성·구체화`
    });
  }

  steps.push({
    id: "detailed_intro",
    kind: "detailed_intro",
    sectionId: "detailed_description",
    label: "【발명을 실시하기 위한 구체적인 내용】 도입부 작성"
  });

  for (let n = 1; n <= drawingCount; n += 1) {
    steps.push({
      id: `detailed_figure_${n}`,
      kind: "detailed_figure",
      sectionId: "detailed_description",
      figureNumber: n,
      label: `【구체적인 내용】 도 ${n} 설명 작성`
    });
  }

  steps.push({
    id: "detailed_outro",
    kind: "detailed_outro",
    sectionId: "detailed_description",
    label: "【구체적인 내용】 말미 작성"
  });

  steps.push({
    id: "finalize",
    kind: "finalize",
    label: "작성 완료"
  });

  return steps;
}
