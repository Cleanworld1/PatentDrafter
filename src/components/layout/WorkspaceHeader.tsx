"use client";

import { useState } from "react";
import { LayoutToggleButtons } from "@/components/layout/LayoutToggleButtons";
import { usePatentDraftStore } from "@/store/patentDraftStore";
import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";
import { PROJECT_STATUS_LABELS } from "@/types/patentDraft";

export function WorkspaceHeader() {
  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);
  const title = usePatentDraftStore((s) => s.currentProject.title);
  const status = usePatentDraftStore((s) => s.currentProject.status);
  const statusLabel = PROJECT_STATUS_LABELS[status];
  const markdown = usePatentDraftStore((s) => s.markdown);
  const setProjectTitle = usePatentDraftStore((s) => s.setProjectTitle);
  const setActiveTab = usePatentDraftStore((s) => s.setActiveTab);
  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    const text = markdown || "아직 생성된 Markdown이 없습니다.";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className={`workspace-header${isCompact ? " workspace-header--compact" : ""}`}>
      <LayoutToggleButtons />
      <div className="workspace-header-left">
        <input
          className="project-title-input"
          value={title}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="프로젝트명을 입력하세요"
          readOnly={isCompact}
          title={isCompact ? "프로젝트명 변경은 넓은 화면에서 이용하세요" : undefined}
        />
        <span className="status-badge">{statusLabel}</span>
      </div>
      <div className="workspace-header-actions">
        {!isCompact && (
          <>
            <button type="button" className="btn-secondary" onClick={copyMarkdown}>
              {copied ? "복사됨" : "Markdown 복사"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setActiveTab("json")}>
              원본 데이터
            </button>
          </>
        )}
      </div>
    </header>
  );
}
