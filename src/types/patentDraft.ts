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
  /** 발명 메이킹: 자료 기반 적극 확장·구체화 */
  inventionMakingEnabled?: boolean;
  /** 화학 발명: 실험예·비교예·수치한정·표 형식 지침 */
  chemicalInventionEnabled?: boolean;
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
  visual_material_analysis: string[];
  document_structure_analysis: string[];
  table_or_experiment_data_analysis: string[];
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
  claim_support?: number[];
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
  workflow?: import("@/types/patentWorkflow").WorkflowState;
  raw_response?: string;
  error_message?: string;
}

export interface GenerateSpecOptions {
  desiredClaimCount: number;
  desiredDrawingCount: number;
  projectName?: string;
}

export type ProjectStatus =
  | "before_analysis"
  | "analysis_complete"
  | "spec_writing"
  | "draft_complete";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  before_analysis: "분석 전",
  analysis_complete: "분석 완료",
  spec_writing: "명세서 작성 중",
  draft_complete: "초안 완료"
};

export type DetailLevel = "brief" | "normal" | "detailed" | "very_detailed";
export type ClaimStyle = "broad" | "balanced" | "specific";

export const DETAIL_LEVELS: { value: DetailLevel; label: string }[] = [
  { value: "brief", label: "간략" },
  { value: "normal", label: "보통" },
  { value: "detailed", label: "상세" },
  { value: "very_detailed", label: "매우 상세" }
];

export const CLAIM_STYLES: { value: ClaimStyle; label: string }[] = [
  { value: "broad", label: "넓게" },
  { value: "balanced", label: "균형" },
  { value: "specific", label: "구체적으로" }
];

export interface ProjectRecord {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
}

export interface TextInputs {
  overview: string;
  coreIdea: string;
  existingProblems: string;
  differentiators: string;
  embodimentNotes: string;
  otherNotes: string;
}

export type AiInputMode =
  | "native_file"
  | "image_input"
  | "pdf_input"
  | "document_input"
  | "spreadsheet_input"
  | "text_fallback";

export type MaterialSourceType =
  | "invention_proposal"
  | "business_plan"
  | "meeting_note"
  | "experiment_data"
  | "drawing"
  | "prior_specification"
  | "etc";

export type FileProcessingStatus =
  | "preparing"
  | "native_ready"
  | "fallback_ready"
  | "unsupported"
  | "error";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  materialType: MaterialType;
  sourceType: MaterialSourceType;
  aiInputMode: AiInputMode;
  fileObjectRef: string;
  extractedText: string;
  analysisNotes: string;
  fallbackUsed: boolean;
  status: FileProcessingStatus;
}

export interface DraftOptions {
  claimCount: number;
  drawingCount: number;
  inventionType: InventionType;
  detailLevel: DetailLevel;
  claimStyle: ClaimStyle;
  autoRecommendDrawingType: boolean;
  generateAdditionalQuestions: boolean;
  /** 직접 입력 기술 내용을 바탕으로 발명을 확장·구체화 */
  inventionMakingEnabled: boolean;
  /** 화학·소재·공정 발명 명세서 실무 지침 적용 */
  chemicalInventionEnabled: boolean;
}

export interface SpecificationSection {
  section_id: string;
  title: string;
  content: string;
  isGenerating: boolean;
  lastUpdatedAt: string;
  isModified?: boolean;
  /** 추가 직후 AI 미작성 초안 */
  isDraft?: boolean;
  /** 청구항·도면 변경 후 검토 필요 */
  needsReview?: boolean;
  /** 검토 시 「보완 작성」 버튼 (기존 본문 유지·추가만) */
  reviewSupplement?: boolean;
  reviewMeta?: {
    cause?: "claim" | "drawing";
    addedClaimNumbers?: number[];
    addedFigureNumbers?: number[];
  };
}

export type WorkspaceTab =
  | "spec_edit"
  | "analysis"
  | "claims"
  | "drawings"
  | "review"
  | "markdown"
  | "json";

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "spec_edit", label: "명세서 편집" },
  { id: "analysis", label: "발명 분석표" },
  { id: "claims", label: "청구항" },
  { id: "drawings", label: "도면 프롬프트" },
  { id: "review", label: "정합성 검토" },
  { id: "markdown", label: "전체 Markdown" },
  { id: "json", label: "원본 데이터" }
];

export type LoadingStage =
  | ""
  | "analyze"
  | "claims"
  | "drawing_plan"
  | "drawing_prompts"
  | "claim_drawing_review"
  | "detailed"
  | "front"
  | "generate"
  | "review"
  | "full"
  | "refine";

export interface PatentDraftSnapshot {
  currentProject: ProjectRecord;
  input: InventionInput;
  textInputs: TextInputs;
  uploadedFiles: UploadedFile[];
  options: DraftOptions;
  analysis: InventionAnalysis | null;
  workflow: import("@/types/patentWorkflow").WorkflowState;
  specificationSections: SpecificationSection[];
  claims: ClaimDraft[];
  drawingPrompts: DrawingPrompt[];
  review: SpecificationReview | null;
  markdown: string;
}
