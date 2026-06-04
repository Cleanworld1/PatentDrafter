import { describe, expect, it } from "vitest";
import { buildAnalyzeChemicalEmbodimentsPrompt } from "@/prompts/analyzeChemicalEmbodiments";
import { getChemicalEmbodimentAnalysisBlock } from "@/knowledge/chemicalEmbodimentContext";
import { buildChemicalEmbodimentFromAnalysis } from "@/lib/contentAwareChemicalEmbodiment";
import { normalizeChemicalEmbodimentAnalysis } from "@/lib/jsonSchema";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";

describe("analyzeChemicalEmbodiments", () => {
  it("prompt references stage 2 and chemical guidelines", () => {
    const prompt = buildAnalyzeChemicalEmbodimentsPrompt({
      ...emptyInventionAnalysis,
      one_line_summary: "폐 용매 정제",
      core_idea: "침전 제거"
    });
    expect(prompt).toContain("2단계");
    expect(prompt).toContain("실시예/비교예");
    expect(prompt).toContain("HTML");
    expect(prompt).toContain("심사기준 반영");
  });

  it("mock embodiment normalizes and formats for injection", () => {
    const mock = buildChemicalEmbodimentFromAnalysis({
      ...emptyInventionAnalysis,
      essential_elements: ["NaOH", "침전"],
      expected_effects: ["불순물 감소"]
    });
    const normalized = normalizeChemicalEmbodimentAnalysis(mock);
    expect(normalized.tables.length).toBeGreaterThan(0);
    expect(normalized.tables[0].html_table).toContain("<table");
    const block = getChemicalEmbodimentAnalysisBlock(normalized);
    expect(block).toContain("2단계 실시예/비교예 분석");
    expect(block).toContain("구체적인 내용");
  });
});
