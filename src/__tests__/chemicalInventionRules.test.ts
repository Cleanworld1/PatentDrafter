import { describe, expect, it } from "vitest";
import {
  getChemicalInventionRulesBlock,
  getChemicalInventionSectionNote
} from "@/knowledge/chemicalInventionRules";
import { buildGenerateSpecificationPrompt } from "@/prompts/generateSpecification";
import { buildRegenerateSectionPrompt } from "@/prompts/regenerateSection";
import { defaultDraftOptions } from "@/lib/defaultDraftOptions";
import type { InventionAnalysis } from "@/types/patentDraft";

const minimalAnalysis: InventionAnalysis = {
  title_candidates: ["테스트"],
  technical_field: "화학",
  one_line_summary: "요약",
  core_idea: "핵심",
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

describe("chemical invention rules", () => {
  it("returns empty block when disabled", () => {
    expect(getChemicalInventionRulesBlock(false)).toBe("");
  });

  it("includes full chemical guidelines when enabled", () => {
    const block = getChemicalInventionRulesBlock(true);
    expect(block).toContain("화학 발명");
    expect(block).toContain("실시가능");
    expect(block).toContain("HTML <table>");
  });

  it("injects rules into generate specification prompt", () => {
    const options = { ...defaultDraftOptions(), chemicalInventionEnabled: true };
    const prompt = buildGenerateSpecificationPrompt({ analysis: minimalAnalysis, options });
    expect(prompt).toContain("화학 발명");
    expect(prompt).toContain("수치한정");
  });

  it("injects section note for detailed description regenerate", () => {
    const regen = buildRegenerateSectionPrompt({
      sectionType: "detailed_description",
      sectionTitle: "구체적인 내용",
      currentContent: "",
      analysis: minimalAnalysis,
      chemicalInventionEnabled: true
    });
    expect(regen).toContain("화학 발명");
    expect(getChemicalInventionSectionNote("detailed_description", true)).toContain("HTML");
  });
});
