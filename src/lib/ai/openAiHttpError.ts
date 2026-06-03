import { redactApiKeys } from "@/lib/ai/sanitizeAiError";

export function messageFromOpenAiHttpError(
  status: number,
  bodyText: string,
  modelUsed: string
): string {
  const redacted = redactApiKeys(bodyText);
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; code?: string };
    };
    const msg = parsed.error?.message ?? "";
    const code = parsed.error?.code ?? "";

    if (status === 403 && (code === "model_not_found" || /does not have access to model/i.test(msg))) {
      const match = msg.match(/model `([^`]+)`/);
      const denied = match?.[1] ?? modelUsed;
      return [
        `이 OpenAI 프로젝트에서 '${denied}' 모델을 사용할 수 없습니다.`,
        `현재 서버 설정: OPENAI_MODEL=${modelUsed}`,
        "① .env.local 의 OPENAI_MODEL 을 gpt-4o 또는 gpt-4.1 등 사용 가능한 모델로 변경",
        "② dev 서버 재시작 후 node scripts/list-openai-models.mjs 로 계정에서 쓸 수 있는 모델 확인",
        "③ Platform에서 해당 프로젝트에 모델 접근 권한·결제 한도 확인"
      ].join(" ");
    }

    if (msg) return redactApiKeys(msg);
  } catch {
    // not json
  }
  return `OpenAI API 오류 (${status}): ${redacted}`;
}
