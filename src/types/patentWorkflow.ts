import type { ClaimDraft, DrawingPrompt, DraftOptions, InventionAnalysis, SpecificationReview } from "@/types/patentDraft";

export type WorkflowStep =
  | "input"
  | "analyzed"
  | "claims_drafted"
  | "drawings_planned"
  | "drawing_prompts_done"
  | "claim_drawing_reviewed"
  | "detailed_description_done"
  | "front_sections_done"
  | "final_review_done";

export const WORKFLOW_STEP_LABELS: Record<WorkflowStep, string> = {
  input: "입력",
  analyzed: "자료 분석 완료",
  claims_drafted: "청구항 초안 완료",
  drawings_planned: "도면 구성 기획 완료",
  drawing_prompts_done: "도면 프롬프트 완료",
  claim_drawing_reviewed: "청구항·도면 정합성 검토 완료",
  detailed_description_done: "구체적인 내용 완료",
  front_sections_done: "앞부분·요약 완료",
  final_review_done: "최종 검토 완료"
};

export interface ProtectionPoint {
  point_id: string;
  description: string;
  technical_problem: string;
  technical_feature: string;
  expected_effect: string;
  claim_priority: "independent" | "dependent" | "embodiment";
  supporting_material: string;
  uncertainty: string;
}

export interface DrawingPlanItem {
  figure_number: number;
  title: string;
  purpose: string;
  drawing_type: DrawingPrompt["drawing_type"];
  required_elements: string[];
  claim_support: number[];
}

export interface ClaimDrawingReview {
  claim_support_check: string[];
  drawing_coverage_check: string[];
  term_consistency_check: string[];
  narrowing_risk: string[];
  abstraction_risk: string[];
  recommended_claim_changes: string[];
  recommended_drawing_changes: string[];
}

export interface FrontSections {
  invention_title: string;
  technical_field: string;
  background_art: string;
  problems_to_solve: string;
  means_for_solving: string;
  effects: string;
  brief_description_of_drawings: string;
  summary: string;
  representative_drawing: string;
}

export interface WorkflowState {
  workflowStep: WorkflowStep;
  inventionCategory: string;
  protectionPoints: ProtectionPoint[];
  claimDrafts: ClaimDraft[];
  drawingPlan: DrawingPlanItem[];
  drawingPrompts: DrawingPrompt[];
  claimDrawingReview: ClaimDrawingReview | null;
  detailedDescription: string;
  frontSections: FrontSections | null;
  finalReview: SpecificationReview | null;
}

export interface WorkflowContext {
  analysis: InventionAnalysis;
  options: DraftOptions;
  projectName: string;
}

export function createEmptyWorkflowState(): WorkflowState {
  return {
    workflowStep: "input",
    inventionCategory: "",
    protectionPoints: [],
    claimDrafts: [],
    drawingPlan: [],
    drawingPrompts: [],
    claimDrawingReview: null,
    detailedDescription: "",
    frontSections: null,
    finalReview: null
  };
}
