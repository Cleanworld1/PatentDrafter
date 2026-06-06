import { getDrawingReferenceNumberRulesBlock } from "@/knowledge/drawingReferenceNumberRules";
import {
  getDefaultElaborateInstruction,
  getDefaultRewriteInstruction
} from "@/lib/workflow/postFullDraftRefinement";
import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis, SpecificationSection } from "@/types/patentDraft";
import { sectionIdToTitle } from "@/types/specificationSection";

const WRITTEN_SPEC_SECTION_MAX = 2500;
const WRITTEN_SPEC_TOTAL_MAX = 22_000;

export function parseDrawingSectionNumber(sectionId: string): number | null {
  const m = sectionId.match(/^drawing_(\d+)$/);
  return m ? Number(m[1]) : null;
}

export function parseClaimSectionNumber(sectionId: string): number | null {
  const m = sectionId.match(/^claim_(\d+)$/);
  return m ? Number(m[1]) : null;
}

/** 편집기에 반영된 청구항 본문을 우선 사용 */
export function buildLiveClaimsFromSections(
  sections: SpecificationSection[],
  claims: ClaimDraft[]
): ClaimDraft[] {
  return claims.map((claim) => {
    const section = sections.find((s) => s.section_id === `claim_${claim.claim_number}`);
    const liveText = section?.content?.trim();
    if (!liveText) return claim;
    return { ...claim, text: liveText };
  });
}

export function formatSingleDrawingContextBlock(
  ctx: CurrentDrawingContext,
  figureNumber: number
): string {
  const entry = ctx.drawings.find((d) => d.figure_number === figureNumber);
  if (!entry) {
    return `[대상 도면 — 도 ${figureNumber}]
현재 명세서에 도 ${figureNumber} 섹션이 없습니다. 도 ${figureNumber}에 대한 프롬프트만 작성하라.`;
  }

  const lines = [
    `- 도 ${entry.figure_number}: ${entry.title}`,
    entry.drawing_type ? `  유형: ${entry.drawing_type}` : "",
    entry.purpose ? `  목적: ${entry.purpose}` : "",
    entry.prompt_excerpt ? `  기존 프롬프트 요약: ${entry.prompt_excerpt}` : ""
  ].filter(Boolean);

  return `[대상 도면 — 오직 도 ${figureNumber}만]
- 이번 출력은 【도 ${figureNumber}】 한 장의 도면 작성 프롬프트만 작성한다.
- 도 ${figureNumber}이 아닌 다른 도면(도 1, 도 2 …)에 대한 프롬프트·설명·제목을 본문에 쓰지 말라.
- 전체 도면 수 ${ctx.drawingCount}개는 참고용이며, 다른 도 번호 문단을 생성하지 말라.

[도 ${figureNumber} 정보]
${lines.join("\n")}`;
}

export function formatClaimRegenerateContext(
  claimNumber: number,
  liveClaims: ClaimDraft[],
  analysis: InventionAnalysis,
  sections: SpecificationSection[]
): string {
  const prior = liveClaims
    .filter((c) => c.claim_number < claimNumber && c.text.trim())
    .sort((a, b) => a.claim_number - b.claim_number);

  const means = sections.find((s) => s.section_id === "means_for_solving")?.content?.trim();
  const detailed = sections.find((s) => s.section_id === "detailed_description")?.content?.trim();

  const priorBlock =
    prior.length > 0
      ? prior.map((c) => `■ 청구항 ${c.claim_number} (${c.category})\n${c.text}`).join("\n\n")
      : "(아직 선행 청구항 없음 — 발명 분석표 기반으로 작성)";

  const supportBlock = [
    means && `【과제의 해결 수단】 요약:\n${means.slice(0, 2000)}`,
    detailed && `【구체적인 내용】 요약:\n${detailed.slice(0, 2000)}`
  ]
    .filter(Boolean)
    .join("\n\n");

  return `[청구항 ${claimNumber} 작성 맥락]
[선행 청구항 — 용어·논리·인용 일치 필수]
${priorBlock}

[발명 분석 — 보호 포인트·핵심 구성]
- claim_points: ${analysis.claim_points.join(" | ") || "(없음)"}
- essential_elements: ${analysis.essential_elements.join(", ") || "(없음)"}
- optional_elements: ${analysis.optional_elements.join(", ") || "(없음)"}
- variation_examples: ${analysis.variation_examples.join(" | ") || "(없음)"}

${supportBlock ? `[이미 작성된 명세서 발췌]\n${supportBlock}` : ""}`;
}

/** 편집기에 이미 작성된 다른 항목 본문 (다시 작성 시 전체 맥락) */
export function formatWrittenSpecificationContext(
  sections: SpecificationSection[],
  excludeSectionId?: string
): string {
  const parts: string[] = [];
  let total = 0;

  for (const sec of sections) {
    if (excludeSectionId && sec.section_id === excludeSectionId) continue;
    const body = sec.content?.trim();
    if (!body) continue;

    const title = sectionIdToTitle(sec.section_id);
    const clipped =
      body.length > WRITTEN_SPEC_SECTION_MAX
        ? `${body.slice(0, WRITTEN_SPEC_SECTION_MAX)}\n…(생략)`
        : body;
    const block = `■ ${title}\n${clipped}`;

    if (total + block.length > WRITTEN_SPEC_TOTAL_MAX) {
      parts.push("…(이미 작성된 다른 항목 일부 생략 — 토큰 한도)");
      break;
    }
    parts.push(block);
    total += block.length;
  }

  if (parts.length === 0) return "";

  return (
    `[이미 작성된 명세서 전체 — 용어·논리·순서 일치 필수]\n` +
    "아래는 편집기에 반영된 **다른 항목**들이다. 대상 항목을 다시 작성할 때 이 내용과 모순되지 않게 하고, 용어·표현·기술 논리를 통일하라.\n\n" +
    parts.join("\n\n")
  );
}

function pickFeatureForDependentClaim(claimNumber: number, analysis: InventionAnalysis): string {
  const pool = [
    ...analysis.essential_elements.slice(1),
    ...analysis.optional_elements,
    ...analysis.variation_examples,
    ...analysis.claim_points.slice(1),
    ...analysis.operation_flow,
    ...analysis.control_conditions
  ].filter((v) => v?.trim());

  const idx = Math.max(0, claimNumber - 2);
  return pool[idx % Math.max(pool.length, 1)] ?? analysis.core_idea;
}

export function buildClaimRewriteUserInstruction(
  claimNumber: number,
  analysis: InventionAnalysis,
  liveClaims: ClaimDraft[]
): string {
  const prior = liveClaims.filter((c) => c.claim_number < claimNumber);
  const baseRules =
    `청구항 ${claimNumber} 본문만 작성하라. "청구항 ${claimNumber}."·【청구항 ${claimNumber}】 머리말 금지. ` +
    "앞 청구항과 동일한 문장을 그대로 반복하지 말라. 발명 분석표 문장만 베끼지 말고, 선행 청구항에 **추가·한정**하는 구성만 쓰라.";

  if (claimNumber === 1) {
    return (
      `${baseRules} ` +
      "독립항으로, claim_points·essential_elements를 반영해 **가장 넓은 합리적** 보호범위를 잡되 구체적 구성은 명시하라. " +
      '\"…에 있어서,\"로 바로 시작하라. ' +
      `핵심 요지: ${analysis.one_line_summary}. ` +
      `우선 반영할 보호포인트: ${analysis.claim_points[0] ?? analysis.core_idea}`
    );
  }

  const feature = pickFeatureForDependentClaim(claimNumber, analysis);
  const citeTarget =
    prior.length > 0
      ? `청구항 ${prior[prior.length - 1].claim_number}`
      : "청구항 1";

  return (
    `${baseRules} ` +
    `종속항으로 ${citeTarget}에 있어서, 상기 …는 **${feature}**를 더 포함(또는 구체화)하는 것을 특징으로 하는 발명으로 작성하라. ` +
    `이번 청구항에서 새로 추가할 차별 구성: ${feature}. ` +
    `claim_points 참고: ${analysis.claim_points[claimNumber - 1] ?? analysis.claim_points[0] ?? "(없음)"}. ` +
    "필수 핵심 구성 순서(독립항→핵심 종속→세부 종속)에 맞게, 이전 청구항과 **다른** 한정을 기재하라."
  );
}

export function buildDrawingRewriteUserInstruction(
  figureNumber: number,
  drawingPrompt?: DrawingPrompt
): string {
  const meta = drawingPrompt
    ? `도면 제목: ${drawingPrompt.title}. 유형: ${drawingPrompt.drawing_type}. 목적: ${drawingPrompt.purpose}. ` +
      `필수 구성: ${drawingPrompt.required_elements.join(", ")}. ` +
      `청구항 지지: ${(drawingPrompt.claim_support ?? []).map((n) => `청구항 ${n}`).join(", ") || "없음"}.`
    : "";

  const refRules = getDrawingReferenceNumberRulesBlock();

  return (
    `【도 ${figureNumber}】 한 장에 대한 **간결한** 도면 작성 프롬프트만 작성하라. ` +
    `도 ${figureNumber}이 아닌 다른 도면(도 1, 도 2, 도 3 …)에 대한 프롬프트·설명·소제목을 출력하지 말라. ` +
    "실제 그림을 그리지 말고, 도면 작성자/이미지 AI가 그릴 수 있는 짧은 텍스트 지시만 쓰라. " +
    "화면·블록·단계·데이터 흐름을 항목별로 길게 나열하지 말고, 핵심 구성과 배치·연결만 적어라. " +
    meta +
    `\n\n${refRules}`
  );
}

export function buildDrawingElaborateUserInstruction(
  figureNumber: number,
  drawingPrompt?: DrawingPrompt
): string {
  return buildDrawingRewriteUserInstruction(figureNumber, drawingPrompt);
}

export function resolveSectionRewriteInstruction(
  sectionId: string,
  state: {
    analysis: InventionAnalysis;
    specificationSections: SpecificationSection[];
    claims: ClaimDraft[];
    drawingPrompts: DrawingPrompt[];
  },
  mode: "rewrite" | "elaborate"
): string {
  const figureNum = parseDrawingSectionNumber(sectionId);
  const claimNum = parseClaimSectionNumber(sectionId);
  const drawingPrompt = figureNum
    ? state.drawingPrompts.find((d) => d.figure_number === figureNum)
    : undefined;
  const liveClaims = buildLiveClaimsFromSections(state.specificationSections, state.claims);

  if (mode === "rewrite" && claimNum) {
    return buildClaimRewriteUserInstruction(claimNum, state.analysis, liveClaims);
  }
  if (mode === "rewrite" && figureNum) {
    return buildDrawingRewriteUserInstruction(figureNum, drawingPrompt);
  }
  if (mode === "elaborate" && figureNum) {
    return buildDrawingElaborateUserInstruction(figureNum, drawingPrompt);
  }
  return mode === "rewrite"
    ? getDefaultRewriteInstruction(sectionId)
    : getDefaultElaborateInstruction(sectionId);
}
