import type { DrawingPrompt, InventionAnalysis, SpecificationReview } from "@/types/patentDraft";

const stringFields: (keyof InventionAnalysis)[] = [
  "technical_field",
  "one_line_summary",
  "core_idea",
  "prior_art"
];

export function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v != null ? String(v) : ""))
      .filter((s) => s.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return [];
}

function coerceString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  return String(value);
}

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
  "visual_material_analysis",
  "document_structure_analysis",
  "table_or_experiment_data_analysis",
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
  visual_material_analysis: [],
  document_structure_analysis: [],
  table_or_experiment_data_analysis: [],
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
  const raw = (value ?? {}) as Record<string, unknown>;
  const normalized: InventionAnalysis = { ...emptyInventionAnalysis };

  for (const field of stringFields) {
    (normalized as unknown as Record<string, unknown>)[field] = coerceString(raw[field]);
  }
  for (const field of arrayFields) {
    (normalized as unknown as Record<string, unknown>)[field] = coerceStringArray(raw[field]);
  }
  return normalized;
}

export function normalizeDrawingPrompts(value: unknown): DrawingPrompt[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    const figure =
      typeof raw.figure_number === "number" ? raw.figure_number : index + 1;
    const drawingType = coerceString(raw.drawing_type);
    const allowed = ["시스템도", "구성도", "흐름도", "UI도", "기계 구조도"] as const;
    const drawing_type = allowed.includes(drawingType as (typeof allowed)[number])
      ? (drawingType as DrawingPrompt["drawing_type"])
      : "시스템도";

    return {
      figure_number: figure,
      title: coerceString(raw.title) || `도면 ${figure}`,
      drawing_type,
      purpose: coerceString(raw.purpose),
      claim_support: Array.isArray(raw.claim_support)
        ? raw.claim_support.filter((n): n is number => typeof n === "number")
        : undefined,
      required_elements: coerceStringArray(raw.required_elements),
      relative_layout: coerceString(raw.relative_layout),
      arrows_or_connections: coerceString(raw.arrows_or_connections),
      reference_number_guidance: coerceString(raw.reference_number_guidance),
      style_instruction: coerceString(raw.style_instruction)
    };
  });
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
