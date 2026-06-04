import { describe, expect, it } from "vitest";
import { buildDrawingGenerationPrompt } from "@/lib/drawingPromptClipboard";
import type { DrawingPrompt } from "@/types/patentDraft";

const samplePrompt: DrawingPrompt = {
  figure_number: 1,
  title: "시스템 구성도",
  drawing_type: "블록도",
  purpose: "전체 구성 표시",
  required_elements: ["처리부", "저장부"],
  relative_layout: "좌에서 우로",
  arrows_or_connections: "화살표로 데이터 흐름",
  reference_number_guidance: "100번대: 시스템",
  style_instruction: "흑백 선도"
};

describe("drawingPromptClipboard", () => {
  it("builds export prompt with figure metadata", () => {
    const text = buildDrawingGenerationPrompt(1, "블록 A와 B를 연결", samplePrompt);
    expect(text).toContain("도 1");
    expect(text).toContain("시스템 구성도");
    expect(text).toContain("블록 A와 B를 연결");
    expect(text).toContain("참조부호");
  });
});
