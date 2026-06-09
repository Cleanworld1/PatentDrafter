import { describe, expect, it } from "vitest";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";
import {
  formatPrunedWrittenSpecificationContext,
  getRelatedSectionIdsForRegenerate,
  pruneAnalysisForRegenerate,
  pruneSpecificationSectionsForRequest,
  sectionContentToPromptText
} from "@/lib/regeneratePromptPruning";

describe("regeneratePromptPruning", () => {
  it("strips HTML tables to compact prompt text", () => {
    const html = "<table><tr><td>셀1</td><td>셀2</td></tr></table>본문";
    const out = sectionContentToPromptText(html, 500);
    expect(out).toContain("[표]");
    expect(out).not.toContain("<table");
  });

  it("picks only related sections for drawing regenerate", () => {
    const sections = [
      { section_id: "technical_field", content: "AI" },
      { section_id: "background_art", content: "선행" },
      { section_id: "means_for_solving", content: "해결" },
      { section_id: "claim_1", content: "청구항" },
      { section_id: "drawing_1", content: "도1" },
      { section_id: "drawing_2", content: "도2" },
      { section_id: "drawing_3", content: "도3" }
    ];
    const related = getRelatedSectionIdsForRegenerate("drawing_3", sections);
    expect(related).toContain("means_for_solving");
    expect(related).toContain("claim_1");
    expect(related).toContain("drawing_1");
    expect(related).not.toContain("background_art");
  });

  it("prunes analysis heavy fields for title section", () => {
    const analysis = {
      ...emptyInventionAnalysis,
      visual_material_analysis: ["a".repeat(500)],
      document_structure_analysis: ["b".repeat(500)],
      operation_flow: ["step1", "step2"]
    };
    const pruned = pruneAnalysisForRegenerate("invention_title", analysis);
    expect(pruned.visual_material_analysis).toEqual([]);
    expect(pruned.operation_flow).toEqual([]);
  });

  it("limits written spec total size", () => {
    const sections = Array.from({ length: 20 }, (_, i) => ({
      section_id: `claim_${i + 1}`,
      content: "가".repeat(2000)
    }));
    const block = formatPrunedWrittenSpecificationContext(sections, "claim_1", [
      "claim_2",
      "claim_3",
      "claim_4",
      "claim_5"
    ]);
    expect(block.length).toBeLessThan(8000);
    expect(block).not.toContain("claim_1");
  });

  it("sends fewer sections in API request body pruning", () => {
    const sections = [
      { section_id: "technical_field", content: "x".repeat(5000) },
      { section_id: "background_art", content: "y".repeat(5000) },
      { section_id: "means_for_solving", content: "z".repeat(500) },
      { section_id: "claim_1", content: "청구항" },
      { section_id: "drawing_1", content: "도1" }
    ];
    const pruned = pruneSpecificationSectionsForRequest(sections, "drawing_1");
    expect(pruned.length).toBeLessThan(sections.length);
    expect(pruned.every((s) => s.content.length <= 1200)).toBe(true);
  });
});
