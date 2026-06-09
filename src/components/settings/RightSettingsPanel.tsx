"use client";

import { FileDropzone, UploadedFileList } from "@/components/settings/FileDropzone";
import { InventionTextInputs } from "@/components/settings/InventionTextInputs";
import { DraftOptionsForm } from "@/components/settings/DraftOptionsForm";
import { ErrorDiagnosticsPanel } from "@/components/settings/ErrorDiagnosticsPanel";
import { GenerationActions } from "@/components/settings/GenerationActions";
import { OpenAiModelSelect } from "@/components/settings/OpenAiModelSelect";
import { LayoutPanelHeader } from "@/components/layout/LayoutPanelHeader";
import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";

export function RightSettingsPanel() {
  const closePanels = useResponsiveLayoutStore((s) => s.closePanels);

  return (
    <aside id="app-settings-panel" className="settings-panel">
      <LayoutPanelHeader title="설정 · 작성" onClose={closePanels} />
      <OpenAiModelSelect />
      <FileDropzone />
      <UploadedFileList />
      <InventionTextInputs />
      <DraftOptionsForm />
      <GenerationActions />
      <ErrorDiagnosticsPanel />
    </aside>
  );
}
