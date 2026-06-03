import { describe, expect, it } from "vitest";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import type { SpecificationSection } from "@/types/patentDraft";

const base = (id: string, title: string): SpecificationSection => ({
  section_id: id,
  title,
  content: "",
  isGenerating: false,
  lastUpdatedAt: ""
});

describe("dedupeSpecificationSections", () => {
  it("removes duplicate section_id keeping last", () => {
    const out = dedupeSpecificationSections([
      base("claim_1", "첫"),
      base("claim_1", "둘"),
      base("summary", "요약")
    ]);
    expect(out).toHaveLength(2);
    expect(out[0].title).toBe("둘");
  });
});
