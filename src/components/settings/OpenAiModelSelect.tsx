"use client";

import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function OpenAiModelSelect() {
  const {
    serverFallbackAvailable,
    devMockAllowed,
    suggestedModel,
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

      {configLoaded && serverFallbackAvailable && !envProjectConfigured && (
        <p className="openai-model-hint openai-model-hint--warn">
          <code>OPENAI_PROJECT_ID</code>가 없습니다. <code>sk-proj-</code> Key 사용 시 .env.local에
          Project ID를 추가하세요.
        </p>
      )}

      <p className="openai-model-hint">
        모델은 <code>OPENAI_MODEL</code> 환경 변수로만 적용됩니다.
        로컬은 <code>.env.local</code> 변경 후 dev 재시작, 배포는 Vercel 환경 변수 후 Redeploy.
      </p>
      <p className="openai-model-hint">
        서버 상태 확인: <code>/api/openai/config</code>
      </p>
    </div>
  );
}
