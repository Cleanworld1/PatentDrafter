export type SpecificationSectionType =
  | "invention_title"
  | "technical_field"
  | "background_art"
  | "problems_to_solve"
  | "means_for_solving"
  | "effects"
  | "brief_description_of_drawings"
  | "detailed_description"
  | "claim"
  | "summary"
  | "representative_drawing"
  | "drawing_prompt";

export const SECTION_TYPE_TITLES: Record<SpecificationSectionType, string> = {
  invention_title: "【발명의 명칭】",
  technical_field: "【기술분야】",
  background_art: "【발명의 배경이 되는 기술】",
  problems_to_solve: "【해결하고자 하는 과제】",
  means_for_solving: "【과제의 해결 수단】",
  effects: "【발명의 효과】",
  brief_description_of_drawings: "【도면의 간단한 설명】",
  detailed_description: "【발명을 실시하기 위한 구체적인 내용】",
  claim: "【청구항】",
  summary: "【요약】",
  representative_drawing: "【대표도】",
  drawing_prompt: "【도면 생성 프롬프트】"
};

export function sectionIdToType(sectionId: string): SpecificationSectionType {
  if (sectionId.startsWith("claim_")) return "claim";
  if (sectionId.startsWith("drawing_")) return "drawing_prompt";
  if (sectionId in SECTION_TYPE_TITLES) return sectionId as SpecificationSectionType;
  return "detailed_description";
}

export function sectionIdToTitle(sectionId: string): string {
  if (sectionId.startsWith("claim_")) {
    const num = sectionId.replace("claim_", "");
    return `【청구항 ${num}】`;
  }
  if (sectionId.startsWith("drawing_")) {
    const num = sectionId.replace("drawing_", "");
    return `【도 ${num}】`;
  }
  const type = sectionIdToType(sectionId);
  return SECTION_TYPE_TITLES[type];
}
