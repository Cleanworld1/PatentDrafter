/** 명세서 본문 줄바꿈 규칙 — 모든 생성·재작성 프롬프트에 포함 */
export const PATENT_SINGLE_LINE_BREAK_RULE = `- 문단·항목 구분에 빈 줄(연속 줄바꿈, \\n\\n)을 쓰지 말고 단일 줄바꿈(\\n)만 사용한다. 문장·항목 사이 이중 개행 금지.`;

export function getPatentLineBreakRulesBlock(): string {
  return `[명세서 줄바꿈 규칙]\n${PATENT_SINGLE_LINE_BREAK_RULE}`;
}
