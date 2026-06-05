import fs from "fs";
import path from "path";

function sanitizeOpenAiApiKey(raw) {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key.toLowerCase().startsWith("bearer ")) key = key.slice(7).trim();
  return key.replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g, "");
}

function parseEnvFile(text) {
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (!m) continue;
    vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

function buildHeaders(apiKey, vars) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const org = vars.OPENAI_ORG_ID || vars.OPENAI_ORGANIZATION;
  const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT;
  if (org) headers["OpenAI-Organization"] = org;
  if (project) headers["OpenAI-Project"] = project;
  return headers;
}

function exitProcess(code) {
  setTimeout(() => process.exit(code), 50);
}

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("FAIL: .env.local 파일이 없습니다.");
  exitProcess(1);
}

const vars = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const apiKey = sanitizeOpenAiApiKey(vars.OPENAI_API_KEY ?? "");
const model = vars.OPENAI_MODEL ?? "";
const allowFallback = vars.ALLOW_SERVER_DEFAULT_OPENAI_KEY ?? "";
const org = vars.OPENAI_ORG_ID || vars.OPENAI_ORGANIZATION || "";
const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT || "";

if (!apiKey) {
  console.error("FAIL: OPENAI_API_KEY가 비어 있습니다.");
  exitProcess(1);
}

console.log("Key length:", apiKey.length, "| prefix:", apiKey.slice(0, 8) + "...");
console.log("Model:", model || "(default)");
console.log("ALLOW_SERVER_DEFAULT_OPENAI_KEY:", allowFallback || "false");
console.log("OPENAI_ORG_ID:", org ? "set" : "missing");
console.log("OPENAI_PROJECT_ID:", project ? "set" : "missing");

if (apiKey.startsWith("sk-proj-") && !project) {
  console.log("");
  console.log("NOTE: sk-proj- Key는 보통 OPENAI_PROJECT_ID=proj_... 가 필요합니다.");
  console.log("      Platform → 해당 프로젝트 → Settings → Project ID 복사");
  console.log("      여러 조직이면 OPENAI_ORG_ID=org_... 도 추가");
}

async function tryModels(label, headers) {
  const res = await fetch("https://api.openai.com/v1/models", { headers });
  console.log(`[${label}] HTTP`, res.status);
  return res.ok;
}

try {
  const headersBasic = { Authorization: `Bearer ${apiKey}` };
  const headersFull = buildHeaders(apiKey, vars);

  const okBasic = await tryModels("Key only", headersBasic);
  if (okBasic) {
    console.log("OK: Key only 로 인증 성공");
    exitProcess(0);
  }

  const okFull = await tryModels("Key + org/project headers", headersFull);
  if (okFull) {
    console.log("OK: OPENAI_PROJECT_ID / OPENAI_ORG_ID 포함 시 인증 성공");
    exitProcess(0);
  }

  console.error("");
  console.error("FAIL: OpenAI가 Key를 거부했습니다 (invalid_api_key).");
  if (apiKey.startsWith("sk-proj-") && !project) {
    console.error("→ .env.local 에 Key를 발급한 동일 프로젝트의 OPENAI_PROJECT_ID=proj_xxx 를 추가한 뒤 다시 테스트하세요.");
  } else {
    console.error("→ Platform에서 Key를 새로 발급하거나, 결제/권한 설정을 확인하세요.");
  }
  exitProcess(1);
} catch (err) {
  console.error("FAIL: 네트워크 오류 —", err instanceof Error ? err.message : "unknown");
  exitProcess(1);
}
