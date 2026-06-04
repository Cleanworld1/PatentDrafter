import "server-only";

const DEFAULT_LOCAL_MS = 280_000;
/** Vercel Hobby 함수 한도(약 10s) 전에 JSON 오류를 반환 */
const DEFAULT_VERCEL_MS = 8_500;
const DEFAULT_PRO_VERCEL_MS = 240_000;

function parsePositiveMs(raw: string | undefined): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || n < 1_000) return undefined;
  return Math.floor(n);
}

/** 발명 분석 OpenAI 호출 상한 (ms) */
export function getAnalyzeOpenAiTimeoutMs(): number {
  const custom = parsePositiveMs(process.env.ANALYZE_TIMEOUT_MS);
  if (custom) return custom;
  if (process.env.VERCEL) return DEFAULT_VERCEL_MS;
  return DEFAULT_LOCAL_MS;
}

export function getDefaultOpenAiCallTimeoutMs(): number {
  const custom = parsePositiveMs(process.env.OPENAI_CALL_TIMEOUT_MS);
  if (custom) return custom;
  if (process.env.VERCEL) return 120_000;
  return DEFAULT_LOCAL_MS;
}

export function getVercelAnalyzeDeploymentHints(): {
  hostedOnVercel: boolean;
  analyzeTimeoutMs: number;
  needsProTimeoutEnv: boolean;
  proTimeoutEnvExample: string;
} {
  const hostedOnVercel = Boolean(process.env.VERCEL);
  const analyzeTimeoutMs = getAnalyzeOpenAiTimeoutMs();
  const hasCustom = Boolean(process.env.ANALYZE_TIMEOUT_MS?.trim());
  const needsProTimeoutEnv = hostedOnVercel && !hasCustom && analyzeTimeoutMs < 60_000;

  return {
    hostedOnVercel,
    analyzeTimeoutMs,
    needsProTimeoutEnv,
    proTimeoutEnvExample: String(DEFAULT_PRO_VERCEL_MS)
  };
}

export function isAnalyzeTimeoutError(message: string): boolean {
  return /시간이 초과|timeout|timed out|abort/i.test(message);
}
