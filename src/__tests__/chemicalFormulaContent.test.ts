import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  registerChemicalFormulaObjectUrl,
  clearChemicalFormulaObjectUrls
} from "@/lib/client/chemicalFormulaImageRegistry";
import {
  ensureChemicalFormulaLabels,
  resolveChemImgSrcInContent,
  revertChemImgSrcInContent
} from "@/lib/chemicalFormulaContent";
import { contentToEditorHtml, normalizeEditorHtmlToStored } from "@/lib/specEditorHtml";

describe("chemicalFormulaContent", () => {
  afterEach(() => {
    clearChemicalFormulaObjectUrls();
  });

  it("ensures [화학식 N] line before img", () => {
    const raw = `<img src="chemimg:abc" alt="화학식 1" class="chem-formula-img">`;
    const out = ensureChemicalFormulaLabels(raw);
    expect(out).toMatch(/\[화학식 1\]\s*\n<img/);
  });

  it("resolves chemimg to blob url for editor and reverts on save", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "formula.png", { type: "image/png" });
    registerChemicalFormulaObjectUrl("abc", file);
    const stored = `[화학식 1]\n<img src="chemimg:abc" alt="화학식 1" class="chem-formula-img">`;
    const html = contentToEditorHtml(stored);
    expect(html).toContain("blob:");
    const roundTrip = normalizeEditorHtmlToStored(html);
    expect(roundTrip).toContain('src="chemimg:abc"');
    expect(roundTrip).toContain("[화학식 1]");
  });
});
