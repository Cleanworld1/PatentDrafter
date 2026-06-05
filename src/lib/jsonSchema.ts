import type { DrawingPrompt, InventionAnalysis, SpecificationReview } from "@/types/patentDraft";
import type {
  ChemicalEmbodimentAnalysis,
  ChemicalEmbodimentExample,
  ChemicalEmbodimentTable,
  ChemicalExampleKind,
  ChemicalGraphDrawingSpec,
  ChemicalNumericalRangeGuide
} from "@/types/chemicalEmbodimentAnalysis";
import { emptyChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";

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

const EXAMPLE_KINDS: ChemicalExampleKind[] = [
  "embodiment",
  "preferred_embodiment",
  "comparative"
];

function normalizeExampleKind(value: unknown): ChemicalExampleKind {
  const s = coerceString(value);
  return EXAMPLE_KINDS.includes(s as ChemicalExampleKind)
    ? (s as ChemicalExampleKind)
    : "embodiment";
}

function normalizeExamples(value: unknown): ChemicalEmbodimentExample[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, i) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      id: coerceString(raw.id) || `example_${i + 1}`,
      kind: normalizeExampleKind(raw.kind),
      label: coerceString(raw.label) || `실시예 ${i + 1}`,
      process_conditions: coerceString(raw.process_conditions),
      reagents_and_amounts: coerceString(raw.reagents_and_amounts),
      measurement_summary: coerceString(raw.measurement_summary),
      results: coerceString(raw.results),
      technical_meaning: coerceString(raw.technical_meaning)
    };
  });
}

function normalizeTables(value: unknown): ChemicalEmbodimentTable[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, i) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      caption: coerceString(raw.caption) || `[표 ${i + 1}]`,
      html_table: coerceString(raw.html_table),
      interpretation: coerceString(raw.interpretation)
    };
  });
}

function normalizeNumericalRanges(value: unknown): ChemicalNumericalRangeGuide[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      parameter_name: coerceString(raw.parameter_name),
      full_range: coerceString(raw.full_range),
      preferred_range: coerceString(raw.preferred_range),
      lower_bound_issue: coerceString(raw.lower_bound_issue),
      upper_bound_issue: coerceString(raw.upper_bound_issue),
      critical_effect_note: coerceString(raw.critical_effect_note)
    };
  });
}

function normalizeGraphDrawings(value: unknown): ChemicalGraphDrawingSpec[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const raw = (item ?? {}) as Record<string, unknown>;
    return {
      title: coerceString(raw.title),
      chart_type: coerceString(raw.chart_type) || "막대 그래프",
      x_axis: coerceString(raw.x_axis),
      y_axis: coerceString(raw.y_axis),
      data_series_description: coerceString(raw.data_series_description),
      purpose: coerceString(raw.purpose),
      related_table_caption: coerceString(raw.related_table_caption) || undefined
    };
  });
}

export function normalizeChemicalEmbodimentAnalysis(
  value: Partial<ChemicalEmbodimentAnalysis> | null | undefined
): ChemicalEmbodimentAnalysis {
  const raw = (value ?? {}) as Record<string, unknown>;
  const inj = (raw.detailed_description_injection ?? {}) as Record<string, unknown>;
  return {
    invention_subtype: coerceString(raw.invention_subtype),
    writing_guidelines_summary: coerceString(raw.writing_guidelines_summary),
    numerical_ranges: normalizeNumericalRanges(raw.numerical_ranges),
    examples: normalizeExamples(raw.examples),
    tables: normalizeTables(raw.tables),
    detailed_description_injection: {
      opening_paragraph: coerceString(inj.opening_paragraph),
      embodiment_paragraphs: coerceStringArray(inj.embodiment_paragraphs),
      preferred_embodiment_paragraph: coerceString(inj.preferred_embodiment_paragraph),
      linked_effects_paragraph: coerceString(inj.linked_effects_paragraph)
    },
    linked_effects: coerceStringArray(raw.linked_effects),
    graph_drawings: normalizeGraphDrawings(raw.graph_drawings),
    measurement_methods: coerceStringArray(raw.measurement_methods),
    claim_support_notes: coerceStringArray(raw.claim_support_notes),
    uncertainties: coerceStringArray(raw.uncertainties)
  };
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
