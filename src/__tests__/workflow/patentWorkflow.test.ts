import { describe, expect, it } from "vitest";
import { buildAnalysisFromInput } from "@/lib/contentAwareAnalysis";
import { assembleSpecificationFromWorkflow } from "@/lib/workflow/assembleSpecification";
import {
  executeWorkflowFromAnalysis,
  generateClaimDraft,
  generateDetailedDescription,
  generateDrawingPrompts,
  generateDrawingPlan,
  reviewClaimDrawingConsistency,
  toWorkflowContext
} from "@/lib/workflow/patentWorkflowService";
import type { DraftOptions, InventionInput } from "@/types/patentDraft";
import { createEmptyWorkflowState } from "@/types/patentWorkflow";

const defaultOptions: DraftOptions = {
  claimCount: 3,
  drawingCount: 3,
  inventionType: "시스템 발명",
  detailLevel: "normal",
  claimStyle: "balanced",
  autoRecommendDrawingType: true,
  generateAdditionalQuestions: true
};

function sampleInput(projectName: string, content: string): InventionInput {
  return {
    projectName,
    inventionContent: content,
    attachmentText: "",
    materialType: "발명제안서",
    desiredClaimCount: defaultOptions.claimCount,
    desiredDrawingCount: defaultOptions.drawingCount,
    inventionType: defaultOptions.inventionType
  };
}

describe("patent workflow", () => {
  it("writes claims before detailed description", async () => {
    const analysis = buildAnalysisFromInput(
      sampleInput("테스트", "데이터 기반 추천 시스템. 서버와 단말이 연동하며 실시간 학습으로 추천 정확도를 개선한다.")
    );
    const ctx = toWorkflowContext(analysis, defaultOptions, "테스트");
    const claims = generateClaimDraft(ctx);
    const plan = generateDrawingPlan(ctx, claims);
    const prompts = generateDrawingPrompts(ctx, plan, claims);
    const detailed = generateDetailedDescription(ctx, claims, prompts);

    expect(claims.length).toBe(3);
    expect(prompts.length).toBe(3);
    expect(detailed).toContain("도 1");
    expect(detailed.length).toBeGreaterThan(claims[0].text.length);
  });

  it("runs full workflow to final_review_done", async () => {
    const analysis = buildAnalysisFromInput(sampleInput("워크플로우", "AI 기반 데이터 처리 시스템"));
    const ctx = toWorkflowContext(analysis, defaultOptions, "워크플로우");
    const workflow = await executeWorkflowFromAnalysis(ctx);

    expect(workflow.workflowStep).toBe("final_review_done");
    expect(workflow.claimDrafts.length).toBeGreaterThan(0);
    expect(workflow.drawingPrompts.length).toBe(3);
    expect(workflow.detailedDescription).toBeTruthy();
    expect(workflow.frontSections?.technical_field).toBeTruthy();
    expect(workflow.finalReview).not.toBeNull();
  });

  it("assembles specification in final TOC order", async () => {
    const analysis = buildAnalysisFromInput(sampleInput("순서", "연동 시스템 발명"));
    const ctx = toWorkflowContext(analysis, defaultOptions, "순서");
    const workflow = await executeWorkflowFromAnalysis(ctx);
    const spec = assembleSpecificationFromWorkflow(workflow, analysis);

    expect(spec.detailed_description).toBe(workflow.detailedDescription);
    expect(spec.claims).toEqual(workflow.claimDrafts);
    expect(spec.brief_description_of_drawings).toContain("도 1");
  });

  it("review flags claim-drawing consistency", () => {
    const analysis = buildAnalysisFromInput(sampleInput("검토", "방법 발명의 처리 단계"));
    const ctx = toWorkflowContext(analysis, defaultOptions, "검토");
    const claims = generateClaimDraft(ctx);
    const prompts = generateDrawingPrompts(ctx, generateDrawingPlan(ctx, claims), claims);
    const review = reviewClaimDrawingConsistency(ctx, claims, prompts);

    expect(review.claim_support_check.length).toBeGreaterThan(0);
    expect(review.term_consistency_check.length).toBeGreaterThan(0);
  });

  it("empty workflow state starts at input", () => {
    const w = createEmptyWorkflowState();
    expect(w.workflowStep).toBe("input");
  });
});
