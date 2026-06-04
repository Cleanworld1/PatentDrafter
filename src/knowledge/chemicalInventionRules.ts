import { CHEMICAL_INVENTION_SPEC_PROMPT } from "@/knowledge/chemicalInventionPrompt";
import type { SpecificationSectionType } from "@/types/specificationSection";

export const CHEMICAL_INVENTION_MODE_LABEL = "화학 발명";

export function isChemicalInventionEnabled(value: boolean | undefined | null): boolean {
  return Boolean(value);
}

export function getChemicalInventionRulesBlock(enabled: boolean | undefined): string {
  if (!isChemicalInventionEnabled(enabled)) return "";

  return `[${CHEMICAL_INVENTION_MODE_LABEL} — 활성]
아래 지침을 명세서·청구항 작성의 최우선 참고 문서로 적용하라.

${CHEMICAL_INVENTION_SPEC_PROMPT}`;
}

export function getChemicalInventionRegenerateNote(enabled: boolean | undefined): string {
  if (!isChemicalInventionEnabled(enabled)) return "";

  return `- 화학 발명 모드: 실험예·비교예·측정방법·수치범위·임계적 효과·HTML 표 형식을 [화학 발명 지침]에 맞게 기재하라. 입력 자료에 없는 측정값은 단정하지 말되, OA 보정을 고려해 조건·조성·공정 범위는 폭넓게 기재하라.`;
}

/** 항목별 재작성 시 화학 발명 추가 지시 */
export function getChemicalInventionSectionNote(
  sectionType: SpecificationSectionType,
  enabled: boolean | undefined
): string {
  if (!isChemicalInventionEnabled(enabled)) return "";

  switch (sectionType) {
    case "detailed_description":
      return `[화학 발명 — 구체적인 내용]
실시예·비교예를 구분하고, 공정 단계·시약·투입 기준·측정방법을 구체적으로 기재하라. 실험 데이터는 HTML <table>과 <caption>으로 정리하고, 표 아래에 임계적 효과·수치범위 대응 해석을 작성하라.`;

    case "effects":
      return `[화학 발명 — 효과]
"구성 → 작용 → 데이터 → 효과" 순으로, 청구항 구성과 대응되게 기재하라. 추상적 우수성 표현은 피하고 자료·실시예에서 도출 가능한 효과만 쓴다.`;

    case "means_for_solving":
      return `[화학 발명 — 해결 수단]
처리 대상·시약·공정 조건·분리 조건을 유기적으로 연결하여 기재하라. 청구항에 들어갈 조합은 본문에 명시적으로 한 문단으로도 기재하라.`;

    case "problems_to_solve":
      return `[화학 발명 — 과제]
불순물·공정 문제·설비 막힘 등 화학·공정 맥락의 기술 과제를 구체적으로 기재하라.`;

    case "claim":
      return `[화학 발명 — 청구항]
독립항에 핵심 조합을, 종속항은 처리 대상→시약→조건→결과 물성 순으로 단계 한정하라. 명세서·실시예에 없는 수치·물질·측정방법은 청구항에 새로 넣지 말라.`;

    case "background_art":
      return `[화학 발명 — 배경기술]
종래 공정·조성·불순물 문제를 구체적으로 기재하고, 본 발명 과제와의 대비가 드러나게 작성하라.`;

    default:
      return "";
  }
}
