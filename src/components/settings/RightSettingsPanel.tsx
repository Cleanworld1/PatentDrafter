"use client";

import { useMobileShellStore } from "@/store/mobileShellStore";
import { FileDropzone, UploadedFileList } from "@/components/settings/FileDropzone";
import { InventionTextInputs } from "@/components/settings/InventionTextInputs";
import { DraftOptionsForm } from "@/components/settings/DraftOptionsForm";
import { GenerationActions } from "@/components/settings/GenerationActions";
import { GeminiDrawingSettings } from "@/components/settings/GeminiDrawingSettings";
import { OpenAiModelSelect } from "@/components/settings/OpenAiModelSelect";

export function RightSettingsPanel() {
  const settingsOpen = useMobileShellStore((s) => s.settingsOpen);
  const setSettingsOpen = useMobileShellStore((s) => s.setSettingsOpen);

  return (
    <aside className={`settings-panel${settingsOpen ? " is-open" : ""}`}>
      <div className="settings-panel-mobile-header">
        <h3 className="settings-panel-mobile-title">설정 · 업로드 · 생성</h3>
        <button
          type="button"
          className="settings-panel-mobile-close"
          onClick={() => setSettingsOpen(false)}
        >
          닫기
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
