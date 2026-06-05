const DB_NAME = "patent-drafter-files";
const DB_VERSION = 1;
const STORE = "blobs";

export interface PersistedFileRecord {
  projectId: string;
  fileId: string;
  name: string;
  mimeType: string;
  lastModified: number;
  data: ArrayBuffer;
}

function storageKey(projectId: string, fileId: string): string {
  return `${projectId}/${fileId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error("indexedDB open failed"));
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
  });
}

export async function persistFileBlob(projectId: string, fileId: string, file: File): Promise<void> {
  const data = await file.arrayBuffer();
  const record: PersistedFileRecord = {
    projectId,
    fileId,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    lastModified: file.lastModified,
    data
  };
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const req = store.put(record, storageKey(projectId, fileId));
      req.onerror = () => reject(req.error ?? new Error("persist failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("persist tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function loadPersistedFileBlob(
  projectId: string,
  fileId: string
): Promise<File | undefined> {
  const db = await openDb();
  try {
    const record = await new Promise<PersistedFileRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(storageKey(projectId, fileId));
      req.onerror = () => reject(req.error ?? new Error("load failed"));
      req.onsuccess = () => resolve(req.result as PersistedFileRecord | undefined);
    });
    if (!record?.data) return undefined;
    const blob = new Blob([record.data], { type: record.mimeType });
    return new File([blob], record.name, {
      type: record.mimeType,
      lastModified: record.lastModified
    });
  } finally {
    db.close();
  }
}

export async function deletePersistedFileBlob(projectId: string, fileId: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const req = tx.objectStore(STORE).delete(storageKey(projectId, fileId));
      req.onerror = () => reject(req.error ?? new Error("delete failed"));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("delete tx failed"));
    });
  } finally {
    db.close();
  }
}

export async function deleteAllPersistedFilesForProject(projectId: string): Promise<void> {
  const prefix = `${projectId}/`;
  const db = await openDb();
  try {
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAllKeys();
      req.onerror = () => reject(req.error ?? new Error("list keys failed"));
      req.onsuccess = () => resolve(req.result ?? []);
    });
    const toDelete = keys.filter((k) => String(k).startsWith(prefix));
    if (toDelete.length === 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const key of toDelete) {
        store.delete(key);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("bulk delete failed"));
    });
  } finally {
    db.close();
  }
}

export async function listPersistedFileIdsForProject(projectId: string): Promise<string[]> {
  const prefix = `${projectId}/`;
  const db = await openDb();
  try {
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAllKeys();
      req.onerror = () => reject(req.error ?? new Error("list keys failed"));
      req.onsuccess = () => resolve(req.result ?? []);
    });
    return keys
      .map((key) => String(key))
      .filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length));
  } finally {
    db.close();
  }
}

export async function restoreProjectFileBlobs(
  projectId: string,
  fileIds: string[]
): Promise<Map<string, File>> {
  const restored = new Map<string, File>();
  await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        const file = await loadPersistedFileBlob(projectId, fileId);
        if (file) restored.set(fileId, file);
      } catch {
        /* ignore per-file load errors */
      }
    })
  );
  return restored;
}
