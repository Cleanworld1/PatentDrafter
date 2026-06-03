import { describe, expect, it } from "vitest";
import { buildNanoBananaDrawingPrompt } from "@/lib/nanoBananaDrawing";
import type { DrawingPrompt } from "@/types/patentDraft";

const samplePrompt: DrawingPrompt = {
  figure_number: 1,
  title: "시스템 구성도",
  drawing_type: "시스템도",
  purpose: "전체 구성",
  required_elements: ["입력부", "처리부"],
  relative_layout: "좌우 배치",
  arrows_or_connections: "화살표",
  reference_number_guidance: "100: 입력부, 200: 처리부",
  style_instruction: "흑백 선도"
};

describe("nanoBananaDrawing", () => {
  it("includes reference number rules and section content", () => {
    const text = buildNanoBananaDrawingPrompt(1, "블록 A와 B를 연결", samplePrompt);
    expect(text).toContain("동일 참조번호");
    expect(text).toContain("중복 지지");
    expect(text).toContain("블록 A와 B를 연결");
    expect(text).toContain("시스템 구성도");
  });
});
