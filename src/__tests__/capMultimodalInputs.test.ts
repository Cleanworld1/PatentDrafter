import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/fileInput/fallbackExtractText", () => ({
  fallbackExtractText: vi.fn(async () => "추출된 본문 텍스트")
}));

import { capMultimodalPreparedInputs } from "@/lib/fileInput/capMultimodalInputs";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";

function pdfPrepared(id: string, name: string): PreparedAiInput {
  return {
    fileId: id,
    name,
    mimeType: "application/pdf",
    extension: ".pdf",
    size: 1000,
    sourceType: "발명제안서",
    aiInputMode: "pdf_input",
    buffer: Buffer.from("%PDF-1.4 minimal"),
    fallbackUsed: false,
    analysisNotes: "pdf"
  };
}

describe("capMultimodalPreparedInputs", () => {
  it("keeps first PDF native and converts second to fallback", async () => {
    const capped = await capMultimodalPreparedInputs([
      pdfPrepared("a", "a.pdf"),
      pdfPrepared("b", "b.pdf")
    ]);
    expect(capped[0]!.fallbackUsed).toBe(false);
    expect(capped[1]!.fallbackUsed).toBe(true);
    expect(capped[1]!.fallbackText?.length).toBeGreaterThan(0);
  });
});
