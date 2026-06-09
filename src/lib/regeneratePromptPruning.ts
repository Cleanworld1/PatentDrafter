import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import {
  parseClaimSectionNumber,
  parseDrawingSectionNumber
} from "@/lib/regenerateSectionContext";
import type { ClaimDraft, InventionAnalysis } from "@/types/patentDraft";
import type { SpecificationSectionType } from "@/types/specificationSection";
import { sectionIdToTitle, sectionIdToType } from "@/types/specificationSection";

const DEFAULT_SECTION_MAX = 700;
const PRIORITY_SECTION_MAX = 1200;
const CLAIM_EXCERPT_MAX = 350;
const TOTAL_WRITTEN_MAX = 5500;

function clip(text: string, max: number): string {
  const t = text.trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}\n…(생략)`;
}

/** HTML·표를 프롬프트용 평문으로 축소 */
export function sectionContentToPromptText(content: string, maxChars: number): string {
  let text = content
    .replace(/<table[\s\S]*?<\/table>/gi, (table) =>
      clip(table.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), 400) + " [표]"
    )
    .replace(/<img[^>]*>/gi, "[이미지]")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n");

  return clip(text, maxChars);
}

function joinList(items: string[], maxItems = 8, itemMax = 120): string {
  return items
    .filter(Boolean)
    .slice(0, maxItems)
    .map((s) => clip(s, itemMax))
    .join(" | ");
}

export function formatCompactAnalysisForSection(
  sectionType: SpecificationSectionType,
  analysis: InventionAnalysis
): string {
  const base = [
    `한줄: ${clip(analysis.one_line_summary, 200)}`,
    `핵심: ${clip(analysis.core_idea, 300)}`,
    `기술분야: ${clip(analysis.technical_field, 120)}`
  ];

  const byType: Partial<Record<SpecificationSectionType, string[]>> = {
    invention_title: [`후보: ${joinList(analysis.title_candidates, 3, 80)}`],
    technical_field: [`기술분야: ${clip(analysis.technical_field, 200)}`],
    background_art: [
      `선행: ${clip(analysis.prior_art, 500)}`,
      `선행문제: ${joinList(analysis.prior_art_problems, 4)}`
    ],
    problems_to_solve: [`해결과제: ${joinList(analysis.problem_to_solve, 5)}`],
    means_for_solving: [
      `필수구성: ${joinList(analysis.essential_elements, 10)}`,
      `관계: ${joinList(analysis.element_relationships, 6)}`
    ],
    effects: [`기대효과: ${joinList(analysis.expected_effects, 6)}`],
    brief_description_of_drawings: [`도면후보: ${joinList(analysis.drawing_candidates, 8)}`],
    detailed_description: [
      `필수구성: ${joinList(analysis.essential_elements, 10)}`,
      `관계: ${joinList(analysis.element_relationships, 6)}`,
      `동작흐름: ${joinList(analysis.operation_flow, 6)}`,
      `제어조건: ${joinList(analysis.control_conditions, 4)}`
    ],
    claim: [
      `보호포인트: ${joinList(analysis.claim_points, 8)}`,
      `필수: ${joinList(analysis.essential_elements, 10)}`,
      `선택: ${joinList(analysis.optional_elements, 6)}`,
      `변형: ${joinList(analysis.variation_examples, 4)}`
    ],
    drawing_prompt: [
      `도면후보: ${joinList(analysis.drawing_candidates, 6)}`,
      `필수구성: ${joinList(analysis.essential_elements, 8)}`,
      `보호포인트: ${joinList(analysis.claim_points, 4)}`
    ],
    summary: [`한줄: ${clip(analysis.one_line_summary, 300)}`, `효과: ${joinList(analysis.expected_effects, 3)}`],
    representative_drawing: [`도면후보: ${joinList(analysis.drawing_candidates, 4)}`]
  };

  const extra = byType[sectionType] ?? [];
  return [...base, ...extra].join("\n");
}

function maxCharsForSection(sectionId: string): number {
  if (sectionId.startsWith("claim_")) return PRIORITY_SECTION_MAX;
  if (sectionId.startsWith("drawing_")) return 300;
  if (
    sectionId === "means_for_solving" ||
    sectionId === "detailed_description" ||
    sectionId === "brief_description_of_drawings"
  ) {
    return PRIORITY_SECTION_MAX;
  }
  return DEFAULT_SECTION_MAX;
}

export function getRelatedSectionIdsForRegenerate(
  sectionId: string,
  allSections: Array<{ section_id: string }>
): string[] {
  const ids = allSections.map((s) => s.section_id);
  const has = (id: string) => ids.includes(id);
  const claims = ids.filter((id) => id.startsWith("claim_")).sort();
  const drawings = ids.filter((id) => id.startsWith("drawing_")).sort();

  const claimNum = parseClaimSectionNumber(sectionId);
  const figureNum = parseDrawingSectionNumber(sectionId);
  const type = sectionIdToType(sectionId);

  const pick = (...wanted: string[]) => wanted.filter(has);

  if (figureNum != null) {
    return pick(
      "invention_title",
      "means_for_solving",
      "detailed_description",
      "brief_description_of_drawings",
      "claim_1",
      ...claims.filter((id) => parseClaimSectionNumber(id) === 1),
      ...drawings.filter((id) => parseDrawingSectionNumber(id) !== figureNum)
    );
  }

  if (claimNum != null) {
    const priorClaims = claims.filter((id) => (parseClaimSectionNumber(id) ?? 0) < claimNum);
    return pick("means_for_solving", "detailed_description", "effects", ...priorClaims);
  }

  const typeMap: Partial<Record<SpecificationSectionType, string[]>> = {
    invention_title: ["technical_field", "summary"],
    technical_field: ["invention_title"],
    background_art: ["technical_field", "problems_to_solve"],
    problems_to_solve: ["background_art", "means_for_solving"],
    means_for_solving: ["problems_to_solve", "claim_1", "detailed_description"],
    effects: ["means_for_solving", "problems_to_solve"],
    brief_description_of_drawings: ["representative_drawing", ...drawings],
    detailed_description: [
      "means_for_solving",
      "brief_description_of_drawings",
      "effects",
      "claim_1",
      ...drawings
    ],
    summary: ["invention_title", "claim_1", "effects"],
    representative_drawing: ["brief_description_of_drawings", ...drawings.slice(0, 3)]
  };

  return pick(...(typeMap[type] ?? ["means_for_solving", "claim_1"]));
}

export function formatPrunedWrittenSpecificationContext(
  sections: Array<{ section_id: string; content: string }>,
  excludeSectionId?: string,
  relatedIds?: string[]
): string {
  const related = new Set(relatedIds ?? sections.map((s) => s.section_id));
  const parts: string[] = [];
  let total = 0;

  for (const sec of sections) {
    if (excludeSectionId && sec.section_id === excludeSectionId) continue;
    if (!related.has(sec.section_id)) continue;

    const body = sectionContentToPromptText(sec.content ?? "", maxCharsForSection(sec.section_id));
    if (!body) continue;

    const block = `■ ${sectionIdToTitle(sec.section_id)}\n${body}`;
    if (total + block.length > TOTAL_WRITTEN_MAX) {
      parts.push("…(관련 항목 일부 생략)");
      break;
    }
    parts.push(block);
    total += block.length;
  }

  if (!parts.length) return "";

  return (
    `[관련 명세서 항목 — 용어·논리 일치]\n` +
    "아래는 대상 항목과 직접 관련된 **다른 항목** 요약이다. 모순 없이 용어를 통일하라.\n\n" +
    parts.join("\n\n")
  );
}

export function pruneClaimsForRegenerate(
  sectionId: string,
  claims: ClaimDraft[]
): ClaimDraft[] {
  const claimNum = parseClaimSectionNumber(sectionId);
  const figureNum = parseDrawingSectionNumber(sectionId);
  const type = sectionIdToType(sectionId);

  if (claimNum != null) {
    return claims.filter((c) => c.claim_number < claimNum && c.text.trim());
  }

  if (figureNum != null || type === "brief_description_of_drawings" || type === "representative_drawing") {
    const c1 = claims.find((c) => c.claim_number === 1);
    return c1 ? [c1] : claims.slice(0, 1);
  }

  if (type === "summary" || type === "means_for_solving") {
    return claims.slice(0, 2);
  }

  if (type === "detailed_description") {
    return claims.slice(0, 3).map((c) =>
      c.claim_number === 1
        ? c
        : { ...c, text: clip(c.text, CLAIM_EXCERPT_MAX) }
    );
  }

  return claims.slice(0, 1);
}

export function pruneAnalysisForRegenerate(
  sectionType: SpecificationSectionType,
  analysis: InventionAnalysis
): InventionAnalysis {
  const compact = (arr: string[], n: number) => arr.slice(0, n);

  const shared: InventionAnalysis = {
    ...analysis,
    title_candidates: compact(analysis.title_candidates, 3),
    prior_art_problems: compact(analysis.prior_art_problems, 4),
    problem_to_solve: compact(analysis.problem_to_solve, 5),
    essential_elements: compact(analysis.essential_elements, 12),
    optional_elements: compact(analysis.optional_elements, 6),
    element_relationships: compact(analysis.element_relationships, 6),
    operation_flow: compact(analysis.operation_flow, 6),
    data_inputs: compact(analysis.data_inputs, 4),
    data_outputs: compact(analysis.data_outputs, 4),
    control_conditions: compact(analysis.control_conditions, 4),
    exception_cases: compact(analysis.exception_cases, 3),
    variation_examples: compact(analysis.variation_examples, 4),
    expected_effects: compact(analysis.expected_effects, 6),
    claim_points: compact(analysis.claim_points, 8),
    drawing_candidates: compact(analysis.drawing_candidates, 8),
    visual_material_analysis: [],
    document_structure_analysis: [],
    table_or_experiment_data_analysis: compact(analysis.table_or_experiment_data_analysis, 2),
    unclear_points: compact(analysis.unclear_points, 3),
    do_not_invent: compact(analysis.do_not_invent, 3),
    prior_art: clip(analysis.prior_art, 600)
  };

  if (sectionType === "drawing_prompt" || sectionType === "brief_description_of_drawings") {
    return {
      ...shared,
      operation_flow: compact(analysis.operation_flow, 4),
      element_relationships: compact(analysis.element_relationships, 4)
    };
  }

  if (sectionType === "claim") {
    return shared;
  }

  if (sectionType === "technical_field" || sectionType === "invention_title" || sectionType === "summary") {
    return {
      ...shared,
      element_relationships: [],
      operation_flow: [],
      data_inputs: [],
      data_outputs: [],
      control_conditions: [],
      table_or_experiment_data_analysis: []
    };
  }

  return shared;
}

export function shouldIncludeDrawingContext(sectionType: SpecificationSectionType): boolean {
  return (
    sectionType === "drawing_prompt" ||
    sectionType === "brief_description_of_drawings" ||
    sectionType === "detailed_description" ||
    sectionType === "representative_drawing"
  );
}

export function shouldIncludeChemicalEmbodiment(sectionType: SpecificationSectionType): boolean {
  return sectionType === "detailed_description" || sectionType === "means_for_solving";
}

export function shouldIncludeChemicalFormulaCatalog(sectionType: SpecificationSectionType): boolean {
  return sectionType === "detailed_description";
}

export function pruneDrawingContextForRegenerate(
  ctx: CurrentDrawingContext | undefined,
  sectionId: string
): CurrentDrawingContext | undefined {
  if (!ctx) return undefined;

  const figureNum = parseDrawingSectionNumber(sectionId);
  if (figureNum != null) {
    const entry = ctx.drawings.find((d) => d.figure_number === figureNum);
    return {
      drawingCount: ctx.drawingCount,
      figureNumbers: [figureNum],
      drawings: entry ? [{ ...entry, prompt_excerpt: clip(entry.prompt_excerpt ?? "", 200) }] : []
    };
  }

  return {
    ...ctx,
    drawings: ctx.drawings.map((d) => ({
      ...d,
      purpose: d.purpose ? clip(d.purpose, 120) : undefined,
      prompt_excerpt: d.prompt_excerpt ? clip(d.prompt_excerpt, 150) : undefined
    }))
  };
}

export function pruneSpecificationSectionsForRequest(
  sections: Array<{ section_id: string; content: string }>,
  sectionId: string
): Array<{ section_id: string; content: string }> {
  const related = new Set(getRelatedSectionIdsForRegenerate(sectionId, sections));
  related.add(sectionId);

  return sections
    .filter((s) => related.has(s.section_id))
    .map((s) => ({
      section_id: s.section_id,
      content:
        s.section_id === sectionId
          ? s.content
          : sectionContentToPromptText(s.content, maxCharsForSection(s.section_id))
    }));
}
