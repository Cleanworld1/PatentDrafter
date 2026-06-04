import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type { DrawingPrompt, DrawingPlanItem } from "@/types/patentWorkflow";

export function mergeChemicalEmbodimentIntoDetailedDescription(
  base: string,
  embodiment: ChemicalEmbodimentAnalysis | null | undefined
): string {
  if (!embodiment) return base;

  const inj = embodiment.detailed_description_injection;
  const blocks: string[] = [base.trim()];

  if (inj.opening_paragraph) blocks.push(inj.opening_paragraph);
  blocks.push(...inj.embodiment_paragraphs.filter(Boolean));
  if (inj.preferred_embodiment_paragraph) blocks.push(inj.preferred_embodiment_paragraph);

  for (const table of embodiment.tables) {
    if (table.html_table) {
      blocks.push(table.html_table);
      if (table.interpretation) blocks.push(table.interpretation);
    }
  }

  if (inj.linked_effects_paragraph) blocks.push(inj.linked_effects_paragraph);
  else if (embodiment.linked_effects.length) {
    blocks.push(embodiment.linked_effects.join("\n"));
  }

  return blocks.filter(Boolean).join("\n\n");
}

export function appendGraphDrawingsToPlan(
  plan: DrawingPlanItem[],
  embodiment: ChemicalEmbodimentAnalysis | null | undefined,
  maxFigures: number
): DrawingPlanItem[] {
  if (!embodiment?.graph_drawings.length) return plan;

  const next = [...plan];
  let num = plan.length;

  for (const graph of embodiment.graph_drawings) {
    if (num >= maxFigures) break;
    num += 1;
    next.push({
      figure_number: num,
      title: graph.title || `도 ${num} 데이터 그래프`,
      purpose: `${graph.purpose} (${graph.chart_type}: ${graph.x_axis} vs ${graph.y_axis}). ${graph.data_series_description}`,
      drawing_type: "구성도",
      required_elements: ["축", "눈금", "데이터 막대 또는 곡선", "범례"],
      claim_support: [1]
    });
  }

  return next.slice(0, maxFigures);
}

export function appendGraphDrawingPrompts(
  prompts: DrawingPrompt[],
  embodiment: ChemicalEmbodimentAnalysis | null | undefined,
  maxFigures: number
): DrawingPrompt[] {
  if (!embodiment?.graph_drawings.length) return prompts;

  const existing = [...prompts];
  const style =
    prompts[0]?.style_instruction ??
    "특허 명세서용 흑백 선도, 단순한 배경, 번호 기입 가능한 여백 포함";

  let num = existing.length;
  for (const graph of embodiment.graph_drawings) {
    if (num >= maxFigures) break;
    num += 1;
    existing.push({
      figure_number: num,
      title: graph.title || `측정값 비교 그래프`,
      drawing_type: "구성도",
      purpose: `【데이터 그래프】 ${graph.purpose}. ${graph.chart_type} 형태로 ${graph.x_axis}(가로)와 ${graph.y_axis}(세로)를 표시한다. ${graph.data_series_description}. 표 ${graph.related_table_caption ?? ""}의 수치를 시각화한다.`,
      required_elements: ["좌표축", "눈금", "데이터 시리즈", "범례"],
      relative_layout: "가로축에 실시예/비교예 구분, 세로축에 측정값. 흑백 막대 또는 선 그래프.",
      arrows_or_connections: "데이터 포인트 간 비교가 가능하도록 눈금을 명확히 표시",
      reference_number_guidance: "축·범례는 참조부호 없이, 필요 시 (100) 데이터 영역",
      style_instruction: `${style}. 수치 그래프는 특허 도면 스타일의 단순 막대/선 그래프.`
    });
  }

  return existing.slice(0, maxFigures);
}
