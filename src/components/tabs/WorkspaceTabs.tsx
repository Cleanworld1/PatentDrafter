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
import { WorkspaceTabActions } from "@/components/tabs/WorkspaceTabActions";
import { useSaveShortcut } from "@/lib/client/useSaveShortcut";
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

  const useOverlay = shouldShowLoadingOverlay(loadingStage);
  const loadingMessage = useOverlay
    ? ""
    : loadingStage === "generate"
      ? "명세서 항목을 작성 중입니다…"
      : loadingStage === "review"
        ? "청구항과 본문 정합성을 검토 중입니다…"
        : "";

  return (
    <div className="workspace-tabs-container">
      <div className="workspace-tabs-bar">
        <nav className="workspace-tabs">
          {WORKSPACE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? "active" : ""}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
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
        {activeTab === "markdown" && <MarkdownTab />}
        {activeTab === "json" && <RawDataTab />}
      </div>
    </div>
  );
}
