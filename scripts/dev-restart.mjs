/**
 * dev 서버 재시작: Node 종료 → .next 삭제 → next dev (백그라운드) → Ready 대기 → verify
 * node scripts/dev-restart.mjs
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const url = process.env.DEV_URL ?? "http://127.0.0.1:3000/";
const maxWaitMs = 60_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function killPort3000() {
  if (process.platform === "win32") {
    try {
      const out = await new Promise((resolve, reject) => {
        import("child_process").then(({ exec }) =>
          exec('netstat -ano | findstr ":3000" | findstr LISTENING', (e, stdout) =>
            e && !stdout ? reject(e) : resolve(stdout ?? "")
          )
        );
      });
      const pids = new Set();
      for (const line of String(out).split(/\r?\n/)) {
        const m = line.trim().match(/LISTENING\s+(\d+)\s*$/);
        if (m) pids.add(m[1]);
      }
      for (const pid of pids) {
        await new Promise((resolve) => {
          import("child_process").then(({ exec }) =>
            exec(`taskkill /PID ${pid} /F`, () => resolve(undefined))
          );
        });
      }
    } catch {
      // ignore
    }
    return;
  }
  await new Promise((resolve) => {
    import("child_process").then(({ exec }) =>
      exec("lsof -ti:3000 | xargs kill -9 2>/dev/null", () => resolve(undefined))
    );
  });
}

async function waitForOk() {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // retry
    }
    await sleep(1500);
  }
  return false;
}

async function main() {
  console.log("Stopping processes on port 3000...");
  await killPort3000();
  await sleep(1500);

  const nextDir = path.join(root, ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("Removed .next");
  }

  console.log("Starting next dev...");
  const child = spawn(process.execPath, [nextBin, "dev"], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    env: process.env
  });
  child.unref();

  console.log(`Waiting for ${url} (max ${maxWaitMs / 1000}s)...`);
  const ok = await waitForOk();
  if (ok) {
    console.log(`OK: dev server ready — ${url}`);
    process.exit(0);
  }
  console.error("FAIL: dev server did not respond with HTTP 200 in time.");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
