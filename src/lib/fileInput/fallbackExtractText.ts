import "server-only";

import * as XLSX from "xlsx";
import { extractTextFromBuffer } from "@/lib/server/fileParser";
import type { AiInputMode } from "@/lib/fileInput/fileInputTypes";

export async function fallbackExtractText(
  buffer: Buffer,
  fileName: string,
  aiInputMode: AiInputMode
): Promise<string> {
  const lower = fileName.toLowerCase();

  if (aiInputMode === "spreadsheet_input" || lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv")) {
    return extractSpreadsheetText(buffer, lower.endsWith(".csv"));
  }

  if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) {
    return extractPptxPlaceholder(fileName);
  }

  if (lower.endsWith(".hwp") || lower.endsWith(".hwpx")) {
    throw new Error(`${fileName}: HWP/HWPX는 텍스트 추출 fallback을 아직 지원하지 않습니다. PDF 또는 DOCX로 변환해 주세요.`);
  }

  return extractTextFromBuffer(buffer, fileName);
}

function extractSpreadsheetText(buffer: Buffer, isCsv: boolean): string {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: isCsv });
  const sheets: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    sheets.push(`[시트: ${sheetName}]\n${csv}`);
  }

  return sheets.join("\n\n");
}

function extractPptxPlaceholder(fileName: string): string {
  return `[PPTX 자료: ${fileName}]\n슬라이드 원본 분석이 OpenAI API에서 가능할 때는 파일 원본을 우선 사용합니다. API 미연동 또는 실패 시에는 슬라이드별 텍스트 추출 모듈을 추가 연동할 예정입니다.`;
}
