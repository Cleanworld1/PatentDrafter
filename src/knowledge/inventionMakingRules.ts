import type { SpecificationSectionType } from "@/types/specificationSection";

/** 직접 입력 기반 발명 확장·구체화(발명 메이킹) 모드 */
export const INVENTION_MAKING_MODE_LABEL = "발명 메이킹";

export function isInventionMakingEnabled(
  value: boolean | undefined | null
): boolean {
  return Boolean(value);
}

const EMBODIMENT_WRITING_STRATEGY = `【발명 메이킹 — 작성 전략】
- 구성요소를 나열·펼쳐놓기만 하지 말고, **하나의 대표 실시예**를 처음부터 끝까지 아주 구체적·상세하게 서술하라.
- 그 실시예 안에서 각 구성의 역할, 결합 관계, 데이터·제어·동작 순서, 분기·예외를 **한 흐름**으로 연결하라.
- 【발명의 효과】·【과제의 해결 수단】·【구체적인 내용】은 "무엇이 있다"보다 **왜 그렇게 동작하는지 → 그래서 어떤 기술적 효과가 생기는지** 인과를 분명히 쓴다.
- 효과는 추상적 슬로건이 아니라, 앞선 구성·동작에서 **논리적으로 도출**되게 쓴다(예: "A가 B를 수행함으로써 C가 가능해진다").
- 변형예·추가 구성은 대표 실시예 뒤에 짧게 보탬. 본문의 중심은 **하나의 풍부한 실시예**다.`;

export function getInventionMakingRulesBlock(enabled: boolean | undefined): string {
  if (!isInventionMakingEnabled(enabled)) return "";

  return `[${INVENTION_MAKING_MODE_LABEL} — 활성]
제공된 기술 내용(직접 입력·업로드 자료)을 출발점으로, 특허 명세서·청구항·도면을 적극적으로 "만든다".

- 주어진 기술 분야·핵심 아이디어·문제·차별점에서 크게 벗어나지 않는 선에서, 구성·동작·실시예·도면을 추가·연결·구체화해도 된다.
- 권리범위·자료 원문 일치보다 명세서 완성도를 우선한다.
- 자료에 빠진 단계·모듈·연동 관계를 합리적으로 상상하여 보완한다.
- 기술 분야와 모순되거나 전혀 무관한 신규 산업·목적·제품군은 넣지 않는다.
- 구체적 수치·실험·성능 개선율 등 근거 없는 정량 주장은 만들지 말고, 구조·기능·동작 위주로 기재한다.

${EMBODIMENT_WRITING_STRATEGY}`;
}

export function getInventionAnalysisModeNotes(enabled: boolean | undefined): string {
  if (!isInventionMakingEnabled(enabled)) {
    return `- 자료에 없는 구체적 수치, 성능 개선율, 실험결과는 만들지 말라.
- 그림에서 명확하지 않은 구성은 단정하지 말고 "추정" 또는 "확인 필요"로 표시하라.
- 자료에 없는 구성·효과를 사실처럼 단정하지 말라.`;
  }

  return `- 발명 메이킹 모드: 분석표에 구성·흐름·실시예·도면·청구 포인트를 자료보다 풍부하게 도출하라.
- operation_flow·element_relationships는 **하나의 대표 실시예**가 실제로 어떻게 진행되는지 시간·데이터 순서로 구체화하라.
- expected_effects는 각 효과가 **어떤 구성·동작 때문에** 발생하는지 인과가 드러나게 쓴다.
- 구체적 수치·실험·성능 % 등 근거 없는 정량값은 만들지 말라.`;
}

export function getInventionMakingRegenerateNote(enabled: boolean | undefined): string {
  if (!isInventionMakingEnabled(enabled)) {
    return "- 입력자료에 없는 수치, 실험결과, 성능 개선율은 만들지 말라.";
  }
  return "- 발명 메이킹 모드: 구성 나열보다 **하나의 대표 실시예**를 매우 구체적으로 서술하고, 효과는 그 동작·구조에서 **논리적으로 연결**되게 쓴다. 근거 없는 수치·실험 결과는 만들지 말라.";
}

/** 항목별 재작성 시 발명 메이킹 추가 지시 */
export function getInventionMakingSectionNote(
  sectionType: SpecificationSectionType,
  enabled: boolean | undefined
): string {
  if (!isInventionMakingEnabled(enabled)) return "";

  switch (sectionType) {
    case "detailed_description":
      return `[발명 메이킹 — 구체적인 내용]
하나의 대표 실시예를 중심으로, 도면별·단계별로 **매우 상세**하게 기술하라. 구성 나열만 하지 말고, 초기 상태→주요 처리→결과까지 **연속된 시나리오**로 쓴다. 각 단계에서 어떤 구성이 어떤 데이터·제어를 주고받는지 명시하라.`;

    case "effects":
      return `[발명 메이킹 — 효과]
효과를 나열하지 말고, 대표 실시예의 구성·동작과 **인과적으로 연결**하여 쓴다. "～함으로써 ～할 수 있다" 형식으로, 앞선 해결 수단·구체적인 내용과 용어·논리를 맞춘다.`;

    case "means_for_solving":
      return `[발명 메이킹 — 해결 수단]
청구항 paraphrasing과 함께, **하나의 통합된 해결 구조**가 어떻게 문제를 해결하는지 흐름으로 풀어 쓴다. 구성만 펼치지 말고 상호 연결·동작 관계를 포함한다.`;

    case "problems_to_solve":
      return `[발명 메이킹 — 과제]
대표 실시예가 해결하려는 기술 과제가, 뒤의 구체적인 내용·효과와 **논리적으로 이어지도록** 간결히 쓴다.`;

    default:
      return "";
  }
}
