import { describe, expect, it } from "vitest";
import {
  contentToEditorHtml,
  hasRenderableHtml,
  normalizeEditorHtmlToStored,
  sanitizeSpecHtml
} from "@/lib/specEditorHtml";

describe("specEditorHtml", () => {
  it("detects table markup in stored content", () => {
    expect(hasRenderableHtml("plain text")).toBe(false);
    expect(hasRenderableHtml('<table><tr><td>a</td></tr></table>')).toBe(true);
  });

  it("wraps prose around table blocks for editor display", () => {
    const html = contentToEditorHtml(
      "해석 문단입니다.\n\n<table><caption>[표 1] 조건</caption><tr><td>1</td></tr></table>"
    );
    expect(html).toContain('class="spec-prose"');
    expect(html).toContain("<table>");
    expect(html).toContain("해석 문단");
  });

  it("strips script and unsafe tags", () => {
    const out = sanitizeSpecHtml(
      '<p>ok</p><script>alert(1)</script><table><tr onclick="x()"><td>a</td></tr></table>'
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).toContain("<table>");
    expect(out).toContain("a");
  });

  it("normalizes editor html back to text plus table", () => {
    const stored = normalizeEditorHtmlToStored(
      '<div class="spec-prose">문단</div><table><tr><td>v</td></tr></table>'
    );
    expect(stored).toContain("문단");
    expect(stored).toContain("<table>");
    expect(stored).toContain("v");
  });
});
