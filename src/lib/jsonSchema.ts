import type { InventionAnalysis, SpecificationReview } from "@/types/patentDraft";

const arrayFields: (keyof InventionAnalysis)[] = [
  "title_candidates",
  "prior_art_problems",
  "problem_to_solve",
  "essential_elements",
  "optional_elements",
  "element_relationships",
  "operation_flow",
  "data_inputs",
  "data_outputs",
  "control_conditions",
  "exception_cases",
  "variation_examples",
  "expected_effects",
  "claim_points",
  "drawing_candidates",
  "unclear_points",
  "do_not_invent"
];

export const emptyInventionAnalysis: InventionAnalysis = {
  title_candidates: [],
  technical_field: "",
  one_line_summary: "",
  core_idea: "",
  prior_art: "",
  prior_art_problems: [],
  problem_to_solve: [],
  essential_elements: [],
  optional_elements: [],
  element_relationships: [],
  operation_flow: [],
  data_inputs: [],
  data_outputs: [],
  control_conditions: [],
  exception_cases: [],
  variation_examples: [],
  expected_effects: [],
  claim_points: [],
  drawing_candidates: [],
  unclear_points: [],
  do_not_invent: []
};

export const emptySpecificationReview: SpecificationReview = {
  claim_support_check: [],
  term_consistency_check: [],
  drawing_spec_consistency_check: [],
  effect_causality_check: [],
  over_narrowing_risk: [],
  over_abstraction_risk: [],
  additional_questions: []
};

export function normalizeInventionAnalysis(value: Partial<InventionAnalysis> | null | undefined): InventionAnalysis {
  const normalized: InventionAnalysis = { ...emptyInventionAnalysis, ...(value ?? {}) };
  for (const field of arrayFields) {
    const current = normalized[field];
    (normalized as unknown as Record<string, unknown>)[field] = Array.isArray(current) ? current : [];
  }
  return normalized;
}

export function parseJsonWithFallback<T>(raw: string, fallback: T): { data: T; raw: string; error?: string } {
  try {
    return { data: JSON.parse(raw) as T, raw };
  } catch (error) {
    return {
      data: fallback,
      raw,
      error: error instanceof Error ? error.message : "JSON 파싱에 실패했습니다."
    };
  }
}
