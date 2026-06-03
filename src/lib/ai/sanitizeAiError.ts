const KEY_PATTERN = /sk-[a-zA-Z0-9_-]{8,}/g;

export function redactApiKeys(text: string): string {
  return text.replace(KEY_PATTERN, "sk-***");
}

export function sanitizeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : "요청 처리 중 오류가 발생했습니다.";
  return redactApiKeys(raw);
}
