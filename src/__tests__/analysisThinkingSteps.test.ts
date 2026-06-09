import { describe, expect, it } from "vitest";
import {
  getThinkingStepsForGuidedStep,
  getThinkingStepsForLoadingStage,
  INVENTION_ANALYSIS_THINKING_STEPS
} from "@/lib/client/analysisThinkingSteps";

describe("analysisThinkingSteps", () => {
  it("returns invention steps for analyze loading stage", () => {
    const steps = getThinkingStepsForLoadingStage("analyze");
    expect(steps?.length).toBeGreaterThan(5);
    expect(steps).toBe(INVENTION_ANALYSIS_THINKING_STEPS);
  });

  it("returns null for unrelated stages", () => {
    expect(getThinkingStepsForLoadingStage("generate")).toBeNull();
  });

  it("returns steps for guided analyze step", () => {
    expect(getThinkingStepsForGuidedStep("analyze")?.[0]).toMatch(/업로드/);
    expect(getThinkingStepsForGuidedStep("refine_section")).toBeNull();
  });
});
