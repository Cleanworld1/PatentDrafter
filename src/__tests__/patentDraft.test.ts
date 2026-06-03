import { describe, expect, it } from "vitest";
import { parseJsonWithFallback, normalizeInventionAnalysis } from "@/lib/jsonSchema";
import { formatSpecificationMarkdown } from "@/lib/markdownFormatter";
import { createFullDraft } from "@/lib/patentDraftService";
import type { InventionInput, SpecificationDraft } from "@/types/patentDraft";

const spec: SpecificationDraft = {
  invention_title: "테스트 발명",
  technical_field: "기술분야",
  background_art: "배경기술",
  problems_to_solve: "과제",
  means_for_solving: "수단",
  effects: "효과",
  brief_description_of_drawings: "도면 설명",
  detailed_description: "상세 설명",
  summary: "요약",
  representative_drawing: "도 1",
  claims: [{ claim_number: 1, category: "독립항", text: "청구항 1 텍스트" }],
  drawing_prompts: [{ figure_number: 1, title: "시스템도", drawing_type: "시스템도", purpose: "목적", required_elements: [], relative_layout: "배치", arrows_or_connections: "화살표", reference_number_guidance: "부호", style_instruction: "특허 명세서용 흑백 선도" }]
};

const input: InventionInput = {
  projectName: "테스트 프로젝트",
  inventionContent: "회의록과 사업계획서에서 발명의 핵심 구성을 추출하여 명세서 초안을 생성한다.",
  attachmentText: "자료 유형 판별, 발명 분석표 생성, 청구항과 도면 프롬프트 생성.",
  materialType: "발명제안서",
  desiredClaimCount: 3,
  desiredDrawingCount: 2,
  inventionType: "시스템 발명"
};

describe("patent draft MVP", () => {
  it("markdownFormatter가 명세서 결과를 올바른 순서로 출력한다", () => {
    const markdown = formatSpecificationMarkdown(spec);
    expect(markdown.indexOf("【발명의 명칭】")).toBeLessThan(markdown.indexOf("【기술분야】"));
    expect(markdown.indexOf("【청구항 1】")).toBeLessThan(markdown.indexOf("【요약】"));
    expect(markdown.indexOf("【대표도】")).toBeLessThan(markdown.indexOf("【도 1】"));
  });

  it("LLM 응답 JSON 파싱 실패 시 graceful fallback이 된다", () => {
    const parsed = parseJsonWithFallback("not-json", { ok: false });
    expect(parsed.data).toEqual({ ok: false });
    expect(parsed.raw).toBe("not-json");
    expect(parsed.error).toBeTruthy();
  });

  it("InventionAnalysis 필수 필드가 누락되었을 때 기본값을 채운다", () => {
    const normalized = normalizeInventionAnalysis({ technical_field: "AI" });
    expect(normalized.technical_field).toBe("AI");
    expect(normalized.title_candidates).toEqual([]);
    expect(normalized.do_not_invent).toEqual([]);
  });

  it("full-draft 서비스가 analyze → generate-spec → review 산출물을 순서대로 만든다", async () => {
    const result = await createFullDraft(input);
    expect(result.analysis.core_idea).toBeTruthy();
    expect(result.claims).toHaveLength(3);
    expect(result.drawing_prompts).toHaveLength(2);
    expect(result.review.additional_questions.length).toBeGreaterThan(0);
    expect(result.markdown).toContain("발명 분석표");
  });
});
