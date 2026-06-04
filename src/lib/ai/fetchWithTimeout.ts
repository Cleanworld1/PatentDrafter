import "server-only";

export class FetchTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

export async function runWithServerlessTimeout<T>(
  label: string,
  timeoutMs: number,
  fn: () => Promise<T>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new FetchTimeoutError(
          `${label}이(가) ${Math.round(timeoutMs / 1000)}초 안에 끝나지 않았습니다. ` +
            "Vercel Hobby는 약 10초 한도가 있습니다. Pro 플랜이면 환경 변수 ANALYZE_TIMEOUT_MS=240000 을 추가한 뒤 Redeploy하세요."
        )
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new FetchTimeoutError(
        `요청 시간이 ${Math.round(timeoutMs / 1000)}초를 초과했습니다. Vercel Pro 사용 시 ANALYZE_TIMEOUT_MS=240000 환경 변수를 설정하세요.`
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
