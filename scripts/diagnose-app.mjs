/**
 * dev 서버·API·진단 로그 수집
 * node scripts/diagnose-app.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = process.env.DEV_URL ?? "http://127.0.0.1:3000";
const outFile = path.join(root, ".diagnostics-report.json");

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  checks: []
};

function addCheck(name, ok, detail) {
  report.checks.push({ name, ok, detail });
  const mark = ok ? "OK" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  console.log(`\nPatent Drafter 진단 — ${baseUrl}\n`);

  try {
    const home = await fetch(`${baseUrl}/`);
    addCheck("GET /", home.ok, `HTTP ${home.status}`);
    if (home.ok) {
      const html = await home.text();
      addCheck("CSS link in HTML", /layout\.css/.test(html));
    }
  } catch (e) {
    addCheck("GET /", false, e instanceof Error ? e.message : String(e));
  }

  try {
    const cfg = await fetch(`${baseUrl}/api/openai/config`);
    addCheck("GET /api/openai/config", cfg.ok, `HTTP ${cfg.status}`);
  } catch (e) {
    addCheck("GET /api/openai/config", false, e instanceof Error ? e.message : String(e));
  }

  try {
    const diag = await fetch(`${baseUrl}/api/diagnostics`);
    if (diag.ok) {
      const data = await diag.json();
      report.serverDiagnostics = data;
      addCheck("GET /api/diagnostics", true, `${data.entries?.length ?? 0} server log entries`);
      if (data.summary?.length) {
        console.log("  서버 요약:");
        for (const line of data.summary) console.log(`    ${line}`);
      }
      if (data.entries?.length) {
        console.log("  최근 서버 오류:");
        for (const e of data.entries.slice(0, 5)) {
          console.log(`    [${e.context}] ${e.message}`);
          if (e.hint) console.log(`      → ${e.hint}`);
        }
      }
    } else {
      addCheck("GET /api/diagnostics", false, `HTTP ${diag.status}`);
    }
  } catch (e) {
    addCheck("GET /api/diagnostics", false, e instanceof Error ? e.message : String(e));
  }

  try {
    const analyze = await fetch(`${baseUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName: "diagnose",
        inventionContent: "테스트 발명",
        attachmentText: "",
        materialType: "발명제안서",
        desiredClaimCount: 3,
        desiredDrawingCount: 1,
        inventionType: "시스템/장치",
        inventionMakingEnabled: false,
        chemicalInventionEnabled: false
      })
    });
    addCheck("POST /api/analyze (JSON smoke)", analyze.ok, `HTTP ${analyze.status}`);
    if (!analyze.ok) {
      const errBody = await analyze.text();
      report.analyzeError = errBody.slice(0, 500);
      console.log(`  응답: ${errBody.slice(0, 200)}`);
    }
  } catch (e) {
    addCheck("POST /api/analyze (JSON smoke)", false, e instanceof Error ? e.message : String(e));
  }

  const failed = report.checks.filter((c) => !c.ok);
  report.overallOk = failed.length === 0;
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n보고서 저장: ${outFile}`);
  console.log(failed.length ? `\n실패 ${failed.length}건 — UI에서 「오류 진단 로그」 패널도 확인하세요.\n` : "\n모든 검사 통과.\n");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
