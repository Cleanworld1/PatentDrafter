import { PATENT_SINGLE_LINE_BREAK_RULE } from "@/knowledge/patentLineBreakRules";
import type { InventionAnalysis } from "@/types/patentDraft";

const SHARED_RULES = `${PATENT_SINGLE_LINE_BREAK_RULE} "업로드 자료", "PDF", "카탈로그" 등 출처 표현 금지. 【…】 항목 제목은 출력하지 말고 본문만 작성.`;

export function buildDetailedIntroInstruction(): string {
  return `【발명을 실시하기 위한 구체적인 내용】의 도입부만 작성하라.

요구사항:
- "이하에서는 첨부된 도면을 참조하여 …" 형식으로 시작하고, 실시예 전개를 예고하라.
- 아직 개별 도면(도 1, 도 2 …)에 대한 상세 설명은 쓰지 말라.
- 발명의 핵심 요지를 2~4문단으로 소개하라.
- ${SHARED_RULES}`;
}

export function buildDetailedOutroInstruction(
  currentContent: string,
  analysis: InventionAnalysis
): string {
  return `아래 [현재까지 작성된 구체적인 내용] 뒤에 이어서 말미(결론·변형·청구범위 지지) 부분만 작성하라.

요구사항:
- 이미 작성된 도입부·도면별 설명은 반복하지 말고, 이어서만 작성하라.
- 변형 실시예, 적용 가능성, "일 실시예에 따르면" 형식의 마무리를 포함하라.
- 발명 요지: ${analysis.one_line_summary}
- ${SHARED_RULES}

[현재까지 작성된 구체적인 내용]
${currentContent.slice(0, 12000) || "(비어 있음)"}`;
}

export function buildDetailedFigureAppendInstruction(
  figureNumber: number,
  figureText: string,
  currentContent: string
): string {
  return `아래 [도 ${figureNumber} 설명]을 [현재 본문]에 자연스럽게 통합한 【발명을 실시하기 위한 구체적인 내용】 전체 본문을 출력하라.

요구사항:
- [현재 본문]을 유지하고 [도 ${figureNumber} 설명]을 적절한 위치에 삽입·융합하라.
- 도 ${figureNumber} 설명은 "도 ${figureNumber}은(는) …" 형식으로 시작하게 하라.
- 다른 도면 번호에 대한 새로운 설명은 추가하지 말라.
- ${SHARED_RULES}

[현재 본문]
${currentContent.slice(0, 12000) || "(비어 있음)"}

[도 ${figureNumber} 설명]
${figureText}`;
}
