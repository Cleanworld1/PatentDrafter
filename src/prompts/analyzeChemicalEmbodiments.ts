import { buildChemicalFormulaCatalog, formatChemicalFormulaCatalogForPrompt } from "@/lib/chemicalFormulaCatalog";
import { CHEMICAL_INVENTION_SPEC_PROMPT } from "@/knowledge/chemicalInventionPrompt";
import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";
import type { InventionAnalysis } from "@/types/patentDraft";

const OUTPUT_JSON_SCHEMA = `{
  "invention_subtype": "",
  "writing_guidelines_summary": "",
  "numerical_ranges": [
    {
      "parameter_name": "",
      "full_range": "",
      "preferred_range": "",
      "lower_bound_issue": "",
      "upper_bound_issue": "",
      "critical_effect_note": ""
    }
  ],
  "examples": [
    {
      "id": "비교예1",
      "kind": "comparative",
      "label": "비교예 1",
      "process_conditions": "",
      "reagents_and_amounts": "",
      "measurement_summary": "",
      "results": "",
      "technical_meaning": ""
    }
  ],
  "tables": [
    {
      "caption": "[표 1] 실시예 및 비교예의 공정 조건 및 측정 결과",
      "html_table": "<table>...</table>",
      "interpretation": ""
    }
  ],
  "detailed_description_injection": {
    "opening_paragraph": "",
    "embodiment_paragraphs": [],
    "preferred_embodiment_paragraph": "",
    "linked_effects_paragraph": ""
  },
  "linked_effects": [],
  "graph_drawings": [
    {
      "title": "",
      "chart_type": "막대 그래프",
      "x_axis": "",
      "y_axis": "",
      "data_series_description": "",
      "purpose": "",
      "related_table_caption": ""
    }
  ],
  "measurement_methods": [],
  "claim_support_notes": [],
  "uncertainties": []
}`;

export function buildAnalyzeChemicalEmbodimentsPrompt(
  analysis: InventionAnalysis,
  prepared: PreparedAiInput[] = [],
  materialsPayload?: Pick<AnalyzeMaterialsPayload, "materials">
): string {
  const formulaCatalog = materialsPayload?.materials
    ? buildChemicalFormulaCatalog(
        materialsPayload.materials.map((m) => ({
          id: m.fileId,
          name: m.name,
          mimeType: m.mimeType,
          extension: m.extension,
          materialType: m.materialType,
          sourceType: m.sourceType,
          aiInputMode: m.aiInputMode,
          fileObjectRef: m.fileId,
          extractedText: m.extractedText ?? "",
          analysisNotes: m.analysisNotes,
          fallbackUsed: m.fallbackUsed,
          status: "native_ready" as const,
          size: m.size
        }))
      )
    : [];
  const fileList =
    prepared.length > 0
      ? prepared
          .map(
            (p) =>
              `- ${p.name}: mode=${p.aiInputMode}, fallback=${p.fallbackUsed}, note=${p.analysisNotes}`
          )
          .join("\n")
      : "(첨부 없음 — 1단계 분석·입력 텍스트만 사용)";

  return `너는 화학/소재/화학공정/신소재/이차전지 분야 특허명세서 작성 전문가이다.
1단계 발명 분석이 완료되었다. 이제 **2단계: 실시예/비교예 분석**을 수행하여, 아래 [화학 발명 지침]에 맞는 명세서 작성 가이드라인과 삽입용 콘텐츠를 JSON으로 산출하라.

목표:
- 실시예·비교예·바람직한 실시예를 설계하고, 수치한정(범위 내/외) 임계 효과를 뒷받침한다.
- 【발명을 실시하기 위한 구체적인 내용】에 **그대로 주입할** 문단과 HTML 표를 작성한다.
- 도면 생성 AI가 그릴 **데이터 그래프 도면** 명세를 제시한다.
- 입력 자료에 없는 측정값은 단정하지 말고 uncertainties에 기재한다. 자료가 부족하면 합리적 가설 범위를 제시하되 "확인 필요"를 명시한다.

표 규칙:
- Markdown 표 금지. 반드시 HTML <table>, <caption>, <thead>, <tbody> 사용.
- 실시예/비교예 구분, 조건, 측정값, 효과, 비고 열 포함. 2~3개 표 권장.
- 표 아래 interpretation에 하한 미만·범위 내·상한 초과 임계 해석 작성.

실시예/비교예 설계 (가능한 한 포함):
- 무처리 비교예, 하한 미만, 하한 실시예, 바람직 범위, 상한, 상한 초과 비교예
- 핵심 시약 미첨가·공정 단계 생략·선행기술 유사 조건 등

${CHEMICAL_INVENTION_SPEC_PROMPT}

${formatChemicalFormulaCatalogForPrompt(formulaCatalog)}

=== 1단계 발명 분석표 ===
${JSON.stringify(analysis, null, 2)}

=== 업로드 자료 (실험데이터·표 우선 반영) ===
${fileList}

반드시 JSON만 출력:
${OUTPUT_JSON_SCHEMA}`;
}
