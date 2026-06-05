import {
  clearChemicalFormulaObjectUrls,
  registerChemicalFormulaObjectUrl,
  removeChemicalFormulaObjectUrl
} from "@/lib/client/chemicalFormulaImageRegistry";
import { buildChemicalFormulaCatalog, isLikelyChemicalFormulaSourceFile } from "@/lib/chemicalFormulaCatalog";
import type { UploadedFile } from "@/types/patentDraft";

export function syncChemicalFormulaObjectUrlsFromFiles(
  uploadedFiles: UploadedFile[],
  getBlob: (id: string) => File | undefined,
  chemicalInventionEnabled: boolean
): void {
  if (!chemicalInventionEnabled) return;

  const ids = new Set(buildChemicalFormulaCatalog(uploadedFiles).map((c) => c.id));
  for (const f of uploadedFiles) {
    if (!isLikelyChemicalFormulaSourceFile(f)) continue;
    const blob = getBlob(f.id);
    if (blob) registerChemicalFormulaObjectUrl(f.id, blob);
  }
  // registry only tracks formula candidates; stale URLs cleared on full clear
  void ids;
}

export function registerChemicalFormulaFileIfApplicable(
  file: UploadedFile,
  blob: File,
  chemicalInventionEnabled: boolean
): void {
  if (!chemicalInventionEnabled || !isLikelyChemicalFormulaSourceFile(file)) return;
  registerChemicalFormulaObjectUrl(file.id, blob);
}

export function unregisterChemicalFormulaFile(fileId: string): void {
  removeChemicalFormulaObjectUrl(fileId);
}

export { clearChemicalFormulaObjectUrls };
