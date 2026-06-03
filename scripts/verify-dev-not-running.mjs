/**
 * next build 전: dev(3000)가 떠 있으면 .next 충돌로 500이 납니다.
 */
import { execSync } from "child_process";

function port3000Listening() {
  try {
    if (process.platform === "win32") {
      const out = execSync('netstat -ano | findstr ":3000" | findstr LISTENING', {
        encoding: "utf8"
      });
      return out.trim().length > 0;
    }
    execSync("lsof -i:3000 -sTCP:LISTEN", { encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

if (port3000Listening()) {
  console.error("");
  console.error("WARN: localhost:3000 dev 서버가 실행 중입니다.");
  console.error("      이 상태에서 next build 하면 .next가 깨져 접속(500)이 납니다.");
  console.error("      → dev를 끄거나: node scripts/dev-restart.mjs");
  console.error("      → 빌드만 필요하면 dev 종료 후 다시 npm run build");
  console.error("");
  process.exit(1);
}
