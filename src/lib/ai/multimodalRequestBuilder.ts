import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";
import type { TextInputs } from "@/types/patentDraft";

export type OpenAiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "low" | "high" | "auto" } }
  | { type: "file"; file: { filename: string; file_data: string } };

function toBase64DataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

const IMAGE_ANALYSIS_INSTRUCTION =
  "이 이미지를 단순 OCR하지 말고, 특허명세서 작성 관점에서 도면의 구조, 구성요소, 연결관계, 동작 흐름, 기술적 의미를 분석하라.";

export function buildMaterialsSummaryText(
  projectName: string,
  userTextInputs: TextInputs,
  prepared: PreparedAiInput[]
): string {
  const textBlocks = [
    userTextInputs.overview && `발명 개요: ${userTextInputs.overview}`,
    userTextInputs.coreIdea && `핵심 아이디어: ${userTextInputs.coreIdea}`,
    userTextInputs.existingProblems && `기존 문제점: ${userTextInputs.existingProblems}`,
    userTextInputs.differentiators && `차별점: ${userTextInputs.differentiators}`,
    userTextInputs.embodimentNotes && `실시예 메모: ${userTextInputs.embodimentNotes}`,
    userTextInputs.otherNotes && `기타 참고: ${userTextInputs.otherNotes}`
  ].filter(Boolean);

  const fileMeta = prepared.map(
    (p) =>
      `- ${p.name} (${p.aiInputMode}, source: ${p.sourceType}, fallback: ${p.fallbackUsed}) — ${p.analysisNotes}`
  );

  return [
    `프로젝트명: ${projectName}`,
    "",
    "=== 사용자 직접 입력 ===",
    textBlocks.length ? textBlocks.join("\n") : "(없음)",
    "",
    "=== 업로드 자료 메타 ===",
    fileMeta.length ? fileMeta.join("\n") : "(없음)"
  ].join("\n");
}

export function buildOpenAiUserContentParts(
  systemPrompt: string,
  projectName: string,
  userTextInputs: TextInputs,
  prepared: PreparedAiInput[]
): OpenAiContentPart[] {
  const parts: OpenAiContentPart[] = [
    { type: "text", text: systemPrompt },
    { type: "text", text: buildMaterialsSummaryText(projectName, userTextInputs, prepared) }
  ];

  for (const file of prepared) {
    if (file.fallbackUsed && file.fallbackText) {
      parts.push({
        type: "text",
        text: `[${file.name} — 텍스트 추출 fallback]\n${file.fallbackText}`
      });
      continue;
    }

    const dataUrl = toBase64DataUrl(file.buffer, file.mimeType);

    if (file.aiInputMode === "image_input") {
      parts.push({ type: "text", text: `${IMAGE_ANALYSIS_INSTRUCTION}\n파일: ${file.name}` });
      parts.push({ type: "image_url", image_url: { url: dataUrl, detail: "high" } });
      continue;
    }

    // OpenAI Chat Completions: type "file" + file_data 는 data:application/pdf;base64,... 만 허용
    if (file.aiInputMode === "pdf_input" && file.mimeType === "application/pdf") {
      parts.push({
        type: "text",
        text: `다음 PDF를 단순 텍스트 변환 없이 문서 구조·표·도면·이미지·레이아웃과 함께 해석하라: ${file.name}`
      });
      parts.push({ type: "file", file: { filename: file.name, file_data: dataUrl } });
      continue;
    }
  }

  return parts;
}
