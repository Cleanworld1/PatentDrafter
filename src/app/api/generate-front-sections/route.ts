import { NextResponse } from "next/server";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import {
  generateClaimDraft,
  generateDetailedDescription,
  generateDrawingPlan,
  generateDrawingPrompts,
  generateEffects,
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
    const frontSections = generateFrontSections(
      ctx,
      claimDrafts,
      drawingPrompts,
      detailedDescription,
      means,
      effects
    );
    const workflow = mergeWorkflowState(body.workflow);
    workflow.claimDrafts = claimDrafts;
    workflow.drawingPlan = drawingPlan;
    workflow.drawingPrompts = drawingPrompts;
    workflow.detailedDescription = detailedDescription;
    workflow.frontSections = frontSections;
    workflow.workflowStep = "front_sections_done";

    return NextResponse.json({ frontSections, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "앞부분 섹션 생성 API 오류" },
      { status: 500 }
    );
  }
}
