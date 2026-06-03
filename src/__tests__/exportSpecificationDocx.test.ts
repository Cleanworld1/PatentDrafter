import { describe, expect, it } from "vitest";
import {
  buildSpecificationSectionParagraphs,
  sanitizeExportFileName
} from "@/lib/exportSpecificationDocx";
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
});
