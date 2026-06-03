import { describe, expect, it } from "vitest";
import {
  buildReviewSupplementInstruction,
  markSectionsForClaimChange,
  markSectionsForDrawingChange,
  SECTIONS_AFFECTED_BY_CLAIM_CHANGE,
  SECTIONS_AFFECTED_BY_DRAWING_CHANGE
} from "@/lib/claimDrawingImpact";
import { createEmptySections } from "@/lib/specificationSections";

describe("claimDrawingImpact", () => {
  it("marks only means_for_solving when claim is added", () => {
    const base = createEmptySections(2, 1);
    const next = markSectionsForClaimChange(base, 3);
    const means = next.find((s) => s.section_id === "means_for_solving");
    const brief = next.find((s) => s.section_id === "brief_description_of_drawings");
    expect(means?.needsReview).toBe(true);
    expect(means?.reviewSupplement).toBe(true);
    expect(means?.reviewMeta?.addedClaimNumbers).toEqual([3]);
    expect(brief?.needsReview).toBeFalsy();
  });

  it("marks brief and detailed when drawing is added", () => {
    const base = createEmptySections(1, 2);
    const next = markSectionsForDrawingChange(base, 3);
    const brief = next.find((s) => s.section_id === "brief_description_of_drawings");
    const detailed = next.find((s) => s.section_id === "detailed_description");
    const means = next.find((s) => s.section_id === "means_for_solving");
    expect(brief?.needsReview).toBe(true);
    expect(brief?.reviewSupplement).toBe(true);
    expect(brief?.reviewMeta?.addedFigureNumbers).toEqual([3]);
    expect(detailed?.needsReview).toBe(true);
    expect(detailed?.reviewSupplement).toBeFalsy();
    expect(means?.needsReview).toBeFalsy();
  });

  it("builds supplement instruction that preserves existing content", () => {
    const sections = createEmptySections(2, 1);
    const means = sections.find((s) => s.section_id === "means_for_solving")!;
    const instruction = buildReviewSupplementInstruction(
      "means_for_solving",
      {
        ...means,
        reviewMeta: { addedClaimNumbers: [2] }
      },
      [
        { claim_number: 1, category: "독립항", text: "독립 내용" },
        { claim_number: 2, category: "종속항", text: "종속 내용", dependency: 1 }
      ],
      []
    );
    expect(instruction).toContain("유지");
    expect(instruction).toContain("청구항 2");
    expect(instruction).not.toContain("처음부터");
  });

  it("exports separate impact section lists", () => {
    expect(SECTIONS_AFFECTED_BY_CLAIM_CHANGE).toEqual(["means_for_solving"]);
    expect(SECTIONS_AFFECTED_BY_DRAWING_CHANGE).toContain("brief_description_of_drawings");
    expect(SECTIONS_AFFECTED_BY_DRAWING_CHANGE).toContain("detailed_description");
  });
});
