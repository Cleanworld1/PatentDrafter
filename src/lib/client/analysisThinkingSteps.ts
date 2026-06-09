import type { LoadingStage } from "@/types/patentDraft";
import type { GuidedDraftStepKind } from "@/lib/workflow/guidedDraftPlan";

export const INVENTION_ANALYSIS_THINKING_STEPS = [
  "업로드 자료의 형식(PDF·이미지·DOCX 등)을 확인하고 있습니다…",
  "문서 구조와 표·도식이 있으면 함께 해석하고 있습니다…",
  "발명의 한 줄 요약과 핵심 아이디어를 추출하고 있습니다…",
  "선행 기술과 해결하려는 과제의 관계를 정리하고 있습니다…",
  "청구항으로 보호할 핵심 구성요소를 골라내고 있습니다…",
  "구성요소 사이의 데이터·제어 흐름을 연결하고 있습니다…",
  "필수 구성과 선택·변형 구성을 구분하고 있습니다…",
  "동작 단계, 분기 조건, 예외 상황을 검토하고 있습니다…",
  "기대 효과가 구성·동작과 맞물리는지 확인하고 있습니다…",
  "도면 후보(시스템도·흐름도·구성도)를 배치하고 있습니다…",
  "자료에 없는 내용은 단정하지 않도록 경계를 표시하고 있습니다…",
  "발명 분석표를 정리해 명세서 작성에 쓸 형태로 맞추고 있습니다…"
] as const;

export const CHEMICAL_EMBODIMENT_THINKING_STEPS = [
  "실시예·비교예 표와 수치 데이터를 읽고 있습니다…",
  "시약·공정 조건·측정 방법의 대응 관계를 정리하고 있습니다…",
  "청구항 구성과 실험 결과의 지지 관계를 맞추고 있습니다…",
  "표·그래프 도면에 넣을 핵심 수치를 고르고 있습니다…",
  "구체적인 내용에 넣을 실시예 문단 구조를 잡고 있습니다…",
  "비교예 대비 효과·수치 범위를 도출하고 있습니다…",
  "화학식·구조식 이미지 후보를 표시하고 있습니다…",
  "실시예/비교예 분석 결과를 JSON으로 정리하고 있습니다…"
] as const;

export function getThinkingStepsForLoadingStage(
  loadingStage: LoadingStage
): readonly string[] | null {
  if (loadingStage === "analyze") return INVENTION_ANALYSIS_THINKING_STEPS;
  if (loadingStage === "chemical_embodiment") return CHEMICAL_EMBODIMENT_THINKING_STEPS;
  return null;
}

export function getThinkingStepsForGuidedStep(
  kind: GuidedDraftStepKind | undefined
): readonly string[] | null {
  if (kind === "analyze") return INVENTION_ANALYSIS_THINKING_STEPS;
  if (kind === "chemical_embodiment") return CHEMICAL_EMBODIMENT_THINKING_STEPS;
  return null;
}
