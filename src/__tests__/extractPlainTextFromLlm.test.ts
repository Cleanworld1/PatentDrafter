import { describe, expect, it } from "vitest";
import {
  extractPlainTextFromLlm,
  formatDrawingPromptJsonAsText
} from "@/lib/ai/extractPlainTextFromLlm";

describe("extractPlainTextFromLlm", () => {
  it("unwraps content field from JSON", () => {
    const raw = JSON.stringify({ content: "발명의 명칭\n본문" });
    expect(extractPlainTextFromLlm(raw)).toBe("발명의 명칭\n본문");
  });

  it("formats drawing prompt JSON as readable text", () => {
    const raw = JSON.stringify({
      title: "시스템 구성도",
      purpose: "전체 구성을 나타낸다.",
      required_elements: ["서버", "단말"],
      relative_layout: "서버 상단, 단말 하단",
      style_instruction: "흑백 선도"
    });
    const text = extractPlainTextFromLlm(raw, true);
    expect(text).toContain("시스템 구성도");
    expect(text).toContain("전체 구성을 나타낸다.");
    expect(text).toContain("서버, 단말");
    expect(text).not.toMatch(/^\s*\{/);
  });

  it("strips markdown json fences", () => {
    const inner = JSON.stringify({ text: "본문만" });
    const raw = "```json\n" + inner + "\n```";
    expect(extractPlainTextFromLlm(raw)).toBe("본문만");
  });

  it("returns plain text when not JSON", () => {
    expect(extractPlainTextFromLlm("도 1은 시스템을 나타낸다.")).toBe(
      "도 1은 시스템을 나타낸다."
    );
  });
});

describe("formatDrawingPromptJsonAsText", () => {
  it("joins title and purpose with blank line", () => {
    const text = formatDrawingPromptJsonAsText({
      title: "도면 A",
      purpose: "목적 설명"
    });
    expect(text).toBe("도면 A\n\n목적 설명");
  });
});
