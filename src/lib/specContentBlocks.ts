import { hasRenderableHtml, TABLE_BLOCK_RE } from "@/lib/specEditorHtml";

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

function cellTextFromHtml(inner: string): string {
  return decodeHtmlEntities(
    inner
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** export용 — <br>, <p>, <div> 등을 줄바꿈으로 변환 */
export function htmlFragmentToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (!/<[a-z]/i.test(trimmed)) return trimmed;

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(
      `<div id="plain-root">${trimmed}</div>`,
      "text/html"
    );
    const root = doc.getElementById("plain-root");
    if (root) {
      return (root.innerText || root.textContent || "")
        .replace(/\u00a0/g, " ")
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    }
  }

  return decodeHtmlEntities(
    trimmed
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/[ \t\f\v]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
  ).trim();
}

function plainTextToParagraphBlocks(text: string): SectionContentBlock[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((lineText) => ({ type: "paragraph" as const, text: lineText }));
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

  if (!hasRenderableHtml(trimmed)) {
    const plain =
      /<(?:br|p|div)\b/i.test(trimmed) ? htmlFragmentToPlainText(trimmed) : trimmed;
    return plainTextToParagraphBlocks(plain);
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
    blocks.push(...plainTextToParagraphBlocks(htmlFragmentToPlainText(piece)));
  }

  return blocks;
}
