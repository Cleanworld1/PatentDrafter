import { getDrawingLayoutRulesBlock } from "@/knowledge/drawingLayoutRules";
import { getDrawingPortfolioRulesBlock, getFigurePortfolioInstruction } from "@/knowledge/drawingPortfolioRules";
import { getDrawingReferenceNumberRulesBlock } from "@/knowledge/drawingReferenceNumberRules";
import { getDrawingSectionNumbers } from "@/lib/specificationSectionOrder";
import {
  getDefaultElaborateInstruction,
  getDefaultRewriteInstruction
} from "@/lib/workflow/postFullDraftRefinement";
import type { CurrentDrawingContext } from "@/lib/drawingContextForRegenerate";
import type { ClaimDraft, DrawingPrompt, InventionAnalysis, SpecificationSection } from "@/types/patentDraft";
import { sectionIdToTitle } from "@/types/specificationSection";

const WRITTEN_SPEC_SECTION_MAX = 800;
const WRITTEN_SPEC_TOTAL_MAX = 6000;

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
    means && `【과제의 해결 수단】 요약:\n${means.slice(0, 900)}`,
    detailed && `【구체적인 내용】 요약:\n${detailed.slice(0, 900)}`
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

const FRESH_REWRITE_LEAD =
  "현재 항목 본문은 비워 두었으므로, [관련 명세서 항목]을 참고하여 **처음부터 전체를 새로** 작성하라. 이전 본문 문장을 그대로 반복·붙여넣지 말라. ";

const PATENT_KOREAN_STYLE =
  "국내 특허명세서 문체로 **한국어**만 사용하라. ";

export const IMAGE_AI_DRAWING_NOTE =
  "이미지 생성 AI(Genspark 등)가 글자·도형을 깨뜨리거나 미완성으로 그리지 않도록, 구성요소 명칭을 명확한 한글로 적고 생략 부호(…)·플레이스홀더·'TBD'·'추후 작성' 등 불완전 표현을 쓰지 말라. " +
  "한 장에 블록 8개 이하, 네모 블록에는 구성요소 이름만(2~6단어), 마름모에는 조건·분기만 한 줄, 블록 안 장문·다중 글씨 나열 금지. A4 한 장 비율·충분한 여백을 명시하라. ";

function wrapFreshSectionInstruction(base: string, isDrawing: boolean): string {
  let text = `${FRESH_REWRITE_LEAD}${PATENT_KOREAN_STYLE}${base}`;
  if (isDrawing) text += IMAGE_AI_DRAWING_NOTE;
  return text;
}

function clipPreviousContent(text: string, max = 2500): string {
  const t = text.trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max)}\n…(이하 생략)` : t;
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
    wrapFreshSectionInstruction(
      `${baseRules} ` +
        "독립항으로, claim_points·essential_elements를 반영해 **가장 넓은 합리적** 보호범위를 잡되 구체적 구성은 명시하라. " +
        '\"…에 있어서,\"로 바로 시작하라. ' +
        `핵심 요지: ${analysis.one_line_summary}. ` +
        `우선 반영할 보호포인트: ${analysis.claim_points[0] ?? analysis.core_idea}`,
      false
    )
  );
  }

  const feature = pickFeatureForDependentClaim(claimNumber, analysis);
  const citeTarget =
    prior.length > 0
      ? `청구항 ${prior[prior.length - 1].claim_number}`
      : "청구항 1";

  return wrapFreshSectionInstruction(
    `${baseRules} ` +
      `종속항으로 ${citeTarget}에 있어서, 상기 …는 **${feature}**를 더 포함(또는 구체화)하는 것을 특징으로 하는 발명으로 작성하라. ` +
      `이번 청구항에서 새로 추가할 차별 구성: ${feature}. ` +
      `claim_points 참고: ${analysis.claim_points[claimNumber - 1] ?? analysis.claim_points[0] ?? "(없음)"}. ` +
      "필수 핵심 구성 순서(독립항→핵심 종속→세부 종속)에 맞게, 이전 청구항과 **다른** 한정을 기재하라.",
    false
  );
}

export function buildDrawingRewriteUserInstruction(
  figureNumber: number,
  drawingPrompt?: DrawingPrompt,
  context?: {
    drawingCount?: number;
    claims?: ClaimDraft[];
    analysis?: InventionAnalysis;
    inventionCategory?: string;
  }
): string {
  const meta = drawingPrompt
    ? `도면 제목: ${drawingPrompt.title}. 유형: ${drawingPrompt.drawing_type}. 목적: ${drawingPrompt.purpose}. ` +
      `필수 구성: ${drawingPrompt.required_elements.join(", ")}. ` +
      `청구항 지지: ${(drawingPrompt.claim_support ?? []).map((n) => `청구항 ${n}`).join(", ") || "없음"}.`
    : "";

  const portfolioBlock =
    context?.drawingCount && context.claims?.length && context.analysis
      ? `\n\n${getFigurePortfolioInstruction(
          figureNumber,
          context.drawingCount,
          context.claims,
          context.analysis,
          context.inventionCategory
        )}`
      : "";

  const refRules = getDrawingReferenceNumberRulesBlock();
  const layoutRules = getDrawingLayoutRulesBlock();
  const portfolioRules = getDrawingPortfolioRulesBlock();

  return wrapFreshSectionInstruction(
    `【도 ${figureNumber}】 한 장에 대한 **간결한** 도면 작성 프롬프트만 작성하라. ` +
      `도 ${figureNumber}이 아닌 다른 도면(도 1, 도 2, 도 3 …)에 대한 프롬프트·설명·소제목을 출력하지 말라. ` +
      "실제 그림을 그리지 말고, 도면 작성자/이미지 AI가 그릴 수 있는 짧은 텍스트 지시만 쓰라. " +
      "화면·블록·단계·데이터 흐름을 항목별로 길게 나열하지 말고, 핵심 구성과 배치·연결만 적어라. " +
      meta +
      portfolioBlock +
      `\n\n${portfolioRules}\n\n${layoutRules}\n\n${refRules}`,
    true
  );
}

export function buildDrawingElaborateUserInstruction(
  figureNumber: number,
  drawingPrompt?: DrawingPrompt,
  context?: {
    drawingCount?: number;
    claims?: ClaimDraft[];
    analysis?: InventionAnalysis;
    inventionCategory?: string;
  }
): string {
  return buildDrawingRewriteUserInstruction(figureNumber, drawingPrompt, context);
}

export function resolveSectionConciseInstruction(
  sectionId: string,
  state: {
    analysis: InventionAnalysis;
    specificationSections: SpecificationSection[];
    claims: ClaimDraft[];
    drawingPrompts: DrawingPrompt[];
  },
  previousContent: string
): string {
  const figureNum = parseDrawingSectionNumber(sectionId);
  const base = resolveSectionRewriteInstruction(sectionId, state, "rewrite");
  const prior = clipPreviousContent(previousContent);
  const priorBlock = prior ? `\n\n[이전 본문 — 이보다 더 짧고 간결하게]\n${prior}` : "";

  const conciseRule = figureNum
    ? "이전 본문보다 **짧게** 줄이되, 이미지 AI가 오류 없이 그릴 수 있을 만큼 구성·배치·연결은 명확히 남겨라."
    : "이전 본문보다 **짧고 간결하게** 핵심만 남겨 작성하라. 불필요한 수식·중복·장황한 나열은 제거하라.";

  return `${base} ${conciseRule}${priorBlock}`;
}

export function resolveSectionRewriteInstruction(
  sectionId: string,
  state: {
    analysis: InventionAnalysis;
    specificationSections: SpecificationSection[];
    claims: ClaimDraft[];
    drawingPrompts: DrawingPrompt[];
    inventionCategory?: string;
  },
  mode: "rewrite" | "elaborate"
): string {
  const figureNum = parseDrawingSectionNumber(sectionId);
  const claimNum = parseClaimSectionNumber(sectionId);
  const drawingPrompt = figureNum
    ? state.drawingPrompts.find((d) => d.figure_number === figureNum)
    : undefined;
  const liveClaims = buildLiveClaimsFromSections(state.specificationSections, state.claims);
  const drawingCount = getDrawingSectionNumbers(state.specificationSections).length;
  const drawingContext = {
    drawingCount: Math.max(drawingCount, state.drawingPrompts.length, 1),
    claims: liveClaims,
    analysis: state.analysis,
    inventionCategory: state.inventionCategory
  };

  if (mode === "rewrite" && claimNum) {
    return buildClaimRewriteUserInstruction(claimNum, state.analysis, liveClaims);
  }
  if (mode === "rewrite" && figureNum) {
    return buildDrawingRewriteUserInstruction(figureNum, drawingPrompt, drawingContext);
  }
  if (mode === "elaborate" && figureNum) {
    return buildDrawingElaborateUserInstruction(figureNum, drawingPrompt, drawingContext);
  }
  return mode === "rewrite"
    ? wrapFreshSectionInstruction(getDefaultRewriteInstruction(sectionId), false)
    : getDefaultElaborateInstruction(sectionId);
}
