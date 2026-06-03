"use client";

import { useState } from "react";
import { downloadSpecificationAsDocx } from "@/lib/exportSpecificationDocx";
import { usePatentDraftStore } from "@/store/patentDraftStore";

function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12m0 0 4-4m-4 4-4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WorkspaceTabActions() {
  const saveCurrentProject = usePatentDraftStore((s) => s.saveCurrentProject);
  const lastSavedAt = usePatentDraftStore((s) => s.lastSavedAt);
  const saveHint = usePatentDraftStore((s) => s.saveHint);
  const projectTitle = usePatentDraftStore((s) => s.currentProject.title);
  const sections = usePatentDraftStore((s) => s.specificationSections);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await downloadSpecificationAsDocx(sections, projectTitle);
    } catch (err) {
      console.error(err);
      window.alert("Word 파일보내기에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
    }
  };

  const saveTitle =
    saveHint ||
    (lastSavedAt
      ? `마지막 저장: ${new Date(lastSavedAt).toLocaleString("ko-KR")} (Ctrl+S)`
      : "명세서 저장 (Ctrl+S)");

  return (
    <div className="workspace-tab-actions">
      {saveHint && <span className="workspace-tab-action-hint">{saveHint}</span>}
      <button
        type="button"
        className="workspace-tab-icon-btn"
        onClick={() => saveCurrentProject()}
        title={saveTitle}
        aria-label="명세서 저장"
      >
        <SaveIcon />
      </button>
      <button
        type="button"
        className="workspace-tab-icon-btn"
        onClick={() => void handleExport()}
        disabled={exporting || sections.length === 0}
        title={exporting ? "보내는 중…" : "명세서 전체 Word(.docx)보내기"}
        aria-label="Word 파일로보내기"
      >
        <ExportIcon />
      </button>
    </div>
  );
}
