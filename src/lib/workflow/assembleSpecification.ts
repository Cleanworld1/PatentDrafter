import type { FrontSections, WorkflowState } from "@/types/patentWorkflow";
import type { InventionAnalysis, SpecificationDraft } from "@/types/patentDraft";

/** 최종 명세서 목차 순서로 조립 (작성 업무 순서와 다름) */
export function assembleSpecificationFromWorkflow(
  workflow: WorkflowState,
  analysis: InventionAnalysis
): SpecificationDraft {
  const front = workflow.frontSections ?? {
    invention_title: analysis.title_candidates[0] ?? "",
    technical_field: analysis.technical_field,
    background_art: analysis.prior_art,
    problems_to_solve: analysis.problem_to_solve.join("\n"),
    means_for_solving: analysis.core_idea,
    effects: analysis.expected_effects.join("\n"),
    brief_description_of_drawings: "",
    summary: analysis.one_line_summary,
    representative_drawing: "도 1"
  };

  return {
    invention_title: front.invention_title,
    technical_field: front.technical_field,
    background_art: front.background_art,
    problems_to_solve: front.problems_to_solve,
    means_for_solving: front.means_for_solving,
    effects: front.effects,
    brief_description_of_drawings: front.brief_description_of_drawings,
    detailed_description: workflow.detailedDescription,
    summary: front.summary,
    representative_drawing: front.representative_drawing,
    claims: workflow.claimDrafts,
    drawing_prompts: workflow.drawingPrompts
  };
}
