import { describe, expect, it } from "vitest";
import { createEmptySections } from "@/lib/specificationSections";
import { ensureSectionsForSupplementUpdates } from "@/lib/supplement/ensureSectionsForSupplementUpdates";
import {
  coerceSupplementSectionUpdates,
  normalizeSupplementSectionId,
  parseSectionUpdatesFromReply
} from "@/lib/supplement/parseSupplementSectionUpdates";

describe("normalizeSupplementSectionId", () => {
  it("normalizes drawing and claim aliases", () => {
    expect(normalizeSupplementSectionId("drawing_3")).toBe("drawing_3");
    expect(normalizeSupplementSectionId("도 3")).toBe("drawing_3");
    expect(normalizeSupplementSectionId("figure_2")).toBe("drawing_2");
    expect(normalizeSupplementSectionId("청구항 4")).toBe("claim_4");
    expect(normalizeSupplementSectionId("detailed_description")).toBe("detailed_description");
  });
});

describe("coerceSupplementSectionUpdates", () => {
  it("merges API updates with reply blocks and prefers longer content", () => {
    const reply = `도 3 프롬프트를 제안합니다.

【도 3】
청구항 1의 제어 방법 흐름도. 단계 S1에서 입력을 수신하고, S2에서 처리하며, S3에서 출력한다.`;

    const updates = coerceSupplementSectionUpdates(reply, [
      {
        section_id: "도 3",
        content: "짧은 요약",
        reason: "도 3 신설"
      }
    ]);

    expect(updates).toHaveLength(1);
    expect(updates[0].section_id).toBe("drawing_3");
    expect(updates[0].content).toContain("단계 S1");
  });
});

describe("parseSectionUpdatesFromReply", () => {
  it("ignores blocks shorter than minimum length", () => {
    const reply = "【도 3】\n비어 있는 도 3 항목에 프롬프트를 신설하기 위함\n\n명세서에 반영";
    expect(parseSectionUpdatesFromReply(reply)).toHaveLength(0);
  });
});

describe("ensureSectionsForSupplementUpdates", () => {
  it("inserts missing drawing section before apply", () => {
    const base = createEmptySections(2, 2);
    const result = ensureSectionsForSupplementUpdates(
      base,
      [{ section_id: "drawing_3", content: "도 3 프롬프트 본문입니다. 흐름도 단계를 순서대로 표시한다." }],
      { claimCount: 2, drawingCount: 2 },
      [],
      []
    );

    expect(result.sections.some((s) => s.section_id === "drawing_3")).toBe(true);
    expect(result.options.drawingCount).toBe(3);
    expect(result.drawingPrompts.some((d) => d.figure_number === 3)).toBe(true);
  });
});
