import { getChemicalInventionMakingAnalysisNotes } from "@/knowledge/chemicalInventionMakingRules";
import {
  getInventionAnalysisModeNotes,
  getInventionMakingRulesBlock
} from "@/knowledge/inventionMakingRules";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";
import type { InventionInput } from "@/types/patentDraft";

const OUTPUT_JSON_SCHEMA = `{
  "title_candidates": [],
  "technical_field": "",
  "one_line_summary": "",
  "core_idea": "",
  "prior_art": "",
  "prior_art_problems": [],
  "problem_to_solve": [],
  "essential_elements": [],
  "optional_elements": [],
  "element_relationships": [],
  "operation_flow": [],
  "data_inputs": [],
  "data_outputs": [],
  "control_conditions": [],
  "exception_cases": [],
  "variation_examples": [],
  "expected_effects": [],
  "claim_points": [],
  "drawing_candidates": [],
  "visual_material_analysis": [],
  "document_structure_analysis": [],
  "table_or_experiment_data_analysis": [],
  "unclear_points": [],
  "do_not_invent": []
}`;

export function buildAnalyzeInventionPrompt(
  input: InventionInput,
  prepared: PreparedAiInput[] = []
): string {
  const inventionMaking = Boolean(input.inventionMakingEnabled);
  const chemicalInvention = Boolean(input.chemicalInventionEnabled);
  const fileList =
    prepared.length > 0
      ? prepared
          .map(
            (p) =>
              `- ${p.name}: mode=${p.aiInputMode}, fallback=${p.fallbackUsed}, note=${p.analysisNotes}`
          )
          .join("\n")
      : input.attachmentText || "(첨부 없음)";

  return `너는 국내 특허출원용 명세서를 작성하기 위한 발명 분석 전문가이다.

사용자는 발명제안서, 사업계획서, 회의록, 메모, 실험데이터, 도면 이미지, PDF, PPT, DOCX, XLSX 등 다양한 자료를 업로드할 수 있다.

너는 업로드된 자료를 단순 텍스트로만 보지 말고, 자료의 원본 형식과 구조를 고려하여 발명을 분석해야 한다.

업로드 자료는 단순 OCR 또는 단순 텍스트 추출 결과로 간주하지 말고, 파일 자체의 형식과 시각적/문서적 구조를 함께 고려하여 분석하라. 이미지 자료가 포함된 경우, 이미지 내 구성요소의 배치, 연결관계, 화살표, 도면 유형, 참조부호, UI 구조 또는 장치 구조를 특허명세서 관점에서 분석하라. PDF 또는 PPT 자료가 포함된 경우, 본문 텍스트뿐 아니라 표, 도식, 도면, 슬라이드 배치 및 설명 간 관계를 함께 고려하라.

특히:
- 이미지가 제공된 경우, OCR 텍스트만 읽지 말고 이미지 내 구성요소, 배치, 화살표, 연결선, UI 구획, 장치 구조, 흐름도 단계, 참조부호를 분석하라.
- PDF가 제공된 경우, 본문 텍스트뿐 아니라 표, 도면, 이미지, 페이지 구성, 제목 계층, 설명 문구 간 관계를 함께 분석하라.
- PPT가 제공된 경우, 슬라이드의 시각적 배치, 도식, 화살표, 표, 설명 문구를 함께 고려하라.
- XLSX 또는 CSV가 제공된 경우, 실험 조건, 컬럼 구조, 수치 경향성, 비교군과 실시예의 차이를 분석하라.
- 기존 명세서 초안이 제공된 경우, 그 문체와 구조를 참고하되 신규 입력자료에서 확인되는 발명의 핵심을 우선한다.

분석 목적은 단순 요약이 아니라, 청구항으로 보호받을 수 있는 기술적 구성을 도출하는 것이다.

주의:
${getInventionAnalysisModeNotes(inventionMaking)}
${getChemicalInventionMakingAnalysisNotes(chemicalInvention, inventionMaking)}
- PDF/PPT의 시각 자료와 텍스트 설명이 충돌하는 경우 충돌 사항을 unclear_points에 기재하라.
- 청구항으로 보호받을 수 있는 구성 중심으로 분석하라.
- fallback 텍스트만 제공된 자료는 "텍스트 추출 기반 분석"임을 인지하되, 가능한 한 원본 구조를 추정하지 말고 텍스트에 기재된 범위 내에서 분석하라.

${getInventionMakingRulesBlock(inventionMaking)}

반드시 JSON만 출력하라.

프로젝트명: ${input.projectName}
자료 유형: ${input.materialType}
발명의 유형: ${input.inventionType}
발명 메이킹: ${inventionMaking ? "활성" : "비활성"}
화학 발명: ${chemicalInvention ? "활성" : "비활성"}
발명의 내용(직접 입력): ${input.inventionContent || "(없음)"}

업로드 자료 처리 방식:
${fileList}

출력 JSON 구조:
${OUTPUT_JSON_SCHEMA}`;
}
