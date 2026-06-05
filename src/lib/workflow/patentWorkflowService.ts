import "server-only";

import { assembleSpecificationFromWorkflow } from "@/lib/workflow/assembleSpecification";
import {
  appendGraphDrawingPrompts,
  appendGraphDrawingsToPlan,
  mergeChemicalEmbodimentIntoDetailedDescription
} from "@/lib/chemicalEmbodimentApply";
import { analyzeChemicalEmbodimentsOrMock } from "@/lib/ai/analyzeChemicalEmbodiments";
import { analyzeMaterialsWithAi, type IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";
import { resolveOpenAiCredentials, isDevMockWithoutKeyAllowed } from "@/lib/ai/resolveOpenAiCredentials";
import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import { formatFullDraftMarkdown } from "@/lib/markdownFormatter";
import { CLAIM_GUIDELINE } from "@/prompts/guidelines/claimGuideline";
import type {
  ClaimDraft,
  DrawingPrompt,
  DraftOptions,
  FullDraftResult,
  GenerateSpecOptions,
  InventionAnalysis,
  SpecificationReview
} from "@/types/patentDraft";
import type {
  ClaimDrawingReview,
  DrawingPlanItem,
  FrontSections,
  ProtectionPoint,
  WorkflowContext,
  WorkflowState
} from "@/types/patentWorkflow";
import { createEmptyWorkflowState } from "@/types/patentWorkflow";

const STYLE =
  "특허 명세서용 흑백 선도, 단순한 배경, 번호 기입 가능한 여백 포함, 깔끔한 구성도 스타일";

export function toWorkflowContext(
  analysis: InventionAnalysis,
  options: DraftOptions,
  projectName: string,
  chemicalEmbodimentAnalysis?: import("@/types/chemicalEmbodimentAnalysis").ChemicalEmbodimentAnalysis | null
): WorkflowContext {
  return { analysis, options, projectName, chemicalEmbodimentAnalysis: chemicalEmbodimentAnalysis ?? null };
}

export function toGenerateOptions(options: DraftOptions, projectName: string): GenerateSpecOptions {
  return {
    desiredClaimCount: options.claimCount,
    desiredDrawingCount: options.drawingCount,
    projectName
  };
}

export function inferInventionCategory(ctx: WorkflowContext): string {
  const t = ctx.options.inventionType;
  if (t !== "자동 판단") return t;
  const text = `${ctx.analysis.technical_field} ${ctx.analysis.core_idea}`.toLowerCase();
  if (text.includes("인공지능") || text.includes("데이터")) return "AI·데이터 처리 발명";
  if (text.includes("방법") || text.includes("단계")) return "방법 발명";
  if (text.includes("시스템") || text.includes("서버")) return "시스템 발명";
  if (text.includes("ui") || text.includes("화면")) return "UI/UX 기반 발명";
  return "시스템 발명";
}

export function deriveProtectionPoints(ctx: WorkflowContext): ProtectionPoint[] {
  const { analysis } = ctx;
  const points: ProtectionPoint[] = [];

  if (analysis.claim_points[0]) {
    points.push({
      point_id: "pp_independent",
      description: analysis.claim_points[0],
      technical_problem: analysis.prior_art_problems[0] ?? analysis.problem_to_solve[0] ?? "",
      technical_feature: analysis.essential_elements.join(", ") || analysis.core_idea,
      expected_effect: analysis.expected_effects[0] ?? "",
      claim_priority: "independent",
      supporting_material: "발명 분석표 claim_points",
      uncertainty: analysis.unclear_points[0] ?? ""
    });
  }

  analysis.essential_elements.slice(0, Math.max(0, ctx.options.claimCount - 1)).forEach((el, i) => {
    points.push({
      point_id: `pp_dep_${i + 2}`,
      description: el,
      technical_problem: "",
      technical_feature: el,
      expected_effect: analysis.expected_effects[i + 1] ?? "",
      claim_priority: "dependent",
      supporting_material: "essential_elements",
      uncertainty: ""
    });
  });

  analysis.variation_examples.slice(0, 2).forEach((v, i) => {
    points.push({
      point_id: `pp_emb_${i}`,
      description: v,
      technical_problem: "",
      technical_feature: v,
      expected_effect: "",
      claim_priority: "embodiment",
      supporting_material: "variation_examples",
      uncertainty: ""
    });
  });

  return points;
}

export function generateClaimDraft(ctx: WorkflowContext): ClaimDraft[] {
  void CLAIM_GUIDELINE;
  const { analysis, options } = ctx;
  const count = Math.max(1, options.claimCount);
  const elements = analysis.essential_elements;

  return Array.from({ length: count }, (_, index) => {
    const num = index + 1;
    const isIndependent = index === 0;
    const text = isIndependent
      ? `${elements.slice(0, 6).join(", ")}를 포함하여 ${analysis.one_line_summary}하는 ${inferInventionCategory(ctx).replace(" 발명", "")}.`
      : `청구항 1에 있어서, 상기 발명은 ${elements[index % Math.max(elements.length, 1)] ?? analysis.optional_elements[0] ?? "추가 구성"}를 더 포함하는 것을 특징으로 하는 발명.`;

    return {
      claim_number: num,
      category: isIndependent ? "독립항" : "종속항",
      text,
      dependency: isIndependent ? undefined : 1,
      support_notes: ["워크플로우 STEP 4: 청구항 우선 작성"]
    };
  });
}

function defaultDrawingTitles(category: string, count: number): string[] {
  const system = ["전체 시스템 구성도", "핵심 장치/서버 구성도", "전체 처리 흐름도", "데이터/AI 처리 흐름도", "UI 또는 결과 제공 화면"];
  const method = ["전체 시스템 구성도", "핵심 처리 흐름도", "세부 단계 흐름도", "데이터 처리 예시", "변형 실시예"];
  const machine = ["전체 장치 사시도", "주요 구성 분해 사시도", "단면 또는 결합 관계도", "작동 상태도", "제어 흐름도"];
  const pool = category.includes("방법") ? method : category.includes("기계") ? machine : system;
  return Array.from({ length: count }, (_, i) => analysisDrawingFallback(i, pool));
}

function analysisDrawingFallback(index: number, pool: string[]): string {
  return pool[index] ?? `도면 ${index + 1}`;
}

export function generateDrawingPlan(
  ctx: WorkflowContext,
  claimDrafts: ClaimDraft[]
): DrawingPlanItem[] {
  const category = inferInventionCategory(ctx);
  const count = Math.max(1, ctx.options.drawingCount);
  const titles =
    ctx.analysis.drawing_candidates.length >= count
      ? ctx.analysis.drawing_candidates.slice(0, count)
      : defaultDrawingTitles(category, count);

  const types: DrawingPrompt["drawing_type"][] = ["시스템도", "구성도", "흐름도", "흐름도", "UI도"];

  const basePlan = titles.map((title, index) => ({
    figure_number: index + 1,
    title,
    purpose:
      index === 0
        ? "전체 발명의 주요 구성과 데이터 흐름을 도시한다."
        : index === 2
          ? "핵심 처리 단계 또는 동작 흐름을 도시한다."
          : `${title}에 관한 세부 구성을 도시한다.`,
    drawing_type: types[index] ?? "시스템도",
    required_elements: ctx.analysis.essential_elements.slice(0, 6),
    claim_support: index === 0 ? [1] : claimDrafts.length > 1 ? [1, Math.min(2, claimDrafts.length)] : [1]
  }));

  return appendGraphDrawingsToPlan(basePlan, ctx.chemicalEmbodimentAnalysis, count);
}

export function generateDrawingPrompts(
  ctx: WorkflowContext,
  drawingPlan: DrawingPlanItem[],
  claimDrafts: ClaimDraft[]
): DrawingPrompt[] {
  const base = drawingPlan.map((plan) => ({
    figure_number: plan.figure_number,
    title: plan.title,
    drawing_type: plan.drawing_type,
    purpose: plan.purpose,
    claim_support: plan.claim_support,
    required_elements: plan.required_elements,
    relative_layout:
      plan.figure_number === 1
        ? "좌측 입력, 중앙 처리 모듈, 우측 출력을 배치한다."
        : "주요 구성요소를 박스로 표시하고 처리 순서대로 화살표를 연결한다.",
    arrows_or_connections: "데이터 및 제어 흐름 방향을 화살표로 표시한다.",
    reference_number_guidance:
      "구성요소마다 하나의 참조번호만 부여(동일 구성 중복 부호 금지). 동일 번호는 동일 구성만 가리킴. 100번대 구성요소, 200번대 데이터 흐름.",
    style_instruction: STYLE
  }));

  return appendGraphDrawingPrompts(
    base,
    ctx.chemicalEmbodimentAnalysis,
    Math.max(1, ctx.options.drawingCount)
  );
}

export function reviewClaimDrawingConsistency(
  ctx: WorkflowContext,
  claimDrafts: ClaimDraft[],
  drawingPrompts: DrawingPrompt[]
): ClaimDrawingReview {
  const claim1Elements = claimDrafts[0]?.text ?? "";
  const drawingElements = drawingPrompts.flatMap((d) => d.required_elements).join(", ");

  return {
    claim_support_check: [
      `청구항 1의 핵심 구성이 도 ${drawingPrompts[0]?.figure_number ?? 1}에 반영되었는지 확인: ${claim1Elements.slice(0, 80)}…`,
      "종속항 세부 구성이 후속 도면 또는 실시예에서 설명될 수 있는지 검토"
    ],
    drawing_coverage_check: [
      `도면별 필수 구성요소: ${drawingElements.slice(0, 120)}…`,
      `도면 수 ${drawingPrompts.length}개가 발명 설명에 충분한지 검토`
    ],
    term_consistency_check: [
      "청구항, 도면 프롬프트, 발명의 설명에서 동일 용어 사용 필요",
      ctx.analysis.essential_elements.slice(0, 3).map((e) => `"${e}" 용어 일관성`).join(", ")
    ],
    narrowing_risk: [
      "특정 UI 레이아웃이나 구현 예시에 과도하게 한정되지 않았는지 확인",
      "도면이 청구항 범위를 불필요하게 좁히지 않는지 검토"
    ],
    abstraction_risk: [
      "청구항 1이 추상적 표현만으로 구성되지 않았는지 확인",
      "도면에 표시된 구성이 본문에서 구체적으로 지지되는지 확인"
    ],
    recommended_claim_changes: drawingPrompts.length < 2 ? ["도면 2개 이상 권장"] : [],
    recommended_drawing_changes:
      claimDrafts.length > 0 && !drawingPrompts.some((d) => d.claim_support?.includes(1))
        ? ["도 1에 청구항 1 핵심 구성 반영 필요"]
        : []
  };
}

export function generateBriefDescriptionOfDrawings(drawingPrompts: DrawingPrompt[]): string {
  return drawingPrompts
    .map((d) => {
      const role =
        d.drawing_type === "흐름도"
          ? "처리 흐름"
          : d.drawing_type === "UI도"
            ? "사용자 인터페이스"
            : d.drawing_type === "구성도"
              ? "구성"
              : "시스템";
      return `도 ${d.figure_number}은(는) ${d.title}를 나타내며, 발명의 ${role}를 설명하기 위한 도면이다.`;
    })
    .join("\n");
}

export function generateDetailedDescription(
  ctx: WorkflowContext,
  claimDrafts: ClaimDraft[],
  drawingPrompts: DrawingPrompt[]
): string {
  const { analysis } = ctx;
  const parts: string[] = [
    "이하에서는 첨부된 도면을 참조하여 본 발명의 실시예를 상세히 설명한다. 그러나 본 발명은 이하에서 설명하는 실시예에 한정되지 않는다.",
    "",
    `실시예들에 따른 발명은 ${analysis.one_line_summary}할 수 있다.`,
    ""
  ];

  for (const drawing of drawingPrompts) {
    parts.push(`도 ${drawing.figure_number}은(는) ${drawing.title}를 나타낸다.`);
    parts.push(
      `도 ${drawing.figure_number}을 참조하면, ${drawing.required_elements.slice(0, 4).join(", ")} 등을 포함하는 구성이 도시될 수 있다.`
    );
    parts.push(
      `상기 구성은 ${drawing.purpose} 각 구성요소는 상호 연동되어 ${analysis.operation_flow[0] ?? "데이터 처리"}를 수행할 수 있다.`
    );
    parts.push("");
  }

  parts.push("일 실시예에 따르면, 상기 구성은 변형될 수 있다.");
  parts.push(analysis.variation_examples.join("\n") || "다른 실시예에 따르면, 일부 구성은 생략 또는 대체될 수 있다.");
  parts.push("");
  parts.push(
    `청구항 1에 기재된 ${claimDrafts[0]?.text.slice(0, 60) ?? "핵심 구성"}은(는) 상기 도면 설명에서 설명된 바와 같이 실시될 수 있다.`
  );

  return mergeChemicalEmbodimentIntoDetailedDescription(
    parts.join("\n"),
    ctx.chemicalEmbodimentAnalysis
  );
}

export function generateMeansForSolving(ctx: WorkflowContext, claimDrafts: ClaimDraft[]): string {
  const { analysis } = ctx;
  const lines = [
    `실시예들에 따른 발명은, ${claimDrafts[0]?.text.slice(0, 120) ?? analysis.core_idea}을 포함할 수 있다.`,
    `필수 구성은 ${analysis.essential_elements.join(", ")}를 포함할 수 있다.`
  ];
  analysis.optional_elements.slice(0, 3).forEach((opt) => {
    lines.push(`나아가, ${opt}를 더 포함할 수 있다.`);
  });
  return lines.join("\n");
}

export function generateEffects(ctx: WorkflowContext, claimDrafts: ClaimDraft[]): string {
  const { analysis } = ctx;
  const effects: string[] = [];
  if (claimDrafts[0]) {
    effects.push(
      `실시예들에 따르면, ${analysis.essential_elements[0] ?? "핵심 구성"}에 의해 ${analysis.problem_to_solve[0] ?? "기술적 과제"}를 해결할 수 있다.`
    );
  }
  analysis.expected_effects.forEach((e) => effects.push(e));
  return effects.join("\n");
}

export function generateFrontSections(
  ctx: WorkflowContext,
  claimDrafts: ClaimDraft[],
  drawingPrompts: DrawingPrompt[],
  detailedDescription: string,
  meansForSolving: string,
  effects: string
): FrontSections {
  const { analysis } = ctx;
  const brief = generateBriefDescriptionOfDrawings(drawingPrompts);
  const rep =
    drawingPrompts.find((d) => d.drawing_type === "시스템도" || d.figure_number === 1)?.figure_number ?? 1;

  return {
    invention_title: analysis.title_candidates[0] ?? ctx.projectName,
    technical_field: analysis.technical_field,
    background_art: [
      analysis.prior_art,
      ...analysis.prior_art_problems,
      "상기와 같이 종래 기술에는 개선의 여지가 있으며, 본 발명은 이에 대한 해결책을 제공한다."
    ].join("\n"),
    problems_to_solve: analysis.problem_to_solve.map((p) => `본 발명의 목적은, ${p}`).join("\n"),
    means_for_solving: meansForSolving,
    effects,
    brief_description_of_drawings: brief,
    summary: `${analysis.one_line_summary} 본 발명은 이에 따른 기술적 효과를 제공할 수 있다.`,
    representative_drawing: `도 ${rep}`
  };
}

export function generateFinalReview(
  ctx: WorkflowContext,
  claimDrafts: ClaimDraft[],
  drawingPrompts: DrawingPrompt[],
  detailedDescription: string,
  front: FrontSections
): SpecificationReview {
  const spec = assembleSpecificationFromWorkflow(
    {
      ...createEmptyWorkflowState(),
      workflowStep: "final_review_done",
      claimDrafts,
      drawingPrompts,
      detailedDescription,
      frontSections: front
    },
    ctx.analysis
  );

  return {
    claim_support_check: [
      "청구항 1의 구성요소가 【발명을 실시하기 위한 구체적인 내용】에 기재되어 있는지 검토 필요",
      ...claimDrafts.map((c) => `청구항 ${c.claim_number} 지지 관계 확인`)
    ],
    term_consistency_check: [
      "청구항, 도면 프롬프트, 도면의 간단한 설명, 구체적인 내용 간 용어 일치 확인",
      ctx.analysis.essential_elements.slice(0, 3).map((e) => `"${e}" 용어 통일`).join(", ")
    ],
    drawing_spec_consistency_check: [
      "도면 프롬프트와 도면의 간단한 설명 일치 확인",
      "구체적인 내용의 도면 번호와 도면 설명 번호 일치 확인",
      ...drawingPrompts.map((d) => `도 ${d.figure_number}: ${d.title}`)
    ],
    effect_causality_check: [
      "【발명의 효과】가 청구항 및 구체적인 내용의 구성과 인과적으로 연결되어 있는지 확인",
      front.effects.slice(0, 80)
    ],
    over_narrowing_risk: [
      "청구항이 특정 실시예 또는 UI에 한정되지 않았는지 검토",
      "도면이 구현 예시에만 국한되지 않았는지 검토"
    ],
    over_abstraction_risk: [
      "청구항 1이 지나치게 추상적이지 않은지 검토",
      "구체적인 내용이 청구항 지지에 충분한지 검토"
    ],
    additional_questions: [
      ...ctx.analysis.unclear_points,
      "워크플로우: 청구항↔도면 프롬프트 반복 검토 완료 여부 사용자 확인"
    ]
  };
}

export async function executeWorkflowFromAnalysis(
  ctx: WorkflowContext,
  initialStep: WorkflowState = createEmptyWorkflowState()
): Promise<WorkflowState> {
  const state: WorkflowState = { ...initialStep, workflowStep: "analyzed" };

  state.inventionCategory = inferInventionCategory(ctx);
  state.protectionPoints = deriveProtectionPoints(ctx);
  state.workflowStep = ctx.chemicalEmbodimentAnalysis ? "embodiment_analyzed" : "analyzed";

  state.claimDrafts = generateClaimDraft(ctx);
  state.workflowStep = "claims_drafted";

  state.drawingPlan = generateDrawingPlan(ctx, state.claimDrafts);
  state.workflowStep = "drawings_planned";

  state.drawingPrompts = generateDrawingPrompts(ctx, state.drawingPlan, state.claimDrafts);
  state.workflowStep = "drawing_prompts_done";

  state.claimDrawingReview = reviewClaimDrawingConsistency(ctx, state.claimDrafts, state.drawingPrompts);
  state.workflowStep = "claim_drawing_reviewed";

  state.detailedDescription = generateDetailedDescription(ctx, state.claimDrafts, state.drawingPrompts);
  state.workflowStep = "detailed_description_done";

  const means = generateMeansForSolving(ctx, state.claimDrafts);
  const effects = generateEffects(ctx, state.claimDrafts);
  state.frontSections = generateFrontSections(
    ctx,
    state.claimDrafts,
    state.drawingPrompts,
    state.detailedDescription,
    means,
    effects
  );
  state.workflowStep = "front_sections_done";

  state.finalReview = generateFinalReview(
    ctx,
    state.claimDrafts,
    state.drawingPrompts,
    state.detailedDescription,
    state.frontSections
  );
  state.workflowStep = "final_review_done";

  return state;
}

export async function createFullDraftViaWorkflow(
  payload: AnalyzeMaterialsPayload,
  files: IncomingMaterialFile[],
  credentials?: import("@/types/openAiCredentials").OpenAiCredentialInput
): Promise<FullDraftResult> {
  const { analysis } = await analyzeMaterialsWithAi(payload, files, credentials);

  let chemicalEmbodimentAnalysis: import("@/types/chemicalEmbodimentAnalysis").ChemicalEmbodimentAnalysis | null =
    null;
  if (isChemicalInventionEnabled(payload.options.chemicalInventionEnabled)) {
    const resolved = resolveOpenAiCredentials(credentials);
    const useDevMock = !resolved && isDevMockWithoutKeyAllowed();
    chemicalEmbodimentAnalysis = await analyzeChemicalEmbodimentsOrMock(
      { ...payload, invention_analysis: analysis },
      files,
      credentials,
      useDevMock
    );
  }

  const ctx = toWorkflowContext(
    analysis,
    payload.options,
    payload.projectName,
    chemicalEmbodimentAnalysis
  );

  const workflow = await executeWorkflowFromAnalysis(ctx);
  const specification = assembleSpecificationFromWorkflow(workflow, analysis);
  const review = workflow.finalReview ?? generateFinalReview(
    ctx,
    workflow.claimDrafts,
    workflow.drawingPrompts,
    workflow.detailedDescription,
    workflow.frontSections!
  );

  const base = {
    analysis,
    specification,
    claims: workflow.claimDrafts,
    drawing_prompts: workflow.drawingPrompts,
    review,
    workflow,
    chemical_embodiment_analysis: chemicalEmbodimentAnalysis ?? undefined
  };

  return {
    ...base,
    markdown: formatFullDraftMarkdown(base)
  };
}
