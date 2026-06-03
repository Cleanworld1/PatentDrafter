import { describe, expect, it } from "vitest";
import {
  isImpactSection,
  isSectionAffectedByClaimChange,
  isSectionAffectedByDrawingChange
} from "@/lib/claimDrawingImpact";
import {
  getClaimSectionNumbers,
  insertClaimSection,
  insertDrawingSection,
  isLastClaimSection
} from "@/lib/specificationSectionOrder";
import { createEmptySections } from "@/lib/specificationSections";

describe("specificationSectionOrder", () => {
  it("inserts new claim before summary", () => {
    const base = createEmptySections(2, 1);
    const next = insertClaimSection(base, 3);
    const ids = next.map((s) => s.section_id);
    const summaryIdx = ids.indexOf("summary");
    expect(ids[summaryIdx - 1]).toBe("claim_3");
    expect(next.find((s) => s.section_id === "claim_3")?.isDraft).toBe(true);
  });

  it("detects last claim section", () => {
    const sections = createEmptySections(3, 1);
    const claimIdx = sections.findIndex((s) => s.section_id === "claim_3");
    expect(isLastClaimSection(sections, claimIdx)).toBe(true);
    expect(getClaimSectionNumbers(sections)).toEqual([1, 2, 3]);
  });

  it("appends drawing section", () => {
    const base = createEmptySections(1, 2);
    const next = insertDrawingSection(base, 3);
    expect(next[next.length - 1].section_id).toBe("drawing_3");
  });

  it("lists impact sections for claim/drawing change", () => {
    expect(isSectionAffectedByClaimChange("means_for_solving")).toBe(true);
    expect(isSectionAffectedByClaimChange("brief_description_of_drawings")).toBe(false);
    expect(isSectionAffectedByDrawingChange("detailed_description")).toBe(true);
    expect(isImpactSection("invention_title")).toBe(false);
  });
});
