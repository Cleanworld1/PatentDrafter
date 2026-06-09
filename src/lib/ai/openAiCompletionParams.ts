export type OpenAiReasoningEffort = "minimal" | "low" | "medium" | "high";

/** API 호출 목적별 토큰·추론 강도 (발명 분석은 env high여도 low로 고정) */
export type OpenAiTaskProfile = "analyze" | "draft" | "default";

const REASONING_EFFORT_VALUES: OpenAiReasoningEffort[] = ["minimal", "low", "medium", "high"];

const TASK_PROFILES: Record<
  OpenAiTaskProfile,
  { maxTokens: number; reasoningEffort: OpenAiReasoningEffort | "env" }
> = {
  analyze: { maxTokens: 24_576, reasoningEffort: "low" },
  draft: { maxTokens: 16_384, reasoningEffort: "env" },
  default: { maxTokens: 16_384, reasoningEffort: "env" }
};

/** gpt-5·o 시리즈 — max_completion_tokens·reasoning_effort 사용 */
export function modelUsesCompletionTokensParam(model: string): boolean {
  return /^gpt-5|^o\d|^o[34]/.test(model);
}

export function modelSupportsReasoningEffort(model: string): boolean {
  return modelUsesCompletionTokensParam(model);
}

export function getReasoningEffortFromEnv(): OpenAiReasoningEffort | undefined {
  const raw = process.env.OPENAI_REASONING_EFFORT?.trim().toLowerCase();
  if (!raw) return undefined;
  return REASONING_EFFORT_VALUES.includes(raw as OpenAiReasoningEffort)
    ? (raw as OpenAiReasoningEffort)
    : undefined;
}

export function resolveReasoningEffortForModel(
  model: string,
  effort: OpenAiReasoningEffort | undefined = getReasoningEffortFromEnv()
): OpenAiReasoningEffort | undefined {
  if (!effort || !modelSupportsReasoningEffort(model)) return undefined;
  return effort;
}

export function resolveReasoningEffortForProfile(
  model: string,
  profile: OpenAiTaskProfile = "default"
): OpenAiReasoningEffort | undefined {
  const spec = TASK_PROFILES[profile].reasoningEffort;
  const effort = spec === "env" ? getReasoningEffortFromEnv() : spec;
  return resolveReasoningEffortForModel(model, effort);
}

export function getMaxTokensForProfile(profile: OpenAiTaskProfile = "default"): number {
  return TASK_PROFILES[profile].maxTokens;
}

export function applyChatCompletionLimits(
  body: Record<string, unknown>,
  model: string,
  maxTokens = 16384,
  profile: OpenAiTaskProfile = "default"
): Record<string, unknown> {
  const next = { ...body };
  const tokenLimit = maxTokens === 16384 ? getMaxTokensForProfile(profile) : maxTokens;

  if (modelUsesCompletionTokensParam(model)) {
    next.max_completion_tokens = tokenLimit;
  } else {
    next.temperature = 0.3;
    next.max_tokens = tokenLimit;
  }

  const effort = resolveReasoningEffortForProfile(model, profile);
  if (effort) {
    next.reasoning_effort = effort;
  }

  return next;
}

export const REASONING_EFFORT_LABELS: Record<OpenAiReasoningEffort, string> = {
  minimal: "최소",
  low: "낮음",
  medium: "보통",
  high: "높음 (Thinking에 가까움)"
};
