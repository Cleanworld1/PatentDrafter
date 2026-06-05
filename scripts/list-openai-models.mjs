/**
 * 계정·프로젝트에서 사용 가능한 모델 ID 목록 출력
 * node scripts/list-openai-models.mjs
 */
import fs from "fs";
import path from "path";

function parseEnv(text) {
  const vars = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

function buildHeaders(apiKey, vars) {
  const h = { Authorization: `Bearer ${apiKey}` };
  const org = vars.OPENAI_ORG_ID || vars.OPENAI_ORGANIZATION;
  const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT;
  if (org) h["OpenAI-Organization"] = org;
  if (project) h["OpenAI-Project"] = project;
  return h;
}

const envPath = path.join(process.cwd(), ".env.local");
const vars = parseEnv(fs.readFileSync(envPath, "utf8"));
const apiKey = (vars.OPENAI_API_KEY ?? "").trim();
const headers = buildHeaders(apiKey, vars);

const res = await fetch("https://api.openai.com/v1/models", { headers });
if (!res.ok) {
  console.error("FAIL", res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const ids = (json.data ?? []).map((m) => m.id).sort();
const chat = ids.filter((id) => /^gpt-|^o\d|^o[0-9]/.test(id));

console.log("OPENAI_MODEL (env):", vars.OPENAI_MODEL || "(not set)");
console.log("OPENAI_PROJECT_ID:", vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT || "(missing)");
console.log("\nChat/reasoning models available to this project:\n");
for (const id of chat) console.log(" ", id);
console.log("\nTip: set OPENAI_MODEL to one of the IDs above in .env.local");
