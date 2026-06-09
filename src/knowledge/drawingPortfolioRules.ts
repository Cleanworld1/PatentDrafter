import {
  buildDrawingPortfolioPlan,
  resolveDrawingPortfolioSlot,
  type DrawingPortfolioRole
} from "@/lib/drawingPortfolioPlan";
import type { ClaimDraft, InventionAnalysis } from "@/types/patentDraft";

const ROLE_LABELS: Record<DrawingPortfolioRole, string> = {
  overall_system: "전체 시스템도",
  overall_config: "전체 구성도",
  claim1_flowchart: "청구항 1 흐름도",
  dependent_flowchart: "종속항 세부 흐름도",
  dependent_config: "종속항 세부 구성도"
};

export const DRAWING_PORTFOLIO_GLOBAL_RULES = `[도면 포트폴리오 — 필수]
- 도면 1~N 중 **전체 구성도 또는 전체 시스템도**가 최소 1장 포함되어야 한다(도면 2장 이상일 때 도 1).
- **방법 청구항**이 있으면 **흐름도**가 반드시 포함되어야 한다.
- **청구항 1 흐름도**: 청구항 1에 명시된 흐름 단계**만**으로 구성(청구항 1에 없는 단계·분기 금지).
- 도면 1장: 청구항 1 흐름도 1장.
- 도면 2장: 도 1=전체 구성도 또는 전체 시스템도, 도 2=청구항 1 흐름도.
- 도면 3장 이상: 도 1=전체 구성/시스템, 도 2=청구항 1 흐름도, 도 3~=종속항 세부 흐름도(방법 한정) 또는 세부 구성도(구성 한정).`;

export function getDrawingPortfolioRulesBlock(): string {
  return DRAWING_PORTFOLIO_GLOBAL_RULES;
}

export function getFigurePortfolioInstruction(
  figureNumber: number,
  drawingCount: number,
  claims: ClaimDraft[],
  analysis: InventionAnalysis,
  inventionCategory = "시스템 발명"
): string {
  const slot = resolveDrawingPortfolioSlot(
    figureNumber,
    Math.max(1, drawingCount),
    claims,
    analysis,
    inventionCategory
  );
  const roleLabel = ROLE_LABELS[slot.role];
  const steps =
    slot.flow_steps?.length && slot.flow_steps.length >= 2
      ? `\n- 포함할 흐름 단계(순서 고정): ${slot.flow_steps.join(" → ")}`
      : "";

  return (
    `[도 ${figureNumber} 역할 — ${roleLabel}]\n` +
    `- 유형: ${slot.drawing_type}\n` +
    `- 제목: ${slot.title}\n` +
    `- 목적: ${slot.purpose}\n` +
    `- 뒷받침 청구항: ${slot.claim_support.map((n) => `청구항 ${n}`).join(", ")}` +
    steps
  );
}

export function summarizeDrawingPortfolioPlan(
  drawingCount: number,
  claims: ClaimDraft[],
  analysis: InventionAnalysis,
  inventionCategory = "시스템 발명"
): string {
  const plan = buildDrawingPortfolioPlan(drawingCount, claims, analysis, inventionCategory);
  return plan
    .map(
      (p) =>
        `도 ${p.figure_number}: ${p.title} (${p.drawing_type}) — ${p.purpose.slice(0, 80)}…`
    )
    .join("\n");
}
