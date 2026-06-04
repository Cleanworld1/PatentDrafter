import type { SpecificationSectionType } from "@/types/specificationSection";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import { isInventionMakingEnabled } from "@/knowledge/inventionMakingRules";

export const CHEMICAL_INVENTION_MAKING_MODE_LABEL = "화학 발명 + 발명 메이킹";

export function isChemicalInventionMakingMode(
  inventionMaking: boolean | undefined | null,
  chemicalInvention: boolean | undefined | null
): boolean {
  return isInventionMakingEnabled(inventionMaking) && isChemicalInventionEnabled(chemicalInvention);
}

const COMBINED_SPEC_RULES = `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 동시 활성, 최우선 적용]

화학 발명 지침과 발명 메이킹을 함께 켠 경우, 【발명을 실시하기 위한 구체적인 내용】 및 관련 항목에 **실험예·비교예·수치한정**을 반드시 포함한다.
입력 자료에 실험 데이터가 없어도, 발명 분석·청구항·해결 수단과 **논리적으로 일치**하는 실험 설계·측정값을 **합리적으로 구성**하여 기재할 수 있다(단, 측정 단위·지표·공정 조건은 발명 맥락과 모순되지 않게).

## 수치한정 설계
- 청구항 또는 본문에 **수치한정 범위**(전체 범위, 바람직한 범위, 더 바람직한 범위)를 명시하라.
- 실험값은 그 범위를 기준으로 **내·외에서 임계적 의의**가 드러나게 배치하라.
  - **비교예**: 하한 미만, 상한 초과, 핵심 시약·공정 생략, 선행과 유사 조건 등 → 효과 불충분·부작용·공정성 저하
  - **실시예(실험예)**: 범위 내(특히 하한·바람직한 범위·상한 근처) → 효과 개시·균형·실용 조건 확인
- "경계값에서 효과가 급격히 변한다"는 해석을 표 아래 문단에서 **수치와 함께** 설명하라.

## 실험예·비교예 본문
- 실험예(실시예)와 비교예를 **명확히 구분**하여 서술하라(제목 또는 단락으로 구분).
- 각 예에는: 원료·조성, 투입량·투입 기준, 공정 조건(온도·시간·pH 등), 측정 방법·장비, 측정값, 결과 해석을 포함하라.
- 비교예는 최소 **무처리 또는 선행 유사**, **수치한정 하한 미만**, **상한 초과**를 포함하도록 설계하라.

## HTML 표 (2~3개 필수)
【구체적인 내용】에 **HTML <table>과 <caption>을 사용한 표를 2개 이상 3개 이하** 포함하라. 권장 구성:

| 표 | 제목 예시 | 내용 |
| 1 | [표 1] 실시예 및 비교예의 공정·조성 조건 | 실시예/비교예 구분, 핵심 변수(투입량·농도·온도 등), 수치한정 범위 대비 위치(범위 내/하한 미만/상한 초과) |
| 2 | [표 2] 측정 결과 | 발명 효과와 직결되는 지표(순도, 수율, 농도, 물성, 전기화학 성능 등)의 **실측값** |
| 3 | (선택) [표 3] 수치한정·임계 효과 요약 | 변수 구간별 대표 측정값·효과 경향·임계점 해석 |

각 표 직후에 **2~4문장**으로: (1) 범위 내·외 차이 (2) 임계적 의의 (3) 청구항 수치한정과의 대응 — 을 기재하라.

## 청구항·효과·해결 수단 연동
- 【과제의 해결 수단】【발명의 효과】는 위 실험·표에서 도출된 **인과(조건→데이터→효과)** 와 용어·수치를 맞추라.
- 【청구항】의 수치한정은 표·실시예에 **기재된 값·범위**와 모순되지 않게 하고, 종속항으로 바람직한 범위·측정 방법을 한정하라.`;

export function getChemicalInventionMakingCombinedBlock(
  inventionMaking: boolean | undefined,
  chemicalInvention: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(inventionMaking, chemicalInvention)) return "";
  return COMBINED_SPEC_RULES;
}

export function getChemicalInventionMakingRegenerateNote(
  inventionMaking: boolean | undefined,
  chemicalInvention: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(inventionMaking, chemicalInvention)) return "";

  return `- ${CHEMICAL_INVENTION_MAKING_MODE_LABEL}: 실험예·비교예·수치한정(범위 내·외 임계 효과)을 반영하고, HTML 표 2~3개(<table>, <caption>)와 표 하단 해석을 포함하라.`;
}

export function getChemicalInventionMakingSectionNote(
  sectionType: SpecificationSectionType,
  inventionMaking: boolean | undefined,
  chemicalInvention: boolean | undefined
): string {
  if (!isChemicalInventionMakingMode(inventionMaking, chemicalInvention)) return "";

  switch (sectionType) {
    case "detailed_description":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 구체적인 내용]
실험예 2개 이상·비교예 2개 이상을 구분하여 상세 서술하라. 수치한정 범위의 **하한 미만·범위 내·상한 초과** 조건에서 측정값이 **임계적으로** 달라지도록 설계하라.
HTML <table> 2~3개(조건표·결과표·수치한정 요약표 중 선택)와 <caption>, 각 표 아래 임계 효과 해석을 반드시 포함하라.`;

    case "effects":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 효과]
표·실험예에서 확인된 측정값 변화를 근거로, 수치한정 범위 내에서만 달성되는 효과·범위 밖에서의 한계를 **인과적으로** 기재하라.`;

    case "means_for_solving":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 해결 수단]
수치한정 변수(투입량·농도·온도·비율 등)와 공정 단계를 명시하고, 뒤 실험예·표의 조건과 일치시키라.`;

    case "claim":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 청구항]
독립항·종속항에 수치한정 범위를 두고, 실시예·표에 기재한 값·단위·측정 방법과 **동일 체계**로 한정하라.`;

    case "problems_to_solve":
      return `[${CHEMICAL_INVENTION_MAKING_MODE_LABEL} — 과제]
수치한정 변수가 범위를 벗어날 때 발생하는 공정·품질·안정성 문제를 구체적으로 기재하라.`;

    default:
      return "";
  }
}
