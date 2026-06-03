import type { AiInputMode, DetectedFileType } from "@/lib/fileInput/fileInputTypes";
import type { FileProcessingStatus } from "@/types/patentDraft";

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const PDF_EXT = [".pdf"];
const DOC_EXT = [".docx", ".doc", ".hwp", ".hwpx"];
const PPT_EXT = [".pptx", ".ppt"];
const SHEET_EXT = [".xlsx", ".xls", ".csv"];
const TEXT_EXT = [".txt", ".md"];

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function detectFileType(fileName: string, mimeType = ""): DetectedFileType {
  const extension = getExtension(fileName);
  const lowerMime = mimeType.toLowerCase();

  if (IMAGE_EXT.includes(extension) || lowerMime.startsWith("image/")) {
    return {
      extension,
      mimeType: mimeType || `image/${extension.replace(".", "")}`,
      aiInputMode: "image_input",
      supportsNativeAiInput: true
    };
  }

  if (PDF_EXT.includes(extension) || lowerMime === "application/pdf") {
    return {
      extension,
      mimeType: mimeType || "application/pdf",
      aiInputMode: "pdf_input",
      supportsNativeAiInput: true
    };
  }

  if (PPT_EXT.includes(extension) || lowerMime.includes("presentation")) {
    return {
      extension,
      mimeType: mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      aiInputMode: "document_input",
      supportsNativeAiInput: true
    };
  }

  if (DOC_EXT.includes(extension) || lowerMime.includes("wordprocessing") || lowerMime.includes("hwp")) {
    const isHwp = extension === ".hwp" || extension === ".hwpx";
    return {
      extension,
      mimeType: mimeType || (isHwp ? "application/x-hwp" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
      aiInputMode: "document_input",
      supportsNativeAiInput: !isHwp
    };
  }

  if (SHEET_EXT.includes(extension) || lowerMime.includes("spreadsheet") || lowerMime === "text/csv") {
    return {
      extension,
      mimeType: mimeType || (extension === ".csv" ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      aiInputMode: "spreadsheet_input",
      supportsNativeAiInput: extension !== ".xls"
    };
  }

  if (TEXT_EXT.includes(extension) || lowerMime.startsWith("text/")) {
    return {
      extension,
      mimeType: mimeType || "text/plain",
      aiInputMode: "text_fallback",
      supportsNativeAiInput: false
    };
  }

  return {
    extension,
    mimeType: mimeType || "application/octet-stream",
    aiInputMode: "text_fallback",
    supportsNativeAiInput: false
  };
}

export function getAiInputModeLabel(mode: AiInputMode, fileName: string): string {
  switch (mode) {
    case "image_input":
      return `${fileName} — 이미지 원본 분석`;
    case "pdf_input":
      return `${fileName} — PDF 원본 분석`;
    case "document_input":
      return `${fileName} — 문서 원본 분석`;
    case "spreadsheet_input":
      return `${fileName} — 표 원본 분석`;
    case "text_fallback":
      return `${fileName} — 텍스트 입력 분석`;
    default:
      return `${fileName} — 원본 파일 분석`;
  }
}

export function getFileStatusLabel(status: FileProcessingStatus, fallbackUsed: boolean): string {
  switch (status) {
    case "preparing":
      return "원본 분석 준비 중";
    case "native_ready":
      return fallbackUsed ? "fallback 텍스트 추출 사용" : "원본 분석 가능";
    case "fallback_ready":
      return "fallback 텍스트 추출 사용";
    case "unsupported":
      return "지원 불가";
    case "error":
      return "오류";
    default:
      return "";
  }
}
