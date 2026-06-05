const blobs = new Map<string, File>();

export function registerSupplementChatBlob(id: string, file: File): void {
  blobs.set(id, file);
}

export function getSupplementChatBlob(id: string): File | undefined {
  return blobs.get(id);
}

export function removeSupplementChatBlob(id: string): void {
  blobs.delete(id);
}

export function clearSupplementChatBlobs(): void {
  blobs.clear();
}
