import { describe, expect, it, afterEach } from "vitest";
import {
  getServerEnvApiKey,
  isServerOpenAiConfigured,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import { redactApiKeys } from "@/lib/ai/sanitizeAiError";

describe("OpenAI env credentials", () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevModel = process.env.OPENAI_MODEL;
  const prevProject = process.env.OPENAI_PROJECT_ID;

  afterEach(() => {
    process.env.OPENAI_API_KEY = prevKey;
    process.env.OPENAI_MODEL = prevModel;
    process.env.OPENAI_PROJECT_ID = prevProject;
  });

  it("returns null when OPENAI_API_KEY is missing", () => {
    delete process.env.OPENAI_API_KEY;
    expect(resolveOpenAiCredentials()).toBeNull();
    expect(isServerOpenAiConfigured()).toBe(false);
  });

  it("uses .env.local key and scope only; ignores client model", () => {
    process.env.OPENAI_API_KEY = "sk-test-env-key-1234567890";
    process.env.OPENAI_MODEL = "gpt-4o";
    process.env.OPENAI_PROJECT_ID = "proj_test";
    const resolved = resolveOpenAiCredentials({ model: "gpt-5.1" });
    expect(resolved?.apiKey).toBe(getServerEnvApiKey());
    expect(resolved?.source).toBe("server_env");
    expect(resolved?.model).toBe("gpt-4o");
    expect(resolved?.projectId).toBe("proj_test");
  });

  it("defaults model from OPENAI_MODEL", () => {
    process.env.OPENAI_API_KEY = "sk-test-env-key-1234567890";
    process.env.OPENAI_MODEL = "gpt-4.1";
    const resolved = resolveOpenAiCredentials();
    expect(resolved?.model).toBe("gpt-4.1");
  });

  it("redacts api keys from error text", () => {
    const text = redactApiKeys("failed with sk-abcdefghijklmnopqrstuvwxyz123456");
    expect(text).not.toContain("sk-abcdefghijklmnopqrstuvwxyz123456");
    expect(text).toContain("sk-***");
  });
});
