"use client";

import { useRef } from "react";
import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/tabs/WorkspaceTabs";
import { RightSettingsPanel } from "@/components/settings/RightSettingsPanel";
import { useWorkspaceEditorWheelScroll } from "@/lib/client/useWorkspaceEditorWheelScroll";

export function MainWorkspace() {
  const editorAreaRef = useRef<HTMLDivElement>(null);
  useWorkspaceEditorWheelScroll(editorAreaRef);

  return (
    <div className="main-workspace">
      <WorkspaceHeader />
      <div className="workspace-body">
        <div ref={editorAreaRef} className="workspace-editor-area">
          <WorkspaceTabs />
        </div>
        <RightSettingsPanel />
      </div>
    </div>
  );
}
