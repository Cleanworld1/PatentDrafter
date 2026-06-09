import { markSectionsForClaimChange, markSectionsForDrawingChange } from "@/lib/claimDrawingImpact";
import { dedupeSpecificationSections } from "@/lib/dedupeSpecificationSections";
import {
  getClaimSectionNumbers,
  getDrawingSectionNumbers,
  insertClaimSection,
  insertDrawingSection
} from "@/lib/specificationSectionOrder";
import type { ClaimDraft, DrawingPrompt, SpecificationSection } from "@/types/patentDraft";
import type { SupplementSectionUpdate } from "@/types/supplementChat";

function parseClaimNumber(sectionId: string): number | null {
  const match = sectionId.match(/^claim_(\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

function parseDrawingNumber(sectionId: string): number | null {
  const match = sectionId.match(/^drawing_(\d+)$/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isNaN(num) ? null : num;
}

export function ensureSectionsForSupplementUpdates(
  sections: SpecificationSection[],
  updates: SupplementSectionUpdate[],
  options: { claimCount: number; drawingCount: number },
  claims: ClaimDraft[],
  drawingPrompts: DrawingPrompt[]
): {
  sections: SpecificationSection[];
  options: { claimCount: number; drawingCount: number };
  claims: ClaimDraft[];
  drawingPrompts: DrawingPrompt[];
} {
  let nextSections = dedupeSpecificationSections(sections);
  let claimCount = options.claimCount;
  let drawingCount = options.drawingCount;
  let nextClaims = [...claims];
  let nextDrawings = [...drawingPrompts];

  const claimNums = [
    ...new Set(updates.map((u) => parseClaimNumber(u.section_id)).filter((n): n is number => n !== null))
  ].sort((a, b) => a - b);

  for (const num of claimNums) {
    if (nextSections.some((s) => s.section_id === `claim_${num}`)) continue;
    nextSections = markSectionsForClaimChange(insertClaimSection(nextSections, num), num);
    claimCount = Math.max(claimCount, num, ...getClaimSectionNumbers(nextSections));
    if (!nextClaims.some((c) => c.claim_number === num)) {
      const existingNums = getClaimSectionNumbers(nextSections);
      nextClaims = [
        ...nextClaims,
        {
          claim_number: num,
          category: num === 1 ? "독립항" : "종속항",
          text: "",
          dependency: num === 1 ? undefined : existingNums[0] ?? 1
        }
      ];
    }
  }

  const drawingNums = [
    ...new Set(updates.map((u) => parseDrawingNumber(u.section_id)).filter((n): n is number => n !== null))
  ].sort((a, b) => a - b);

  for (const num of drawingNums) {
    if (nextSections.some((s) => s.section_id === `drawing_${num}`)) continue;
    nextSections = markSectionsForDrawingChange(insertDrawingSection(nextSections, num), num);
    drawingCount = Math.max(drawingCount, num, ...getDrawingSectionNumbers(nextSections));
    if (!nextDrawings.some((d) => d.figure_number === num)) {
      nextDrawings = [
        ...nextDrawings,
        {
          figure_number: num,
          title: `도면 ${num}`,
          drawing_type: "시스템도",
          purpose: "",
          required_elements: [],
          relative_layout: "",
          arrows_or_connections: "",
          reference_number_guidance: "",
          style_instruction: ""
        }
      ];
    }
  }

  return {
    sections: nextSections,
    options: { claimCount, drawingCount },
    claims: nextClaims,
    drawingPrompts: nextDrawings
  };
}
