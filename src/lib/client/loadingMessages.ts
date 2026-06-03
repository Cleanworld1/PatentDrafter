import type { LoadingStage } from "@/types/patentDraft";

export interface LoadingOverlayContent {
  title: string;
  message: string;
  hint?: string;
}

export function getLoadingOverlayContent(
  loadingStage: LoadingStage,
  refiningProgress: string
): LoadingOverlayContent | null {
  if (loadingStage === "analyze") {
    return {
      title: "발명 분석 중",
      message: "업로드한 자료와 입력 내용을 분석하고 있습니다.",
      hint: "파일·이미지가 많으면 시간이 더 걸릴 수 있습니다."
    };
  }

  if (loadingStage === "full") {
    return {
      title: "워크플로우 전체 자동 작성",
      message: "청구항·도면·명세서 초안을 순서대로 생성하고 있습니다.",
      hint: "완료까지 수 분이 걸릴 수 있습니다. 창을 닫지 마세요."
    };
  }

  if (loadingStage === "refine") {
    return {
      title: "명세서 품질 정제",
      message: refiningProgress
        ? refiningProgress
        : "항목별 다시 작성·구체화를 진행하고 있습니다.",
      hint: "【도면】 프롬프트와 【구체적인 내용】을 순차 보강 중입니다."
    };
  }

  return null;
}

export function shouldShowLoadingOverlay(loadingStage: LoadingStage): boolean {
  return loadingStage === "analyze" || loadingStage === "full" || loadingStage === "refine";
}
