import { getDrawingReferenceNumberRulesBlock } from "@/knowledge/drawingReferenceNumberRules";
import type { DrawingPrompt } from "@/types/patentDraft";

const DEFAULT_NANO_BANANA_URL = "https://aistudio.google.com/";

export function getNanoBananaStudioUrl(): string {
  return process.env.NEXT_PUBLIC_NANO_BANANA_URL?.trim() || DEFAULT_NANO_BANANA_URL;
}

/** Nano Banana 2(이미지 생성)에 붙여넣을 도면 프롬프트 본문 */
export function buildNanoBananaDrawingPrompt(
  figureNumber: number,
  sectionContent: string,
  drawingPrompt?: DrawingPrompt
): string {
  const lines: string[] = [
    `[특허 도면 생성 — 도 ${figureNumber}]`,
    "흑백 특허 명세서용 선도. 텍스트·참조부호는 명확히.",
    "",
    getDrawingReferenceNumberRulesBlock(),
    ""
  ];

  if (drawingPrompt) {
    lines.push(
      `【도면 제목】 ${drawingPrompt.title}`,
      `【도면 유형】 ${drawingPrompt.drawing_type}`,
      `【목적】 ${drawingPrompt.purpose}`,
      drawingPrompt.required_elements.length > 0
        ? `【필수 구성】 ${drawingPrompt.required_elements.join(", ")}`
        : "",
      drawingPrompt.relative_layout ? `【배치】 ${drawingPrompt.relative_layout}` : "",
      drawingPrompt.arrows_or_connections ? `【연결·화살표】 ${drawingPrompt.arrows_or_connections}` : "",
      drawingPrompt.reference_number_guidance
        ? `【참조부호】 ${drawingPrompt.reference_number_guidance}`
        : "",
      drawingPrompt.style_instruction ? `【스타일】 ${drawingPrompt.style_instruction}` : "",
      ""
    );
  }

  const body = sectionContent.trim();
  if (body) {
    lines.push("【편집 영역 프롬프트】", body);
  } else if (!drawingPrompt) {
    lines.push("(도면 프롬프트 본문이 비어 있습니다. 편집 영역에 지시를 작성한 뒤 다시 시도하세요.)");
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

/** 프롬프트를 클립보드에 복사하고 Nano Banana 2(기본: Google AI Studio) 탭을 연다 */
export async function launchNanoBananaDrawing(prompt: string): Promise<void> {
  await navigator.clipboard.writeText(prompt);
  window.open(getNanoBananaStudioUrl(), "_blank", "noopener,noreferrer");
}
