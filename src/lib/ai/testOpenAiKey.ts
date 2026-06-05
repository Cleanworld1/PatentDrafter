import {
  buildOpenAiAuthHeaders,
  getConfiguredOpenAiScope
} from "@/lib/ai/openAiRequestHeaders";
import { getDefaultModelName } from "@/lib/ai/resolveOpenAiCredentials";
import { redactApiKeys } from "@/lib/ai/sanitizeAiError";
import {
  sanitizeOpenAiApiKey,
  validateOpenAiApiKeyFormat
} from "@/lib/ai/sanitizeOpenAiApiKey";

export interface TestOpenAiKeyScope {
  organizationId?: string;
  projectId?: string;
}

export interface TestOpenAiKeyResult {
  ok: boolean;
  model: string;
  message: string;
}

function hasProjectConfigured(scope?: TestOpenAiKeyScope): boolean {
  return Boolean(
    scope?.projectId?.trim() ||
      process.env.OPENAI_PROJECT_ID?.trim() ||
      process.env.OPENAI_PROJECT?.trim()
  );
}

function userMessageFromOpenAiError(status: number, bodyText: string): string {
  const redacted = redactApiKeys(bodyText);
  try {
    const parsed = JSON.parse(bodyText) as { error?: { message?: string; type?: string } };
    const msg = parsed.error?.message ?? "";

    if (
      status === 401 &&
      (/incorrect api key/i.test(msg) || /invalid_api_key/i.test(msg))
    ) {
      if (!getConfiguredOpenAiScope().hasProject) {
        return [
          "Key 형식은 정상입니다(sk-proj-). OpenAI는 프로젝트 ID 없이는 이 Key를 거부하는 경우가 많습니다.",
          "① platform.openai.com → Key를 만든 그 프로젝트 → Settings → Project ID (proj_…)",
          "② .env.local 에 OPENAI_PROJECT_ID=proj_… 추가 후 dev 서버 재시작",
          "③ node scripts/test-openai-env.mjs 로 확인",
          "여러 조직이면 OPENAI_ORG_ID=org_… 도 추가하세요."
        ].join(" ");
      }
      return [
        "OpenAI가 이 API Key를 인식하지 못했습니다.",
        "① https://platform.openai.com/api-keys 에서 새 Secret Key를 발급",
        "② 「Copy」로 전체 Key를 한 번에 붙여넣기 (sk-proj-… 전체)",
        "③ ChatGPT 로그인 비밀번호·Cursor 키가 아닌 OpenAI Platform API Key인지 확인",
        "④ Key를 삭제·재발급했으면 예전 Key는 더 이상 동작하지 않습니다."
      ].join(" ");
    }

    if (status === 403) {
      return "API Key는 있으나 권한이 없습니다. 조직/프로젝트 권한 또는 결제 설정을 확인해 주세요.";
    }

    if (msg) return redactApiKeys(msg);
  } catch {
    // not JSON
  }

  if (redacted) return `OpenAI 응답 (${status}): ${redacted}`;
  return `API Key를 확인하지 못했습니다. (HTTP ${status})`;
}

export async function testOpenAiApiKey(
  rawApiKey: string,
  model?: string,
  scope?: TestOpenAiKeyScope
): Promise<TestOpenAiKeyResult> {
  const resolvedModel = model?.trim() || getDefaultModelName();
  const apiKey = sanitizeOpenAiApiKey(rawApiKey);

  const formatError = validateOpenAiApiKeyFormat(apiKey);
  if (formatError) {
    return { ok: false, model: resolvedModel, message: formatError };
  }

  if (apiKey.startsWith("sk-proj-") && !hasProjectConfigured(scope)) {
    return {
      ok: false,
      model: resolvedModel,
      message: [
        "프로젝트 Key(sk-proj-)는 Project ID(proj_…)가 필요합니다.",
        "아래 Project ID 칸에 입력하거나 .env.local에 OPENAI_PROJECT_ID=proj_… 를 넣은 뒤 dev 서버를 재시작하세요."
      ].join(" ")
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      method: "GET",
      headers: buildOpenAiAuthHeaders(apiKey, scope)
    });

    if (response.ok) {
      return {
        ok: true,
        model: resolvedModel,
        message: "API Key가 정상적으로 확인되었습니다."
      };
    }

    const errText = await response.text();
    return {
      ok: false,
      model: resolvedModel,
      message: userMessageFromOpenAiError(response.status, errText)
    };
  } catch {
    return {
      ok: false,
      model: resolvedModel,
      message: "네트워크 오류로 OpenAI에 연결하지 못했습니다. 인터넷 연결 후 다시 시도해 주세요."
    };
  }
}
