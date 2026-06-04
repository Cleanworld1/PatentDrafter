"use client";

import { useMobileShellStore } from "@/store/mobileShellStore";
import { FileDropzone, UploadedFileList } from "@/components/settings/FileDropzone";
import { InventionTextInputs } from "@/components/settings/InventionTextInputs";
import { DraftOptionsForm } from "@/components/settings/DraftOptionsForm";
import { GenerationActions } from "@/components/settings/GenerationActions";
import { GeminiDrawingSettings } from "@/components/settings/GeminiDrawingSettings";
import { OpenAiModelSelect } from "@/components/settings/OpenAiModelSelect";

export function RightSettingsPanel() {
  const closeSettings = useMobileShellStore((s) => s.closeSettings);

  return (
    <aside className="settings-panel" aria-label="설정 및 업로드">
      <div className="settings-panel-mobile-header">
        <h2 className="settings-panel-mobile-title">설정 · 업로드</h2>
        <button
          type="button"
          className="mobile-drawer-close"
          onClick={closeSettings}
          aria-label="설정 패널 닫기"
        >
          ✕
        </button>
      </div>
      <OpenAiModelSelect />
      <GeminiDrawingSettings />
      <FileDropzone />
      <UploadedFileList />
      <InventionTextInputs />
      <DraftOptionsForm />
      <GenerationActions />
    </aside>
  );
}
