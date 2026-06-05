import { buildOpenAiAuthHeaders } from "@/lib/ai/openAiRequestHeaders";
import { flattenModelIds } from "@/lib/ai/openAiModelCatalog";
import { sanitizeOpenAiApiKey } from "@/lib/ai/sanitizeOpenAiApiKey";

export interface ProbeOpenAiScope {
  organizationId?: string;
  projectId?: string;
}

export interface ProbeOpenAiModelsResult {
  ok: boolean;
  recommendedModel: string | null;
  workingModels: string[];
  message: string;
}

function chatBodyForModel(model: string): Record<string, unknown> {
  const base = {
    model,
    messages: [{ role: "user", content: "say ok" }]
  };
  if (/^gpt-5|^o\d|^o[34]/.test(model)) {
    return { ...base, max_completion_tokens: 8 };
  }
  return { ...base, max_tokens: 8 };
}

export async function probeOpenAiModels(
  rawApiKey: string,
  scope?: ProbeOpenAiScope
): Promise<ProbeOpenAiModelsResult> {
  const apiKey = sanitizeOpenAiApiKey(rawApiKey);
  const headers = buildOpenAiAuthHeaders(apiKey, scope);

  const authRes = await fetch("https://api.openai.com/v1/models", { headers });
  if (!authRes.ok) {
    const errText = await authRes.text();
    let hint = "API Key 또는 프로젝트/조직 ID를 확인해 주세요.";
    if (apiKey.startsWith("sk-proj-") && !scope?.projectId?.trim()) {
      hint =
        "sk-proj- Key는 OPENAI_PROJECT_ID(proj_…)가 필요합니다. Platform → 프로젝트 → Settings에서 복사하세요.";
    }
    return {
      ok: false,
      recommendedModel: null,
      workingModels: [],
      message: `인증 실패 (HTTP ${authRes.status}). ${hint} ${errText.slice(0, 120)}`
    };
  }

  const working: string[] = [];
  for (const model of flattenModelIds()) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify(chatBodyForModel(model))
    });
    if (res.ok) working.push(model);
    await new Promise((r) => setTimeout(r, 150));
  }

  if (working.length === 0) {
    return {
      ok: false,
      recommendedModel: null,
      workingModels: [],
      message: "인증은 되었으나 후보 모델 chat 호출이 모두 실패했습니다. 결제·모델 접근 권한을 확인해 주세요."
    };
  }

  return {
    ok: true,
    recommendedModel: working[0],
    workingModels: working,
    message: `사용 가능: ${working.slice(0, 5).join(", ")}${working.length > 5 ? " …" : ""}`
  };
}
