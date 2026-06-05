import { describe, expect, it } from "vitest";
import { buildGuidedDraftPlan } from "@/lib/workflow/guidedDraftPlan";
import { defaultDraftOptions } from "@/lib/defaultDraftOptions";

describe("buildGuidedDraftPlan", () => {
  it("includes split detailed description steps per drawing", () => {
    const plan = buildGuidedDraftPlan({
      ...defaultDraftOptions(),
      claimCount: 2,
      drawingCount: 3,
      chemicalInventionEnabled: false
    });

    expect(plan.some((s) => s.kind === "analyze")).toBe(true);
    expect(plan.some((s) => s.kind === "detailed_intro")).toBe(true);
    expect(plan.filter((s) => s.kind === "detailed_figure")).toHaveLength(3);
    expect(plan.some((s) => s.kind === "detailed_outro")).toBe(true);
    expect(plan.some((s) => s.kind === "finalize")).toBe(true);
  });

  it("includes chemical step when enabled", () => {
    const plan = buildGuidedDraftPlan({
      ...defaultDraftOptions(),
      chemicalInventionEnabled: true
    });
    expect(plan.some((s) => s.kind === "chemical_embodiment")).toBe(true);
  });
});
