import { NextResponse } from "next/server";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import { generateClaimDraft, generateDrawingPlan, toWorkflowContext } from "@/lib/workflow/patentWorkflowService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { body } = await parseWorkflowJson(request);
    const options = resolveOptions(body);
    const ctx = toWorkflowContext(body.analysis, options, resolveProjectName(body));
    const claimDrafts = body.claimDrafts ?? generateClaimDraft(ctx);
    const drawingPlan = generateDrawingPlan(ctx, claimDrafts);
    const workflow = mergeWorkflowState(body.workflow);
    workflow.claimDrafts = claimDrafts;
    workflow.drawingPlan = drawingPlan;
    workflow.workflowStep = "drawings_planned";

    return NextResponse.json({ drawingPlan, claimDrafts, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "도면 구성 기획 API 오류" },
      { status: 500 }
    );
  }
}
