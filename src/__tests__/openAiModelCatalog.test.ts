import { describe, expect, it } from "vitest";
import { flattenModelIds, OPENAI_MODEL_GROUPS } from "@/lib/ai/openAiModelCatalog";

describe("openAiModelCatalog", () => {
  it("includes GPT-5 and Pro-tier model ids", () => {
    const ids = flattenModelIds();
    expect(ids).toContain("gpt-5");
    expect(ids).toContain("gpt-5.2");
    expect(ids).toContain("o3-pro");
    expect(ids).toContain("o1-pro");
  });

  it("has grouped catalog entries", () => {
    expect(OPENAI_MODEL_GROUPS.length).toBeGreaterThanOrEqual(3);
    expect(OPENAI_MODEL_GROUPS[0].label).toContain("GPT-5");
  });
});
