import "server-only";

import { detectFileType } from "@/lib/fileInput/detectFileType";
import { fallbackExtractText } from "@/lib/fileInput/fallbackExtractText";
import type { MaterialSourceType, PreparedAiInput } from "@/lib/fileInput/fileInputTypes";

const MAX_NATIVE_BYTES = 20 * 1024 * 1024;

export interface PrepareFileOptions {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  sourceType: MaterialSourceType;
}

export async function prepareAiFileInput(
  buffer: Buffer,
  options: PrepareFileOptions
): Promise<PreparedAiInput> {
  const detected = detectFileType(options.name, options.mimeType);
  let fallbackUsed = false;
  let fallbackText: string | undefined;
  let analysisNotes = "";
  let aiInputMode = detected.aiInputMode;

  if (detected.aiInputMode === "text_fallback") {
    fallbackText = buffer.toString("utf-8").trim() || (await fallbackExtractText(buffer, options.name, detected.aiInputMode));
    fallbackUsed = true;
    aiInputMode = "text_fallback";
    analysisNotes = "텍스트 파일 — 텍스트 입력 분석";
  } else if (!detected.supportsNativeAiInput) {
    fallbackText = await fallbackExtractText(buffer, options.name, detected.aiInputMode);
    fallbackUsed = true;
    aiInputMode = "text_fallback";
    analysisNotes = "원본 파일 직접 입력이 불가하여 텍스트 추출 기반 분석을 사용합니다.";
  } else if (buffer.length > MAX_NATIVE_BYTES) {
    fallbackText = await fallbackExtractText(buffer, options.name, detected.aiInputMode);
    fallbackUsed = true;
    aiInputMode = "text_fallback";
    analysisNotes = `파일 크기 제한 초과 — 텍스트 추출 fallback (${options.size} bytes)`;
  } else {
    aiInputMode = detected.aiInputMode;
    analysisNotes = getNativeAnalysisNote(detected.aiInputMode);
  }

  return {
    fileId: options.fileId,
    name: options.name,
    mimeType: detected.mimeType,
    extension: detected.extension,
    size: options.size,
    sourceType: options.sourceType,
    aiInputMode,
    buffer,
    fallbackText,
    fallbackUsed,
    analysisNotes
  };
}

function getNativeAnalysisNote(mode: PreparedAiInput["aiInputMode"]): string {
  switch (mode) {
    case "image_input":
      return "이미지 원본을 멀티모달 입력으로 전달하여 도면·구조·UI·흐름을 해석합니다.";
    case "pdf_input":
      return "PDF 원본을 파일 입력으로 전달하여 본문·표·도면·레이아웃을 함께 해석합니다.";
    case "document_input":
      return "문서 원본을 파일 입력으로 전달하여 구조·표·이미지·문단 흐름을 해석합니다.";
    case "spreadsheet_input":
      return "표 파일 원본을 전달하여 실험 조건·수치·경향성을 해석합니다.";
    default:
      return "원본 파일 기반 분석";
  }
}
