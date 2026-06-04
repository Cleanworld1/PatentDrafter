const objectUrls = new Map<string, string>();

export function registerChemicalFormulaObjectUrl(fileId: string, file: File): void {
  const prev = objectUrls.get(fileId);
  if (prev) URL.revokeObjectURL(prev);
  objectUrls.set(fileId, URL.createObjectURL(file));
}

export function getChemicalFormulaObjectUrl(fileId: string): string | undefined {
  return objectUrls.get(fileId);
}

export function removeChemicalFormulaObjectUrl(fileId: string): void {
  const url = objectUrls.get(fileId);
  if (url) URL.revokeObjectURL(url);
  objectUrls.delete(fileId);
}

export function clearChemicalFormulaObjectUrls(): void {
  for (const url of objectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  objectUrls.clear();
}

/** blob/data URL → chemimg:fileId (저장용) */
export function objectUrlToChemImgId(src: string): string | null {
  for (const [id, url] of objectUrls.entries()) {
    if (src === url) return id;
  }
  return null;
}

/** 본문 전체에서 등록된 blob URL을 chemimg:로 치환 */
export function replaceRegisteredObjectUrlsWithChemImg(content: string): string {
  let out = content;
  for (const [id, url] of objectUrls.entries()) {
    if (url && out.includes(url)) {
      out = out.split(url).join(`chemimg:${id}`);
    }
  }
  return out;
}
