import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";
import type { InventionAnalysis, InventionInput } from "@/types/patentDraft";

export interface UploadedSection {
  materialType: string;
  fileName: string;
  content: string;
}

export function combineInputSources(input: InventionInput): string {
  const parts: string[] = [];
  if (input.inventionContent?.trim()) {
    parts.push(`=== 직접 입력 ===\n${input.inventionContent.trim()}`);
  }
  if (input.attachmentText?.trim()) {
    parts.push(`=== 업로드 파일 ===\n${input.attachmentText.trim()}`);
  }
  return parts.join("\n\n");
}

export function parseUploadedSections(attachmentText: string): UploadedSection[] {
  if (!attachmentText.trim()) return [];

  const sections: UploadedSection[] = [];
  const blocks = attachmentText.split(/\n\n(?=\[)/);

  for (const block of blocks) {
    const match = block.match(/^\[([^\]]+)\]\s*([^\n]+)\n([\s\S]*)$/);
    if (match) {
      sections.push({
        materialType: match[1].trim(),
        fileName: match[2].trim(),
        content: match[3].trim()
      });
    }
  }

  if (sections.length === 0 && attachmentText.trim()) {
    sections.push({
      materialType: "첨부",
      fileName: "첨부자료",
      content: attachmentText.trim()
    });
  }

  return sections;
}

function firstSentence(text: string, maxLen = 220): string {
  const line = text.split(/\n/).find((l) => l.trim().length > 10)?.trim() ?? text.trim();
  if (line.length <= maxLen) return line;
  return `${line.slice(0, maxLen)}…`;
}

function extractBulletItems(text: string, max = 8): string[] {
  const items: string[] = [];
  const lines = text.split(/\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^[-•*]\s+(.+)/) ?? trimmed.match(/^\d+[.)]\s+(.+)/);
    if (bullet?.[1] && bullet[1].length > 3) {
      items.push(bullet[1].trim());
    }
    if (items.length >= max) break;
  }
  return items;
}

function extractSentencesWithKeywords(text: string, keywords: string[], max = 4): string[] {
  const sentences = text.split(/[.!?]\s+|\n+/).map((s) => s.trim()).filter((s) => s.length > 8);
  const found: string[] = [];
  for (const sentence of sentences) {
    if (keywords.some((kw) => sentence.includes(kw))) {
      found.push(sentence);
    }
    if (found.length >= max) break;
  }
  return found;
}

function inferTechnicalField(inventionType: string): string {
  const map: Record<string, string> = {
    "장치 발명": "본 발명은 장치 또는 하드웨어 구성에 관한 것이다.",
    "방법 발명": "본 발명은 방법 또는 공정에 관한 것이다.",
    "시스템 발명": "본 발명은 정보처리 시스템 또는 네트워크 구성에 관한 것이다.",
    "프로그램 발명": "본 발명은 컴퓨터 프로그램 및 정보처리에 관한 것이다.",
    "AI·데이터 처리 발명": "본 발명은 인공지능 및 데이터 처리에 관한 것이다.",
    "기계 구조 발명": "본 발명은 기계 구조 및 기계적 결합에 관한 것이다.",
    "조성물 발명": "본 발명은 조성물 또는 재료에 관한 것이다."
  };
  return map[inventionType] ?? "본 발명은 업로드된 발명 자료에 기재된 기술 분야에 관한 것이다.";
}

function extractComponentCandidates(text: string): string[] {
  const fromBullets = extractBulletItems(text, 10);
  const fromPatterns = [...text.matchAll(/([가-힣A-Za-z0-9]+(?:부|모듈|장치|단계|서버|엔진|시스템|방법|수단))/g)]
    .map((m) => m[1])
    .filter((w) => w.length >= 2 && w.length <= 30);

  const merged = [...fromBullets, ...fromPatterns];
  const unique = [...new Set(merged)];
  return unique.slice(0, 8);
}

export function buildAnalysisFromInput(input: InventionInput): InventionAnalysis {
  const combined = combineInputSources(input);
  const fileSections = parseUploadedSections(input.attachmentText);
  const fileNames = fileSections.map((s) => s.fileName);
  const fileContents = fileSections.map((s) => s.content).join("\n\n");

  const hasUploads = fileSections.length > 0;
  const hasDirectInput = Boolean(input.inventionContent?.trim());
  const sourceForSummary = input.inventionContent?.trim() || fileContents || combined;

  const essential = extractComponentCandidates(combined);
  const optional = extractBulletItems(fileContents, 5).filter((item) => !essential.includes(item)).slice(0, 4);

  const priorProblems = extractSentencesWithKeywords(
    combined,
    ["문제", "한계", "불편", "어렵", "부족", "비효율"],
    4
  );
  const problemsToSolve = extractSentencesWithKeywords(
    combined,
    ["해결", "개선", "과제", "목적", "달성", "제공"],
    4
  );
  const effects = extractSentencesWithKeywords(
    combined,
    ["효과", "장점", "향상", "감소", "증가", "가능"],
    4
  );

  const operationFlow = extractBulletItems(combined, 6);
  const defaultFlow =
    operationFlow.length > 0
      ? operationFlow
      : hasUploads
        ? ["업로드된 자료를 수신한다.", "자료 유형에 따라 발명 요소를 추출한다.", "발명 분석표를 생성한다.", "명세서 초안을 작성한다."]
        : ["발명 자료를 입력받는다.", "발명 분석표를 생성한다."];

  const drawingMentions = [...combined.matchAll(/(?:도면|구성도|흐름도|블록도|시퀀스)[^\n.]*/g)].map((m) => m[0].trim());
  const drawing_candidates =
    drawingMentions.length > 0
      ? drawingMentions.slice(0, 5)
      : ["전체 시스템 구성도", "주요 처리 흐름도", "핵심 구성요소 상세도"];

  const unclear_points: string[] = [];
  if (!hasUploads && !hasDirectInput) {
    unclear_points.push("분석할 업로드 파일 또는 직접 입력 내용이 없습니다.");
  }
  if (hasUploads && fileContents.length < 80) {
    unclear_points.push("업로드 파일에서 추출된 텍스트가 짧아 추가 자료 확인이 필요할 수 있습니다.");
  }

  const titleBase = input.projectName?.trim() || fileNames[0]?.replace(/\.[^.]+$/, "") || "발명";
  const summary = firstSentence(sourceForSummary);

  return {
    title_candidates: [
      `${titleBase}에 관한 발명`,
      fileNames.length > 0 ? `${fileNames[0]} 기반 ${input.materialType} 분석 결과` : `${titleBase} 관련 기술`
    ],
    technical_field: inferTechnicalField(input.inventionType),
    one_line_summary: summary,
    core_idea: hasDirectInput
      ? firstSentence(input.inventionContent, 400)
      : firstSentence(fileContents || combined, 400),
    prior_art: priorProblems[0] ?? "업로드 자료에 명시된 선행 기술 또는 종래 기술의 설명을 확인할 필요가 있다.",
    prior_art_problems:
      priorProblems.length > 0
        ? priorProblems
        : ["종래 기술은 발명 자료에 기재된 바와 같이 추가 검토가 필요하다."],
    problem_to_solve:
      problemsToSolve.length > 0
        ? problemsToSolve
        : ["업로드된 발명 자료에 기재된 기술적 과제를 해결한다."],
    essential_elements:
      essential.length > 0
        ? essential
        : ["입력자료 수신부", "자료 분석부", "발명 분석표 생성부", "명세서 초안 생성부"],
    optional_elements:
      optional.length > 0 ? optional : ["사용자 확인 질의 생성부", "정합성 검토부"],
    element_relationships:
      essential.length >= 2
        ? essential.slice(0, 3).map((el, i, arr) =>
            i < arr.length - 1 ? `${el}는 ${arr[i + 1]}에 데이터를 전달할 수 있다.` : ""
          ).filter(Boolean)
        : ["자료 분석부는 발명 분석표 생성부에 분석 결과를 전달한다."],
    operation_flow: defaultFlow,
    data_inputs: [
      input.projectName,
      ...fileNames.map((n) => `업로드 파일: ${n}`),
      input.materialType,
      input.inventionType
    ].filter(Boolean),
    data_outputs: ["발명 분석표", "명세서 초안", "청구항 초안", "도면 프롬프트", "정합성 검토 결과"],
    control_conditions: [
      `자료 유형: ${input.materialType}`,
      `발명 유형: ${input.inventionType}`,
      "입력자료에 없는 수치·실험결과는 생성하지 않는다."
    ],
    exception_cases: ["핵심 구성이 불명확한 경우 unclear_points에 기록한다."],
    variation_examples: fileSections.map((s) => `${s.materialType}(${s.fileName}) 기반 변형 실시예`),
    expected_effects:
      effects.length > 0 ? effects : ["업로드 자료에 기재된 효과를 명세서에 반영할 수 있다."],
    claim_points: essential.slice(0, 3).length > 0 ? essential.slice(0, 3) : [summary],
    drawing_candidates,
    visual_material_analysis: [],
    document_structure_analysis: [],
    table_or_experiment_data_analysis: [],
    unclear_points,
    do_not_invent: [
      "입력자료·업로드 파일에 없는 성능 수치",
      "검증되지 않은 실험 결과",
      "마케팅 문구"
    ]
  };
}

export function buildAnalysisFromMaterials(
  payload: AnalyzeMaterialsPayload,
  prepared: PreparedAiInput[],
  legacyInput: InventionInput
): InventionAnalysis {
  const base = buildAnalysisFromInput(legacyInput);

  const visual_material_analysis = prepared
    .filter((p) => p.aiInputMode === "image_input")
    .map((p) =>
      p.fallbackUsed
        ? `${p.name}: fallback 텍스트 기반 — ${(p.fallbackText ?? "").slice(0, 200)}`
        : `${p.name}: 이미지 원본 분석 대기 (OpenAI API 연동 시 멀티모달 해석) — ${p.analysisNotes}`
    );

  const document_structure_analysis = prepared
    .filter((p) => ["pdf_input", "document_input"].includes(p.aiInputMode))
    .map((p) =>
      `${p.name} (${p.fallbackUsed ? "텍스트 추출 fallback" : "문서 원본"}): ${p.analysisNotes}`
    );

  const table_or_experiment_data_analysis = prepared
    .filter((p) => p.aiInputMode === "spreadsheet_input" || p.sourceType === "experiment_data")
    .map((p) => {
      const preview = (p.fallbackText ?? "").slice(0, 300);
      return `${p.name}: ${p.analysisNotes}${preview ? ` — ${preview}` : ""}`;
    });

  if (prepared.some((p) => p.fallbackUsed)) {
    base.unclear_points = [
      ...base.unclear_points,
      "일부 자료는 텍스트 추출 fallback으로 분석되었습니다. 원본 시각·레이아웃 정보는 제한될 수 있습니다."
    ];
  }

  return {
    ...base,
    visual_material_analysis,
    document_structure_analysis,
    table_or_experiment_data_analysis,
    data_inputs: [
      ...base.data_inputs,
      ...prepared.map((p) => `${p.name} [${p.aiInputMode}${p.fallbackUsed ? ", fallback" : ", native"}]`)
    ]
  };
}
