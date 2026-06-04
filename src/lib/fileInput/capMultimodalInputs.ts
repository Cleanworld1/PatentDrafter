import "server-only";

import { fallbackExtractText } from "@/lib/fileInput/fallbackExtractText";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";

/**
 * OpenAI Chat Completions에 PDF file 파트는 1개만 안정적으로 보내고,
 * 추가 PDF·대용량 원본은 텍스트 fallback으로 전환해 요청 크기·연결 끊김을 방지한다.
 */
export async function capMultimodalPreparedInputs(
  prepared: PreparedAiInput[]
): Promise<PreparedAiInput[]> {
  let pdfNativeUsed = false;
  const out: PreparedAiInput[] = [];

  for (const file of prepared) {
    if (file.fallbackUsed) {
      out.push(file);
      continue;
    }

    if (file.aiInputMode === "pdf_input") {
      if (!pdfNativeUsed) {
        pdfNativeUsed = true;
        out.push(file);
        continue;
      }
      const fallbackText = await fallbackExtractText(file.buffer, file.name, file.aiInputMode);
      out.push({
        ...file,
        fallbackUsed: true,
        fallbackText,
        aiInputMode: "text_fallback",
        analysisNotes:
          "동시에 여러 PDF 원본 전송 시 연결 오류가 발생할 수 있어, 이 파일은 텍스트 추출 fallback으로 분석합니다."
      });
      continue;
    }

    out.push(file);
  }

  return out;
}
