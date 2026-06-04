import { describe, expect, it } from "vitest";
import {
  buildSpecificationSectionExports,
  buildSpecificationSectionParagraphs,
  sanitizeExportFileName
} from "@/lib/exportSpecificationDocx";
import { htmlFragmentToPlainText, parseSectionContentBlocks } from "@/lib/specContentBlocks";
import type { SpecificationSection } from "@/types/patentDraft";

function section(title: string, content: string, id = "test"): SpecificationSection {
  return {
    section_id: id,
    title,
    content,
    isGenerating: false,
    lastUpdatedAt: new Date().toISOString()
  };
}

describe("exportSpecificationDocx", () => {
  it("sanitizes unsafe file name characters", () => {
    expect(sanitizeExportFileName('발명:테스트/1')).toBe("발명_테스트_1");
    expect(sanitizeExportFileName("  ")).toBe("명세서");
  });

  it("builds paragraphs per section in editor order", () => {
    const sections = [
      section("【기술분야】", "본 발명은 …"),
      section("【청구항 1】", "장치.", "claim_1")
    ];
    const blocks = buildSpecificationSectionParagraphs(sections);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].title).toBe("【기술분야】");
    expect(blocks[0].paragraphs[0]).toContain("본 발명은");
    expect(blocks[1].title).toBe("【청구항 1】");
  });

  it("includes section title even when content is empty", () => {
    const blocks = buildSpecificationSectionParagraphs([section("【요약】", "")]);
    expect(blocks[0].title).toBe("【요약】");
    expect(blocks[0].paragraphs).toHaveLength(0);
  });

  it("preserves line breaks from HTML br and div when section has tables", () => {
    const content =
      '<div class="spec-prose">실시예 1<br>조건 설명</div>\n<table><tr><td>A</td></tr></table>\n비교예 설명';
    const blocks = parseSectionContentBlocks(content);
    const paragraphs = blocks.filter((b) => b.type === "paragraph");
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
    expect(paragraphs[0].type === "paragraph" && paragraphs[0].text).toBe("실시예 1");
    expect(paragraphs.some((b) => b.type === "paragraph" && b.text.includes("비교예"))).toBe(
      true
    );
    expect(htmlFragmentToPlainText("줄1<br>줄2")).toContain("줄1");
    expect(htmlFragmentToPlainText("줄1<br>줄2")).toMatch(/줄1[\s\S]*줄2/);
  });

  it("parses HTML tables into table blocks for export", () => {
    const content =
      "해석 문단.\n\n<table><caption>[표 1] 조건</caption><tr><th>항목</th><th>값</th></tr><tr><td>A</td><td>1</td></tr></table>";
    const blocks = parseSectionContentBlocks(content);
    expect(blocks.some((b) => b.type === "paragraph" && b.text.includes("해석"))).toBe(true);
    const tableBlock = blocks.find((b) => b.type === "table");
    expect(tableBlock?.type).toBe("table");
    if (tableBlock?.type === "table") {
      expect(tableBlock.table.caption).toContain("[표 1]");
      expect(tableBlock.table.rows[0]).toEqual(["항목", "값"]);
      expect(tableBlock.table.rows[1]).toEqual(["A", "1"]);
    }

    const exports = buildSpecificationSectionExports([
      section("【구체적인 내용】", content, "detailed_description")
    ]);
    expect(exports[0].blocks.some((b) => b.type === "table")).toBe(true);
  });
});
