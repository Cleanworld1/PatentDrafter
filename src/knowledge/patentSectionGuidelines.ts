import { SECTION_GUIDELINES_SUMMARY, SPECIFICATION_STYLE_RULES } from "@/knowledge/specificationStyleRules";
import { TITLE_GUIDELINE } from "@/prompts/guidelines/titleGuideline";
import { TECHNICAL_FIELD_GUIDELINE } from "@/prompts/guidelines/technicalFieldGuideline";
import { BACKGROUND_ART_GUIDELINE } from "@/prompts/guidelines/backgroundArtGuideline";
import { PROBLEM_GUIDELINE } from "@/prompts/guidelines/problemGuideline";
import { SOLUTION_GUIDELINE } from "@/prompts/guidelines/solutionGuideline";
import { EFFECT_GUIDELINE } from "@/prompts/guidelines/effectGuideline";
import { DRAWING_DESCRIPTION_GUIDELINE } from "@/prompts/guidelines/drawingDescriptionGuideline";
import { DETAILED_DESCRIPTION_GUIDELINE } from "@/prompts/guidelines/detailedDescriptionGuideline";
import { CLAIM_GUIDELINE } from "@/prompts/guidelines/claimGuideline";
import { ABSTRACT_GUIDELINE } from "@/prompts/guidelines/abstractGuideline";
import { REPRESENTATIVE_DRAWING_GUIDELINE } from "@/prompts/guidelines/representativeDrawingGuideline";
import { DRAWING_PROMPT_GUIDELINE } from "@/prompts/guidelines/drawingPromptGuideline";
import type { SpecificationSectionType } from "@/types/specificationSection";

export type PatentSectionGuidelines = Record<SpecificationSectionType, string>;

const GUIDELINE_MAP: PatentSectionGuidelines = {
  invention_title: TITLE_GUIDELINE,
  technical_field: TECHNICAL_FIELD_GUIDELINE,
  background_art: BACKGROUND_ART_GUIDELINE,
  problems_to_solve: PROBLEM_GUIDELINE,
  means_for_solving: SOLUTION_GUIDELINE,
  effects: EFFECT_GUIDELINE,
  brief_description_of_drawings: DRAWING_DESCRIPTION_GUIDELINE,
  detailed_description: DETAILED_DESCRIPTION_GUIDELINE,
  claim: CLAIM_GUIDELINE,
  summary: ABSTRACT_GUIDELINE,
  representative_drawing: REPRESENTATIVE_DRAWING_GUIDELINE,
  drawing_prompt: DRAWING_PROMPT_GUIDELINE
};

export function getSectionGuideline(sectionType: SpecificationSectionType): string {
  return GUIDELINE_MAP[sectionType];
}

export function getAllSectionGuidelines(): PatentSectionGuidelines {
  return { ...GUIDELINE_MAP };
}

export function getSectionGuidelinesSummary(): string {
  return SECTION_GUIDELINES_SUMMARY;
}

export function getFullSectionGuidelinesText(): string {
  return Object.entries(GUIDELINE_MAP)
    .map(([type, text]) => `--- ${type} ---\n${text}`)
    .join("\n\n");
}

export function getSpecificationStyleRules(): string {
  return SPECIFICATION_STYLE_RULES;
}
