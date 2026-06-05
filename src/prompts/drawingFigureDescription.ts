import { PATENT_SINGLE_LINE_BREAK_RULE } from "@/knowledge/patentLineBreakRules";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";

export interface DrawingFigureDescriptionInput {
  figureNumber: number;
  drawingMaterial: string;
  analysis: InventionAnalysis;
  relatedClaims: ClaimDraft[];
  priorFigureDescriptions: string[];
  drawingPrompt?: DrawingPrompt;
}

export function buildDrawingFigureDescriptionPrompt(input: DrawingFigureDescriptionInput): string {
  const { figureNumber, drawingMaterial, analysis, relatedClaims, priorFigureDescriptions, drawingPrompt } =
    input;

  const claimsText =
    relatedClaims.length > 0
      ? relatedClaims.map((c) => `청구항 ${c.claim_number} (${c.category}): ${c.text}`).join("\n")
      : "(없음)";

  const priorText =
    priorFigureDescriptions.length > 0
      ? priorFigureDescriptions.map((t, i) => `--- 앞선 도 ${i + 1} 설명 요약 ---\n${t.slice(0, 800)}`).join("\n\n")
      : "(없음)";

  const promptMeta = drawingPrompt
    ? `도면 유형: ${drawingPrompt.drawing_type}\n도면 제목: ${drawingPrompt.title}\n도면 목적: ${drawingPrompt.purpose}\n필수 구성: ${drawingPrompt.required_elements.join(", ")}\n배치: ${drawingPrompt.relative_layout}\n연결: ${drawingPrompt.arrows_or_connections}\n참조부호: ${drawingPrompt.reference_number_guidance}\n스타일: ${drawingPrompt.style_instruction}`
    : "(도면 프롬프트 메타 없음)";

  return `아래 [도 ${figureNumber}]에 대한 발명의 설명을 국내 특허명세서 문체로 작성해줘.

[도 ${figureNumber} 자료/이미지/설명]
${drawingMaterial || "(비어 있음)"}

[도면 생성 AI용 프롬프트 메타]
${promptMeta}

[관련 발명 내용]
발명 분석표 요약 필드: ${analysis.one_line_summary}
핵심 아이디어: ${analysis.core_idea}
핵심 구성요소: ${analysis.essential_elements.join(", ")}
요소 관계: ${analysis.element_relationships.join("; ")}

[관련 청구항·초안]
${claimsText}

[앞선 도면 설명 (연결 참고)]
${priorText}

---------------------
작성 기준:
1. “도 ${figureNumber}은 …를 나타낸다.”로 시작해줘.
2. 단순히 도면에 보이는 구성만 나열하지 말고, 각 구성요소의 역할, 연결관계, 동작 흐름, 데이터 흐름 또는 제어 흐름을 설명해줘.
3. 이 도면이 발명의 어떤 핵심 차별점을 뒷받침하는지 드러나게 작성해줘.
4. 청구항에 들어갈 수 있는 기술적 특징이 충분히 지지되도록 구체적으로 작성해줘. 단, “청구항”이라는 표현이나 파일명은 본문에 직접 쓰지 말아줘.
5. 도 1, 도 2 등 앞선 도면과 연결되는 경우 “도 1의 ○○에 대응하여” 또는 “도 ${figureNumber}은 도 M의 구성을 구체화한 예시로서”처럼 자연스럽게 연결해줘.
6. 입력자료에 없는 구체적 수치나 효과는 임의로 만들지 말고, 필요한 경우 “일 실시예에 따르면”, “포함할 수 있다” 형식으로 써줘.
7. 명세서 본문에 바로 삽입 가능한 10개~20개 문단 정도로 작성해줘.
8. "업로드 자료", "카탈로그", "PDF", "제출 자료" 등 참고 자료 출처는 본문에 쓰지 말고, 발명 실시 내용만 서술해줘.
9. "종래기술", "선행에 따르면" 같은 종래기술 서술 티 없이 일 실시예 문체로 써줘.
10. ${PATENT_SINGLE_LINE_BREAK_RULE}

출력: 도 ${figureNumber} 관련 본문만. JSON 없이 텍스트만. 【발명을 실시하기 위한 구체적인 내용】 등 【…】 항목 제목은 출력하지 말라.`;
}

export function buildDetailedDescriptionElaborateInstruction(figureDescriptions: string[]): string {
  const blocks = figureDescriptions
    .map((text, i) => `### 도 ${i + 1} 상세 설명 (명세서 삽입용)\n${text}`)
    .join("\n\n");

  return `【발명을 실시하기 위한 구체적인 내용】을 아래 도면별 상세 설명을 반영하여 더 구체화하라.

요구사항:
- 아래 각 도면 설명을 본문에 자연스럽게 통합·배치하라 (도면별 소제목 또는 연속 문단).
- 청구항·앞선 항목(기술분야, 과제, 해결 수단 등)과 용어·논리를 일치시키라.
- “청구항”이라는 단어는 본문에 쓰지 말라.
- 입력에 없는 수치·실험 결과는 만들지 말라.
- "업로드 자료", "카탈로그", "PDF" 등 참고 자료 출처 표현 금지.
- "종래기술", "선행에 따르면" 등 종래기술 서술 티 없이 일 실시예 문체로 작성하라.
- 국내 특허명세서 문체, 10~20문단 이상 분량으로 풍부하게 작성하라.
- 【발명을 실시하기 위한 구체적인 내용】 등 【…】 형식의 목차·항목 제목은 출력하지 말고 본문만 작성하라.
- ${PATENT_SINGLE_LINE_BREAK_RULE}

[도면별 상세 설명]
${blocks}`;
}
