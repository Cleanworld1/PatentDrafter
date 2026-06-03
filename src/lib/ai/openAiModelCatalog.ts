/**
 * OpenAI Chat Completions / 멀티모달에 사용할 수 있는 모델 ID 목록.
 * 계정·지역에 따라 일부 모델은 사용 불가할 수 있으며, 고급 입력으로 직접 지정 가능합니다.
 */
export interface OpenAiModelOption {
  id: string;
  label: string;
  hint?: string;
}

export interface OpenAiModelGroup {
  label: string;
  models: OpenAiModelOption[];
}

export const OPENAI_MODEL_GROUPS: OpenAiModelGroup[] = [
  {
    label: "GPT-5 · 최신",
    models: [
      { id: "gpt-5.5", label: "GPT-5.5", hint: "최신" },
      { id: "gpt-5.4", label: "GPT-5.4", hint: "권장" },
      { id: "gpt-5.2", label: "GPT-5.2" },
      { id: "gpt-5.1", label: "GPT-5.1" },
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 Mini", hint: "빠르고 저렴" },
      { id: "gpt-5-nano", label: "GPT-5 Nano", hint: "초경량" }
    ]
  },
  {
    label: "GPT-4 · Pro급 멀티모달",
    models: [
      { id: "gpt-4.1", label: "GPT-4.1", hint: "고성능" },
      { id: "gpt-4.1-mini", label: "GPT-4.1 Mini" },
      { id: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
      { id: "gpt-4o", label: "GPT-4o", hint: "멀티모달·안정" },
      { id: "gpt-4o-mini", label: "GPT-4o Mini" },
      { id: "chatgpt-4o-latest", label: "ChatGPT-4o Latest", hint: "ChatGPT 동일 계열" }
    ]
  },
  {
    label: "추론(Reasoning) · o 시리즈",
    models: [
      { id: "o3", label: "o3", hint: "고난도 추론" },
      { id: "o3-mini", label: "o3 Mini" },
      { id: "o3-pro", label: "o3 Pro", hint: "Pro 추론" },
      { id: "o4-mini", label: "o4-mini" },
      { id: "o1", label: "o1" },
      { id: "o1-pro", label: "o1 Pro", hint: "Pro 추론" }
    ]
  }
];

export const FALLBACK_DEFAULT_MODEL = "gpt-4o";

export function flattenModelIds(): string[] {
  return OPENAI_MODEL_GROUPS.flatMap((g) => g.models.map((m) => m.id));
}

export function findModelOption(id: string): OpenAiModelOption | undefined {
  for (const group of OPENAI_MODEL_GROUPS) {
    const found = group.models.find((m) => m.id === id);
    if (found) return found;
  }
  return undefined;
}

export function formatModelOptionLabel(option: OpenAiModelOption, isSuggested?: boolean): string {
  const suffix = option.hint ? ` — ${option.hint}` : "";
  const rec = isSuggested ? " (권장)" : "";
  return `${option.label}${suffix}${rec}`;
}
