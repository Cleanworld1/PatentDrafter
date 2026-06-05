"use client";

import { useRef, useState } from "react";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function ProjectTransferPanel() {
  const exportCurrentProject = usePatentDraftStore((s) => s.exportCurrentProject);
  const importProjectBundle = usePatentDraftStore((s) => s.importProjectBundle);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"export" | "import" | null>(null);

  const handleExport = async () => {
    setBusy("export");
    try {
      await exportCurrentProject();
    } finally {
      setBusy(null);
    }
  };

  const handleImportClick = () => {
    inputRef.current?.click();
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy("import");
    try {
      await importProjectBundle(file);
    } finally {
      setBusy(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="project-transfer-panel">
      <p className="project-transfer-label">다른 브라우저로 옮기기</p>
      <div className="project-transfer-actions">
        <button
          type="button"
          className="project-transfer-btn"
          onClick={() => void handleExport()}
          disabled={busy !== null}
        >
          {busy === "export" ? "보내는 중…" : "프로젝트보내기"}
        </button>
        <button
          type="button"
          className="project-transfer-btn"
          onClick={handleImportClick}
          disabled={busy !== null}
        >
          {busy === "import" ? "가져오는 중…" : "프로젝트 가져오기"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.pdraft.zip,application/zip"
        className="project-transfer-file-input"
        onChange={(e) => void handleImportFile(e.target.files?.[0])}
      />
      <p className="project-transfer-hint">.pdraft.zip 파일로 저장·복원합니다. 업로드 파일 포함.</p>
    </div>
  );
}
