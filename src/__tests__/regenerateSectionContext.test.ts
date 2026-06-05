import { describe, expect, it } from "vitest";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";
import {
  buildClaimRewriteUserInstruction,
  buildLiveClaimsFromSections,
  formatSingleDrawingContextBlock,
  parseDrawingSectionNumber
} from "@/lib/regenerateSectionContext";
import type { ClaimDraft, SpecificationSection } from "@/types/patentDraft";

describe("regenerateSectionContext", () => {
  it("parses drawing section number", () => {
    expect(parseDrawingSectionNumber("drawing_3")).toBe(3);
    expect(parseDrawingSectionNumber("claim_1")).toBeNull();
  });

  it("uses live claim text from editor sections", () => {
    const claims: ClaimDraft[] = [
      { claim_number: 1, category: "independent", text: "stale claim 1" },
      { claim_number: 2, category: "dependent", text: "stale claim 2", dependency: 1 }
    ];
    const sections: SpecificationSection[] = [
      {
        section_id: "claim_1",
        title: "청구항 1",
        content: "live claim 1 body",
        isGenerating: false,
        lastUpdatedAt: ""
      },
      {
        section_id: "claim_2",
        title: "청구항 2",
        content: "live claim 2 body",
        isGenerating: false,
        lastUpdatedAt: ""
      }
    ];

    const live = buildLiveClaimsFromSections(sections, claims);
    expect(live[0].text).toBe("live claim 1 body");
    expect(live[1].text).toBe("live claim 2 body");
  });

  it("formats single-drawing context for one figure only", () => {
    const block = formatSingleDrawingContextBlock(
      {
        drawingCount: 3,
        figureNumbers: [1, 2, 3],
        drawings: [
          { figure_number: 1, title: "시스템 구성도" },
          { figure_number: 2, title: "흐름도" },
          { figure_number: 3, title: "UI 화면" }
        ]
      },
      1
    );

    expect(block).toContain("오직 도 1만");
    expect(block).toContain("도 1이 아닌 다른 도면");
    expect(block).not.toContain("도 2: 흐름도");
  });

  it("builds distinct dependent claim instructions", () => {
    const analysis = {
      ...emptyInventionAnalysis,
      one_line_summary: "요약",
      core_idea: "핵심",
      claim_points: ["포인트A", "포인트B", "포인트C"],
      essential_elements: ["요소1", "요소2", "요소3"],
      optional_elements: ["선택1", "선택2"]
    };
    const claims: ClaimDraft[] = [
      { claim_number: 1, category: "independent", text: "청구항 1 본문" }
    ];

    const claim2 = buildClaimRewriteUserInstruction(2, analysis, claims);
    const claim3 = buildClaimRewriteUserInstruction(3, analysis, claims);

    expect(claim2).toContain("종속항");
    expect(claim2).toContain("청구항 1");
    expect(claim3).not.toBe(claim2);
    expect(claim3).toContain("이전 청구항과 **다른**");
  });
});
