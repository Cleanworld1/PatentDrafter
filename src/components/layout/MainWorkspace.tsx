"use client";

import { WorkspaceHeader } from "@/components/layout/WorkspaceHeader";
import { WorkspaceTabs } from "@/components/tabs/WorkspaceTabs";
import { RightSettingsPanel } from "@/components/settings/RightSettingsPanel";

export function MainWorkspace() {
  return (
    <div className="main-workspace">
      <WorkspaceHeader />
      <div className="workspace-body">
        <div className="workspace-editor-area">
          <WorkspaceTabs />
        </div>
        <RightSettingsPanel />
      </div>
    </div>
  );
}
