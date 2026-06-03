import { NextResponse } from "next/server";
import { assembleSpecificationFromWorkflow } from "@/lib/workflow/assembleSpecification";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import {
  generateClaimDraft,
  generateDetailedDescription,
  generateDrawingPlan,
  generateDrawingPrompts,
  generateEffects,
  generateFinalReview,
  generateFrontSections,
  generateMeansForSolving,
  toWorkflowContext
} from "@/lib/workflow/patentWorkflowService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { body } = await parseWorkflowJson(request);
    const options = resolveOptions(body);
    const ctx = toWorkflowContext(body.analysis, options, resolveProjectName(body));
    const claimDrafts = body.claimDrafts ?? generateClaimDraft(ctx);
    const drawingPlan = body.drawingPlan ?? generateDrawingPlan(ctx, claimDrafts);
    const drawingPrompts = body.drawingPrompts ?? generateDrawingPrompts(ctx, drawingPlan, claimDrafts);
    const detailedDescription =
      body.detailedDescription ?? generateDetailedDescription(ctx, claimDrafts, drawingPrompts);
    const means = generateMeansForSolving(ctx, claimDrafts);
    const effects = generateEffects(ctx, claimDrafts);
    const frontSections =
      body.workflow?.frontSections ??
      generateFrontSections(ctx, claimDrafts, drawingPrompts, detailedDescription, means, effects);
    const finalReview = generateFinalReview(
      ctx,
      claimDrafts,
      drawingPrompts,
      detailedDescription,
      frontSections
    );
    const workflow = mergeWorkflowState(body.workflow);
    workflow.claimDrafts = claimDrafts;
    workflow.drawingPlan = drawingPlan;
    workflow.drawingPrompts = drawingPrompts;
    workflow.detailedDescription = detailedDescription;
    workflow.frontSections = frontSections;
    workflow.finalReview = finalReview;
    workflow.workflowStep = "final_review_done";

    const specification = assembleSpecificationFromWorkflow(workflow, body.analysis);

    return NextResponse.json({ finalReview, specification, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "최종 정합성 검토 API 오류" },
      { status: 500 }
    );
  }
}
