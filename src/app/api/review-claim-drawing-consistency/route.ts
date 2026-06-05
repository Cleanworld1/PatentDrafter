import { NextResponse } from "next/server";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import {
  generateClaimDraft,
  generateDrawingPlan,
  generateDrawingPrompts,
  reviewClaimDrawingConsistency,
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
    const claimDrawingReview = reviewClaimDrawingConsistency(ctx, claimDrafts, drawingPrompts);
    const workflow = mergeWorkflowState(body.workflow);
    workflow.claimDrafts = claimDrafts;
    workflow.drawingPlan = drawingPlan;
    workflow.drawingPrompts = drawingPrompts;
    workflow.claimDrawingReview = claimDrawingReview;
    workflow.workflowStep = "claim_drawing_reviewed";

    return NextResponse.json({ claimDrawingReview, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "청구항·도면 정합성 검토 API 오류" },
      { status: 500 }
    );
  }
}
