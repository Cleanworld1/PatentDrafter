import type { SpecificationSection } from "@/types/patentDraft";

/** 동일 section_id 중복 제거(마지막 항목 유지) */
export function dedupeSpecificationSections(sections: SpecificationSection[]): SpecificationSection[] {
  const seen = new Set<string>();
  const result: SpecificationSection[] = [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const s = sections[i];
    if (!s?.section_id || seen.has(s.section_id)) continue;
    seen.add(s.section_id);
    result.unshift(s);
  }
  return result;
}
