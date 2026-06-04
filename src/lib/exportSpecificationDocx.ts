import { parseSectionContentBlocks, type ParsedTable, type SectionContentBlock } from "@/lib/specContentBlocks";
import type { SpecificationSection } from "@/types/patentDraft";

export function sanitizeExportFileName(title: string): string {
  const base = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return base || "명세서";
}

export interface SpecificationSectionExport {
  title: string;
  blocks: SectionContentBlock[];
}

/** Word 문서 본문용 — 섹션 제목 + 단락/표 블록 */
export function buildSpecificationSectionExports(
  sections: SpecificationSection[]
): SpecificationSectionExport[] {
  return sections.map((section) => ({
    title: section.title,
    blocks: parseSectionContentBlocks(section.content)
  }));
}

/** @deprecated — 단락 문자열만 필요할 때; 표 HTML은 한 줄로 남음 */
export function buildSpecificationSectionParagraphs(
  sections: SpecificationSection[]
): { title: string; paragraphs: string[] }[] {
  return buildSpecificationSectionExports(sections).map(({ title, blocks }) => ({
    title,
    paragraphs: blocks
      .filter((b): b is SectionContentBlock & { type: "paragraph" } => b.type === "paragraph")
      .map((b) => b.text)
  }));
}

type DocxParagraph = import("docx").Paragraph;
type DocxTable = import("docx").Table;
type DocxTextRun = import("docx").TextRun;

function textToDocxRuns(
  text: string,
  TextRun: typeof import("docx").TextRun,
  options?: { bold?: boolean }
): DocxTextRun[] {
  const bold = options?.bold ?? false;
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const runs: DocxTextRun[] = [];
  for (const line of lines) {
    if (!line) continue;
    if (runs.length > 0) {
      runs.push(new TextRun({ break: 1 }));
    }
    runs.push(new TextRun({ text: line, bold }));
  }
  return runs.length > 0 ? runs : [new TextRun({ text: text.trim(), bold })];
}

function buildDocxTable(
  table: ParsedTable,
  Table: typeof import("docx").Table,
  TableRow: typeof import("docx").TableRow,
  TableCell: typeof import("docx").TableCell,
  Paragraph: typeof import("docx").Paragraph,
  TextRun: typeof import("docx").TextRun,
  WidthType: typeof import("docx").WidthType
): DocxTable {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: table.rows.map((row, rowIndex) => {
      const isHeader = table.hasHeaderRow && rowIndex === 0;
      return new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: textToDocxRuns(cell, TextRun, { bold: isHeader })
                })
              ]
            })
        )
      });
    })
  });
}

function blocksToDocxChildren(
  blocks: SectionContentBlock[],
  Paragraph: typeof import("docx").Paragraph,
  TextRun: typeof import("docx").TextRun,
  Table: typeof import("docx").Table,
  TableRow: typeof import("docx").TableRow,
  TableCell: typeof import("docx").TableCell,
  WidthType: typeof import("docx").WidthType
): (DocxParagraph | DocxTable)[] {
  const children: (DocxParagraph | DocxTable)[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      children.push(
        new Paragraph({
          children: textToDocxRuns(block.text, TextRun),
          spacing: { after: 120 }
        })
      );
      continue;
    }

    const { table } = block;
    if (table.caption) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: table.caption, bold: true })],
          spacing: { after: 80 }
        })
      );
    }
    children.push(buildDocxTable(table, Table, TableRow, TableCell, Paragraph, TextRun, WidthType));
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "" })],
        spacing: { after: 120 }
      })
    );
  }

  return children;
}

export async function downloadSpecificationAsDocx(
  sections: SpecificationSection[],
  projectTitle: string
): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } =
    await import("docx");

  const sectionExports = buildSpecificationSectionExports(sections);
  const children = sectionExports.flatMap(({ title, blocks }) => {
    const heading = new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 }
    });
    if (blocks.length === 0) {
      return [heading];
    }
    const body = blocksToDocxChildren(
      blocks,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType
    );
    return [heading, ...body];
  });

  const doc = new Document({
    title: projectTitle,
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: projectTitle || "특허명세서",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 240 }
          }),
          ...children
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `${sanitizeExportFileName(projectTitle)}_명세서.docx`;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
