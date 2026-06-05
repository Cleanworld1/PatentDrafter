import type { SpecificationSectionType } from "@/types/specificationSection";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import { isInventionMakingEnabled } from "@/knowledge/inventionMakingRules";

export const CHEMICAL_INVENTION_MAKING_MODE_LABEL = "화학 발명 + 발명 메이킹";

export function isChemicalInventionMakingMode(
  chemicalInventionEnabled: boolean | undefined,
  inventionMakingEnabled: boolean | undefined
): boolean {
  return (
    isChemicalInventionEnabled(chemicalInventionEnabled) &&
    isInventionMakingEnabled(inventionMakingEnabled)
  );
}

const COMBINED_CORE_BLOCK = `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 복합 모드]
화학 발명 지침과 발명 메이킹이 동시에 활성이다. 【발명을 실시하기 위한 구체적인 내용】 중심으로 아래를 반드시 반영하라.

■ 실험예·비교예
- 실험예(실시예)와 비교예를 구분하여 서술한다.
- 비교예: 무처리·핵심 시약/공정 생략·선행 유사 조건·수치한정 **하한 미만**·**상한 초과** 등을 포함한다.
- 실험예: 청구항·해결 수단의 수치한정범위 **하한·바람직한 범위·상한** 부근 조건을 포함한다.

■ 수치한정
- 【과제의 해결 수단】·청구항에 들어갈 **수치한정 요소**(파라미터명, 단위, 측정·산출 기준, 전체/바람직한 범위)를 먼저 정합한다.
- 실험·측정값은 그 **수치한정범위**를 기준으로, 범위 **내**와 **외**(하한 미만, 상한 초과)에서 효과·성능이 **임계적으로** 달라지도록 설계한다(단순 최적화 곡선이 아니라 경계에서의 급격한 변화·실무상 한계가 드러나게).
- 각 표 아래에 "왜 하한/상한에서 효과가 달라지는지" 임계적 의의를 해석한다.

■ 실험·비교 표 (HTML, 2~3개)
- 실험예/비교예 데이터를 HTML <table>과 <caption>으로 **2개 이상 3개 내외** 작성한다.
  · [표 1] 실시예·비교예 구분, 조성·공정 조건(수치한정 파라미터 포함)
  · [표 2] 측정 결과·분석값(하한 미만/범위 내/상한/상한 초과 등 비교열 포함)
  · [표 3] (선택) 효과·성능·공정성 지표 종합 비교 또는 경계값 대비 해석용
- 표 제목 예: "[표 1] 실시예 및 비교예의 공정 조건", "[표 2] 수치한정 파라미터별 측정 결과"
- 업로드 자료에 실험·표 데이터가 있으면 우선 반영·보강하고, 부족한 경우에도 발명 논리·수치한정범위와 **모순 없는** 대표 실험·비교 시나리오를 구체적으로 구성한다(OA·실시가능·수치한정 심사 대비).
- 무관 분야 수치·허위 측정방법·청구항/명세에 없는 파라미터를 표·청구항에 새로 넣지 말라.`;

export function getChemicalInventionMakingRulesBlock(
  chemicalInventionEnabled: boolean | undefined,
  inventionMakingEnabled: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(chemicalInventionEnabled, inventionMakingEnabled)) {
    return "";
  }
  return COMBINED_CORE_BLOCK;
}

export function getChemicalInventionMakingAnalysisNotes(
  chemicalInventionEnabled: boolean | undefined,
  inventionMakingEnabled: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(chemicalInventionEnabled, inventionMakingEnabled)) {
    return "";
  }
  return `- ${CHEMICAL_INVENTION_MAKING_MODE_LABEL}: 분석표의 table_or_experiment_data_analysis·control_conditions·expected_effects에 **수치한정 후보 파라미터**(단위·측정 기준·권장 하한·상한), **실험예·비교예 설계**(무처리/하한 미만/범위 내/상한/상한 초과), 표 2~3개에 필요한 **열·행 구조·측정 지표**를 구체적으로 기재하라.`;
}

export function getChemicalInventionMakingRegenerateNote(
  chemicalInventionEnabled: boolean | undefined,
  inventionMakingEnabled: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(chemicalInventionEnabled, inventionMakingEnabled)) {
    return "";
  }
  return `- ${CHEMICAL_INVENTION_MAKING_MODE_LABEL}: 실험예·비교예를 구분하고, 수치한정범위 내·외에서 임계적 효과가 보이도록 수치를 배치하라. HTML 표 2~3개와 표 하단 해석을 포함하라.`;
}

/** 항목별 재작성 — 복합 모드 추가 지시 */
export function getChemicalInventionMakingSectionNote(
  sectionType: SpecificationSectionType,
  chemicalInventionEnabled: boolean | undefined,
  inventionMakingEnabled: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(chemicalInventionEnabled, inventionMakingEnabled)) {
    return "";
  }

  switch (sectionType) {
    case "detailed_description":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 구체적인 내용]
대표 실시예 흐름 안에 실험예·비교예를 단락으로 구분하고, 수치한정 파라미터별로 하한 미만·범위 내·상한·상한 초과 조건을 대비시켜 서술하라. HTML 표 2~3개(조건표·결과표·효과 비교표)와 각 표 아래 임계적 의의 해석을 반드시 포함하라.`;

    case "means_for_solving":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 해결 수단]
청구항과 맞물릴 **수치한정 요소**(범위·단위·측정 기준)를 명시하고, 후속 실험예·비교예·표에서 다룰 파라미터와 일치시켜라.`;

    case "effects":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 효과]
표·실험예에서 확인된 데이터를 인용하여, 수치한정범위 내 조건에서의 효과와 범위 밖(하한 미만·상한 초과)에서의 한계를 대비하여 기재하라.`;

    case "claim":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 청구항]
독립·종속항에 수치한정을 단계적으로 넣되, 명세서 실험예·비교예·표에 기재할 범위·단위·측정 기준과 **동일 체계**로 작성하라.`;

    case "problems_to_solve":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 과제]
수치한정 파라미터가 범위를 벗어날 때 발생하는 공정·품질·안정성 문제를 구체적으로 기재하라.`;

    default:
      return "";
  }
}
