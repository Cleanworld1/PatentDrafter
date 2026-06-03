import { describe, expect, it } from "vitest";
import {
  getInventionAnalysisModeNotes,
  getInventionMakingRulesBlock,
  getInventionMakingSectionNote
} from "@/knowledge/inventionMakingRules";
import { buildAnalyzeInventionPrompt } from "@/prompts/analyzeInvention";
import { buildRegenerateSectionPrompt } from "@/prompts/regenerateSection";

describe("inventionMakingRules", () => {
  it("returns empty block when disabled", () => {
    expect(getInventionMakingRulesBlock(false)).toBe("");
    expect(getInventionAnalysisModeNotes(false)).toContain("만들지 말라");
  });

  it("returns expansion rules when enabled", () => {
    const block = getInventionMakingRulesBlock(true);
    expect(block).toContain("발명 메이킹");
    expect(block).toContain("대표 실시예");
    expect(block).toContain("논리");
  });

  it("injects mode into analyze and regenerate prompts", () => {
    const input = {
      projectName: "테스트",
      inventionContent: "핵심 기술",
      attachmentText: "",
      materialType: "발명제안서" as const,
      desiredClaimCount: 3,
      desiredDrawingCount: 2,
      inventionType: "시스템 발명" as const,
      inventionMakingEnabled: true
    };
    expect(buildAnalyzeInventionPrompt(input)).toContain("발명 메이킹: 활성");

    const regen = buildRegenerateSectionPrompt({
      sectionType: "means_for_solving",
      sectionTitle: "【과제의 해결 수단】",
      currentContent: "",
      analysis: { title_candidates: [], technical_field: "", one_line_summary: "", core_idea: "", prior_art: "", prior_art_problems: [], problem_to_solve: [], essential_elements: [], optional_elements: [], element_relationships: [], operation_flow: [], data_inputs: [], data_outputs: [], control_conditions: [], exception_cases: [], variation_examples: [], expected_effects: [], claim_points: [], drawing_candidates: [], visual_material_analysis: [], document_structure_analysis: [], table_or_experiment_data_analysis: [], unclear_points: [], do_not_invent: [] },
      inventionMakingEnabled: true
    });
    expect(regen).toContain("발명 메이킹");
    expect(getInventionMakingSectionNote("detailed_description", true)).toContain("대표 실시예");
  });
});
