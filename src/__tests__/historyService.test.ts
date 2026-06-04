import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteHistoryEntry,
  listHistory,
  saveHistoryEntry
} from "@/lib/historyService";
import type { PatentDraftSnapshot } from "@/types/patentDraft";

const STORAGE_KEY = "patent-draft-history";

function minimalSnapshot(id: string, title: string): PatentDraftSnapshot {
  const now = new Date().toISOString();
  return {
    currentProject: {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      status: "input"
    },
    input: {
      projectName: title,
      inventionContent: "",
      attachmentText: "",
      materialType: "발명제안서",
      desiredClaimCount: 1,
      desiredDrawingCount: 1,
      inventionType: "시스템 발명"
    },
    textInputs: {
      overview: "",
      coreIdea: "",
      existingProblems: "",
      differentiators: "",
      embodimentNotes: "",
      otherNotes: ""
    },
    uploadedFiles: [],
    options: {
      claimCount: 1,
      drawingCount: 1,
      inventionType: "시스템 발명",
      detailLevel: "normal",
      claimStyle: "balanced",
      autoRecommendDrawingType: true,
      generateAdditionalQuestions: true,
      inventionMakingEnabled: false,
      chemicalInventionEnabled: false
    },
    analysis: null,
    workflow: {
      workflowStep: "input",
      inventionCategory: "",
      protectionPoints: [],
      claimDrafts: [],
      drawingPlan: [],
      drawingPrompts: [],
      claimDrawingReview: null,
      detailedDescription: "",
      frontSections: null,
      finalReview: null
    },
    specificationSections: [],
    claims: [],
    drawingPrompts: [],
    review: null,
    markdown: ""
  };
}

describe("historyService", () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    const localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      }
    };
    vi.stubGlobal("window", { localStorage } as Window & typeof globalThis);
    vi.stubGlobal("localStorage", localStorage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deletes a saved history entry", () => {
    saveHistoryEntry(minimalSnapshot("proj_a", "발명 A"));
    saveHistoryEntry(minimalSnapshot("proj_b", "발명 B"));
    expect(listHistory()).toHaveLength(2);

    deleteHistoryEntry("proj_a");
    const remaining = listHistory();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("proj_b");
    expect(store.get(STORAGE_KEY)).toBeTruthy();
  });
});
