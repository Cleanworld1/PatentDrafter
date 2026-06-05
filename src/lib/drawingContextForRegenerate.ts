import { getDrawingSectionNumbers } from "@/lib/specificationSectionOrder";
import type { DrawingPrompt, SpecificationSection } from "@/types/patentDraft";

export interface CurrentDrawingEntry {
  figure_number: number;
  title: string;
  drawing_type?: string;
  purpose?: string;
  prompt_excerpt?: string;
}

export interface CurrentDrawingContext {
  drawingCount: number;
  figureNumbers: number[];
  drawings: CurrentDrawingEntry[];
}

export function buildCurrentDrawingContext(
  sections: SpecificationSection[],
  drawingPrompts: DrawingPrompt[]
): CurrentDrawingContext {
  const figureNumbers = getDrawingSectionNumbers(sections);
  const drawings: CurrentDrawingEntry[] = figureNumbers.map((n) => {
    const prompt = drawingPrompts.find((d) => d.figure_number === n);
    const section = sections.find((s) => s.section_id === `drawing_${n}`);
    const excerpt = section?.content?.trim()
      ? section.content.trim().slice(0, 400) + (section.content.length > 400 ? "…" : "")
      : undefined;
    return {
      figure_number: n,
      title: prompt?.title?.trim() || `도면 ${n}`,
      drawing_type: prompt?.drawing_type,
      purpose: prompt?.purpose?.trim() || undefined,
      prompt_excerpt: excerpt
    };
  });

  return {
    drawingCount: figureNumbers.length,
    figureNumbers,
    drawings
  };
}

export function formatCurrentDrawingContextBlock(ctx: CurrentDrawingContext): string {
  if (ctx.drawingCount === 0) {
    return `[현재 명세서 도면 구성]
현재 편집기에 등록된 도면 섹션이 없습니다. 도면이 없으면 해당 항목은 비우거나 도면 추가 후 다시 작성하라.`;
  }

  const lines = ctx.drawings.map((d) => {
    const parts = [`도 ${d.figure_number}: ${d.title}`];
    if (d.drawing_type) parts.push(`유형 ${d.drawing_type}`);
    if (d.purpose) parts.push(`목적 — ${d.purpose}`);
    if (d.prompt_excerpt) parts.push(`프롬프트 요약 — ${d.prompt_excerpt}`);
    return `- ${parts.join(" | ")}`;
  });

  return `[현재 명세서 도면 구성 — 최우선 기준]
- 현재 도면 수: ${ctx.drawingCount}개 (도 ${ctx.figureNumbers.join(", 도 ")})
- 발명 분석표의 drawing_candidates 개수와 다르면, 반드시 아래 현재 도면 수·번호를 따른다.
- 도면의 간단한 설명·구체적인 내용 작성 시 위 ${ctx.drawingCount}개 도면을 빠짐없이 모두 다룬다.

[도면별 정보]
${lines.join("\n")}`;
}

export function getDrawingCountMatchRule(
  sectionType: "brief_description_of_drawings" | "detailed_description",
  ctx: CurrentDrawingContext
): string {
  if (ctx.drawingCount === 0) return "";

  const nums = ctx.figureNumbers.map((n) => `도 ${n}`).join(", ");

  if (sectionType === "brief_description_of_drawings") {
    return (
      `[도면 수 일치 — 필수]\n` +
      `현재 명세서 도면은 ${ctx.drawingCount}개(${nums})이다.\n` +
      `"도 N은(는) …를 나타낸다." 형식의 문장을 정확히 ${ctx.drawingCount}개 작성하라.\n` +
      `도 번호는 ${ctx.figureNumbers.join(", ")}만 사용하고, 없는 도면 번호·누락·초과 문장을 만들지 말라.`
    );
  }

  return (
    `[도면 수 일치 — 필수]\n` +
    `현재 명세서 도면은 ${ctx.drawingCount}개(${nums})이다.\n` +
    `【발명을 실시하기 위한 구체적인 내용】에는 ${nums} 각각에 대한 설명(‘도 N은 …’ / ‘도 N을 참조하면 …’ 등)을 빠짐없이 포함하라.\n` +
    `분석표에만 있고 현재 도면 목록에 없는 도면 번호는 쓰지 말라.`
  );
}
