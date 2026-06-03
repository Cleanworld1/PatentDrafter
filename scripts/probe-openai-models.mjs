/**
 * .env.local Key로 인증·모델 목록·chat 동작을 검사하고 최신 사용 가능 모델을 추천합니다.
 * node scripts/probe-openai-models.mjs
 */
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
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const org = vars.OPENAI_ORG_ID || vars.OPENAI_ORGANIZATION;
  const project = vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT;
  if (org) headers["OpenAI-Organization"] = org;
  if (project) headers["OpenAI-Project"] = project;
  return headers;
}

const CANDIDATES = [
  "gpt-5.2",
  "gpt-5.1",
  "gpt-5",
  "gpt-5-mini",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4o",
  "gpt-4o-mini",
  "o3-mini",
  "o4-mini"
];

const envPath = path.join(process.cwd(), ".env.local");
const vars = parseEnvFile(fs.readFileSync(envPath, "utf8"));
const apiKey = sanitizeOpenAiApiKey(vars.OPENAI_API_KEY ?? "");
const headers = buildHeaders(apiKey, vars);

async function authCheck(label, h) {
  const res = await fetch("https://api.openai.com/v1/models", { headers: h });
  return { label, status: res.status, ok: res.ok, body: res.ok ? null : await res.text() };
}

async function listModels() {
  const res = await fetch("https://api.openai.com/v1/models", { headers });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []).map((m) => m.id).filter((id) => id.startsWith("gpt-") || id.startsWith("o"));
}

async function tryProjects() {
  const urls = [
    "https://api.openai.com/v1/organization/projects?limit=20",
    "https://api.openai.com/v1/projects"
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        const items = json.data ?? json.projects ?? [];
        return items.map((p) => p.id ?? p.project?.id).filter(Boolean);
      }
    } catch {
      // ignore
    }
  }
  return [];
}

async function testChat(model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 5,
      messages: [{ role: "user", content: "ok" }]
    })
  });
  const text = await res.text();
  let err = "";
  try {
    err = JSON.parse(text)?.error?.message ?? "";
  } catch {
    err = text.slice(0, 120);
  }
  return { model, ok: res.ok, status: res.status, err };
}

async function main() {
  console.log("Key prefix:", apiKey.slice(0, 12) + "...");
  console.log("OPENAI_PROJECT_ID:", vars.OPENAI_PROJECT_ID || vars.OPENAI_PROJECT || "(missing)");

  const basic = await authCheck("key-only", { Authorization: `Bearer ${apiKey}` });
  const full = await authCheck("key+scope", headers);
  console.log(`[${basic.label}]`, basic.status);
  console.log(`[${full.label}]`, full.status);

  if (!full.ok && !basic.ok) {
    const projects = await tryProjects();
    if (projects.length) {
      console.log("\n발견된 프로젝트 ID (첫 번째로 .env.local 테스트 권장):");
      for (const id of projects) console.log("  ", id);
    }
    console.error("\nFAIL: 인증 실패. sk-proj- Key면 OPENAI_PROJECT_ID=proj_... 필요.");
    process.exit(1);
  }

  const h = full.ok ? headers : { Authorization: `Bearer ${apiKey}` };
  const listRes = await fetch("https://api.openai.com/v1/models", { headers: h });
  const available = listRes.ok ? (await listRes.json()).data?.map((m) => m.id) ?? [] : [];
  const availableSet = new Set(available);

  console.log("\n계정에 노출된 gpt/o 모델 수:", [...availableSet].filter((id) => /^gpt-|^o/.test(id)).length);

  const working = [];
  for (const model of CANDIDATES) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: h,
      body: JSON.stringify({
        model,
        max_completion_tokens: 5,
        messages: [{ role: "user", content: "say hi" }]
      })
    });
    const text = await res.text();
    let err = "";
    try {
      err = JSON.parse(text)?.error?.message ?? "";
    } catch {
      err = text.slice(0, 80);
    }
    const ok = res.ok;
    console.log(ok ? "OK  " : "FAIL", model, res.status, ok ? "" : err.slice(0, 100));
    if (ok) working.push(model);
    // rate limit pause
    await new Promise((r) => setTimeout(r, 200));
  }

  if (working.length === 0) {
    console.error("\nFAIL: 후보 모델 chat 모두 실패");
    process.exit(1);
  }

  const best = working[0];
  console.log("\nRECOMMENDED_MODEL:", best);
  console.log("WORKING_MODELS:", working.join(", "));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
