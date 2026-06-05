"use client";

import { REASONING_EFFORT_LABELS } from "@/lib/ai/openAiCompletionParams";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function OpenAiModelSelect() {
  const {
    serverFallbackAvailable,
    devMockAllowed,
    suggestedModel,
    configuredReasoningEffort,
    activeReasoningEffort,
    reasoningEffortSupported,
    envProjectConfigured,
    configLoaded,
    configError
  } = useSessionApiKeyStore();

  const connectionLabel = !configLoaded
    ? "연결 상태 확인 중…"
    : configError
      ? `설정 불러오기 실패: ${configError}`
      : serverFallbackAvailable
        ? "서버 .env.local Key 사용"
        : devMockAllowed
          ? "개발 mock 모드 (Key 없음)"
          : "서버 Key 미설정 (.env.local 확인)";

  const statusClass =
    !configLoaded || configError
      ? "pending"
      : serverFallbackAvailable || devMockAllowed
        ? "ok"
        : "warn";

  return (
    <div className="settings-card openai-model-select">
      <h3 className="settings-card-title">AI 모델</h3>

      <div className={`openai-connection-status ${statusClass}`}>
        <span>{connectionLabel}</span>
        {configError && (
          <button
            type="button"
            className="openai-config-retry"
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        )}
      </div>

      <p className="openai-model-active">
        사용 중 모델: <strong>{configLoaded ? suggestedModel : "…"}</strong>
      </p>

      {configLoaded && configuredReasoningEffort && (
        <p className="openai-model-active">
          추론 강도:{" "}
          <strong>
            {activeReasoningEffort
              ? REASONING_EFFORT_LABELS[activeReasoningEffort]
              : `${configuredReasoningEffort} (현재 모델 미지원)`}
          </strong>
        </p>
      )}

      {configLoaded && configuredReasoningEffort && !reasoningEffortSupported && (
        <p className="openai-model-hint openai-model-hint--warn">
          <code>OPENAI_REASONING_EFFORT</code>는 gpt-5·o 시리즈에서만 적용됩니다.{" "}
          <code>{suggestedModel}</code>에는 반영되지 않습니다.
        </p>
      )}

      {configLoaded && serverFallbackAvailable && !envProjectConfigured && (
        <p className="openai-model-hint openai-model-hint--warn">
          <code>OPENAI_PROJECT_ID</code>가 없습니다. <code>sk-proj-</code> Key 사용 시 .env.local에
          Project ID를 추가하세요.
        </p>
      )}

      <p className="openai-model-hint">
        모델·추론 강도는 UI가 아니라 <code>.env.local</code>의 <code>OPENAI_MODEL</code>,{" "}
        <code>OPENAI_REASONING_EFFORT</code>(minimal | low | medium | high)만 적용됩니다.
        변경 후 dev 서버를 재시작하세요.
      </p>
      <p className="openai-model-hint">
        서버 상태 확인: <code>/api/openai/config</code>
      </p>
    </div>
  );
}
