import type { SpecificationSection } from "@/types/patentDraft";

export function getClaimSectionNumbers(sections: SpecificationSection[]): number[] {
  return sections
    .filter((s) => s.section_id.startsWith("claim_"))
    .map((s) => Number(s.section_id.replace("claim_", "")))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

export function getDrawingSectionNumbers(sections: SpecificationSection[]): number[] {
  return sections
    .filter((s) => s.section_id.startsWith("drawing_"))
    .map((s) => Number(s.section_id.replace("drawing_", "")))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => a - b);
}

export function isLastClaimSection(sections: SpecificationSection[], index: number): boolean {
  const section = sections[index];
  if (!section?.section_id.startsWith("claim_")) return false;
  const nums = getClaimSectionNumbers(sections);
  const num = Number(section.section_id.replace("claim_", ""));
  return nums[nums.length - 1] === num;
}

export function isLastDrawingSection(sections: SpecificationSection[], index: number): boolean {
  const section = sections[index];
  if (!section?.section_id.startsWith("drawing_")) return false;
  const nums = getDrawingSectionNumbers(sections);
  const num = Number(section.section_id.replace("drawing_", ""));
  return nums[nums.length - 1] === num;
}

export function insertClaimSection(
  sections: SpecificationSection[],
  claimNumber: number
): SpecificationSection[] {
  const now = new Date().toISOString();
  const newSection: SpecificationSection = {
    section_id: `claim_${claimNumber}`,
    title: `【청구항 ${claimNumber}】`,
    content: "",
    isGenerating: false,
    lastUpdatedAt: now,
    isDraft: true
  };
  const summaryIdx = sections.findIndex((s) => s.section_id === "summary");
  const insertAt = summaryIdx >= 0 ? summaryIdx : sections.length;
  const next = [...sections];
  next.splice(insertAt, 0, newSection);
  return next;
}

export function insertDrawingSection(
  sections: SpecificationSection[],
  figureNumber: number
): SpecificationSection[] {
  const now = new Date().toISOString();
  const newSection: SpecificationSection = {
    section_id: `drawing_${figureNumber}`,
    title: `【도 ${figureNumber}】`,
    content: "",
    isGenerating: false,
    lastUpdatedAt: now,
    isDraft: true
  };
  return [...sections, newSection];
}
