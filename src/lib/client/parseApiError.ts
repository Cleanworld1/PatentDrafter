import { recordClientError } from "@/lib/client/appErrorLog";

export async function parseApiErrorResponse(
  response: Response,
  fallback: string,
  context = "api.response"
): Promise<string> {
  const rawText = await response.text().catch(() => "");
  try {
    const data = JSON.parse(rawText) as { error?: string; message?: string };
    if (data.error?.trim()) return data.error.trim();
    if (data.message?.trim()) return data.message.trim();
  } catch {
    // not json
  }
  const snippet = rawText.replace(/\s+/g, " ").trim().slice(0, 280);
  if (snippet && !snippet.startsWith("<!DOCTYPE")) {
    const msg = `${fallback}: ${snippet}`;
    if (!response.ok) {
      recordClientError(context, new Error(msg), { status: response.status });
    }
    return msg;
  }
  const msg = `${fallback} (HTTP ${response.status})`;
  if (!response.ok) {
    recordClientError(context, new Error(msg), { status: response.status });
  }
  return msg;
}

/** 브라우저 fetch 실패(서버 다운·연결 끊김·타임아웃) 시 사용자용 메시지 */
export function formatFetchError(err: unknown, fallback: string, context = "fetch"): string {
  const msg = err instanceof Error ? err.message : "";
  if (
    err instanceof TypeError &&
    (/failed to fetch/i.test(msg) || /networkerror/i.test(msg) || /load failed/i.test(msg))
  ) {
    const text = [
      "서버에 연결하지 못했습니다.",
      "① 터미널에서 dev 서버가 실행 중인지 확인 (http://localhost:3000)",
      "② 안 되면 scripts\\dev-restart.cmd 실행 후 브라우저 새로고침",
      "③ 파일을 2개 이상 올렸다면 용량 합이 48MB 이하인지 확인 (PDF 여러 개는 특히 큼)",
      "④ 전체 자동 작성·분석 중 dev 서버가 꺼지면 이 오류가 날 수 있습니다."
    ].join(" ");
    recordClientError(context, err);
    return text;
  }
  if (err instanceof Error && msg) {
    recordClientError(context, err);
    return msg;
  }
  recordClientError(context, new Error(fallback));
  return fallback;
}
