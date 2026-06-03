import { describe, expect, it } from "vitest";
import { getSectionGuideline, getAllSectionGuidelines } from "@/knowledge/patentSectionGuidelines";
import { buildGenerateSpecificationPrompt } from "@/prompts/generateSpecification";
import { buildRegenerateSectionPrompt } from "@/prompts/regenerateSection";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";

describe("section guidelines", () => {
  it("returns guideline per section type", () => {
    const g = getSectionGuideline("means_for_solving");
    expect(g).toContain("해결 수단");
    expect(g).toContain("청구항");
  });

  it("includes all section guidelines in generate prompt", () => {
    const prompt = buildGenerateSpecificationPrompt({
      analysis: emptyInventionAnalysis,
      options: { desiredClaimCount: 3, desiredDrawingCount: 2 },
      sectionGuidelines: getAllSectionGuidelines()
    });
    expect(prompt).toContain("항목별 작성 목적 요약");
    expect(prompt).toContain("invention_title");
    expect(prompt).toContain("means_for_solving");
  });

  it("builds regenerate section prompt with guideline", () => {
    const prompt = buildRegenerateSectionPrompt({
      sectionType: "technical_field",
      sectionTitle: "【기술분야】",
      currentContent: "기존 내용",
      analysis: emptyInventionAnalysis
    });
    expect(prompt).toContain("【기술분야】");
    expect(prompt).toContain("작성 지침");
    expect(prompt).toContain("다른 항목은 출력하지 말라");
    expect(prompt).toContain("심사관 관점 필수 작성 규칙");
    expect(prompt).toContain("목차·항목 제목");
  });
});
