import { afterEach, describe, expect, it } from "vitest";
import {
  applyChatCompletionLimits,
  getReasoningEffortFromEnv,
  resolveReasoningEffortForModel,
  resolveReasoningEffortForProfile
} from "@/lib/ai/openAiCompletionParams";

describe("openAiCompletionParams", () => {
  const prev = process.env.OPENAI_REASONING_EFFORT;

  afterEach(() => {
    process.env.OPENAI_REASONING_EFFORT = prev;
  });

  it("reads reasoning effort from env", () => {
    process.env.OPENAI_REASONING_EFFORT = "high";
    expect(getReasoningEffortFromEnv()).toBe("high");
  });

  it("ignores invalid reasoning effort values", () => {
    process.env.OPENAI_REASONING_EFFORT = "turbo";
    expect(getReasoningEffortFromEnv()).toBeUndefined();
  });

  it("applies reasoning_effort for gpt-5 models", () => {
    process.env.OPENAI_REASONING_EFFORT = "high";
    const body = applyChatCompletionLimits({ model: "gpt-5.4", messages: [] }, "gpt-5.4");
    expect(body.max_completion_tokens).toBe(16384);
    expect(body.reasoning_effort).toBe("high");
    expect(body.temperature).toBeUndefined();
  });

  it("skips reasoning_effort for gpt-4o", () => {
    process.env.OPENAI_REASONING_EFFORT = "high";
    const body = applyChatCompletionLimits({ model: "gpt-4o", messages: [] }, "gpt-4o");
    expect(body.max_tokens).toBe(16384);
    expect(body.reasoning_effort).toBeUndefined();
    expect(body.temperature).toBe(0.3);
  });

  it("resolves active effort only when model supports it", () => {
    process.env.OPENAI_REASONING_EFFORT = "medium";
    expect(resolveReasoningEffortForModel("o3")).toBe("medium");
    expect(resolveReasoningEffortForModel("gpt-4o")).toBeUndefined();
  });

  it("uses low reasoning for analyze profile even when env is high", () => {
    process.env.OPENAI_REASONING_EFFORT = "high";
    const body = applyChatCompletionLimits({ model: "gpt-5.4", messages: [] }, "gpt-5.4", 16384, "analyze");
    expect(body.reasoning_effort).toBe("low");
    expect(body.max_completion_tokens).toBe(24576);
  });

  it("uses env reasoning for draft profile", () => {
    process.env.OPENAI_REASONING_EFFORT = "high";
    const body = applyChatCompletionLimits({ model: "gpt-5.4", messages: [] }, "gpt-5.4", 16384, "draft");
    expect(body.reasoning_effort).toBe("high");
    expect(resolveReasoningEffortForProfile("gpt-5.4", "analyze")).toBe("low");
  });
});
