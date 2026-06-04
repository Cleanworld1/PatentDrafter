import {
  getChemicalFormulaObjectUrl,
  objectUrlToChemImgId,
  replaceRegisteredObjectUrlsWithChemImg
} from "@/lib/client/chemicalFormulaImageRegistry";

export const CHEM_IMG_SRC_PREFIX = "chemimg:";

const CHEM_IMG_TAG_RE =
  /<img\b[^>]*\bsrc=["']chemimg:([^"']+)["'][^>]*>/gi;

/** 저장 문자열의 chemimg: → 편집기 표시용 blob URL */
export function resolveChemImgSrcInContent(content: string): string {
  return content.replace(CHEM_IMG_TAG_RE, (tag, id: string) => {
    const url = getChemicalFormulaObjectUrl(id);
    if (!url) return tag;
    return tag.replace(
      new RegExp(`src=["']chemimg:${escapeRegExp(id)}["']`, "i"),
      `src="${url}"`
    );
  });
}

/** 편집기 HTML/저장본의 blob·data URL → chemimg: (히스토리·AI 일관) */
export function revertChemImgSrcInContent(content: string): string {
  let out = replaceRegisteredObjectUrlsWithChemImg(content);
  return out.replace(/<img\b([^>]*)>/gi, (full, attrs: string) => {
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) return full;
    const src = srcMatch[1]!;
    if (src.startsWith(CHEM_IMG_SRC_PREFIX)) return full;

    const id = objectUrlToChemImgId(src);
    if (!id) return full;

    const nextAttrs = attrs.replace(
      /\bsrc=["'][^"']+["']/i,
      `src="${CHEM_IMG_SRC_PREFIX}${id}"`
    );
    return `<img${nextAttrs}>`;
  });
}

/** [화학식 N] 라벨이 img 직전에 없으면 보정(후처리) */
export function ensureChemicalFormulaLabels(content: string): string {
  const matches = [...content.matchAll(CHEM_IMG_TAG_RE)];
  if (matches.length === 0) return content;

  let result = content;
  let shift = 0;
  matches.forEach((match, index) => {
    const label = `[화학식 ${index + 1}]`;
    const idx = (match.index ?? 0) + shift;
    const before = result.slice(0, idx).trimEnd();
    if (before.endsWith(label)) return;
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const insert = `${prefix}${label}\n`;
    result = result.slice(0, idx) + insert + result.slice(idx);
    shift += insert.length;
  });
  return result;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** AI 생성 본문 → 저장용(화학식 라벨·chemimg 유지) */
export function finalizeChemicalFormulaSectionContent(
  content: string,
  chemicalInventionEnabled: boolean | undefined
): string {
  if (!chemicalInventionEnabled) return content;
  return ensureChemicalFormulaLabels(revertChemImgSrcInContent(content));
}
