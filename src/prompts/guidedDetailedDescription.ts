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

/** 말미만 생성 — 기존 본문은 출력하지 않음 (클라이언트에서 이어 붙임) */
export function buildDetailedOutroOnlyInstruction(analysis: InventionAnalysis): string {
  return `【발명을 실시하기 위한 구체적인 내용】의 말미(결론·변형·적용 가능성)만 작성하라.

요구사항:
- 도입부·도면별 설명은 이미 앞에 작성되어 있으므로 반복·요약하지 말고, 말미 문단만 출력하라.
- 변형 실시예, 적용 가능성, "일 실시예에 따르면" 형식의 마무리를 포함하라.
- 발명 요지: ${analysis.one_line_summary}
- ${SHARED_RULES}`;
}
