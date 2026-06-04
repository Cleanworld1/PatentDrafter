import { hasRenderableHtml, shouldUseHtmlEditor, TABLE_BLOCK_RE } from "@/lib/specEditorHtml";

export interface ParsedTable {
  caption?: string;
  rows: string[][];
  /** 첫 행이 th만으로 구성된 경우 */
  hasHeaderRow: boolean;
}

export type SectionContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "table"; table: ParsedTable };

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** HTML 조각 → export용 평문 (br·블록 요소 → \\n) */
export function htmlFragmentToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof DOMParser !== "undefined") {
    const wrapped = /^<[a-z]/i.test(trimmed) ? trimmed : `<div>${trimmed}</div>`;
    const doc = new DOMParser().parseFromString(wrapped, "text/html");
    const text = (doc.body?.innerText ?? "").replace(/\u00a0/g, " ");
    return text.replace(/\r\n/g, "\n");
  }

  return decodeHtmlEntities(
    trimmed
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>\s*/gi, "\n")
      .replace(/<\/div>\s*/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

function pushParagraphLines(blocks: SectionContentBlock[], plain: string): void {
  const normalized = plain.replace(/\r\n/g, "\n");
  for (const line of normalized.split("\n")) {
    blocks.push({ type: "paragraph", text: line });
  }
}

function cellTextFromHtml(inner: string): string {
  return decodeHtmlEntities(
    inner
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function parseHtmlTable(html: string): ParsedTable {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) {
      return { rows: [], hasHeaderRow: false };
    }
    const caption = table.querySelector("caption")?.textContent?.trim() || undefined;
    const rows: string[][] = [];
    let hasHeaderRow = false;
    for (const tr of table.querySelectorAll("tr")) {
      const ths = tr.querySelectorAll("th");
      const tds = tr.querySelectorAll("td");
      const cells = [...tr.querySelectorAll("th,td")].map((c) =>
        cellTextFromHtml(c.innerHTML || c.textContent || "")
      );
      if (cells.length > 0) {
        if (rows.length === 0 && ths.length > 0 && tds.length === 0) {
          hasHeaderRow = true;
        }
        rows.push(cells);
      }
    }
    return { caption, rows, hasHeaderRow };
  }

  const captionMatch = html.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i);
  const caption = captionMatch ? cellTextFromHtml(captionMatch[1]!) : undefined;
  const rows: string[][] = [];
  let hasHeaderRow = false;
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRe.exec(html)) !== null) {
    const rowHtml = trMatch[1]!;
    const thOnly = /<th\b/i.test(rowHtml) && !/<td\b/i.test(rowHtml);
    const cells: string[] = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRe.exec(rowHtml)) !== null) {
      cells.push(cellTextFromHtml(cellMatch[1]!));
    }
    if (cells.length > 0) {
      if (rows.length === 0 && thOnly) hasHeaderRow = true;
      rows.push(cells);
    }
  }
  return { caption, rows, hasHeaderRow };
}

/** 섹션 본문을 단락·표 블록으로 분해 (export·렌더 공용) */
export function parseSectionContentBlocks(content: string): SectionContentBlock[] {
  const trimmed = content.trim();
  if (!trimmed) return [];

  if (!hasRenderableHtml(trimmed) && !shouldUseHtmlEditor(trimmed)) {
    const blocks: SectionContentBlock[] = [];
    pushParagraphLines(blocks, trimmed);
    return blocks;
  }

  if (!hasRenderableHtml(trimmed) && shouldUseHtmlEditor(trimmed)) {
    const blocks: SectionContentBlock[] = [];
    pushParagraphLines(blocks, htmlFragmentToPlainText(trimmed));
    return blocks;
  }

  const parts = trimmed.split(TABLE_BLOCK_RE).filter((p) => p.length > 0);
  const blocks: SectionContentBlock[] = [];

  for (const part of parts) {
    const piece = part.trim();
    if (!piece) continue;
    if (/^<table/i.test(piece)) {
      const table = parseHtmlTable(piece);
      if (table.rows.length > 0) {
        blocks.push({ type: "table", table });
      }
      continue;
    }
    const plain = /<[a-z]/i.test(piece) ? htmlFragmentToPlainText(piece) : piece;
    pushParagraphLines(blocks, plain);
  }

  return blocks;
}
