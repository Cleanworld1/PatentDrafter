"use client";

import { FileDropzone, UploadedFileList } from "@/components/settings/FileDropzone";
import { InventionTextInputs } from "@/components/settings/InventionTextInputs";
import { DraftOptionsForm } from "@/components/settings/DraftOptionsForm";
import { GenerationActions } from "@/components/settings/GenerationActions";
import { GeminiDrawingSettings } from "@/components/settings/GeminiDrawingSettings";
import { OpenAiModelSelect } from "@/components/settings/OpenAiModelSelect";

export function RightSettingsPanel() {
  return (
    <aside className="settings-panel">
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
