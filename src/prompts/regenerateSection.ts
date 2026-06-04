import {
  getChemicalInventionRegenerateNote,
  getChemicalInventionRulesBlock,
  getChemicalInventionSectionNote
} from "@/knowledge/chemicalInventionRules";
import {
  getChemicalInventionMakingRegenerateNote,
  getChemicalInventionMakingCombinedBlock,
  getChemicalInventionMakingSectionNote
} from "@/knowledge/chemicalInventionMakingRules";
import { getInventionMakingRegenerateNote, getInventionMakingRulesBlock, getInventionMakingSectionNote } from "@/knowledge/inventionMakingRules";
import { getPatentExaminerRulesBlock } from "@/knowledge/patentExaminerDraftingRules";
import { getPatentLineBreakRulesBlock } from "@/knowledge/patentLineBreakRules";
import { getSectionGuideline } from "@/knowledge/patentSectionGuidelines";
import {
  formatCurrentDrawingContextBlock,
  getDrawingCountMatchRule,
  type CurrentDrawingContext
} from "@/lib/drawingContextForRegenerate";
import { getSectionOutputNoHeadingRule } from "@/lib/sectionOutputSanitizer";
import type { ClaimDraft, InventionAnalysis } from "@/types/patentDraft";
import type { SpecificationSectionType } from "@/types/specificationSection";

export interface RegenerateSectionPromptInput {
  sectionType: SpecificationSectionType;
  sectionTitle: string;
  currentContent: string;
  analysis: InventionAnalysis;
  relatedClaims?: ClaimDraft[];
  userInstruction?: string;
  inventionMakingEnabled?: boolean;
  chemicalInventionEnabled?: boolean;
  /** 명세서 편집기에 있는 현재 도면 목록·개수 */
  drawingContext?: CurrentDrawingContext;
}

export function buildRegenerateSectionPrompt(input: RegenerateSectionPromptInput): string {
  const claimsText =
    input.relatedClaims && input.relatedClaims.length > 0
      ? input.relatedClaims.map((c) => `청구항 ${c.claim_number} (${c.category}): ${c.text}`).join("\n")
      : "(없음)";

  const guideline = getSectionGuideline(input.sectionType);
  const drawingBlock = input.drawingContext
    ? `\n\n${formatCurrentDrawingContextBlock(input.drawingContext)}`
    : "";
  const drawingCountRule =
    input.drawingContext &&
    (input.sectionType === "brief_description_of_drawings" ||
      input.sectionType === "detailed_description")
      ? `\n\n${getDrawingCountMatchRule(input.sectionType, input.drawingContext)}`
      : "";

  return `너는 국내 특허명세서의 특정 항목을 보완 작성하는 AI이다.

[대상 항목]
${input.sectionTitle}

[현재 내용]
${input.currentContent || "(비어 있음)"}

[발명 분석표]
${JSON.stringify(input.analysis, null, 2)}

[관련 청구항]
${claimsText}${drawingBlock}${drawingCountRule}

[사용자 요청]
${input.userInstruction || "현재 내용을 발명 분석표와 작성 지침에 맞게 보완·개선하라."}

[작성 지침]
${guideline}

${getPatentExaminerRulesBlock(input.sectionType)}

${getPatentLineBreakRulesBlock()}

${getInventionMakingRulesBlock(input.inventionMakingEnabled)}

${getInventionMakingSectionNote(input.sectionType, input.inventionMakingEnabled)}

${getChemicalInventionRulesBlock(input.chemicalInventionEnabled)}

${getChemicalInventionMakingCombinedBlock(
  input.inventionMakingEnabled,
  input.chemicalInventionEnabled
)}

${getChemicalInventionSectionNote(input.sectionType, input.chemicalInventionEnabled)}

${getChemicalInventionMakingSectionNote(
  input.sectionType,
  input.inventionMakingEnabled,
  input.chemicalInventionEnabled
)}

위 정보를 바탕으로 대상 항목만 다시 작성하라.

주의:
- 다른 항목은 출력하지 말라.
- 현재 내용의 장점을 유지하되, 사용자 요청에 맞게 보완하라.
- 청구항과 용어가 일치하도록 작성하라.
${getInventionMakingRegenerateNote(input.inventionMakingEnabled)}
${getChemicalInventionRegenerateNote(input.chemicalInventionEnabled)}
${getChemicalInventionMakingRegenerateNote(
  input.inventionMakingEnabled,
  input.chemicalInventionEnabled
)}
- 국내 특허명세서 문체를 사용하라.
- 심사관 관점 필수 규칙을 최우선으로 적용하라.
${getSectionOutputNoHeadingRule(input.sectionTitle)}

출력 형식: 대상 항목 본문만 평문(한국어)으로 반환하라. JSON 객체·키·중괄호·따옴표로 감싼 구조는 절대 출력하지 말라. 【…】 형식의 항목 제목·소제목은 출력하지 말라.
${input.sectionType === "drawing_prompt" ? "도면 생성용 텍스트 프롬프트이므로 title/purpose 등 필드명 없이 읽기 쉬운 설명문만 작성하라." : ""}
${input.sectionType === "claim" ? "청구항 본문만 출력하라. 목차에 이미 【청구항 N】이 있으므로 \"청구항 N.\" / \"청구항 N:\" 머리말은 쓰지 말고, 독립항은 \"…에 있어서,\"로 바로 시작하라." : ""}`;
}
