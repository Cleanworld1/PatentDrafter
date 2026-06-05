import type {
  AiInputMode,
  DraftOptions,
  MaterialSourceType,
  MaterialType,
  TextInputs
} from "@/types/patentDraft";

export type { AiInputMode, MaterialSourceType };

import type { FileProcessingStatus } from "@/types/patentDraft";

export type { FileProcessingStatus };

export const AI_INPUT_MODE_LABELS: Record<AiInputMode, string> = {
  native_file: "원본 파일 분석",
  image_input: "이미지 원본 분석",
  pdf_input: "PDF 원본 분석",
  document_input: "문서 원본 분석",
  spreadsheet_input: "표 원본 분석",
  text_fallback: "텍스트 추출 fallback"
};

export interface DetectedFileType {
  extension: string;
  mimeType: string;
  aiInputMode: AiInputMode;
  supportsNativeAiInput: boolean;
}

export interface PreparedAiInput {
  fileId: string;
  name: string;
  mimeType: string;
  extension: string;
  size: number;
  sourceType: MaterialSourceType;
  aiInputMode: AiInputMode;
  buffer: Buffer;
  fallbackText?: string;
  fallbackUsed: boolean;
  analysisNotes: string;
}

export interface AnalyzeMaterialsPayload {
  task: "analyze_invention_materials";
  projectName: string;
  userTextInputs: TextInputs;
  options: DraftOptions;
  materials: Array<{
    fileId: string;
    name: string;
    mimeType: string;
    extension: string;
    size: number;
    sourceType: MaterialSourceType;
    materialType: MaterialType;
    aiInputMode: AiInputMode;
    fallbackUsed: boolean;
    analysisNotes: string;
    extractedText?: string;
  }>;
}

export function materialTypeToSourceType(materialType: MaterialType): MaterialSourceType {
  const map: Record<MaterialType, MaterialSourceType> = {
    발명제안서: "invention_proposal",
    사업계획서: "business_plan",
    회의록: "meeting_note",
    메모: "etc",
    실험데이터: "experiment_data",
    "도면 설명": "drawing",
    "기존 명세서 초안": "prior_specification",
    기타: "etc"
  };
  return map[materialType] ?? "etc";
}
