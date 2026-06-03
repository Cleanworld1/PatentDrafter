/** 붙여넣기 시 흔한 오타·공백·접두사 제거 (Key 원문은 로그에 남기지 않음) */
export function sanitizeOpenAiApiKey(raw: string): string {
  let key = raw.trim();

  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice(7).trim();
  }

  // 줄바꿈·탭·NBSP 등 제거 (복사 시 끊긴 Key 복구)
  key = key.replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g, "");

  return key;
}

export function validateOpenAiApiKeyFormat(key: string): string | null {
  if (!key) return "API Key를 입력해 주세요.";
  if (!key.startsWith("sk-")) {
    return "OpenAI API Key는 보통 sk- 로 시작합니다. platform.openai.com/api-keys 에서 발급한 Key인지 확인해 주세요.";
  }
  if (key.startsWith("sk-proj-") && key.length < 80) {
    return "프로젝트 Key(sk-proj-)는 매우 깁니다. 발급 화면에서 「복사」로 전체 Key가 들어왔는지 확인해 주세요.";
  }
  if (key.length < 20) {
    return "API Key가 너무 짧습니다. 전체 Key가 붙여넣기 되었는지 확인해 주세요.";
  }
  return null;
}
