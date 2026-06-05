"use client";

import { usePatentDraftStore } from "@/store/patentDraftStore";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function GenerationActions() {
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const workflowStepLabel = usePatentDraftStore((s) => s.getWorkflowStepLabel());
  const chemicalInventionEnabled = usePatentDraftStore((s) => s.options.chemicalInventionEnabled);
  const hasAnalysis = usePatentDraftStore((s) => Boolean(s.analysis));
  const hasEmbodimentAnalysis = usePatentDraftStore((s) => Boolean(s.chemicalEmbodimentAnalysis));
  const canRunAi = useSessionApiKeyStore((s) => s.canRunAi());
  const devMockAllowed = useSessionApiKeyStore((s) => s.devMockAllowed);
  const serverFallbackAvailable = useSessionApiKeyStore((s) => s.serverFallbackAvailable);
  const runAnalyze = usePatentDraftStore((s) => s.runAnalyze);
  const runChemicalEmbodimentAnalyze = usePatentDraftStore((s) => s.runChemicalEmbodimentAnalyze);
  const runGenerateSpec = usePatentDraftStore((s) => s.runGenerateSpec);
  const runReview = usePatentDraftStore((s) => s.runReview);
  const runFullDraft = usePatentDraftStore((s) => s.runFullDraft);

  const isLoading = loadingStage !== "";
  const stage2Disabled = isLoading || !canRunAi || !hasAnalysis;

  return (
    <div className="settings-card generation-actions">
      <h3 className="settings-card-title">실행</h3>
      <p className="workflow-step-hint">
        업무 순서: 분석 → 청구항 → 도면 → 정합성 → 구체적 내용 → 앞부분·요약
        <br />
        <span className="workflow-step-current">현재 단계: {workflowStepLabel}</span>
      </p>
      {!canRunAi && (
        <p className="workflow-key-warning">
          서버에 OpenAI API Key가 없습니다. 프로젝트 루트 <code>.env.local</code>의{" "}
          <code>OPENAI_API_KEY</code>를 설정한 뒤 dev 서버를 재시작하세요.
        </p>
      )}
      {devMockAllowed && !serverFallbackAvailable && (
        <p className="workflow-key-hint">개발 모드: Key 없이 mock으로 실행됩니다.</p>
      )}
      <button
        type="button"
        className="btn-primary btn-block"
        disabled={isLoading || !canRunAi}
        onClick={() => void runAnalyze()}
      >
        1단계: 발명 분석하기
      </button>
      {chemicalInventionEnabled && (
        <div className="generation-stage2-wrap">
          <button
            type="button"
            className="btn-secondary btn-block generation-stage2-btn"
            disabled={stage2Disabled}
            title={
              !hasAnalysis
                ? "1단계 발명 분석을 먼저 실행하세요"
                : hasEmbodimentAnalysis
                  ? "실시예/비교예 분석을 다시 실행합니다"
                  : undefined
            }
            onClick={() => void runChemicalEmbodimentAnalyze()}
          >
            2단계: 실시예/비교예 분석
            {hasEmbodimentAnalysis ? " (다시 실행)" : ""}
          </button>
          <p className="generation-stage2-hint">
            화학 발명 모드 · 1단계 완료 후 실행. 표·구체적인 내용·데이터 그래프 도면 지시를 생성합니다.
          </p>
        </div>
      )}
      <button
        type="button"
        className="btn-accent btn-block"
        disabled={isLoading || !canRunAi}
        onClick={() => void runFullDraft()}
      >
        워크플로우 전체 자동 작성
      </button>
      <p className="generation-stage2-hint">
        항목마다 AI 요청을 나누어 실행합니다. 각 단계 결과를 확인한 뒤 「계속」을 누르세요. 「중단」으로
        언제든 멈출 수 있습니다.
      </p>
      <details className="legacy-actions">
        <summary>레거시 단계 실행</summary>
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={isLoading}
          onClick={() => void runGenerateSpec()}
        >
          (구) 명세서 초안 일괄 생성
        </button>
        <button
          type="button"
          className="btn-primary btn-block"
          disabled={isLoading}
          onClick={() => void runReview()}
        >
          (구) 정합성 검토
        </button>
      </details>
    </div>
  );
}
