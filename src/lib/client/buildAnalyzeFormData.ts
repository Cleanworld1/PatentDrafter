import { appendOpenAiToFormData } from "@/lib/client/appendOpenAiFields";
import { getFileBlob } from "@/lib/client/fileBlobRegistry";
import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import type { InventionAnalysis, PatentDraftSnapshot } from "@/types/patentDraft";

export function buildAnalyzeMaterialsPayload(state: {
  currentProject: { title: string };
  textInputs: PatentDraftSnapshot["textInputs"];
  uploadedFiles: PatentDraftSnapshot["uploadedFiles"];
  options: PatentDraftSnapshot["options"];
}): AnalyzeMaterialsPayload {
  return {
    task: "analyze_invention_materials",
    projectName: state.currentProject.title,
    userTextInputs: state.textInputs,
    options: state.options,
    materials: state.uploadedFiles.map((f) => ({
      fileId: f.id,
      name: f.name,
      mimeType: f.mimeType,
      extension: f.extension,
      size: f.size,
      sourceType: f.sourceType,
      materialType: f.materialType,
      aiInputMode: f.aiInputMode,
      fallbackUsed: f.fallbackUsed,
      analysisNotes: f.analysisNotes,
      extractedText: f.extractedText
    }))
  };
}

export function buildMaterialsFormData(state: {
  currentProject: { title: string };
  textInputs: PatentDraftSnapshot["textInputs"];
  uploadedFiles: PatentDraftSnapshot["uploadedFiles"];
  options: PatentDraftSnapshot["options"];
}): FormData {
  const formData = new FormData();
  const payload = buildAnalyzeMaterialsPayload(state);
  formData.append("payload", JSON.stringify(payload));

  for (const meta of payload.materials) {
    const file = getFileBlob(meta.fileId);
    if (file) {
      formData.append(meta.fileId, file, file.name);
    }
  }

  appendOpenAiToFormData(formData);
  return formData;
}

export function buildChemicalEmbodimentFormData(
  state: {
    currentProject: { title: string };
    textInputs: PatentDraftSnapshot["textInputs"];
    uploadedFiles: PatentDraftSnapshot["uploadedFiles"];
    options: PatentDraftSnapshot["options"];
  },
  invention_analysis: InventionAnalysis
): FormData {
  const formData = new FormData();
  const payload = {
    ...buildAnalyzeMaterialsPayload(state),
    invention_analysis
  };
  formData.append("payload", JSON.stringify(payload));

  for (const meta of payload.materials) {
    const file = getFileBlob(meta.fileId);
    if (file) {
      formData.append(meta.fileId, file, file.name);
    }
  }

  appendOpenAiToFormData(formData);
  return formData;
}
