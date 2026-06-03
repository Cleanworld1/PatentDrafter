/** 도면 프롬프트·참조부호 작성 시 AI·편집자 공통 규칙 */
export const DRAWING_REFERENCE_NUMBER_RULES = `- 참조부호 일관성: 동일 참조번호(부호)는 항상 동일한 하나의 구성요소만 가리킨다. 같은 번호가 서로 다른 구성을 가리키면 안 된다.
- 중복 지지 금지: 동일 구성요소를 여러 참조선·여러 참조번호로 중복 표시하지 않는다. 한 구성에는 하나의 참조번호만 부여한다.
- reference_number_guidance에 위 원칙을 명시하고, 필수 구성요소 목록과 부호 매핑을 1:1로 기재한다.`;

export function getDrawingReferenceNumberRulesBlock(): string {
  return `[참조부호 필수 규칙]\n${DRAWING_REFERENCE_NUMBER_RULES}`;
}
