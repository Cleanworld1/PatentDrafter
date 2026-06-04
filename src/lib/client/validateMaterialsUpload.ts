import type { UploadedFile } from "@/types/patentDraft";

/** 브라우저 → /api/analyze multipart 업로드 상한 (dev·로컬) */
export const MAX_ANALYZE_UPLOAD_BYTES = 48 * 1024 * 1024;

export function validateMaterialsForAnalyze(
  uploadedFiles: UploadedFile[],
  getBlob: (fileId: string) => File | undefined
): string | null {
  if (uploadedFiles.length === 0) return null;

  const missing = uploadedFiles.filter((f) => !getBlob(f.id));
  if (missing.length > 0) {
    return [
      "업로드 파일 원본을 찾을 수 없습니다. 히스토리를 불러온 뒤에는 브라우저에 저장된 복사본을 사용합니다. 아래 파일을 다시 올려 주세요.",
      `누락: ${missing.map((f) => f.name).join(", ")}`
    ].join(" ");
  }

  const total = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_ANALYZE_UPLOAD_BYTES) {
    const mb = (total / (1024 * 1024)).toFixed(1);
    return `업로드 용량 합계가 ${mb}MB입니다. 한 번에 ${MAX_ANALYZE_UPLOAD_BYTES / (1024 * 1024)}MB 이하로 올리거나 파일 수를 줄여 주세요.`;
  }

  return null;
}
