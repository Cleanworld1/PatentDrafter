const fileBlobs = new Map<string, File>();

export function registerFileBlob(id: string, file: File): void {
  fileBlobs.set(id, file);
}

export function getFileBlob(id: string): File | undefined {
  return fileBlobs.get(id);
}

export function removeFileBlob(id: string): void {
  fileBlobs.delete(id);
}

export function clearFileBlobs(): void {
  fileBlobs.clear();
}
