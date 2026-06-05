import type { FullDraftResult, SpecificationDraft } from "@/types/patentDraft";

export function formatSpecificationMarkdown(specification: SpecificationDraft): string {
  const lines: string[] = [];
  lines.push(`## 【발명의 명칭】\n${specification.invention_title}`);
  lines.push(`## 【기술분야】\n${specification.technical_field}`);
  lines.push(`## 【발명의 배경이 되는 기술】\n${specification.background_art}`);
  lines.push(`## 【해결하고자 하는 과제】\n${specification.problems_to_solve}`);
  lines.push(`## 【과제의 해결 수단】\n${specification.means_for_solving}`);
  lines.push(`## 【발명의 효과】\n${specification.effects}`);
  lines.push(`## 【도면의 간단한 설명】\n${specification.brief_description_of_drawings}`);
  lines.push(`## 【발명을 실시하기 위한 구체적인 내용】\n${specification.detailed_description}`);

  for (const claim of specification.claims) {
    lines.push(`## 【청구항 ${claim.claim_number}】\n${claim.text}`);
  }

  lines.push(`## 【요약】\n${specification.summary}`);
  lines.push(`## 【대표도】\n${specification.representative_drawing}`);

  for (const drawing of specification.drawing_prompts) {
    lines.push(`## 【도 ${drawing.figure_number}】\n${drawing.title}\n\n${drawing.purpose}`);
  }

  return `${lines.join("\n\n")}\n`;
}

export function formatFullDraftMarkdown(result: Omit<FullDraftResult, "markdown">): string {
  return [
    `# ${result.specification.invention_title || "특허명세서 초안"}`,
    "## 발명 분석표",
    "```json",
    JSON.stringify(result.analysis, null, 2),
    "```",
    formatSpecificationMarkdown(result.specification),
    "## 도면 생성 프롬프트",
    "```json",
    JSON.stringify(result.drawing_prompts, null, 2),
    "```",
    "## 정합성 검토",
    "```json",
    JSON.stringify(result.review, null, 2),
    "```"
  ].join("\n\n");
}
