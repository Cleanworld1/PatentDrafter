import {
  getAllSectionGuidelines,
  getFullSectionGuidelinesText,
  getSectionGuidelinesSummary,
  getSpecificationStyleRules,
  type PatentSectionGuidelines
} from "@/knowledge/patentSectionGuidelines";
import { getInventionMakingRulesBlock } from "@/knowledge/inventionMakingRules";
import type { DraftOptions, GenerateSpecOptions, InventionAnalysis } from "@/types/patentDraft";

export interface GenerateSpecificationPromptInput {
  analysis: InventionAnalysis;
  options: GenerateSpecOptions | DraftOptions;
  sectionGuidelines?: PatentSectionGuidelines;
}

function normalizeSpecOptions(options: GenerateSpecOptions | DraftOptions): GenerateSpecOptions {
  if ("desiredClaimCount" in options) {
    return options as GenerateSpecOptions;
  }
  const draft = options as DraftOptions;
  return {
    desiredClaimCount: draft.claimCount,
    desiredDrawingCount: draft.drawingCount
  };
}

export function buildGenerateSpecificationPrompt(input: GenerateSpecificationPromptInput): string {
  const { analysis } = input;
  const options = normalizeSpecOptions(input.options);
  const guidelines = input.sectionGuidelines ?? getAllSectionGuidelines();
  const inventionMaking =
    "inventionMakingEnabled" in input.options
      ? Boolean((input.options as DraftOptions).inventionMakingEnabled)
      : false;

  return `당신은 국내 특허출원용 명세서 초안 작성 보조자입니다. 발명 분석표를 바탕으로 명세서 초안 JSON만 출력하십시오.

각 명세서 항목은 서로 다른 작성 목적을 가지므로, 항목별 작성 지침을 반드시 따르십시오.

${getSpecificationStyleRules()}

[항목별 작성 목적 요약]
${getSectionGuidelinesSummary()}

[항목별 상세 작성 지침]
${getFullSectionGuidelinesText()}

${getInventionMakingRulesBlock(inventionMaking)}

요구 청구항 수: ${options.desiredClaimCount}
요구 도면 수: ${options.desiredDrawingCount}

발명 분석표:
${JSON.stringify(analysis, null, 2)}

항목별 핵심 참조 (요약):
- invention_title: ${guidelines.invention_title.slice(0, 120)}…
- means_for_solving: 청구항 1 핵심 구성 반드시 포함
- detailed_description: 청구항 1 각 구성 상세 뒷받침
- claims: ${guidelines.claim.slice(0, 120)}…

출력 JSON 키:
invention_title, technical_field, background_art, problems_to_solve, means_for_solving, effects, brief_description_of_drawings, detailed_description, summary, representative_drawing, claims (배열: claim_number, category, text, dependency?), drawing_prompts (배열: figure_number, title, drawing_type, purpose, required_elements, relative_layout, arrows_or_connections, reference_number_guidance, style_instruction)`;
}

/** @deprecated analysis, options 개별 인자 — 객체 입력 권장 */
export function buildGenerateSpecificationPromptLegacy(
  analysis: InventionAnalysis,
  options: GenerateSpecOptions
): string {
  return buildGenerateSpecificationPrompt({ analysis, options });
}
