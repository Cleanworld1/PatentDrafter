import { getDrawingReferenceNumberRulesBlock } from "@/knowledge/drawingReferenceNumberRules";
import { getPatentExaminerRulesBlockBySectionId } from "@/knowledge/patentExaminerDraftingRules";

export type RefinementMode = "rewrite" | "elaborate";

export interface RefinementStep {
  sectionId: string;
  mode: RefinementMode;
  /** regenerate-section에 전달할 추가 지시 (없으면 기본 지시) */
  userInstruction?: string;
}

const REWRITE_SUFFIX =
  " 심사관 제출용 명세서 품질 규칙(자료 출처 표현 금지, 배경기술 외 일 실시예 문체)을 최우선 적용하라. 【…】 형식의 목차·항목 제목은 출력하지 말고 본문만 작성하라. 빈 줄(\\n\\n) 없이 단일 줄바꿈(\\n)만 사용하라.";

const REWRITE_DEFAULT =
  "발명 분석표·[이미 작성된 명세서 전체]·해당 항목 작성 지침에 맞게, 현재 초안을 참고하되 품질이 낮은 표현은 버리고 해당 항목만 처음부터 다시 작성하라. 다른 항목과 용어·논리가 일치해야 한다. 국내 특허명세서 문체를 사용하라. 다른 항목은 출력하지 말라." +
  REWRITE_SUFFIX;

const DRAWING_REF_RULES = getDrawingReferenceNumberRulesBlock();

const DRAWING_REWRITE =
  "실제 도면 이미지를 생성·묘사하지 말라. 도면 작성자가 특허 도면을 그릴 수 있도록 **간결한** 텍스트 프롬프트만 작성하라. " +
  "핵심 구성요소·상대 배치·연결·화살표 의미·참조부호·흑백 선도 스타일만 짧게 적고, 화면/블록/단계를 과도하게 세분·나열하지 말라." +
  `\n\n${DRAWING_REF_RULES}`;

const DRAWING_ELABORATE = DRAWING_REWRITE;

const BRIEF_DRAWINGS_REWRITE =
  "【도면의 간단한 설명】만 다시 작성하라. [현재 명세서 도면 구성]에 나열된 도면 개수·번호와 정확히 일치하게, 각 도면마다 \"도 N은(는) …를 나타낸다.\" 문장을 빠짐없이 작성하라. 목록에 없는 도면 번호는 쓰지 말고, 목록의 도면은 하나도 빠뜨리지 말라." +
  REWRITE_SUFFIX;

const DETAILED_REWRITE =
  "청구항·도면 프롬프트·앞선 항목과 정합되게 【발명을 실시하기 위한 구체적인 내용】만 다시 작성하라. 국내 특허명세서 문체. [현재 명세서 도면 구성]의 모든 도면(도 1~현재 도면 수)에 대해 각각 ‘도 N은 …’ / ‘도 N을 참조하면 …’ 형식의 설명을 빠짐없이 포함하라. 분석표 도면 수와 다르면 현재 도면 목록을 따른다." +
  REWRITE_SUFFIX;

const ELABORATE_SUFFIX =
  " 자료·파일·페이지 출처 표현 없이, 배경기술 외 항목은 일 실시예 문체를 유지하라. 【…】 항목 제목은 출력하지 말라. 이중 개행 금지, 단일 줄바꿈만 사용하라.";

function withExaminerRules(sectionId: string, base: string): string {
  return `${base}\n\n${getPatentExaminerRulesBlockBySectionId(sectionId)}`;
}

export function getDefaultRewriteInstruction(sectionId: string): string {
  if (sectionId.startsWith("drawing_")) {
    return withExaminerRules(
      sectionId,
      DRAWING_REWRITE + " 자료·카탈로그·PDF 등 출처 표현은 프롬프트 본문에 넣지 말라."
    );
  }
  if (sectionId === "brief_description_of_drawings") {
    return withExaminerRules(sectionId, BRIEF_DRAWINGS_REWRITE);
  }
  if (sectionId === "detailed_description") {
    return withExaminerRules(sectionId, DETAILED_REWRITE);
  }
  if (sectionId === "background_art") {
    return withExaminerRules(
      sectionId,
      `${REWRITE_DEFAULT} 선행문헌은 1건만 "이와 관련하여 대한민국 특허공개공보 제○○○○○○호가 있다." 형식으로 간단히 언급한다.`
    );
  }
  if (sectionId === "problems_to_solve") {
    return withExaminerRules(
      sectionId,
      `${REWRITE_DEFAULT} 분량은 약 3줄(3문장 전후)로 제한한다.`
    );
  }
  if (sectionId === "means_for_solving") {
    return withExaminerRules(
      sectionId,
      `${REWRITE_DEFAULT} 모든 청구항을 paraphrasing하여 기재하고 "필수 구성으로서" 등 표현은 쓰지 않는다.`
    );
  }
  if (sectionId.startsWith("claim_")) {
    const num = sectionId.replace("claim_", "");
    return withExaminerRules(
      sectionId,
      `${REWRITE_DEFAULT} 청구항 ${num} 본문만 작성하라. "청구항 ${num}." 같은 번호 머리말·【청구항 ${num}】 제목은 출력하지 말라. 독립항은 "…에 있어서,"로 바로 시작하고, 종속항만 인용 청구항에 대해 "청구항 M에 있어서,"로 시작하라.`
    );
  }
  return withExaminerRules(sectionId, REWRITE_DEFAULT);
}

export function getDefaultElaborateInstruction(sectionId: string): string {
  if (sectionId.startsWith("drawing_")) {
    return withExaminerRules(sectionId, DRAWING_ELABORATE + ELABORATE_SUFFIX);
  }
  if (sectionId === "detailed_description") {
    return withExaminerRules(
      sectionId,
      "【발명을 실시하기 위한 구체적인 내용】을 더 풍부하고 구체적으로 확장하라. [현재 명세서 도면 구성]의 모든 도면에 대한 설명·구성요소 역할·동작 흐름을 빠짐없이 보강하라." +
        ELABORATE_SUFFIX
    );
  }
  if (sectionId === "problems_to_solve") {
    return withExaminerRules(
      sectionId,
      `현재 내용을 유지하면서 기술적 구체성을 보강하되, 전체 3줄 내외 분량을 넘기지 말라.${ELABORATE_SUFFIX}`
    );
  }
  if (sectionId === "means_for_solving") {
    return withExaminerRules(
      sectionId,
      `청구항 전체를 paraphrasing 형태로 더 명확히 풀어 쓰되 "필수 구성으로서" 표현은 넣지 말라.${ELABORATE_SUFFIX}`
    );
  }
  return withExaminerRules(
    sectionId,
    `현재 내용을 유지하면서 기술적 구체성·논리 연결·지지 관계를 한 단계 더 풍부하게 작성하라. 국내 특허명세서 문체.${ELABORATE_SUFFIX}`
  );
}

/** 전체 자동 작성 직후 순차 정제 계획 */
export function buildPostFullDraftRefinementPlan(
  claimCount: number,
  drawingCount: number
): RefinementStep[] {
  const steps: RefinementStep[] = [];

  const phase1: string[] = [
    "invention_title",
    "technical_field",
    "background_art",
    "problems_to_solve"
  ];
  for (const id of phase1) {
    steps.push({ sectionId: id, mode: "rewrite" });
  }

  for (let i = 1; i <= claimCount; i += 1) {
    steps.push({ sectionId: `claim_${i}`, mode: "rewrite" });
  }

  for (const id of ["summary", "means_for_solving", "effects", "brief_description_of_drawings"]) {
    steps.push({ sectionId: id, mode: "rewrite" });
  }

  for (let i = 1; i <= drawingCount; i += 1) {
    steps.push({ sectionId: `drawing_${i}`, mode: "rewrite" });
  }

  steps.push({ sectionId: "detailed_description", mode: "rewrite" });
  steps.push({ sectionId: "detailed_description", mode: "elaborate", userInstruction: "__DETAILED_WITH_FIGURES__" });

  return steps;
}

export function resolveRefinementInstruction(
  step: RefinementStep
): string | undefined {
  if (step.userInstruction === "__DETAILED_WITH_FIGURES__") {
    return undefined;
  }
  if (step.userInstruction) return step.userInstruction;
  return step.mode === "rewrite"
    ? getDefaultRewriteInstruction(step.sectionId)
    : getDefaultElaborateInstruction(step.sectionId);
}
