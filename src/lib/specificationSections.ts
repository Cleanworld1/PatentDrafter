import type { ClaimDraft, DrawingPrompt, SpecificationDraft, SpecificationSection } from "@/types/patentDraft";

const BASE_SECTION_DEFS = [
  { section_id: "invention_title", title: "【발명의 명칭】" },
  { section_id: "technical_field", title: "【기술분야】" },
  { section_id: "background_art", title: "【발명의 배경이 되는 기술】" },
  { section_id: "problems_to_solve", title: "【해결하고자 하는 과제】" },
  { section_id: "means_for_solving", title: "【과제의 해결 수단】" },
  { section_id: "effects", title: "【발명의 효과】" },
  { section_id: "brief_description_of_drawings", title: "【도면의 간단한 설명】" },
  { section_id: "detailed_description", title: "【발명을 실시하기 위한 구체적인 내용】" }
] as const;

export function createEmptySections(claimCount = 5, drawingCount = 5): SpecificationSection[] {
  const now = new Date().toISOString();
  const sections: SpecificationSection[] = BASE_SECTION_DEFS.map((def) => ({
    ...def,
    content: "",
    isGenerating: false,
    lastUpdatedAt: now
  }));

  for (let i = 1; i <= claimCount; i += 1) {
    sections.push({
      section_id: `claim_${i}`,
      title: `【청구항 ${i}】`,
      content: "",
      isGenerating: false,
      lastUpdatedAt: now
    });
  }

  sections.push(
    { section_id: "summary", title: "【요약】", content: "", isGenerating: false, lastUpdatedAt: now },
    { section_id: "representative_drawing", title: "【대표도】", content: "", isGenerating: false, lastUpdatedAt: now }
  );

  for (let i = 1; i <= drawingCount; i += 1) {
    sections.push({
      section_id: `drawing_${i}`,
      title: `【도 ${i}】`,
      content: "",
      isGenerating: false,
      lastUpdatedAt: now
    });
  }

  return sections;
}

export function specificationToSections(
  specification: SpecificationDraft,
  claimCount?: number,
  drawingCount?: number
): SpecificationSection[] {
  const now = new Date().toISOString();
  const claims = specification.claims ?? [];
  const drawings = specification.drawing_prompts ?? [];
  const maxClaims = claimCount ?? Math.max(claims.length, 5);
  const maxDrawings = drawingCount ?? Math.max(drawings.length, 5);

  const sections = createEmptySections(maxClaims, maxDrawings);

  const contentMap: Record<string, string> = {
    invention_title: specification.invention_title,
    technical_field: specification.technical_field,
    background_art: specification.background_art,
    problems_to_solve: specification.problems_to_solve,
    means_for_solving: specification.means_for_solving,
    effects: specification.effects,
    brief_description_of_drawings: specification.brief_description_of_drawings,
    detailed_description: specification.detailed_description,
    summary: specification.summary,
    representative_drawing: specification.representative_drawing
  };

  for (const section of sections) {
    if (contentMap[section.section_id]) {
      section.content = contentMap[section.section_id];
      section.lastUpdatedAt = now;
    } else if (section.section_id.startsWith("claim_")) {
      const num = Number(section.section_id.replace("claim_", ""));
      const claim = claims.find((c) => c.claim_number === num);
      if (claim) {
        section.content = claim.text;
        section.lastUpdatedAt = now;
      }
    } else if (section.section_id.startsWith("drawing_")) {
      const num = Number(section.section_id.replace("drawing_", ""));
      const drawing = drawings.find((d) => d.figure_number === num);
      if (drawing) {
        section.content = `${drawing.title}\n\n${drawing.purpose}`;
        section.lastUpdatedAt = now;
      }
    }
  }

  return sections;
}

export function sectionsToSpecification(
  sections: SpecificationSection[],
  existing?: SpecificationDraft
): SpecificationDraft {
  const get = (id: string) => sections.find((s) => s.section_id === id)?.content ?? "";

  const claimSections = sections.filter((s) => s.section_id.startsWith("claim_"));
  const claims: ClaimDraft[] = claimSections.map((section, index) => {
    const num = Number(section.section_id.replace("claim_", ""));
    const existingClaim = existing?.claims.find((c) => c.claim_number === num);
    return {
      claim_number: num,
      category: existingClaim?.category ?? (index === 0 ? "독립항" : "종속항"),
      text: section.content,
      dependency: existingClaim?.dependency ?? (index === 0 ? undefined : 1),
      support_notes: existingClaim?.support_notes
    };
  });

  const drawingSections = sections.filter((s) => s.section_id.startsWith("drawing_"));
  const drawing_prompts: DrawingPrompt[] = drawingSections.map((section) => {
    const num = Number(section.section_id.replace("drawing_", ""));
    const existingDrawing = existing?.drawing_prompts.find((d) => d.figure_number === num);
    const [title = "", ...rest] = section.content.split("\n\n");
    return existingDrawing ?? {
      figure_number: num,
      title: title || `도면 ${num}`,
      drawing_type: "시스템도",
      purpose: rest.join("\n\n") || section.content,
      required_elements: [],
      relative_layout: "",
      arrows_or_connections: "",
      reference_number_guidance: "",
      style_instruction: ""
    };
  });

  return {
    invention_title: get("invention_title"),
    technical_field: get("technical_field"),
    background_art: get("background_art"),
    problems_to_solve: get("problems_to_solve"),
    means_for_solving: get("means_for_solving"),
    effects: get("effects"),
    brief_description_of_drawings: get("brief_description_of_drawings"),
    detailed_description: get("detailed_description"),
    summary: get("summary"),
    representative_drawing: get("representative_drawing"),
    claims,
    drawing_prompts
  };
}

export function findSectionById(sections: SpecificationSection[], sectionId: string): SpecificationSection | undefined {
  return sections.find((s) => s.section_id === sectionId);
}
