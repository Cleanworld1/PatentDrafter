import type { ClaimDraft, DrawingPrompt, InventionAnalysis } from "@/types/patentDraft";
import type { DrawingPlanItem } from "@/types/patentWorkflow";

export type DrawingPortfolioRole =
  | "claim1_flowchart"
  | "overall_system"
  | "overall_config"
  | "dependent_flowchart"
  | "dependent_config";

export interface DrawingPortfolioSlot {
  figure_number: number;
  role: DrawingPortfolioRole;
  title: string;
  purpose: string;
  drawing_type: DrawingPrompt["drawing_type"];
  required_elements: string[];
  claim_support: number[];
  flow_steps?: string[];
}

const METHOD_CLAIM_PATTERN =
  /방법|단계|포함하는\s*단계|단계를\s*포함|단계\s*중|수행하는\s*단계|처리\s*단계/i;

export function isMethodClaimText(text: string): boolean {
  return METHOD_CLAIM_PATTERN.test(text);
}

export function hasMethodClaims(claims: ClaimDraft[]): boolean {
  return claims.some((c) => isMethodClaimText(c.text));
}

export function extractClaimFlowSteps(
  claim: ClaimDraft,
  analysis: InventionAnalysis
): string[] {
  const fromAnalysis = analysis.operation_flow.filter(Boolean).slice(0, 8);
  if (fromAnalysis.length >= 2) return fromAnalysis;

  const numbered = [...claim.text.matchAll(/(?:단계\s*)?(?:S)?(\d+)[.)]\s*([^.;]+)/gi)].map(
    (m) => m[2].trim()
  );
  if (numbered.length >= 2) return numbered;

  const segments = claim.text
    .split(/[,;]|(?:을|를)\s*(?:포함|수행|실행|제공|전송|수신|판별|생성|검토)/)
    .map((s) => s.replace(/^[\s,;]+|[\s,;]+$/g, ""))
    .filter((s) => s.length >= 4 && s.length <= 80);

  if (segments.length >= 2) return segments.slice(0, 7);

  return fromAnalysis.length ? fromAnalysis : [claim.text.slice(0, 120)];
}

function pickOverallType(category: string, analysis: InventionAnalysis): DrawingPrompt["drawing_type"] {
  const text = `${category} ${analysis.technical_field} ${analysis.core_idea}`.toLowerCase();
  if (text.includes("ui") || text.includes("화면")) return "UI도";
  if (text.includes("기계") || text.includes("장치") || text.includes("부품")) return "기계 구조도";
  if (text.includes("구성") && !text.includes("시스템")) return "구성도";
  return "시스템도";
}

function overallRoleForType(type: DrawingPrompt["drawing_type"]): DrawingPortfolioRole {
  return type === "구성도" || type === "기계 구조도" ? "overall_config" : "overall_system";
}

function dependentRoleForClaim(claim: ClaimDraft | undefined): DrawingPortfolioRole {
  if (!claim) return "dependent_config";
  return isMethodClaimText(claim.text) ? "dependent_flowchart" : "dependent_config";
}

function dependentDrawingType(role: DrawingPortfolioRole): DrawingPrompt["drawing_type"] {
  return role === "dependent_flowchart" ? "흐름도" : "구성도";
}

function claimForFigure(figureNumber: number, claimCount: number): number {
  if (figureNumber <= 2) return Math.min(figureNumber, claimCount);
  const target = figureNumber - 1;
  return Math.min(Math.max(2, target), claimCount);
}

function titleForRole(
  role: DrawingPortfolioRole,
  figureNumber: number,
  claimNumber: number,
  overallType: DrawingPrompt["drawing_type"]
): string {
  switch (role) {
    case "claim1_flowchart":
      return figureNumber === 1 && claimNumber === 1
        ? "청구항 1 방법 흐름도"
        : "청구항 1 흐름도";
    case "overall_system":
      return "전체 시스템 구성도";
    case "overall_config":
      return overallType === "기계 구조도" ? "전체 장치 구성도" : "전체 구성도";
    case "dependent_flowchart":
      return `청구항 ${claimNumber} 세부 단계 흐름도`;
    case "dependent_config":
      return `청구항 ${claimNumber} 세부 구성도`;
    default:
      return `도면 ${figureNumber}`;
  }
}

function purposeForSlot(slot: Omit<DrawingPortfolioSlot, "title" | "purpose"> & { claim?: ClaimDraft }): string {
  const steps = slot.flow_steps?.length
    ? `흐름 단계(청구항 기재 순서): ${slot.flow_steps.join(" → ")}. `
    : "";

  switch (slot.role) {
    case "claim1_flowchart":
      return `${steps}청구항 1에 명시된 흐름 단계만으로 구성된 흐름도. 청구항 1에 없는 단계·분기는 넣지 않는다.`;
    case "overall_system":
      return "발명 전체의 주요 구성요소, 모듈, 데이터·제어 연결을 한눈에 보이는 전체 시스템도.";
    case "overall_config":
      return "발명 전체의 물리·논리 구성요소와 결합·배치 관계를 보이는 전체 구성도.";
    case "dependent_flowchart":
      return `${steps}청구항 ${slot.claim_support[0]}에서 추가·한정된 세부 처리 단계만을 도시하는 흐름도.`;
    case "dependent_config":
      return `청구항 ${slot.claim_support[0]}에서 추가·한정된 세부 구성요소와 결합 관계를 도시하는 구성도.`;
    default:
      return "명세서 청구항을 뒷받침하는 도면.";
  }
}

export function resolveDrawingPortfolioSlot(
  figureNumber: number,
  drawingCount: number,
  claims: ClaimDraft[],
  analysis: InventionAnalysis,
  inventionCategory: string
): DrawingPortfolioSlot {
  const claimCount = Math.max(1, claims.length);
  const claim1 = claims.find((c) => c.claim_number === 1) ?? claims[0];
  const overallType = pickOverallType(inventionCategory, analysis);
  const claim1Steps = extractClaimFlowSteps(claim1, analysis);

  if (drawingCount <= 1) {
    return {
      figure_number: 1,
      role: "claim1_flowchart",
      title: titleForRole("claim1_flowchart", 1, 1, overallType),
      purpose: purposeForSlot({
        figure_number: 1,
        role: "claim1_flowchart",
        drawing_type: "흐름도",
        required_elements: claim1Steps,
        claim_support: [1],
        flow_steps: claim1Steps
      }),
      drawing_type: "흐름도",
      required_elements: claim1Steps.slice(0, 7),
      claim_support: [1],
      flow_steps: claim1Steps
    };
  }

  if (figureNumber === 1) {
    const role = overallRoleForType(overallType);
    return {
      figure_number: 1,
      role,
      title: titleForRole(role, 1, 1, overallType),
      purpose: purposeForSlot({
        figure_number: 1,
        role,
        drawing_type: overallType,
        required_elements: analysis.essential_elements.slice(0, 8),
        claim_support: [1]
      }),
      drawing_type: overallType,
      required_elements: analysis.essential_elements.slice(0, 8),
      claim_support: [1]
    };
  }

  if (figureNumber === 2) {
    return {
      figure_number: 2,
      role: "claim1_flowchart",
      title: titleForRole("claim1_flowchart", 2, 1, overallType),
      purpose: purposeForSlot({
        figure_number: 2,
        role: "claim1_flowchart",
        drawing_type: "흐름도",
        required_elements: claim1Steps,
        claim_support: [1],
        flow_steps: claim1Steps
      }),
      drawing_type: "흐름도",
      required_elements: claim1Steps.slice(0, 7),
      claim_support: [1],
      flow_steps: claim1Steps
    };
  }

  const claimNum = claimForFigure(figureNumber, claimCount);
  const claim = claims.find((c) => c.claim_number === claimNum);
  const role = dependentRoleForClaim(claim);
  const drawing_type = dependentDrawingType(role);
  const steps =
    role === "dependent_flowchart" && claim
      ? extractClaimFlowSteps(claim, analysis)
      : claim
        ? [claim.text.slice(0, 200)]
        : [];

  return {
    figure_number: figureNumber,
    role,
    title: titleForRole(role, figureNumber, claimNum, overallType),
    purpose: purposeForSlot({
      figure_number: figureNumber,
      role,
      drawing_type,
      required_elements: steps,
      claim_support: [claimNum],
      flow_steps: role === "dependent_flowchart" ? steps : undefined,
      claim
    }),
    drawing_type,
    required_elements:
      role === "dependent_flowchart"
        ? steps.slice(0, 7)
        : analysis.essential_elements.slice(0, 6),
    claim_support: [claimNum],
    flow_steps: role === "dependent_flowchart" ? steps : undefined
  };
}

export function buildDrawingPortfolioPlan(
  drawingCount: number,
  claims: ClaimDraft[],
  analysis: InventionAnalysis,
  inventionCategory: string
): DrawingPlanItem[] {
  const count = Math.max(1, drawingCount);
  return Array.from({ length: count }, (_, i) => {
    const slot = resolveDrawingPortfolioSlot(i + 1, count, claims, analysis, inventionCategory);
    return {
      figure_number: slot.figure_number,
      title: slot.title,
      purpose: slot.purpose,
      drawing_type: slot.drawing_type,
      required_elements: slot.required_elements,
      claim_support: slot.claim_support
    };
  });
}

export function layoutHintForRole(role: DrawingPortfolioRole): string {
  switch (role) {
    case "claim1_flowchart":
    case "dependent_flowchart":
      return "상단에서 하단(또는 좌에서 우)으로 청구항 흐름 단계 순서대로 배치. 마름모는 조건·분기만 짧게.";
    case "overall_system":
      return "좌측 입력·단말, 중앙 처리·서버, 우측 출력·DB를 배치하고 네트워크 연결을 표시.";
    case "overall_config":
      return "주요 구성요소를 박스로 배치하고 결합·데이터 연결을 화살표로 표시.";
    case "dependent_config":
      return "종속항에서 추가된 구성요소를 강조하고 기존 구성과의 결합 관계를 표시.";
    default:
      return "주요 구성요소를 박스로 표시하고 처리 순서대로 화살표를 연결한다.";
  }
}
