import type { InventionAnalysis } from "@/types/patentDraft";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import { emptyChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";

export function buildChemicalEmbodimentFromAnalysis(
  analysis: InventionAnalysis
): ChemicalEmbodimentAnalysis {
  const base = emptyChemicalEmbodimentAnalysis();
  const expNotes = analysis.table_or_experiment_data_analysis.slice(0, 4);

  base.invention_subtype = analysis.technical_field.includes("화학")
    ? "화학공정 발명"
    : "조성물/공정 발명";
  base.writing_guidelines_summary =
    "1단계 분석과 실험 자료를 바탕으로 실시예·비교예·수치한정·HTML 표·연계 효과를 【구체적인 내용】에 반영한다 (개발용 mock).";
  base.examples = [
    {
      id: "비교예1",
      kind: "comparative",
      label: "비교예 1 (무처리)",
      process_conditions: "핵심 시약 미첨가 또는 종래 조건",
      reagents_and_amounts: "(자료 확인 필요)",
      measurement_summary: expNotes[0] ?? "측정방법·장비는 자료에 기재된 범위 내",
      results: "기준 대비 효과 미흡 또는 잔류 불순물",
      technical_meaning: "발명 효과의 출발점 대비"
    },
    {
      id: "실시예1",
      kind: "embodiment",
      label: "실시예 1",
      process_conditions: analysis.operation_flow.slice(0, 2).join(" → ") || analysis.core_idea,
      reagents_and_amounts: analysis.essential_elements.slice(0, 3).join(", "),
      measurement_summary: expNotes[1] ?? "ICP-OES 등 (자료 확인)",
      results: analysis.expected_effects[0] ?? "개선 효과",
      technical_meaning: "청구항 핵심 구성의 실시 형태"
    },
    {
      id: "실시예2",
      kind: "preferred_embodiment",
      label: "바람직한 실시예",
      process_conditions: "바람직한 수치 범위 내 조건",
      reagents_and_amounts: analysis.optional_elements.slice(0, 2).join(", ") || "동등 시약 가능",
      measurement_summary: expNotes[2] ?? "",
      results: "균형 잡힌 제거율·공정성",
      technical_meaning: "최적 범위 지지"
    }
  ];
  base.tables = [
    {
      caption: "[표 1] 실시예 및 비교예의 조건 및 측정 결과 (mock)",
      html_table: `<table border="1" cellpadding="4"><caption>[표 1] 실시예 및 비교예의 조건 및 측정 결과</caption><thead><tr><th>구분</th><th>주요 조건</th><th>측정값</th><th>비고</th></tr></thead><tbody><tr><td>비교예 1</td><td>무처리</td><td>—</td><td>기준</td></tr><tr><td>실시예 1</td><td>${analysis.essential_elements[0] ?? "핵심 조건"}</td><td>자료 확인</td><td>임계 효과</td></tr><tr><td>바람직한 실시예</td><td>범위 내</td><td>자료 확인</td><td>최적</td></tr></tbody></table>`,
      interpretation:
        "비교예 1 대비 실시예 1에서 측정 지표가 개선되는 경향이 확인될 수 있으며, 바람직한 실시예는 공정성과 효과의 균형을 나타낸다 (실측값은 업로드 자료로 대체)."
    }
  ];
  base.detailed_description_injection = {
    opening_paragraph:
      "이하에서는 첨부 도면 및 실험 결과를 참조하여 화학·공정 실시예를 설명한다. 실시예는 청구항의 핵심 구성을 뒷받침한다.",
    embodiment_paragraphs: [
      `일 실시예에 따르면, ${analysis.core_idea}`,
      analysis.variation_examples[0]
        ? `다른 실시예에 따르면, ${analysis.variation_examples[0]}`
        : "변형 실시예에서 일부 조건은 생략·대체될 수 있다."
    ],
    preferred_embodiment_paragraph: `바람직한 실시예에서는 ${analysis.essential_elements.slice(0, 4).join(", ")} 등의 조합이 적용될 수 있다.`,
    linked_effects_paragraph: analysis.expected_effects.join(" ") || "연계 효과는 자료 확인 필요."
  };
  base.linked_effects = [...analysis.expected_effects];
  base.graph_drawings = [
    {
      title: "실시예별 측정값 비교 그래프",
      chart_type: "막대 그래프",
      x_axis: "실시예/비교예 구분",
      y_axis: "대표 측정 지표 (자료 기재 단위)",
      data_series_description: "[표 1]의 측정값을 막대로 표시",
      purpose: "비교예 대비 실시예·바람직한 실시예의 효과 차이를 시각화",
      related_table_caption: "[표 1] 실시예 및 비교예의 조건 및 측정 결과 (mock)"
    }
  ];
  base.measurement_methods = ["ICP-OES", "pH meter", "여과 전후 중량차"];
  base.claim_support_notes = analysis.claim_points.slice(0, 3);
  base.uncertainties = [...analysis.unclear_points];
  return base;
}
