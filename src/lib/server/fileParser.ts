import "server-only";

import mammoth from "mammoth";

const MAX_CHARS = 120_000;

function truncate(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return `${text.slice(0, MAX_CHARS)}\n\n[이하 ${text.length - MAX_CHARS}자 생략]`;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function ensurePdfParseWorker(): Promise<void> {
  await import("pdf-parse/worker");
}

async function extractPdf(buffer: Buffer): Promise<string> {
  await ensurePdfParseWorker();
  const { PDFParse } = await import("pdf-parse");
  const { CanvasFactory } = await import("pdf-parse/worker");
  const parser = new PDFParse({ data: buffer, CanvasFactory });
  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeWhitespace(result.value ?? "");
}

export async function extractTextFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return truncate(normalizeWhitespace(buffer.toString("utf-8")));
  }

  if (lower.endsWith(".docx")) {
    const text = await extractDocx(buffer);
    if (!text) throw new Error(`${fileName}: DOCX에서 추출할 텍스트가 없습니다.`);
    return truncate(text);
  }

  if (lower.endsWith(".pdf")) {
    const text = await extractPdf(buffer);
    if (!text) throw new Error(`${fileName}: PDF에서 추출할 텍스트가 없습니다.`);
    return truncate(text);
  }

  if (lower.endsWith(".hwp")) {
    throw new Error(
      `${fileName}: HWP는 아직 서버 파싱을 지원하지 않습니다. DOCX 또는 PDF로 변환 후 업로드해 주세요.`
    );
  }

  throw new Error(`지원하지 않는 파일 형식입니다: ${fileName}`);
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
