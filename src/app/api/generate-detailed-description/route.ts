import { NextResponse } from "next/server";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import {
  generateClaimDraft,
  generateDetailedDescription,
  generateDrawingPlan,
  generateDrawingPrompts,
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
    const detailedDescription = generateDetailedDescription(ctx, claimDrafts, drawingPrompts);
    const workflow = mergeWorkflowState(body.workflow);
    workflow.claimDrafts = claimDrafts;
    workflow.drawingPlan = drawingPlan;
    workflow.drawingPrompts = drawingPrompts;
    workflow.detailedDescription = detailedDescription;
    workflow.workflowStep = "detailed_description_done";

    return NextResponse.json({ detailedDescription, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "구체적인 내용 생성 API 오류" },
      { status: 500 }
    );
  }
}
