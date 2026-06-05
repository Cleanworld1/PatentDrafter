/** 화학 발명 2단계: 실시예/비교예 분석 결과 */

export type ChemicalExampleKind =
  | "embodiment"
  | "preferred_embodiment"
  | "comparative";

export interface ChemicalEmbodimentExample {
  id: string;
  kind: ChemicalExampleKind;
  label: string;
  process_conditions: string;
  reagents_and_amounts: string;
  measurement_summary: string;
  results: string;
  technical_meaning: string;
}

export interface ChemicalEmbodimentTable {
  caption: string;
  html_table: string;
  interpretation: string;
}

export interface ChemicalNumericalRangeGuide {
  parameter_name: string;
  full_range: string;
  preferred_range: string;
  lower_bound_issue: string;
  upper_bound_issue: string;
  critical_effect_note: string;
}

export interface ChemicalGraphDrawingSpec {
  title: string;
  chart_type: string;
  x_axis: string;
  y_axis: string;
  data_series_description: string;
  purpose: string;
  related_table_caption?: string;
}

export interface ChemicalDetailedDescriptionInjection {
  opening_paragraph: string;
  embodiment_paragraphs: string[];
  preferred_embodiment_paragraph: string;
  linked_effects_paragraph: string;
}

export interface ChemicalEmbodimentAnalysis {
  invention_subtype: string;
  writing_guidelines_summary: string;
  numerical_ranges: ChemicalNumericalRangeGuide[];
  examples: ChemicalEmbodimentExample[];
  tables: ChemicalEmbodimentTable[];
  detailed_description_injection: ChemicalDetailedDescriptionInjection;
  linked_effects: string[];
  graph_drawings: ChemicalGraphDrawingSpec[];
  measurement_methods: string[];
  claim_support_notes: string[];
  uncertainties: string[];
}

export const emptyChemicalEmbodimentAnalysis = (): ChemicalEmbodimentAnalysis => ({
  invention_subtype: "",
  writing_guidelines_summary: "",
  numerical_ranges: [],
  examples: [],
  tables: [],
  detailed_description_injection: {
    opening_paragraph: "",
    embodiment_paragraphs: [],
    preferred_embodiment_paragraph: "",
    linked_effects_paragraph: ""
  },
  linked_effects: [],
  graph_drawings: [],
  measurement_methods: [],
  claim_support_notes: [],
  uncertainties: []
});
