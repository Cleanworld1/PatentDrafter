/**
 * .env.local OpenAI 설정 검증 + 사용 가능한 최신 모델로 OPENAI_MODEL 갱신
 *
 *   node scripts/configure-openai.mjs
 *   node scripts/configure-openai.mjs proj_xxxxxxxx
 *   node scripts/configure-openai.mjs proj_xxxxxxxx org_xxxxxxxx
 */
import fs from "fs";
import path from "path";

const CANDIDATES = [
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5",
  "gpt-5-mini",
  "gpt-4.1",
  "gpt-4o",
  "gpt-4o-mini"
];

function parseEnv(text) {
  const lines = text.split(/\r?\n/);
  const vars = {};
  for (const line of lines) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim();
  }
  return { lines, vars };
}

function sanitizeKey(raw) {
  let k = raw.trim();
  if (k.toLowerCase().startsWith("bearer ")) k = k.slice(7).trim();
  return k.replace(/[\s\u00a0\u200b-\u200d\ufeff]+/g, "");
}

function buildHeaders(key, vars) {
  const h = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const org = vars.OPENAI_ORG_ID || vars.OPENAI_ORGANIZATION;
  const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT;
  if (org) h["OpenAI-Organization"] = org;
  if (project) h["OpenAI-Project"] = project;
  return h;
}

function chatBody(model) {
  const base = { model, messages: [{ role: "user", content: "ok" }] };
  if (/^gpt-5|^o/.test(model)) return { ...base, max_completion_tokens: 5 };
  return { ...base, max_tokens: 5 };
}

function upsertEnvLine(lines, key, value) {
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  const next = `${key}=${value}`;
  if (idx >= 0) lines[idx] = next;
  else lines.push(next);
  return lines;
}

const envPath = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(envPath)) {
  console.error("FAIL: .env.local 없음");
  process.exit(1);
}

const projArg = process.argv[2]?.trim();
const orgArg = process.argv[3]?.trim();
const raw = fs.readFileSync(envPath, "utf8");
const { lines, vars } = parseEnv(raw);

if (projArg) vars.OPENAI_PROJECT_ID = projArg;
if (orgArg) vars.OPENAI_ORG_ID = orgArg;

const apiKey = sanitizeKey(vars.OPENAI_API_KEY ?? "");
if (!apiKey) {
  console.error("FAIL: OPENAI_API_KEY 비어 있음");
  process.exit(1);
}

const headers = buildHeaders(apiKey, vars);
const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT || "";

console.log("Key:", apiKey.slice(0, 12) + "... (" + apiKey.length + " chars)");
console.log("OPENAI_PROJECT_ID:", project || "(missing)");

const auth = await fetch("https://api.openai.com/v1/models", { headers });
console.log("Auth /v1/models:", auth.status);
if (!auth.ok) {
  console.error(await auth.text());
  if (apiKey.startsWith("sk-proj-") && !project) {
    console.error("\n→ node scripts/configure-openai.mjs proj_YOUR_PROJECT_ID");
  }
  process.exit(1);
}

const working = [];
for (const model of CANDIDATES) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(chatBody(model))
  });
  const ok = res.ok;
  console.log(ok ? "OK " : "NO ", model, res.status);
  if (ok) working.push(model);
}

if (!working.length) {
  console.error("FAIL: chat 모델 없음");
  process.exit(1);
}

const best = working[0];
let outLines = [...lines];
if (projArg) outLines = upsertEnvLine(outLines, "OPENAI_PROJECT_ID", projArg);
if (orgArg) outLines = upsertEnvLine(outLines, "OPENAI_ORG_ID", orgArg);
outLines = upsertEnvLine(outLines, "OPENAI_MODEL", best);
fs.writeFileSync(envPath, outLines.filter((l) => l !== "").join("\r\n") + "\r\n", "utf8");

console.log("\nDONE: OPENAI_MODEL=" + best);
console.log("Working:", working.join(", "));
setTimeout(() => process.exit(0), 50);
