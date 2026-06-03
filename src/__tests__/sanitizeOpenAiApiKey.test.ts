import { describe, expect, it } from "vitest";
import {
  sanitizeOpenAiApiKey,
  validateOpenAiApiKeyFormat
} from "@/lib/ai/sanitizeOpenAiApiKey";

describe("sanitizeOpenAiApiKey", () => {
  it("removes Bearer prefix and whitespace", () => {
    const raw = "Bearer sk-test123\n";
    expect(sanitizeOpenAiApiKey(raw)).toBe("sk-test123");
  });

  it("warns on truncated project keys", () => {
    expect(validateOpenAiApiKeyFormat("sk-proj-short")).toMatch(/매우 깁니다/);
  });
});
