import { describe, expect, it } from "vitest";
import {
  getChemicalInventionMakingCombinedBlock,
  getChemicalInventionMakingRegenerateNote,
  getChemicalInventionMakingSectionNote,
  isChemicalInventionMakingMode
} from "@/knowledge/chemicalInventionMakingRules";
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

describe("chemical invention + invention making combined rules", () => {
  it("is active only when both flags are on", () => {
    expect(isChemicalInventionMakingMode(true, true)).toBe(true);
    expect(isChemicalInventionMakingMode(true, false)).toBe(false);
    expect(isChemicalInventionMakingMode(false, true)).toBe(false);
  });

  it("requires numerical limitation tables and experiment/comparative examples", () => {
    const block = getChemicalInventionMakingCombinedBlock(true, true);
    expect(block).toContain("수치한정");
    expect(block).toContain("실험예");
    expect(block).toContain("비교예");
    expect(block).toContain("HTML <table>");
    expect(block).toContain("2~3");
    expect(block).toContain("임계");
  });

  it("injects combined rules into generate and regenerate prompts", () => {
    const options = {
      ...defaultDraftOptions(),
      inventionMakingEnabled: true,
      chemicalInventionEnabled: true
    };
    const gen = buildGenerateSpecificationPrompt({ analysis: minimalAnalysis, options });
    expect(gen).toContain("화학 발명 + 발명 메이킹");

    const regen = buildRegenerateSectionPrompt({
      sectionType: "detailed_description",
      sectionTitle: "구체적인 내용",
      currentContent: "",
      analysis: minimalAnalysis,
      inventionMakingEnabled: true,
      chemicalInventionEnabled: true
    });
    expect(regen).toContain("표 2~3개");
    expect(getChemicalInventionMakingRegenerateNote(true, true)).toContain("2~3개");
    expect(getChemicalInventionMakingSectionNote("detailed_description", true, true)).toContain(
      "하한 미만"
    );
  });
});
