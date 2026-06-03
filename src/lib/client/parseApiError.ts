export async function parseApiErrorResponse(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    // ignore
  }
  return `${fallback} (HTTP ${response.status})`;
}

/** 브라우저 fetch 실패(서버 다운·연결 끊김·타임아웃) 시 사용자용 메시지 */
export function formatFetchError(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : "";
  if (
    err instanceof TypeError &&
    (/failed to fetch/i.test(msg) || /networkerror/i.test(msg) || /load failed/i.test(msg))
  ) {
    return [
      "서버에 연결하지 못했습니다.",
      "① 터미널에서 dev 서버가 실행 중인지 확인 (http://localhost:3000)",
      "② 안 되면 scripts\\dev-restart.cmd 실행 후 브라우저 새로고침",
      "③ 전체 자동 작성 중 dev 서버가 꺼지면 이 오류가 날 수 있습니다."
    ].join(" ");
  }
  if (err instanceof Error && msg) return msg;
  return fallback;
}
