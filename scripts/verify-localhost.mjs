/**
 * localhost:3000 응답 확인 (dev 서버 살아 있는지)
 * node scripts/verify-localhost.mjs
 */
const URL = process.env.DEV_URL ?? "http://127.0.0.1:3000/";
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS ?? 15000);

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(URL, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      console.log(`OK: ${URL} → HTTP ${res.status}`);
      process.exit(0);
    }
    console.error(`FAIL: ${URL} → HTTP ${res.status}`);
    console.error("→ scripts\\dev-restart.cmd 로 dev 서버를 재시작하세요.");
    process.exit(1);
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAIL: ${URL} 에 연결하지 못했습니다 (${msg})`);
    console.error("→ dev 서버가 꺼져 있거나 .next 캐시가 깨졌을 수 있습니다.");
    console.error("→ scripts\\dev-restart.cmd 실행 후 다시 확인하세요.");
    process.exit(1);
  }
}

main();
