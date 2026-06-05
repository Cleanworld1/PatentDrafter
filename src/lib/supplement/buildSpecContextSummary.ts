import { formatChemicalEmbodimentAnalysisForPrompt } from "@/knowledge/chemicalEmbodimentContext";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type {
  ClaimDraft,
  DrawingPrompt,
  InventionAnalysis,
  SpecificationReview,
  SpecificationSection
} from "@/types/patentDraft";
import { sectionIdToTitle } from "@/types/specificationSection";

const MAX_SECTION_CHARS = 12_000;
const MAX_TOTAL_CHARS = 90_000;

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n…(이하 생략)`;
}

export function buildSpecContextSummary(
  sections: SpecificationSection[],
  claims: ClaimDraft[],
  drawingPrompts: DrawingPrompt[],
  analysis: InventionAnalysis | null,
  review: SpecificationReview | null,
  chemicalEmbodiment?: ChemicalEmbodimentAnalysis | null
): string {
  const parts: string[] = [];

  if (chemicalEmbodiment) {
    parts.push(formatChemicalEmbodimentAnalysisForPrompt(chemicalEmbodiment), "");
  }

  if (analysis) {
    parts.push(
      "=== 발명 분석 요약 ===",
      `한 줄 요약: ${analysis.one_line_summary}`,
      `핵심 아이디어: ${analysis.core_idea}`,
      `기술분야: ${analysis.technical_field}`,
      `해결 과제: ${analysis.problem_to_solve.join("; ")}`,
      ""
    );
  }

  if (review) {
    const issues = [
      ...review.claim_support_check,
      ...review.term_consistency_check,
      ...review.over_narrowing_risk,
      ...review.over_abstraction_risk
    ].filter(Boolean);
    if (issues.length) {
      parts.push("=== 정합성 검토 이슈 ===", issues.map((i) => `- ${i}`).join("\n"), "");
    }
    if (review.additional_questions.length) {
      parts.push(
        "=== 추가 확인 질문 ===",
        review.additional_questions.map((q) => `- ${q}`).join("\n"),
        ""
      );
    }
  }

  parts.push("=== 현재 명세서 본문 ===");
  let total = parts.join("\n").length;

  for (const sec of sections) {
    const title = sectionIdToTitle(sec.section_id);
    const body = clip(sec.content || "(비어 있음)", MAX_SECTION_CHARS);
    const block = `${title}\n${body}\n`;
    if (total + block.length > MAX_TOTAL_CHARS) {
      parts.push("…(명세서 일부 항목 생략 — 토큰 한도)");
      break;
    }
    parts.push(block);
    total += block.length;
  }

  parts.push(
    "=== 청구항 메타 ===",
    claims.map((c) => `청구항 ${c.claim_number} (${c.category}): ${clip(c.text, 800)}`).join("\n\n"),
    "",
    "=== 도면 프롬프트 메타 ===",
    drawingPrompts
      .map((d) => `도 ${d.figure_number}: ${d.title} — ${clip(d.purpose, 400)}`)
      .join("\n")
  );

  return parts.join("\n");
}

export function buildReviewSummary(review: SpecificationReview | null): string {
  if (!review) return "(정합성 검토 없음)";
  const lines: string[] = [];
  if (review.additional_questions.length) {
    lines.push(`추가 질문 ${review.additional_questions.length}건`);
  }
  if (review.claim_support_check.length) {
    lines.push(`청구항 지지: ${review.claim_support_check.length}건`);
  }
  if (review.term_consistency_check.length) {
    lines.push(`용어 정합: ${review.term_consistency_check.length}건`);
  }
  return lines.length ? lines.join(", ") : "특이 이슈 없음";
}
