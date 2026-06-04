import { analyzeMaterialsWithAi, type IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";

import { buildGenerateSpecificationPrompt } from "@/prompts/generateSpecification";

import { buildReviewSpecificationPrompt } from "@/prompts/reviewSpecification";

import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";

import { formatFullDraftMarkdown, formatSpecificationMarkdown } from "@/lib/markdownFormatter";

import type {

  ClaimDraft,

  DrawingPrompt,

  FullDraftResult,

  GenerateSpecOptions,

  InventionAnalysis,

  InventionInput,

  SpecificationDraft,

  SpecificationReview

} from "@/types/patentDraft";



const styleInstruction = "특허 명세서용 흑백 선도, 단순한 배경, 번호 기입 가능한 여백 포함, 깔끔한 구성도 스타일";



export async function analyzeInvention(
  input: InventionInput,
  credentials?: import("@/types/openAiCredentials").OpenAiCredentialInput
): Promise<InventionAnalysis> {
  const { resolveOpenAiCredentials } = await import("@/lib/ai/resolveOpenAiCredentials");
  const { buildAnalysisFromInput } = await import("@/lib/contentAwareAnalysis");
  const { normalizeInventionAnalysis } = await import("@/lib/jsonSchema");

  if (!resolveOpenAiCredentials(credentials)) {
    return normalizeInventionAnalysis(buildAnalysisFromInput(input));
  }

  const { analysis } = await analyzeMaterialsWithAi(
    {
      task: "analyze_invention_materials",
      projectName: input.projectName,
      userTextInputs: {
        overview: input.inventionContent,
        coreIdea: "",
        existingProblems: "",
        differentiators: "",
        embodimentNotes: "",
        otherNotes: input.attachmentText
      },
      options: {
        claimCount: input.desiredClaimCount,
        drawingCount: input.desiredDrawingCount,
        inventionType: input.inventionType,
        detailLevel: "normal",
        claimStyle: "balanced",
        autoRecommendDrawingType: true,
        generateAdditionalQuestions: true,
        inventionMakingEnabled: false,
        chemicalInventionEnabled: false
      },
      materials: []
    },
    [],
    credentials
  );

  return analysis;
}



export async function analyzeInventionMaterials(

  payload: AnalyzeMaterialsPayload,

  files: IncomingMaterialFile[],

  credentials?: import("@/types/openAiCredentials").OpenAiCredentialInput

): Promise<InventionAnalysis> {

  const { analysis } = await analyzeMaterialsWithAi(payload, files, credentials);

  return analysis;

}



export async function generateSpecification(analysis: InventionAnalysis, options: GenerateSpecOptions): Promise<{ specification: SpecificationDraft; markdown: string }> {

  buildGenerateSpecificationPrompt({ analysis, options });

  const claimCount = Math.max(1, options.desiredClaimCount || 5);

  const drawingCount = Math.max(1, options.desiredDrawingCount || 5);

  const claims: ClaimDraft[] = Array.from({ length: claimCount }, (_, index) => ({

    claim_number: index + 1,

    category: index === 0 ? "독립항" : "종속항",

    dependency: index === 0 ? undefined : 1,

    text: index === 0

      ? `입력자료를 수신하는 입력자료 수신부, 상기 입력자료의 자료 유형을 판별하는 자료 유형 판별부, 상기 입력자료로부터 발명 분석표를 생성하는 발명 분석표 생성부, 상기 발명 분석표에 기초하여 국내 특허명세서 초안을 생성하는 명세서 초안 생성부, 청구항 초안과 도면 생성 프롬프트를 생성하는 생성부, 및 상기 명세서 초안과 청구항 초안의 정합성을 검토하는 정합성 검토부를 포함하는 특허명세서 초안 생성 시스템.`

      : `청구항 1에 있어서, 상기 시스템은 ${analysis.optional_elements[index % Math.max(analysis.optional_elements.length, 1)] ?? "사용자 확인 질의 생성부"}를 더 포함할 수 있는 특허명세서 초안 생성 시스템.`,

    support_notes: ["mock LLM 응답에 의한 초안이며 사용자 검토가 필요하다."]

  }));

  const drawing_prompts: DrawingPrompt[] = Array.from({ length: drawingCount }, (_, index) => ({

    figure_number: index + 1,

    title: analysis.drawing_candidates[index] ?? `도면 ${index + 1}`,

    drawing_type: index === 1 ? "흐름도" : "시스템도",

    purpose: index === 0 ? "전체 시스템의 주요 구성요소와 데이터 흐름을 도시한다." : "명세서 초안 생성 워크플로우의 세부 단계를 도시한다.",

    required_elements: analysis.essential_elements.slice(0, 6),

    relative_layout: "좌측에 입력자료, 중앙에 분석 및 생성 모듈, 우측에 Markdown 및 JSON 출력 결과를 배치한다.",

    arrows_or_connections: "입력자료 수신부에서 자료 유형 판별부, 발명 분석표 생성부, 명세서 초안 생성부, 정합성 검토부, 출력부 순서로 화살표를 표시한다.",

    reference_number_guidance:
      "구성요소 1:1 참조부호(동일 번호=동일 구성, 중복 부호 금지). 100번대 구성, 200번대 데이터.",

    style_instruction: styleInstruction

  }));

  const specification: SpecificationDraft = {

    invention_title: analysis.title_candidates[0] ?? options.projectName ?? "특허명세서 초안 생성 시스템",

    technical_field: analysis.technical_field,

    background_art: `${analysis.prior_art}\n${analysis.prior_art_problems.join(" ")}`,

    problems_to_solve: analysis.problem_to_solve.join("\n"),

    means_for_solving: `${analysis.core_idea}\n필수 구성은 ${analysis.essential_elements.join(", ")}를 포함할 수 있다.`,

    effects: analysis.expected_effects.join("\n"),

    brief_description_of_drawings: drawing_prompts.map((drawing) => `도 ${drawing.figure_number}은(는) ${drawing.title}를 나타낸다.`).join("\n"),

    detailed_description: `${analysis.element_relationships.join("\n")}\n\n동작 흐름은 ${analysis.operation_flow.join(" → ")}의 순서로 수행될 수 있다.`,

    summary: analysis.one_line_summary,

    representative_drawing: "도 1",

    claims,

    drawing_prompts

  };

  return { specification, markdown: formatSpecificationMarkdown(specification) };

}



export async function reviewSpecification(specification: SpecificationDraft): Promise<SpecificationReview> {

  buildReviewSpecificationPrompt(specification);

  return {

    claim_support_check: ["청구항 1의 주요 구성요소가 상세한 설명에 기재되어 있는지 추가 검토가 필요하다."],

    term_consistency_check: ["입력자료 수신부, 자료 유형 판별부, 발명 분석표 생성부의 용어는 본문과 청구항에서 동일하게 사용되었다."],

    drawing_spec_consistency_check: ["도 1의 구성요소 명칭과 본문 구성요소 명칭을 동일하게 유지해야 한다."],

    effect_causality_check: ["발명 분석표를 중간 산출물로 사용하기 때문에 검토 효율이 향상될 수 있다는 인과관계가 기재되어 있다."],

    over_narrowing_risk: ["특정 UI 형태에 한정하지 않도록 API 기반 구현예를 변형예로 유지하는 것이 바람직하다."],

    over_abstraction_risk: ["자료 유형 판별부의 구체적인 판별 기준 또는 예시가 부족할 수 있다."],

    additional_questions: ["자료 유형 판별은 규칙 기반인지 LLM 기반인지 확인이 필요하다.", "사용자가 수정한 초안을 재검토하는 반복 워크플로우가 필요한지 확인이 필요하다."]

  };

}



export async function createFullDraftFromMaterials(

  payload: AnalyzeMaterialsPayload,

  files: IncomingMaterialFile[],

  credentials?: import("@/types/openAiCredentials").OpenAiCredentialInput

): Promise<FullDraftResult> {

  const { createFullDraftViaWorkflow } = await import("@/lib/workflow/patentWorkflowService");

  return createFullDraftViaWorkflow(payload, files, credentials);

}



export async function createFullDraft(
  input: InventionInput,
  credentials?: import("@/types/openAiCredentials").OpenAiCredentialInput
): Promise<FullDraftResult> {

  const analysis = await analyzeInvention(input, credentials);

  const {

    executeWorkflowFromAnalysis,

    toWorkflowContext

  } = await import("@/lib/workflow/patentWorkflowService");

  const { assembleSpecificationFromWorkflow } = await import("@/lib/workflow/assembleSpecification");

  const ctx = toWorkflowContext(

    analysis,

    {

      claimCount: input.desiredClaimCount,

      drawingCount: input.desiredDrawingCount,

      inventionType: input.inventionType,

      detailLevel: "normal",

      claimStyle: "balanced",

      autoRecommendDrawingType: true,

      generateAdditionalQuestions: true,
      inventionMakingEnabled: false,
      chemicalInventionEnabled: false

    },

    input.projectName

  );

  const workflow = await executeWorkflowFromAnalysis(ctx);

  const specification = assembleSpecificationFromWorkflow(workflow, analysis);

  const review = workflow.finalReview ?? (await reviewSpecification(specification));

  const baseResult = {

    analysis,

    specification,

    claims: workflow.claimDrafts,

    drawing_prompts: workflow.drawingPrompts,

    review,

    workflow

  };

  return { ...baseResult, markdown: formatFullDraftMarkdown(baseResult) };

}


