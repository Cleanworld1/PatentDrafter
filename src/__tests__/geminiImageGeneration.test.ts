import { describe, expect, it } from "vitest";
import {
  extractImageFromGeminiResponse,
  formatGeminiApiErrorForUser
} from "@/lib/ai/geminiImageGeneration";

describe("geminiImageGeneration", () => {
  it("extracts inline image from Gemini response", () => {
    const image = extractImageFromGeminiResponse({
      candidates: [
        {
          content: {
            parts: [
              { text: "done" },
              { inlineData: { mimeType: "image/png", data: "abc123" } }
            ]
          }
        }
      ]
    });
    expect(image).toEqual({ mimeType: "image/png", dataBase64: "abc123" });
  });

  it("explains free tier quota errors in Korean", () => {
    const msg = formatGeminiApiErrorForUser(
      "Quota exceeded for generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0",
      "gemini-3.1-flash-image"
    );
    expect(msg).toContain("무료");
    expect(msg).toContain("gemini-3.1-flash-image");
    expect(msg).toContain("gemini-2.5-flash-image");
  });

  it("returns null when no image part", () => {
    expect(
      extractImageFromGeminiResponse({
        candidates: [{ content: { parts: [{ text: "only text" }] } }]
      })
    ).toBeNull();
  });
});
