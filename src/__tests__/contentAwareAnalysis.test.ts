import { describe, expect, it } from "vitest";
import { buildAnalysisFromInput, parseUploadedSections } from "@/lib/contentAwareAnalysis";
import type { InventionInput } from "@/types/patentDraft";

describe("contentAwareAnalysis", () => {
  it("parses uploaded file sections from attachment text", () => {
    const sections = parseUploadedSections(
      "[발명제안서] proposal.docx\n핵심 아이디어는 자동 분석이다.\n\n[회의록] meeting.txt\n회의에서 도면 3종을 논의했다."
    );
    expect(sections).toHaveLength(2);
    expect(sections[0].fileName).toBe("proposal.docx");
    expect(sections[1].content).toContain("도면");
  });

  it("builds analysis reflecting uploaded file content", () => {
    const input: InventionInput = {
      projectName: "스마트 센서",
      inventionContent: "실내 공기질을 실시간 측정하는 IoT 센서 시스템.",
      attachmentText: "[실험데이터] lab.txt\n- 온도 센서 모듈\n- 습도 센서 모듈\n- 데이터 전송부",
      materialType: "실험데이터",
      desiredClaimCount: 3,
      desiredDrawingCount: 2,
      inventionType: "시스템 발명"
    };
    const analysis = buildAnalysisFromInput(input);
    expect(analysis.one_line_summary).toContain("IoT");
    expect(analysis.essential_elements.some((e) => e.includes("센서") || e.includes("모듈") || e.includes("전송"))).toBe(true);
    expect(analysis.data_inputs.some((d) => d.includes("lab.txt"))).toBe(true);
  });
});
