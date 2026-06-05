import { describe, expect, it } from "vitest";
import {
  getLoadingOverlayContent,
  shouldShowLoadingOverlay
} from "@/lib/client/loadingMessages";

describe("loadingMessages", () => {
  it("shows overlay for analyze, full, refine", () => {
    expect(shouldShowLoadingOverlay("analyze")).toBe(true);
    expect(shouldShowLoadingOverlay("full")).toBe(true);
    expect(shouldShowLoadingOverlay("refine")).toBe(true);
    expect(shouldShowLoadingOverlay("generate")).toBe(false);
  });

  it("includes refining progress in refine message", () => {
    const content = getLoadingOverlayContent("refine", "【청구항 1】 — 다시 작성");
    expect(content?.message).toContain("청구항 1");
  });
});
