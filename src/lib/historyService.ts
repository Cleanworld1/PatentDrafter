import type { PatentDraftSnapshot, ProjectRecord } from "@/types/patentDraft";

const STORAGE_KEY = "patent-draft-history";

export interface HistoryEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectRecord["status"];
  snapshot: PatentDraftSnapshot;
}

function readAll(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function listHistory(): HistoryEntry[] {
  return readAll().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function searchHistory(query: string): HistoryEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return listHistory();
  return listHistory().filter((entry) => entry.title.toLowerCase().includes(q));
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return readAll().find((entry) => entry.id === id);
}

export function saveHistoryEntry(snapshot: PatentDraftSnapshot): HistoryEntry {
  const entries = readAll();
  const now = new Date().toISOString();
  const existingIndex = entries.findIndex((e) => e.id === snapshot.currentProject.id);

  const entry: HistoryEntry = {
    id: snapshot.currentProject.id,
    title: snapshot.currentProject.title || "제목 없음",
    createdAt: existingIndex >= 0 ? entries[existingIndex].createdAt : now,
    updatedAt: now,
    status: snapshot.currentProject.status,
    snapshot
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.unshift(entry);
  }

  writeAll(entries);
  return entry;
}

export function deleteHistoryEntry(id: string): void {
  writeAll(readAll().filter((e) => e.id !== id));
}

export function createProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getMockHistoryEntries(): HistoryEntry[] {
  const now = new Date().toISOString();
  return [
    {
      id: "mock_1",
      title: "특허명세서 자동작성 MVP",
      createdAt: now,
      updatedAt: now,
      status: "draft_complete",
      snapshot: {
        currentProject: {
          id: "mock_1",
          title: "특허명세서 자동작성 MVP",
          createdAt: now,
          updatedAt: now,
          status: "draft_complete"
        },
        input: {
          projectName: "특허명세서 자동작성 MVP",
          inventionContent: "",
          attachmentText: "",
          materialType: "발명제안서",
          desiredClaimCount: 5,
          desiredDrawingCount: 5,
          inventionType: "시스템 발명"
        },
        textInputs: {
          overview: "사용자가 업로드한 회의록과 사업계획서에서 발명의 핵심 구성을 추출하는 시스템.",
          coreIdea: "",
          existingProblems: "",
          differentiators: "",
          embodimentNotes: "",
          otherNotes: ""
        },
        uploadedFiles: [],
        options: {
          claimCount: 5,
          drawingCount: 5,
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
      }
    }
  ];
}
