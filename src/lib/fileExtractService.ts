import { detectFileType, getExtension } from "@/lib/fileInput/detectFileType";
import { materialTypeToSourceType } from "@/lib/fileInput/fileInputTypes";
import type { AiInputMode, FileProcessingStatus, MaterialType, UploadedFile } from "@/types/patentDraft";

const SUPPORTED_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".webp", ".gif",
  ".pdf",
  ".docx", ".doc", ".hwp", ".hwpx",
  ".pptx", ".ppt",
  ".xlsx", ".xls", ".csv",
  ".txt", ".md"
];

export function getSupportedExtensions(): string[] {
  return SUPPORTED_EXTENSIONS;
}

export function isSupportedFile(name: string): boolean {
  const ext = getExtension(name);
  return SUPPORTED_EXTENSIONS.includes(ext);
}

export function createFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function defaultMaterialTypeForFile(name: string): MaterialType {
  const lower = name.toLowerCase();
  if (lower.includes("회의")) return "회의록";
  if (lower.includes("사업")) return "사업계획서";
  if (lower.includes("실험")) return "실험데이터";
  if (lower.includes("명세")) return "기존 명세서 초안";
  if (lower.includes("도면")) return "도면 설명";
  return "발명제안서";
}

export function createUploadedFileFromBrowserFile(file: File): UploadedFile {
  const detected = detectFileType(file.name, file.type);
  const materialType = defaultMaterialTypeForFile(file.name);
  const isHwp = detected.extension === ".hwp" || detected.extension === ".hwpx";

  let status: FileProcessingStatus = "native_ready";
  let analysisNotes = detected.supportsNativeAiInput
    ? "서버에서 원본 파일 기반 AI 분석을 수행합니다."
    : "텍스트 추출 fallback 예정";

  if (isHwp) {
    status = "unsupported";
    analysisNotes = "HWP/HWPX — 텍스트 추출 fallback 예정 (DOCX/PDF 변환 권장)";
  } else if (detected.aiInputMode === "text_fallback") {
    status = "fallback_ready";
    analysisNotes = "텍스트 파일 — 분석 시 텍스트 입력으로 처리";
  }

  return {
    id: createFileId(),
    name: file.name,
    size: file.size,
    mimeType: detected.mimeType,
    extension: detected.extension,
    materialType,
    sourceType: materialTypeToSourceType(materialType),
    aiInputMode: detected.aiInputMode,
    fileObjectRef: "",
    extractedText: "",
    analysisNotes,
    fallbackUsed: !detected.supportsNativeAiInput || isHwp,
    status
  };
}
