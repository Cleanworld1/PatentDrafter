import { NextResponse } from "next/server";
import { mergeWorkflowState, parseWorkflowJson, resolveOptions, resolveProjectName } from "@/lib/api/parseWorkflowJson";
import { deriveProtectionPoints, generateClaimDraft, toWorkflowContext } from "@/lib/workflow/patentWorkflowService";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { body } = await parseWorkflowJson(request);
    const options = resolveOptions(body);
    const ctx = toWorkflowContext(body.analysis, options, resolveProjectName(body));
    const protectionPoints = deriveProtectionPoints(ctx);
    const claimDrafts = generateClaimDraft(ctx);
    const workflow = mergeWorkflowState(body.workflow);
    workflow.protectionPoints = protectionPoints;
    workflow.claimDrafts = claimDrafts;
    workflow.workflowStep = "claims_drafted";

    return NextResponse.json({ claimDrafts, protectionPoints, workflow });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "청구항 초안 생성 API 오류" },
      { status: 500 }
    );
  }
}
