import type { SpecificationDraft } from "@/types/patentDraft";

export function buildReviewSpecificationPrompt(specification: SpecificationDraft): string {
  return `당신은 국내 특허명세서 초안의 본문-청구항-도면 정합성을 검토하는 보조자입니다. 아래 초안에 대해 JSON만 출력하십시오.

검토 원칙:
- 청구항 필수 구성이 본문에 지지되는지 확인한다.
- 본문, 청구항, 도면 설명의 용어 일치 여부를 확인한다.
- 효과가 구성에서 인과적으로 도출되는지 확인한다.
- 과도하게 좁거나 추상적인 표현을 지적한다.
- 입력자료에 없는 내용을 사실처럼 단정한 부분이 있는지 확인한다.

명세서 초안: ${JSON.stringify(specification, null, 2)}

출력 JSON 구조:
{
  "claim_support_check": [],
  "term_consistency_check": [],
  "drawing_spec_consistency_check": [],
  "effect_causality_check": [],
  "over_narrowing_risk": [],
  "over_abstraction_risk": [],
  "additional_questions": []
}`;
}
