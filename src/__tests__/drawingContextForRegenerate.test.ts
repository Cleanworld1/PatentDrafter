import { describe, expect, it } from "vitest";
import {
  buildCurrentDrawingContext,
  formatCurrentDrawingContextBlock,
  getDrawingCountMatchRule
} from "@/lib/drawingContextForRegenerate";
import { createEmptySections } from "@/lib/specificationSections";
import { insertDrawingSection } from "@/lib/specificationSectionOrder";
import type { DrawingPrompt } from "@/types/patentDraft";

describe("drawingContextForRegenerate", () => {
  const prompts: DrawingPrompt[] = [
    {
      figure_number: 1,
      title: "시스템도",
      drawing_type: "시스템도",
      purpose: "전체 구성",
      required_elements: [],
      relative_layout: "",
      arrows_or_connections: "",
      reference_number_guidance: "",
      style_instruction: ""
    },
    {
      figure_number: 2,
      title: "흐름도",
      drawing_type: "흐름도",
      purpose: "처리 흐름",
      required_elements: [],
      relative_layout: "",
      arrows_or_connections: "",
      reference_number_guidance: "",
      style_instruction: ""
    }
  ];

  it("uses drawing section ids not analysis candidates count", () => {
    const sections = insertDrawingSection(createEmptySections(1, 2), 3);
    const ctx = buildCurrentDrawingContext(sections, [
      ...prompts,
      {
        figure_number: 3,
        title: "추가도",
        drawing_type: "구성도",
        purpose: "세부",
        required_elements: [],
        relative_layout: "",
        arrows_or_connections: "",
        reference_number_guidance: "",
        style_instruction: ""
      }
    ]);
    expect(ctx.drawingCount).toBe(3);
    expect(ctx.figureNumbers).toEqual([1, 2, 3]);
  });

  it("requires exact sentence count for brief description", () => {
    const ctx = buildCurrentDrawingContext(createEmptySections(1, 2), prompts);
    const rule = getDrawingCountMatchRule("brief_description_of_drawings", ctx);
    expect(rule).toContain("2개");
    expect(rule).toContain("정확히 2개");
    const block = formatCurrentDrawingContextBlock(ctx);
    expect(block).toContain("도 1");
    expect(block).toContain("도 2");
  });
});
