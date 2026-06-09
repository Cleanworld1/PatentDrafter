"use client";

import { shouldShowLoadingOverlay } from "@/lib/client/loadingMessages";
import { WORKSPACE_TABS } from "@/types/patentDraft";
import { usePatentDraftStore } from "@/store/patentDraftStore";
import { SpecificationEditor } from "@/components/editor/SpecificationEditor";
import { AnalysisTab } from "@/components/tabs/AnalysisTab";
import { ClaimsTab } from "@/components/tabs/ClaimsTab";
import { DrawingPromptsTab } from "@/components/tabs/DrawingPromptsTab";
import { ReviewTab } from "@/components/tabs/ReviewTab";
import { MarkdownTab } from "@/components/tabs/MarkdownTab";
import { RawDataTab } from "@/components/tabs/RawDataTab";
import { SupplementChatTab } from "@/components/tabs/SupplementChatTab";
import { WorkspaceTabActions } from "@/components/tabs/WorkspaceTabActions";
import { useSaveShortcut } from "@/lib/client/useSaveShortcut";
import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";
import { useSpecEditorViewportStore } from "@/store/specEditorViewportStore";
import { useEffect } from "react";

export function WorkspaceTabs() {
  useSaveShortcut();
  const activeTab = usePatentDraftStore((s) => s.activeTab);
  const setActiveTab = usePatentDraftStore((s) => s.setActiveTab);
  const fullscreen = useSpecEditorViewportStore((s) => s.fullscreen);
  const setFullscreen = useSpecEditorViewportStore((s) => s.setFullscreen);

  useEffect(() => {
    if (activeTab !== "spec_edit" && fullscreen) {
      setFullscreen(false);
    }
  }, [activeTab, fullscreen, setFullscreen]);
  const error = usePatentDraftStore((s) => s.error);
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const refiningProgress = usePatentDraftStore((s) => s.refiningProgress);
  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);

  const useOverlay = shouldShowLoadingOverlay(loadingStage);
  const loadingMessage = useOverlay
    ? ""
    : loadingStage === "generate"
      ? "명세서 항목을 작성 중입니다…"
      : loadingStage === "review"
        ? "청구항과 본문 정합성을 검토 중입니다…"
        : loadingStage === "supplement_chat"
          ? "AI 보완 응답을 작성 중입니다…"
          : loadingStage === "guided_step"
            ? `${refiningProgress || "명세서"} 작성 중…`
            : "";

  return (
    <div className={`workspace-tabs-container${isCompact ? " workspace-tabs-container--compact" : ""}`}>
      {isCompact && (
        <p className="workspace-compact-hint" role="note">
          탭을 눌러 내용을 확인하고, 설정 패널에서 작성·진행 버튼을 사용하세요.
        </p>
      )}
      <div className="workspace-tabs-bar">
        <nav className="workspace-tabs" aria-label="작업 탭">
          {WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              {isCompact && tab.shortLabel ? tab.shortLabel : tab.label}
            </button>
          ))}
        </nav>
        <WorkspaceTabActions />
      </div>

      {loadingMessage && <div className="loading-banner">{loadingMessage}</div>}
      {error && <div className="error-banner" role="alert">{error}</div>}

      <div className="tab-content">
        {activeTab === "spec_edit" && <SpecificationEditor />}
        {activeTab === "analysis" && <AnalysisTab />}
        {activeTab === "claims" && <ClaimsTab />}
        {activeTab === "drawings" && <DrawingPromptsTab />}
        {activeTab === "review" && <ReviewTab />}
        {activeTab === "supplement_chat" && <SupplementChatTab />}
        {activeTab === "markdown" && <MarkdownTab />}
        {activeTab === "json" && <RawDataTab />}
      </div>
    </div>
  );
}
