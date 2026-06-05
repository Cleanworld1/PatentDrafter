import { strFromU8, strToU8, unzip, zip } from "fflate";
import { createProjectId } from "@/lib/historyService";
import {
  listPersistedFileIdsForProject,
  loadPersistedFileBlob,
  persistFileBlob
} from "@/lib/client/fileBlobPersistence";
import type { PatentDraftSnapshot } from "@/types/patentDraft";

export const PROJECT_EXPORT_FORMAT = "patent-drafter-project";
export const PROJECT_EXPORT_VERSION = 1;
const MANIFEST_NAME = "manifest.json";
const FILES_PREFIX = "files/";

export interface ProjectExportFileEntry {
  fileId: string;
  name: string;
  mimeType: string;
  lastModified: number;
  zipPath: string;
}

export interface ProjectExportManifest {
  format: typeof PROJECT_EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  snapshot: PatentDraftSnapshot;
  files: ProjectExportFileEntry[];
}

export interface BuildProjectExportZipOptions {
  projectId: string;
  snapshot: PatentDraftSnapshot;
  getMemoryFile?: (fileId: string) => File | undefined;
}

function uniqueFileRefs(snapshot: PatentDraftSnapshot): string[] {
  const refs = new Set<string>();
  for (const file of snapshot.uploadedFiles ?? []) {
    const ref = file.fileObjectRef?.trim() || file.id;
    if (ref) refs.add(ref);
  }
  return [...refs];
}

async function collectExportFiles(
  projectId: string,
  snapshot: PatentDraftSnapshot,
  getMemoryFile?: (fileId: string) => File | undefined
): Promise<Map<string, File>> {
  const refs = uniqueFileRefs(snapshot);
  let persistedIds: string[] = [];
  try {
    persistedIds = await listPersistedFileIdsForProject(projectId);
  } catch {
    /* IndexedDB unavailable (tests/private mode) — memory refs only */
  }
  const allIds = [...new Set([...refs, ...persistedIds])];
  const files = new Map<string, File>();

  await Promise.all(
    allIds.map(async (fileId) => {
      const memory = getMemoryFile?.(fileId);
      if (memory) {
        files.set(fileId, memory);
        return;
      }
      const persisted = await loadPersistedFileBlob(projectId, fileId);
      if (persisted) files.set(fileId, persisted);
    })
  );

  return files;
}

function sanitizeZipSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim() || "file";
}

export async function buildProjectExportZip(options: BuildProjectExportZipOptions): Promise<Uint8Array> {
  const { projectId, snapshot, getMemoryFile } = options;
  const files = await collectExportFiles(projectId, snapshot, getMemoryFile);
  const fileEntries: ProjectExportFileEntry[] = [];

  const zipInput: Record<string, Uint8Array> = {};
  for (const [fileId, file] of files) {
    const zipPath = `${FILES_PREFIX}${fileId}__${sanitizeZipSegment(file.name)}`;
    fileEntries.push({
      fileId,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      lastModified: file.lastModified,
      zipPath
    });
    zipInput[zipPath] = new Uint8Array(await file.arrayBuffer());
  }

  const manifest: ProjectExportManifest = {
    format: PROJECT_EXPORT_FORMAT,
    version: PROJECT_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    snapshot,
    files: fileEntries
  };
  zipInput[MANIFEST_NAME] = strToU8(JSON.stringify(manifest, null, 2));

  return new Promise((resolve, reject) => {
    zip(zipInput, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });
}

function parseManifest(raw: string): ProjectExportManifest {
  const parsed = JSON.parse(raw) as ProjectExportManifest;
  if (parsed.format !== PROJECT_EXPORT_FORMAT) {
    throw new Error("지원하지 않는 프로젝트 파일 형식입니다.");
  }
  if (!parsed.snapshot?.currentProject?.id) {
    throw new Error("프로젝트 manifest가 손상되었습니다.");
  }
  if (typeof parsed.version === "number" && parsed.version > PROJECT_EXPORT_VERSION) {
    throw new Error("이 앱 버전보다 최신 형식의 프로젝트 파일입니다. 앱을 업데이트해 주세요.");
  }
  return parsed;
}

export async function parseProjectExportZip(data: Uint8Array): Promise<{
  manifest: ProjectExportManifest;
  files: Map<string, File>;
}> {
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });

  const manifestBytes = entries[MANIFEST_NAME];
  if (!manifestBytes) {
    throw new Error("manifest.json이 없는 프로젝트 파일입니다.");
  }

  const manifest = parseManifest(strFromU8(manifestBytes));
  const files = new Map<string, File>();

  for (const entry of manifest.files ?? []) {
    const bytes = entries[entry.zipPath];
    if (!bytes) continue;
    const blob = new Blob([new Uint8Array(bytes)], {
      type: entry.mimeType || "application/octet-stream"
    });
    files.set(entry.fileId, new File([blob], entry.name, {
      type: entry.mimeType || "application/octet-stream",
      lastModified: entry.lastModified || Date.now()
    }));
  }

  return { manifest, files };
}

export function resolveImportProjectIdentity(
  snapshot: PatentDraftSnapshot,
  existingProjectIds: string[]
): { projectId: string; title: string; renamed: boolean } {
  const existing = new Set(existingProjectIds);
  const currentId = snapshot.currentProject.id;
  const currentTitle = snapshot.currentProject.title || "제목 없음";

  if (!existing.has(currentId)) {
    return { projectId: currentId, title: currentTitle, renamed: false };
  }

  return {
    projectId: createProjectId(),
    title: `${currentTitle} (가져옴)`,
    renamed: true
  };
}

export function remapSnapshotForImport(
  snapshot: PatentDraftSnapshot,
  projectId: string,
  title: string
): PatentDraftSnapshot {
  const now = new Date().toISOString();
  return {
    ...snapshot,
    currentProject: {
      ...snapshot.currentProject,
      id: projectId,
      title,
      updatedAt: now,
      createdAt: snapshot.currentProject.createdAt || now
    },
    input: {
      ...snapshot.input,
      projectName: title
    }
  };
}

export async function persistImportedProjectFiles(
  projectId: string,
  files: Map<string, File>
): Promise<void> {
  await Promise.all(
    [...files.entries()].map(([fileId, file]) => persistFileBlob(projectId, fileId, file))
  );
}

export async function importProjectBundleFromZip(
  data: Uint8Array,
  existingProjectIds: string[]
): Promise<{ snapshot: PatentDraftSnapshot; renamed: boolean }> {
  const { manifest, files } = await parseProjectExportZip(data);
  const identity = resolveImportProjectIdentity(manifest.snapshot, existingProjectIds);
  const snapshot = remapSnapshotForImport(manifest.snapshot, identity.projectId, identity.title);
  await persistImportedProjectFiles(identity.projectId, files);
  return { snapshot, renamed: identity.renamed };
}
