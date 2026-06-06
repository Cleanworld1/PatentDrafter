import { describe, expect, it } from "vitest";
import { buildPostFullDraftRefinementPlan } from "@/lib/workflow/postFullDraftRefinement";

describe("postFullDraftRefinement plan", () => {
  it("orders phase1 rewrite then drawings then detailed", () => {
    const plan = buildPostFullDraftRefinementPlan(2, 2);
    const ids = plan.map((s) => `${s.sectionId}:${s.mode}`);

    expect(ids.indexOf("invention_title:rewrite")).toBeLessThan(ids.indexOf("claim_1:rewrite"));
    expect(ids.indexOf("claim_2:rewrite")).toBeLessThan(ids.indexOf("summary:rewrite"));
    expect(ids.indexOf("summary:rewrite")).toBeLessThan(ids.indexOf("means_for_solving:rewrite"));
    expect(ids.indexOf("brief_description_of_drawings:rewrite")).toBeLessThan(
      ids.indexOf("drawing_1:rewrite")
    );
    expect(ids).toContain("drawing_1:rewrite");
    expect(ids).not.toContain("drawing_1:elaborate");
    expect(ids).not.toContain("drawing_2:elaborate");
    expect(ids.indexOf("drawing_2:rewrite")).toBeLessThan(ids.indexOf("detailed_description:rewrite"));
    expect(ids[ids.length - 1]).toBe("detailed_description:elaborate");
  });
});
