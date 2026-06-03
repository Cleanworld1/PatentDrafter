import { describe, expect, it } from "vitest";
import { sanitizeDownloadBaseName } from "@/lib/downloadTextFile";

describe("downloadTextFile", () => {
  it("sanitizes download base name", () => {
    expect(sanitizeDownloadBaseName("프로젝트/1")).toBe("프로젝트_1");
  });
});
