import {
  deletePersistedFileBlob,
  persistFileBlob
} from "@/lib/client/fileBlobPersistence";

const fileBlobs = new Map<string, File>();
let activeProjectId: string | null = null;

const restorePromises = new Map<string, Promise<void>>();

export function setFileBlobProjectContext(projectId: string | null): void {
  activeProjectId = projectId;
}

export function registerFileBlob(id: string, file: File): void {
  fileBlobs.set(id, file);
  if (activeProjectId) {
    void persistFileBlob(activeProjectId, id, file).catch(() => {
      /* quota / private mode — in-memory blob still works this session */
    });
  }
}

export function getFileBlob(id: string): File | undefined {
  return fileBlobs.get(id);
}

export function removeFileBlob(id: string): void {
  fileBlobs.delete(id);
  if (activeProjectId) {
    void deletePersistedFileBlob(activeProjectId, id).catch(() => undefined);
  }
}

export function clearFileBlobs(): void {
  fileBlobs.clear();
}

export function scheduleProjectFileRestore(
  projectId: string,
  restore: () => Promise<void>
): void {
  const promise = restore().finally(() => {
    if (restorePromises.get(projectId) === promise) {
      restorePromises.delete(projectId);
    }
  });
  restorePromises.set(projectId, promise);
}

export async function waitForProjectFileRestore(projectId: string): Promise<void> {
  const pending = restorePromises.get(projectId);
  if (pending) await pending;
}
