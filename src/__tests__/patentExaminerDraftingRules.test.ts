import { describe, expect, it } from "vitest";
import {
  getPatentExaminerRulesBlock,
  getPatentExaminerRulesForSectionId
} from "@/knowledge/patentExaminerDraftingRules";
import {
  getDefaultElaborateInstruction,
  getDefaultRewriteInstruction
} from "@/lib/workflow/postFullDraftRefinement";
import { buildRegenerateSectionPrompt } from "@/prompts/regenerateSection";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";

describe("patentExaminerDraftingRules", () => {
  it("includes global no-source rule for all sections", () => {
    const rules = getPatentExaminerRulesBlock("technical_field");
    expect(rules).toContain("업로드 자료에 따르면");
    expect(rules).toContain("일 실시예");
  });

  it("adds section-specific rules for background and means", () => {
    expect(getPatentExaminerRulesForSectionId("background_art")).toContain("특허공개공보");
    expect(getPatentExaminerRulesForSectionId("problems_to_solve")).toContain("3줄");
    expect(getPatentExaminerRulesForSectionId("means_for_solving")).toContain("paraphrasing");
    expect(getPatentExaminerRulesForSectionId("means_for_solving")).toContain("필수 구성으로서");
  });

  it("injects rules into rewrite and elaborate defaults", () => {
    expect(getDefaultRewriteInstruction("background_art")).toContain("특허공개공보");
    expect(getDefaultRewriteInstruction("problems_to_solve")).toContain("3줄");
    expect(getDefaultRewriteInstruction("means_for_solving")).toContain("paraphrasing");
    expect(getDefaultElaborateInstruction("means_for_solving")).toContain("필수 구성으로서");
  });

  it("injects rules into regenerate section prompt", () => {
    const prompt = buildRegenerateSectionPrompt({
      sectionType: "background_art",
      sectionTitle: "【발명의 배경이 되는 기술】",
      currentContent: "초안",
      analysis: emptyInventionAnalysis
    });
    expect(prompt).toContain("심사관 관점 필수 작성 규칙");
    expect(prompt).toContain("PDF");
  });
});
