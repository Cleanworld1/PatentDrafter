import { describe, expect, it } from "vitest";
import { emptyInventionAnalysis } from "@/lib/jsonSchema";
import {
  buildDrawingPortfolioPlan,
  extractClaimFlowSteps,
  hasMethodClaims,
  isMethodClaimText,
  resolveDrawingPortfolioSlot
} from "@/lib/drawingPortfolioPlan";
import type { ClaimDraft } from "@/types/patentDraft";

const methodClaim1: ClaimDraft = {
  claim_number: 1,
  category: "독립항",
  text: "데이터를 수신하는 단계; 상기 데이터를 분석하는 단계; 및 결과를 출력하는 단계를 포함하는 데이터 처리 방법."
};

const apparatusClaim1: ClaimDraft = {
  claim_number: 1,
  category: "독립항",
  text: "입력부, 처리부 및 출력부를 포함하는 데이터 처리 시스템."
};

const depClaim2: ClaimDraft = {
  claim_number: 2,
  category: "종속항",
  text: "청구항 1에 있어서, 상기 방법은 암호화 단계를 더 포함하는 것을 특징으로 하는 데이터 처리 방법.",
  dependency: 1
};

const depClaim3: ClaimDraft = {
  claim_number: 3,
  category: "종속항",
  text: "청구항 1에 있어서, 상기 시스템은 캐시 모듈을 더 포함하는 것을 특징으로 하는 데이터 처리 시스템.",
  dependency: 1
};

describe("drawingPortfolioPlan", () => {
  it("detects method claims", () => {
    expect(isMethodClaimText(methodClaim1.text)).toBe(true);
    expect(isMethodClaimText(apparatusClaim1.text)).toBe(false);
    expect(hasMethodClaims([methodClaim1, depClaim2])).toBe(true);
  });

  it("assigns single drawing to claim 1 flowchart", () => {
    const analysis = {
      ...emptyInventionAnalysis,
      operation_flow: ["수신", "분석", "출력"]
    };
    const slot = resolveDrawingPortfolioSlot(1, 1, [methodClaim1], analysis, "방법 발명");
    expect(slot.drawing_type).toBe("흐름도");
    expect(slot.role).toBe("claim1_flowchart");
    expect(slot.claim_support).toEqual([1]);
  });

  it("assigns two drawings to overall + claim1 flow", () => {
    const analysis = { ...emptyInventionAnalysis, operation_flow: ["수신", "분석", "출력"] };
    const claims = [methodClaim1, depClaim2];
    const plan = buildDrawingPortfolioPlan(2, claims, analysis, "시스템 발명");

    expect(plan[0].figure_number).toBe(1);
    expect(["시스템도", "구성도", "UI도", "기계 구조도"]).toContain(plan[0].drawing_type);
    expect(plan[0].title).toMatch(/전체/);

    expect(plan[1].figure_number).toBe(2);
    expect(plan[1].drawing_type).toBe("흐름도");
    expect(plan[1].title).toContain("청구항 1");
  });

  it("assigns figure 3+ to dependent flow or config", () => {
    const analysis = { ...emptyInventionAnalysis, operation_flow: ["수신", "분석"] };
    const claims = [apparatusClaim1, depClaim3, depClaim2];
    const plan = buildDrawingPortfolioPlan(4, claims, analysis, "시스템 발명");

    expect(plan[2].drawing_type).toBe("흐름도");
    expect(plan[2].claim_support).toEqual([2]);
    expect(plan[3].drawing_type).toBe("구성도");
    expect(plan[3].claim_support).toEqual([3]);
  });

  it("extracts flow steps from operation_flow", () => {
    const analysis = {
      ...emptyInventionAnalysis,
      operation_flow: ["단계A", "단계B", "단계C"]
    };
    expect(extractClaimFlowSteps(methodClaim1, analysis)).toEqual(["단계A", "단계B", "단계C"]);
  });
});
