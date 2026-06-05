import type { ClaimDraft, DrawingPrompt, SpecificationSection } from "@/types/patentDraft";

/** 청구항 추가 시 검토 대상 */
export const SECTIONS_AFFECTED_BY_CLAIM_CHANGE = ["means_for_solving"] as const;

/** 도면 추가 시 검토 대상 */
export const SECTIONS_AFFECTED_BY_DRAWING_CHANGE = [
  "brief_description_of_drawings",
  "detailed_description"
] as const;

export type ClaimImpactSectionId = (typeof SECTIONS_AFFECTED_BY_CLAIM_CHANGE)[number];
export type DrawingImpactSectionId = (typeof SECTIONS_AFFECTED_BY_DRAWING_CHANGE)[number];

/** @deprecated — claim ∪ drawing */
export const SECTIONS_AFFECTED_BY_CLAIM_OR_DRAWING_CHANGE = [
  ...SECTIONS_AFFECTED_BY_CLAIM_CHANGE,
  ...SECTIONS_AFFECTED_BY_DRAWING_CHANGE
] as const;

export const CLAIM_REVIEW_NOTICE = "청구항이 추가되었으므로 검토가 필요합니다";
export const DRAWING_REVIEW_NOTICE = "도면이 추가되었으므로 검토가 필요합니다";

export const CLAIM_DRAWING_REVIEW_NOTICE =
  "청구항 또는 도면이 추가/수정되었으므로 검토가 필요합니다";

function mergeNumbers(existing: number[] | undefined, value: number): number[] {
  const set = new Set(existing ?? []);
  set.add(value);
  return [...set].sort((a, b) => a - b);
}

export function isSectionAffectedByClaimChange(sectionId: string): sectionId is ClaimImpactSectionId {
  return (SECTIONS_AFFECTED_BY_CLAIM_CHANGE as readonly string[]).includes(sectionId);
}

export function isSectionAffectedByDrawingChange(sectionId: string): sectionId is DrawingImpactSectionId {
  return (SECTIONS_AFFECTED_BY_DRAWING_CHANGE as readonly string[]).includes(sectionId);
}

/** @deprecated */
export function isImpactSection(sectionId: string): boolean {
  return isSectionAffectedByClaimChange(sectionId) || isSectionAffectedByDrawingChange(sectionId);
}

export function getReviewNoticeForSection(section: SpecificationSection): string {
  if (section.section_id === "means_for_solving") return CLAIM_REVIEW_NOTICE;
  if (
    section.section_id === "brief_description_of_drawings" ||
    section.section_id === "detailed_description"
  ) {
    return DRAWING_REVIEW_NOTICE;
  }
  return CLAIM_DRAWING_REVIEW_NOTICE;
}

export function markSectionsForClaimChange(
  sections: SpecificationSection[],
  claimNumber: number
): SpecificationSection[] {
  return sections.map((s) => {
    if (s.section_id !== "means_for_solving") return s;
    return {
      ...s,
      needsReview: true,
      reviewSupplement: true,
      reviewMeta: {
        cause: "claim" as const,
        addedClaimNumbers: mergeNumbers(s.reviewMeta?.addedClaimNumbers, claimNumber)
      }
    };
  });
}

export function markSectionsForDrawingChange(
  sections: SpecificationSection[],
  figureNumber: number
): SpecificationSection[] {
  return sections.map((s) => {
    if (s.section_id === "brief_description_of_drawings") {
      return {
        ...s,
        needsReview: true,
        reviewSupplement: true,
        reviewMeta: {
          cause: "drawing" as const,
          addedFigureNumbers: mergeNumbers(s.reviewMeta?.addedFigureNumbers, figureNumber)
        }
      };
    }
    if (s.section_id === "detailed_description") {
      return {
        ...s,
        needsReview: true,
        reviewMeta: {
          cause: "drawing" as const,
          addedFigureNumbers: mergeNumbers(s.reviewMeta?.addedFigureNumbers, figureNumber)
        }
      };
    }
    return s;
  });
}

export function clearSectionReviewFlags(section: SpecificationSection): SpecificationSection {
  const { needsReview: _n, reviewSupplement: _s, reviewMeta: _m, ...rest } = section;
  return rest;
}

export function buildReviewSupplementInstruction(
  sectionId: string,
  section: SpecificationSection,
  claims: ClaimDraft[],
  drawingPrompts: DrawingPrompt[]
): string {
  const meta = section.reviewMeta;
  const examinerSuffix =
    " 심사관 제출용 명세서 품질 규칙을 적용하라. 【…】 항목 제목은 출력하지 말고 본문만 작성하라. 이중 개행 금지, 단일 줄바꿈(\\n)만 사용하라.";

  if (sectionId === "means_for_solving") {
    const nums = meta?.addedClaimNumbers ?? [];
    const newClaims = claims.filter((c) => nums.includes(c.claim_number));
    const claimsBlock =
      newClaims.length > 0
        ? newClaims.map((c) => `청구항 ${c.claim_number} (${c.category}): ${c.text || "(아직 비어 있음)"}`).join("\n")
        : claims.map((c) => `청구항 ${c.claim_number}: ${c.text}`).join("\n");

    return (
      `【보완 작성 — 과제의 해결 수단】` +
      `\n현재 【과제의 해결 수단】 본문 전체를 유지하라. 기존 청구항에 대한 서술은 삭제·변경·재배열하지 말라.` +
      `\n다음 신규·추가 청구항${nums.length > 0 ? ` (${nums.map((n) => `청구항 ${n}`).join(", ")})` : ""}만 반영하여, 부족한 부분만 문단 끝 또는 적절한 위치에 덧붙여라.` +
      `\n"필수 구성으로서" 표현은 쓰지 말고, 모든 청구항을 paraphrasing 형태로 포함하되 기존 문장은 그대로 두라.` +
      `\n\n[전체 청구항]\n${claimsBlock}` +
      examinerSuffix
    );
  }

  if (sectionId === "brief_description_of_drawings") {
    const total = drawingPrompts.length;
    const figs = meta?.addedFigureNumbers ?? [];
    const newDrawings = drawingPrompts.filter((d) => figs.includes(d.figure_number));
    const drawingBlock =
      newDrawings.length > 0
        ? newDrawings
            .map(
              (d) =>
                `도 ${d.figure_number}: ${d.title || `도면 ${d.figure_number}`}${d.purpose ? ` — ${d.purpose}` : ""}`
            )
            .join("\n")
        : drawingPrompts.map((d) => `도 ${d.figure_number}: ${d.title}`).join("\n");

    return (
      `【보완 작성 — 도면의 간단한 설명】` +
      `\n현재 명세서 도면은 총 ${total}개이다.` +
      `\n현재 【도면의 간단한 설명】 본문을 유지하라. 이미 있는 "도 N은(는) …를 나타낸다." 형식 문장은 수정·삭제·순서 변경하지 말라.` +
      `\n신규·추가 도면${figs.length > 0 ? ` (도 ${figs.join(", 도 ")})` : ""}에 대해서만 같은 형식의 한 문장씩 추가하라.` +
      `\n기존 도면 번호에 대한 문장은 건드리지 말라. (다시 작성 시에는 도 1~도 ${total} 전체에 맞춰 작성)` +
      `\n\n[신규·추가 도면 정보]\n${drawingBlock}` +
      examinerSuffix
    );
  }

  return section.content
    ? "현재 내용을 유지하면서 발명 분석표와 작성 지침에 맞게 보완하라."
    : "발명 분석표와 작성 지침에 맞게 해당 항목을 작성하라.";
}

/** @deprecated */
export function markSectionsForClaimDrawingReview(
  sections: SpecificationSection[]
): SpecificationSection[] {
  return sections.map((s) =>
    isImpactSection(s.section_id) ? { ...s, needsReview: true } : s
  );
}
