import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";

export function formatChemicalEmbodimentAnalysisForPrompt(
  analysis: ChemicalEmbodimentAnalysis | null | undefined
): string {
  if (!analysis) return "";

  const tables = analysis.tables
    .map(
      (t, i) =>
        `--- 표 ${i + 1}: ${t.caption} ---\n${t.html_table}\n[해석] ${t.interpretation}`
    )
    .join("\n\n");

  const examples = analysis.examples
    .map(
      (e) =>
        `[${e.label} / ${e.kind}] 조건: ${e.process_conditions}\n시약: ${e.reagents_and_amounts}\n측정: ${e.measurement_summary}\n결과: ${e.results}\n의미: ${e.technical_meaning}`
    )
    .join("\n\n");

  const graphs = analysis.graph_drawings
    .map(
      (g) =>
        `- ${g.title} (${g.chart_type}): X=${g.x_axis}, Y=${g.y_axis}. ${g.data_series_description}. 목적: ${g.purpose}`
    )
    .join("\n");

  const inj = analysis.detailed_description_injection;

  return `[2단계 실시예/비교예 분석 — 명세서·도면 반영용]
발명 유형: ${analysis.invention_subtype}
요약: ${analysis.writing_guidelines_summary}

수치한정 가이드:
${analysis.numerical_ranges.map((r) => `- ${r.parameter_name}: ${r.full_range} (바람직: ${r.preferred_range}). 임계: ${r.critical_effect_note}`).join("\n") || "(없음)"}

실시예/비교예:
${examples || "(없음)"}

HTML 표 (구체적인 설명에 그대로 삽입):
${tables || "(없음)"}

【구체적인 내용】 주입 문단:
${inj.opening_paragraph}
${inj.embodiment_paragraphs.join("\n\n")}
${inj.preferred_embodiment_paragraph}
${inj.linked_effects_paragraph}

연계 효과:
${analysis.linked_effects.join("\n") || "(없음)"}

도면용 데이터 그래프:
${graphs || "(없음)"}

측정방법:
${analysis.measurement_methods.join("; ") || "(없음)"}

청구항 지지 메모:
${analysis.claim_support_notes.join("; ") || "(없음)"}`;
}

export function getChemicalEmbodimentAnalysisBlock(
  analysis: ChemicalEmbodimentAnalysis | null | undefined
): string {
  const body = formatChemicalEmbodimentAnalysisForPrompt(analysis);
  if (!body) return "";
  return `${body}

위 2단계 분석을 반드시 따르라. 【발명을 실시하기 위한 구체적인 내용】에는 실시예·바람직한 실시예·비교예 본문과 HTML <table> 표를 주입하고, 표 아래 임계적 효과 해석을 작성하라. 도면 프롬프트에는 데이터 그래프(막대·선 등) 도면을 포함하라.`;
}
