/**
 * localhost dev 응답 + CSS 청크 로드 확인
 * node scripts/verify-localhost.mjs
 */
const devUrl = process.env.DEV_URL ?? "http://127.0.0.1:3000/";
const TIMEOUT_MS = Number(process.env.VERIFY_TIMEOUT_MS ?? 15000);

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(devUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`FAIL: ${devUrl} → HTTP ${res.status}`);
      console.error("→ scripts\\dev-restart.cmd 로 dev 서버를 재시작하세요.");
      process.exit(1);
    }

    const html = await res.text();
    const cssMatch = html.match(/href="(\/_next\/static\/css\/[^"]+\.css[^"]*)"/);
    if (!cssMatch) {
      console.error(`FAIL: ${devUrl} HTML에 stylesheet 링크가 없습니다.`);
      console.error("→ .next 캐시 손상 가능. scripts\\dev-restart.cmd 실행 후 재시도.");
      process.exit(1);
    }

    const cssUrl = new globalThis.URL(cssMatch[1], devUrl);
    const cssRes = await fetch(cssUrl);
    if (!cssRes.ok) {
      console.error(`FAIL: CSS ${cssUrl.pathname} → HTTP ${cssRes.status}`);
      console.error("→ dev 중 build를 돌리지 않았는지 확인하고 dev-restart 하세요.");
      process.exit(1);
    }

    const cssText = await cssRes.text();
    if (!cssText.includes(".app-shell")) {
      console.error("FAIL: layout.css에 앱 스타일(.app-shell)이 없습니다.");
      console.error("→ scripts\\dev-restart.cmd 실행 후 브라우저 강력 새로고침(Ctrl+Shift+R).");
      process.exit(1);
    }

    if (html.includes("next-error-h1") && !html.includes('class="app-shell"')) {
      console.error("FAIL: Next.js 오류 페이지가 반환되었습니다.");
      console.error("→ scripts\\dev-restart.cmd 실행하세요.");
      process.exit(1);
    }

    console.log(`OK: ${devUrl} → HTTP ${res.status}`);
    console.log(`OK: CSS ${cssUrl.pathname} (${cssText.length} bytes, .app-shell 포함)`);
    process.exit(0);
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FAIL: ${devUrl} 에 연결하지 못했습니다 (${msg})`);
    console.error("→ dev 서버가 꺼져 있거나 .next 캐시가 깨졌을 수 있습니다.");
    console.error("→ scripts\\dev-restart.cmd 실행 후 다시 확인하세요.");
    process.exit(1);
  }
}

main();
