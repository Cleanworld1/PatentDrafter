import { describe, expect, it } from "vitest";
import { shouldReplaceSectionFresh } from "@/lib/client/regenerateSectionStreaming";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";
import { resolveSectionConciseInstruction } from "@/lib/regenerateSectionContext";

describe("regenerateSectionStreaming", () => {
  it("replaces fresh content only for rewrite and concise", () => {
    expect(shouldReplaceSectionFresh("rewrite")).toBe(true);
    expect(shouldReplaceSectionFresh("concise")).toBe(true);
    expect(shouldReplaceSectionFresh("elaborate")).toBe(false);
    expect(shouldReplaceSectionFresh("supplement")).toBe(false);
  });
});

describe("resolveSectionConciseInstruction", () => {
  it("includes previous content and concise rule", () => {
    const instruction = resolveSectionConciseInstruction(
      "technical_field",
      {
        analysis: emptyInventionAnalysis,
        specificationSections: [],
        claims: [],
        drawingPrompts: []
      },
      "이전 기술분야 본문입니다."
    );
    expect(instruction).toContain("더 짧고 간결하게");
    expect(instruction).toContain("이전 기술분야 본문");
    expect(instruction).toContain("처음부터 전체를 새로");
  });
});
