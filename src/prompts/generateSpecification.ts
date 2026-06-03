import type { GenerateSpecOptions, InventionAnalysis } from "@/types/patentDraft";

export function buildGenerateSpecificationPrompt(analysis: InventionAnalysis, options: GenerateSpecOptions): string {
  return `당신은 국내 특허출원용 명세서 초안 작성 보조자입니다. 발명 분석표를 바탕으로 명세서 초안 JSON만 출력하십시오.

원칙:
- 사용자가 제공한 자료 또는 발명 분석표에 없는 구체적 수치, 성능 개선율, 실험결과는 임의 생성하지 않는다.
- 일반화, 선택적 실시예, 변형예는 "포함할 수 있다", "일 실시예에 따르면"으로 표현한다.
- 청구항 1의 필수 구성은 본문에 충분히 기재한다.
- 발명의 효과는 구성과 효과의 인과관계가 드러나게 작성한다.
- 본문, 청구항, 도면 설명의 용어를 일치시킨다.
- 광고성, 마케팅성 문구는 배제한다.
- "완성된 명세서"가 아니라 검토·수정 가능한 "초안" 문체를 유지한다.

요구 청구항 수: ${options.desiredClaimCount}
요구 도면 수: ${options.desiredDrawingCount}
발명 분석표: ${JSON.stringify(analysis, null, 2)}

출력 JSON 키:
invention_title, technical_field, background_art, problems_to_solve, means_for_solving, effects, brief_description_of_drawings, detailed_description, summary, representative_drawing, claims, drawing_prompts`;
}
