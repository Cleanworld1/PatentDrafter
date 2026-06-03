import { PATENT_SINGLE_LINE_BREAK_RULE } from "@/knowledge/patentLineBreakRules";
import type { SpecificationSectionType } from "@/types/specificationSection";
import { sectionIdToType } from "@/types/specificationSection";

/** 다시 작성·더 구체화 시 심사관 제출용 명세서 품질 규칙 */
export const PATENT_EXAMINER_GLOBAL_RULES = `【심사관 제출용 명세서 — 전 항목 공통】
0. 목차 제목 생략: UI 목차에 이미 있는 【…】 형식 항목 제목을 본문에 다시 쓰지 말라. 본문은 제목 없이 기술 내용부터 시작한다.
0-1. 줄바꿈: ${PATENT_SINGLE_LINE_BREAK_RULE.replace(/^- /, "")}
1. 자료 출처 표현 금지: "업로드 자료에 따르면", "카탈로그에서는", "PDF N쪽", "제출 자료", "첨부 문서", "발명자가 제공한" 등 내부 참고 자료·파일·페이지를 드러내는 표현은 절대 쓰지 말라. 분석표·자료는 작성 참고용일 뿐이며, 명세서 본문은 발명 자체의 기술 설명만 기재한다.
2. 배경기술(【발명의 배경이 되는 기술】)을 제외한 모든 항목: 종래기술·선행을 설명할 때도 "종래에는", "기존 기술은", "선행 기술에 따르면" 같은 종래기술 서술 티를 내지 말고, 본 발명의 일 실시예·구성·동작을 서술하는 것과 같은 문체(객관·단정, "일 실시예에 따르면", "포함할 수 있다")로 쓴다.`;

const SECTION_EXAMINER_RULES: Partial<Record<SpecificationSectionType, string>> = {
  background_art: `【배경기술 전용】
- 선행문헌·종래기술 인용은 통상 1건만 명시한다.
- 권장 형식 예: "이와 관련하여 대한민국 특허공개공보 제○○○○○○호가 있다." (공보 번호는 분석표·자료에 있을 때만, 없으면 "선행문헌이 개시되어 있다" 등 일반 표현 또는 생략)
- 여러 선행을 나열·비교·상세 인용하지 말라. 배경은 간결히 종래 상황·한계만 서술한다.`,

  problems_to_solve: `【해결하고자 하는 과제 전용】
- 전체 분량은 약 3줄(3문장 전후)로 제한한다. 장문·다단 목적 나열 금지.
- "본 발명의 목적은 …" 형태 1~2문장으로 핵심 기술 과제만 기재한다.`,

  means_for_solving: `【과제의 해결 수단 전용】
- 작성된 모든 청구항 내용을 명세서 문체로 paraphrasing(의미 동일, 표현은 본문용)하여 기재한다.
- "필수 구성으로서", "필수적으로 포함하는" 등 청구항 티가 나는 군더더기 표현은 넣지 말라.
- 청구항과 동일한 용어·논리 순서를 유지하되, 자연스러운 해결 수단 서술로 풀어 쓴다.`,

  detailed_description: `【구체적인 내용 전용】
- 도면·구성 설명도 자료 출처 표현 없이 일 실시예 문체로 쓴다.
- 종래기술 대비 서술이 필요해도 비교·인용 문구 대신 본 발명 실시 형태로 기술한다.`,

  summary: `【요약 전용】
- 3줄 내외로 간결히. 자료 출처 표현 금지.`,

  claim: `【청구항 전용】
- 자료·파일·페이지 언급 금지.
- "청구항 N." / "청구항 N:" / "【청구항 N】" 머리말 금지. 독립항은 "…에 있어서,"로 시작. 종속항만 "청구항 M에 있어서," 허용.`
};

export function getPatentExaminerRulesForSection(
  sectionType: SpecificationSectionType
): string {
  const specific = SECTION_EXAMINER_RULES[sectionType];
  if (specific) {
    return `${PATENT_EXAMINER_GLOBAL_RULES}\n\n${specific}`;
  }
  return PATENT_EXAMINER_GLOBAL_RULES;
}

export function getPatentExaminerRulesForSectionId(sectionId: string): string {
  return getPatentExaminerRulesForSection(sectionIdToType(sectionId));
}

/** regenerate / 다시 작성·더 구체화 프롬프트에 삽입할 블록 */
export function getPatentExaminerRulesBlock(sectionType: SpecificationSectionType): string {
  return `[심사관 관점 필수 작성 규칙 — 반드시 준수]\n${getPatentExaminerRulesForSection(sectionType)}`;
}

export function getPatentExaminerRulesBlockBySectionId(sectionId: string): string {
  return getPatentExaminerRulesBlock(sectionIdToType(sectionId));
}
