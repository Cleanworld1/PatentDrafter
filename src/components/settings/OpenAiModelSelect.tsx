"use client";

import { useEffect } from "react";
import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function OpenAiModelSelect() {
  const { serverFallbackAvailable, devMockAllowed, suggestedModel, setServerConfig } =
    useSessionApiKeyStore();

  useEffect(() => {
    void fetch("/api/openai/config")
      .then((r) => r.json())
      .then(
        (data: {
          suggestedModel?: string;
          serverFallbackAvailable?: boolean;
          devMockAllowed?: boolean;
        }) => {
          setServerConfig({
            suggestedModel: data.suggestedModel ?? FALLBACK_DEFAULT_MODEL,
            serverFallbackAvailable: Boolean(data.serverFallbackAvailable),
            devMockAllowed: Boolean(data.devMockAllowed)
          });
        }
      )
      .catch(() => undefined);
  }, [setServerConfig]);

  const connectionLabel = serverFallbackAvailable
    ? "서버 .env.local Key 사용"
    : devMockAllowed
      ? "개발 mock 모드 (Key 없음)"
      : "서버 Key 미설정 (.env.local 확인)";

  return (
    <div className="settings-card openai-model-select">
      <h3 className="settings-card-title">AI 모델</h3>

      <div
        className={`openai-connection-status ${serverFallbackAvailable || devMockAllowed ? "ok" : "warn"}`}
      >
        <span>{connectionLabel}</span>
      </div>

      <p className="openai-model-active">
        사용 중 모델: <strong>{suggestedModel}</strong>
      </p>
      <p className="openai-model-hint">
        모델은 UI가 아니라 <code>.env.local</code>의 <code>OPENAI_MODEL</code>만 적용됩니다.
        변경 후 dev 서버를 재시작하세요.
      </p>
      <p className="openai-model-hint">
        프로젝트에서 쓸 수 있는 모델 확인:{" "}
        <code>node scripts/list-openai-models.mjs</code>
      </p>
      <p className="openai-model-hint">
        <code>model_not_found</code> 오류는 Key 문제가 아니라, 해당 프로젝트에 그 모델 권한이
        없을 때 납니다. 보통 <code>gpt-4o</code> / <code>gpt-4.1</code> 가 안전합니다.
      </p>
    </div>
  );
}
