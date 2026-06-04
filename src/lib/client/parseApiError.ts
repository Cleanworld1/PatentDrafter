import { isLocalDevHost } from "@/lib/openAiSetupMessage";

/** Vercel Serverless 요청 본문 상한(약 4.5MB) — 여유를 두고 4MB 권장 */
export const VERCEL_MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export async function parseApiErrorResponse(response: Response, fallback: string): Promise<string> {
  try {
    const data = (await response.json()) as {
      error?: string;
      message?: string;
      code?: string;
    };
    if (data.code === "ANALYZE_TIMEOUT" && data.error) return data.error;
    if (data.code === "PAYLOAD_TOO_LARGE" && data.error) return data.error;
    if (data.error) return data.error;
    if (data.message) return data.message;
  } catch {
    // ignore
  }
  if (response.status === 413) {
    return "업로드 용량이 서버 한도를 초과했습니다. 파일 크기를 줄이거나 일부만 올려 주세요.";
  }
  if (response.status === 504 || response.status === 502) {
    return `${fallback} (HTTP ${response.status}). 분석 시간이 길면 Vercel Pro 플랜·함수 시간 한도를 확인하세요.`;
  }
  return `${fallback} (HTTP ${response.status})`;
}

export function isBrowserFetchNetworkError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : "";
  return (
    err instanceof TypeError &&
    (/failed to fetch/i.test(msg) || /networkerror/i.test(msg) || /load failed/i.test(msg))
  );
}

function getNetworkErrorHints(): string[] {
  if (typeof window === "undefined") {
    return ["호스팅 환경 변수·배포 로그·요청 크기를 확인하세요."];
  }

  const host = window.location.hostname;
  if (isLocalDevHost(host)) {
    return [
      "① 터미널에서 dev 서버 실행 여부 확인 (http://localhost:3000)",
      "② scripts\\dev-restart.cmd 실행 후 브라우저 새로고침",
      "③ 전체 자동 작성 중 dev 서버가 꺼지면 이 오류가 날 수 있습니다"
    ];
  }

  return [
    `① 지금 주소가 배포 URL인지 확인 (${window.location.origin}) — localhost가 아니어야 합니다`,
    "② Vercel → Settings → Environment Variables → OPENAI_API_KEY·OPENAI_MODEL 설정 후 Redeploy",
    "③ 업로드 파일 합계가 약 4MB를 넘으면 요청이 끊길 수 있습니다",
    "④ Vercel Deployments → 해당 배포 → Functions/Runtime Logs에서 /api/analyze 오류 확인",
    "⑤ 분석이 10초 이상 걸리면 Hobby 플랜 한도일 수 있습니다 (vercel.json maxDuration은 Pro 필요)"
  ];
}

/** 브라우저 fetch 실패(서버 다운·연결 끊김·타임아웃·용량 초과) 시 사용자용 메시지 */
export function formatFetchError(err: unknown, fallback: string): string {
  if (isBrowserFetchNetworkError(err)) {
    return ["서버 API에 연결하지 못했습니다.", ...getNetworkErrorHints()].join(" ");
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function formatUploadTooLargeError(totalBytes: number): string {
  const mb = (totalBytes / (1024 * 1024)).toFixed(1);
  return `업로드 파일 합계가 약 ${mb}MB입니다. 배포 환경(Vercel)에서는 약 4MB 이하를 권장합니다.`;
}
