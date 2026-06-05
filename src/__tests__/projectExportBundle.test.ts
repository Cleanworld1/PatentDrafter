import { describe, expect, it } from "vitest";
import {
  buildProjectExportZip,
  parseProjectExportZip,
  PROJECT_EXPORT_FORMAT,
  remapSnapshotForImport,
  resolveImportProjectIdentity
} from "@/lib/client/projectExportBundle";
import type { PatentDraftSnapshot } from "@/types/patentDraft";

function minimalSnapshot(id: string, title: string): PatentDraftSnapshot {
  const now = new Date().toISOString();
  return {
    currentProject: {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      status: "spec_writing"
    },
    input: {
      projectName: title,
      inventionContent: "발명 내용",
      attachmentText: "",
      materialType: "발명제안서",
      desiredClaimCount: 2,
      desiredDrawingCount: 2,
      inventionType: "시스템 발명"
    },
    textInputs: {
      overview: "개요",
      coreIdea: "",
      existingProblems: "",
      differentiators: "",
      embodimentNotes: "",
      otherNotes: ""
    },
    uploadedFiles: [
      {
        id: "file_1",
        name: "proposal.pdf",
        size: 1200,
        mimeType: "application/pdf",
        extension: ".pdf",
        materialType: "발명제안서",
        sourceType: "proposal",
        aiInputMode: "pdf_input",
        fileObjectRef: "file_1",
        extractedText: "",
        analysisNotes: "",
        fallbackUsed: false,
        status: "native_ready"
      }
    ],
    options: {
      claimCount: 2,
      drawingCount: 2,
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

describe("projectExportBundle", () => {
  it("round-trips snapshot and uploaded files in zip", async () => {
    const snapshot = minimalSnapshot("proj_export", "테스트 발명");
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const memoryFile = new File([pdfBytes], "proposal.pdf", {
      type: "application/pdf",
      lastModified: 1_700_000_000_000
    });

    const zipData = await buildProjectExportZip({
      projectId: "proj_export",
      snapshot,
      getMemoryFile: (id) => (id === "file_1" ? memoryFile : undefined)
    });

    const parsed = await parseProjectExportZip(zipData);
    expect(parsed.manifest.format).toBe(PROJECT_EXPORT_FORMAT);
    expect(parsed.manifest.snapshot.currentProject.id).toBe("proj_export");
    expect(parsed.manifest.snapshot.input.inventionContent).toBe("발명 내용");
    expect(parsed.files.get("file_1")?.name).toBe("proposal.pdf");
    expect(new Uint8Array(await parsed.files.get("file_1")!.arrayBuffer())).toEqual(pdfBytes);
  });

  it("assigns a new project id when importing a duplicate", () => {
    const snapshot = minimalSnapshot("proj_dup", "중복 프로젝트");
    const resolved = resolveImportProjectIdentity(snapshot, ["proj_dup", "proj_other"]);
    expect(resolved.renamed).toBe(true);
    expect(resolved.projectId).not.toBe("proj_dup");
    expect(resolved.title).toContain("(가져옴)");
  });

  it("keeps project id when no conflict exists", () => {
    const snapshot = minimalSnapshot("proj_new", "신규");
    const resolved = resolveImportProjectIdentity(snapshot, ["proj_other"]);
    expect(resolved.renamed).toBe(false);
    expect(resolved.projectId).toBe("proj_new");
    expect(resolved.title).toBe("신규");
  });

  it("remaps snapshot project metadata on import", () => {
    const snapshot = minimalSnapshot("old_id", "옛 제목");
    const remapped = remapSnapshotForImport(snapshot, "new_id", "새 제목");
    expect(remapped.currentProject.id).toBe("new_id");
    expect(remapped.currentProject.title).toBe("새 제목");
    expect(remapped.input.projectName).toBe("새 제목");
  });
});
