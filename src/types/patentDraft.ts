export const MATERIAL_TYPES = [
  "발명제안서",
  "사업계획서",
  "회의록",
  "메모",
  "실험데이터",
  "도면 설명",
  "기존 명세서 초안",
  "기타"
] as const;

export const INVENTION_TYPES = [
  "자동 판단",
  "장치 발명",
  "방법 발명",
  "시스템 발명",
  "프로그램 발명",
  "AI·데이터 처리 발명",
  "기계 구조 발명",
  "조성물 발명"
] as const;

export type MaterialType = (typeof MATERIAL_TYPES)[number];
export type InventionType = (typeof INVENTION_TYPES)[number];

export interface InventionInput {
  projectName: string;
  inventionContent: string;
  attachmentText: string;
  materialType: MaterialType;
  desiredClaimCount: number;
  desiredDrawingCount: number;
  inventionType: InventionType;
}

export interface InventionAnalysis {
  title_candidates: string[];
  technical_field: string;
  one_line_summary: string;
  core_idea: string;
  prior_art: string;
  prior_art_problems: string[];
  problem_to_solve: string[];
  essential_elements: string[];
  optional_elements: string[];
  element_relationships: string[];
  operation_flow: string[];
  data_inputs: string[];
  data_outputs: string[];
  control_conditions: string[];
  exception_cases: string[];
  variation_examples: string[];
  expected_effects: string[];
  claim_points: string[];
  drawing_candidates: string[];
  unclear_points: string[];
  do_not_invent: string[];
}

export interface ClaimDraft {
  claim_number: number;
  category: string;
  text: string;
  dependency?: number;
  support_notes?: string[];
}

export interface DrawingPrompt {
  figure_number: number;
  title: string;
  drawing_type: "시스템도" | "구성도" | "흐름도" | "UI도" | "기계 구조도";
  purpose: string;
  required_elements: string[];
  relative_layout: string;
  arrows_or_connections: string;
  reference_number_guidance: string;
  style_instruction: string;
}

export interface SpecificationDraft {
  invention_title: string;
  technical_field: string;
  background_art: string;
  problems_to_solve: string;
  means_for_solving: string;
  effects: string;
  brief_description_of_drawings: string;
  detailed_description: string;
  summary: string;
  representative_drawing: string;
  claims: ClaimDraft[];
  drawing_prompts: DrawingPrompt[];
}

export interface SpecificationReview {
  claim_support_check: string[];
  term_consistency_check: string[];
  drawing_spec_consistency_check: string[];
  effect_causality_check: string[];
  over_narrowing_risk: string[];
  over_abstraction_risk: string[];
  additional_questions: string[];
}

export interface FullDraftResult {
  analysis: InventionAnalysis;
  specification: SpecificationDraft;
  claims: ClaimDraft[];
  drawing_prompts: DrawingPrompt[];
  review: SpecificationReview;
  markdown: string;
  raw_response?: string;
  error_message?: string;
}

export interface GenerateSpecOptions {
  desiredClaimCount: number;
  desiredDrawingCount: number;
  projectName?: string;
}
