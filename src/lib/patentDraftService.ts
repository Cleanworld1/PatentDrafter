import { buildAnalyzeInventionPrompt } from "@/prompts/analyzeInvention";
import { buildGenerateSpecificationPrompt } from "@/prompts/generateSpecification";
import { buildReviewSpecificationPrompt } from "@/prompts/reviewSpecification";
import { formatFullDraftMarkdown, formatSpecificationMarkdown } from "@/lib/markdownFormatter";
import { normalizeInventionAnalysis } from "@/lib/jsonSchema";
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

export async function analyzeInvention(input: InventionInput): Promise<InventionAnalysis> {
  buildAnalyzeInventionPrompt(input);
  return normalizeInventionAnalysis({
    title_candidates: [
      `${input.projectName || "입력자료"} 기반 특허명세서 초안 생성 시스템`,
      "복수 유형 자료 분석 기반 국내 특허명세서 초안 작성 방법"
    ],
    technical_field: "본 발명은 입력자료를 분석하여 국내 특허출원용 명세서 초안을 작성하는 정보처리 시스템에 관한 것이다.",
    one_line_summary: "회의록, 사업계획서 등 입력자료에서 발명 핵심 구성을 추출하고 명세서 초안, 청구항 및 도면 프롬프트를 생성하는 시스템이다.",
    core_idea: "자료 유형 판별, 발명 분석표 생성, 누락 질의 도출, 명세서 목차별 초안 생성, 청구항 및 도면 프롬프트 생성, 정합성 검토를 순차 수행한다.",
    prior_art: "일반적인 문서 요약 도구 또는 수동 명세서 작성 절차가 존재한다.",
    prior_art_problems: ["단순 요약만으로는 청구항과 본문 간 지지관계를 확보하기 어렵다.", "자료 유형별 누락 정보 확인 및 도면 프롬프트 생성이 일관되게 수행되지 않는다."],
    problem_to_solve: ["입력자료를 발명 분석표로 구조화한다.", "국내 특허명세서 목차에 맞춘 검토 가능한 초안을 생성한다.", "본문, 청구항 및 도면 설명의 용어 정합성을 점검한다."],
    essential_elements: ["입력자료 수신부", "자료 유형 판별부", "발명 분석표 생성부", "명세서 초안 생성부", "청구항 생성부", "도면 프롬프트 생성부", "정합성 검토부"],
    optional_elements: ["사용자 확인 질의 생성부", "Markdown 및 JSON 출력부", "초안 수정 인터페이스"],
    element_relationships: ["입력자료 수신부는 자료 유형 판별부에 자료를 전달한다.", "발명 분석표 생성부의 결과는 명세서 초안 생성부와 청구항 생성부의 입력으로 사용된다.", "정합성 검토부는 생성된 본문, 청구항 및 도면 설명을 상호 비교한다."],
    operation_flow: ["입력자료를 수신한다.", "자료 유형 및 발명 유형을 판별한다.", "발명 분석표를 생성한다.", "누락 정보와 추가 확인 사항을 도출한다.", "명세서 및 청구항 초안을 생성한다.", "도면 생성 프롬프트를 생성한다.", "정합성 검토 결과와 함께 Markdown 및 JSON으로 출력한다."],
    data_inputs: ["프로젝트명", "발명의 내용", "첨부자료 텍스트", "자료 유형", "원하는 청구항 수", "원하는 도면 수", "발명의 유형"],
    data_outputs: ["발명 분석표", "명세서 초안", "청구항 초안", "도면 생성 프롬프트", "정합성 검토 결과", "Markdown 결과", "JSON 결과"],
    control_conditions: ["사용자가 지정한 청구항 수와 도면 수에 맞춰 산출물 개수를 조정한다.", "입력자료에 없는 구체적 수치 또는 실험결과는 생성하지 않는다."],
    exception_cases: ["발명의 핵심 구성이 불명확한 경우 추가 확인 사항으로 표시한다.", "선행기술 정보가 부족한 경우 일반적 배경 수준으로 한정한다."],
    variation_examples: ["API 기반 서비스로 구현될 수 있다.", "웹 애플리케이션의 탭형 UI로 구현될 수 있다.", "추후 DB 저장 계층과 연동될 수 있다."],
    expected_effects: ["명세서 작성 전 발명 요소를 구조화하여 검토 효율을 높일 수 있다.", "청구항과 본문 사이의 용어 불일치 가능성을 조기에 확인할 수 있다."],
    claim_points: ["자료 유형 판별부터 정합성 검토까지의 순차 워크플로우", "발명 분석표를 중간 산출물로 사용하는 점", "명세서, 청구항 및 도면 프롬프트를 함께 출력하는 점"],
    drawing_candidates: ["전체 시스템 구성도", "명세서 초안 생성 흐름도", "발명 분석표 데이터 구조도", "정합성 검토 흐름도"],
    unclear_points: ["실제 LLM 모델 및 JSON schema 강제 방식은 후속 작업에서 확정이 필요하다.", "사용자별 저장 방식은 아직 정해지지 않았다."],
    do_not_invent: ["입력자료에 없는 성능 개선율", "검증되지 않은 법적 효과", "실험데이터에 없는 수치"]
  });
}

export async function generateSpecification(analysis: InventionAnalysis, options: GenerateSpecOptions): Promise<{ specification: SpecificationDraft; markdown: string }> {
  buildGenerateSpecificationPrompt(analysis, options);
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
    reference_number_guidance: "각 구성요소에는 100번대 참조부호를 부여하고, 데이터 산출물에는 200번대 참조부호를 부여할 수 있다.",
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

export async function createFullDraft(input: InventionInput): Promise<FullDraftResult> {
  const analysis = await analyzeInvention(input);
  const { specification } = await generateSpecification(analysis, {
    desiredClaimCount: input.desiredClaimCount,
    desiredDrawingCount: input.desiredDrawingCount,
    projectName: input.projectName
  });
  const review = await reviewSpecification(specification);
  const baseResult = {
    analysis,
    specification,
    claims: specification.claims,
    drawing_prompts: specification.drawing_prompts,
    review
  };
  return { ...baseResult, markdown: formatFullDraftMarkdown(baseResult) };
}
