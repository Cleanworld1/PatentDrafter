"use client";

import { useGeminiConfigStore } from "@/store/geminiConfigStore";

export function GeminiDrawingSettings() {
  const drawingConfigured = useGeminiConfigStore((s) => s.drawingConfigured);
  const imageModel = useGeminiConfigStore((s) => s.imageModel);
  const studioUrl = useGeminiConfigStore((s) => s.studioUrl);
  const configLoaded = useGeminiConfigStore((s) => s.configLoaded);
  const configError = useGeminiConfigStore((s) => s.configError);

  const statusLabel = !configLoaded
    ? "확인 중…"
    : configError
      ? `오류: ${configError}`
      : drawingConfigured
        ? "서버 Key 연결됨 (앱에서 바로 생성)"
        : "Key 미설정 (AI Studio 수동 붙여넣기)";

  const statusClass = !configLoaded || configError ? "pending" : drawingConfigured ? "ok" : "warn";

  return (
    <div className="settings-card gemini-drawing-settings">
      <h3 className="settings-card-title">도면 생성 (Nano Banana 2)</h3>

      <div className={`openai-connection-status ${statusClass}`}>
        <span>{statusLabel}</span>
      </div>

      {configLoaded && drawingConfigured && (
        <p className="openai-model-active">
          이미지 모델: <strong>{imageModel}</strong>
        </p>
      )}

      <p className="openai-model-hint openai-model-hint--warn">
        <code>gemini-3.1-flash-image</code>(Nano Banana 2)는 무료 API 할당량이 <strong>0</strong>입니다.
        「quota exceeded · free_tier · limit: 0」 오류는 Key 문제가 아니라 <strong>유료 결제 미연결</strong> 또는
        무료로 쓸 수 없는 모델을 선택한 경우입니다.
      </p>
      <p className="openai-model-hint">
        Google AI Studio에서 API Key 발급 후 <strong>결제( Billing ) 연결</strong>하거나,{" "}
        <code>GEMINI_IMAGE_MODEL=gemini-2.5-flash-image</code> 로 변경해 보세요.
      </p>
      <p className="openai-model-hint">
        모델 ID는 <code>GEMINI_IMAGE_MODEL</code>로 변경합니다 (기본:{" "}
        <code>gemini-3.1-flash-image</code>).
      </p>
      <p className="openai-model-hint">
        Key가 없으면 「도면 생성」 시 프롬프트 복사 후{" "}
        <a href={studioUrl} target="_blank" rel="noopener noreferrer">
          AI Studio
        </a>
        에서 수동 생성합니다.
      </p>
    </div>
  );
}
