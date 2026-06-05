import { SECTION_TYPE_TITLES } from "@/types/specificationSection";

/** 재작성·구체화 프롬프트에 넣을 출력 형식 규칙 */
export function getSectionOutputNoHeadingRule(sectionTitle: string): string {
  const base = `- 출력에 목차·항목 제목(예: ${sectionTitle})을 포함하지 말라. UI 목차에 이미 표시되므로 본문은 【…】 소제목 없이 기술 내용부터 바로 시작하라.`;
  if (/^【청구항\s*\d+】$/.test(sectionTitle.trim())) {
    return (
      `${base}\n` +
      `- "청구항 N." / "청구항 N:" / "【청구항 N】" 같은 번호 머리말을 출력하지 말라.\n` +
      `- 독립항은 바로 "…에 있어서,"로 시작하라. 종속항만 "청구항 M에 있어서,"로 시작할 수 있다(M은 인용 청구항 번호).`
    );
  }
  return base;
}

export function parseClaimNumberFromSectionTitle(sectionTitle: string): number | null {
  const m = sectionTitle.trim().match(/^【청구항\s*(\d+)】$/);
  return m ? Number(m[1]) : null;
}

/**
 * 목차 중복용 "청구항 N." 접두어 제거. "청구항 M에 있어서,"(종속항 인용)는 유지.
 */
export function stripClaimNumberListPrefix(content: string, claimNumber: number): string {
  const listPrefix = new RegExp(`^\\s*청구항\\s*${claimNumber}\\s*[.:．]\\s*`);
  let text = content.trim();
  if (listPrefix.test(text)) {
    text = text.replace(listPrefix, "");
  }
  const lines = text.split("\n");
  if (lines.length > 0) {
    lines[0] = lines[0].replace(
      new RegExp(`^\\s*청구항\\s*${claimNumber}\\s*[.:．]\\s*`),
      ""
    );
  }
  return lines.join("\n").trim();
}

export function sanitizeClaimSectionOutput(content: string, sectionTitle: string): string {
  const claimNumber = parseClaimNumberFromSectionTitle(sectionTitle);
  let text = stripDuplicateSectionHeading(content, sectionTitle);
  if (claimNumber != null) {
    text = stripClaimNumberListPrefix(text, claimNumber);
  }
  return normalizeSpecificationLineBreaks(text);
}

const ALL_SECTION_HEADINGS = new Set([
  ...Object.values(SECTION_TYPE_TITLES),
  ...Array.from({ length: 30 }, (_, i) => `【청구항 ${i + 1}】`),
  ...Array.from({ length: 30 }, (_, i) => `【도 ${i + 1}】`)
]);

function normalizeHeadingLine(line: string): string {
  return line.trim().replace(/^#+\s*/, "").replace(/\s+$/, "");
}

function isSectionHeadingLine(line: string, primaryTitle: string): boolean {
  const normalized = normalizeHeadingLine(line);
  if (!normalized) return false;
  if (normalized === primaryTitle) return true;
  if (ALL_SECTION_HEADINGS.has(normalized)) return true;
  if (/^【청구항 \d+】$/.test(normalized)) return true;
  if (/^【도 \d+】$/.test(normalized)) return true;
  return false;
}

/** 명세서 본문: 이중 개행을 단일 개행으로 정리 */
export function normalizeSpecificationLineBreaks(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

/** AI가 반복 출력한 【…】 목차 제목을 본문 앞에서 제거 */
export function stripDuplicateSectionHeading(content: string, sectionTitle: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let start = 0;

  while (start < lines.length) {
    const line = lines[start];
    if (!line.trim()) {
      start += 1;
      continue;
    }
    if (isSectionHeadingLine(line, sectionTitle)) {
      start += 1;
      continue;
    }
    break;
  }

  return lines.slice(start).join("\n").trim();
}
