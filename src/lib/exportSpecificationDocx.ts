import type { SpecificationSection } from "@/types/patentDraft";

export function sanitizeExportFileName(title: string): string {
  const base = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return base || "명세서";
}

/** Word 문서 본문 단락용 — 섹션 제목 + 내용 */
export function buildSpecificationSectionParagraphs(
  sections: SpecificationSection[]
): { title: string; paragraphs: string[] }[] {
  return sections.map((section) => {
    const body = section.content.trim();
    const paragraphs = body
      ? body
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean)
      : [];
    return { title: section.title, paragraphs };
  });
}

export async function downloadSpecificationAsDocx(
  sections: SpecificationSection[],
  projectTitle: string
): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");

  const blocks = buildSpecificationSectionParagraphs(sections);
  const children = blocks.flatMap(({ title, paragraphs }) => {
    const heading = new Paragraph({
      text: title,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 }
    });
    if (paragraphs.length === 0) {
      return [heading];
    }
    const body = paragraphs.map(
      (text) =>
        new Paragraph({
          children: [new TextRun({ text })],
          spacing: { after: 120 }
        })
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
