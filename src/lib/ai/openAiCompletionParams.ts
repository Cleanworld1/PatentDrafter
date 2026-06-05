export type OpenAiReasoningEffort = "minimal" | "low" | "medium" | "high";

const REASONING_EFFORT_VALUES: OpenAiReasoningEffort[] = ["minimal", "low", "medium", "high"];

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

export function applyChatCompletionLimits(
  body: Record<string, unknown>,
  model: string,
  maxTokens = 16384
): Record<string, unknown> {
  const next = { ...body };
  if (modelUsesCompletionTokensParam(model)) {
    next.max_completion_tokens = maxTokens;
  } else {
    next.temperature = 0.3;
    next.max_tokens = maxTokens;
  }

  const effort = resolveReasoningEffortForModel(model);
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
