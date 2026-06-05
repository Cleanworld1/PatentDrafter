import { NextResponse } from "next/server";
import { analyzeInventionMaterials } from "@/lib/patentDraftService";
import { deriveProtectionPoints, inferInventionCategory, toWorkflowContext } from "@/lib/workflow/patentWorkflowService";
import { parseAnalyzeRequest } from "@/lib/api/parseAnalyzeRequest";
import { resolveOptions } from "@/lib/api/parseWorkflowJson";
import { createEmptyWorkflowState } from "@/types/patentWorkflow";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const parsed = await parseAnalyzeRequest(request);
    requireOpenAiCredentials(parsed.credentials);

    if (parsed.kind === "materials") {
      const analysis = await analyzeInventionMaterials(
        parsed.payload,
        parsed.files,
        parsed.credentials
      );
      const ctx = toWorkflowContext(
        analysis,
        parsed.payload.options,
        parsed.payload.projectName
      );
      const protectionPoints = deriveProtectionPoints(ctx);
      const workflow = {
        ...createEmptyWorkflowState(),
        workflowStep: "analyzed" as const,
        inventionCategory: inferInventionCategory(ctx),
        protectionPoints
      };
      return NextResponse.json({
        invention_analysis: analysis,
        protection_points: protectionPoints,
        workflow
      });
    }

    const { analyzeInvention } = await import("@/lib/patentDraftService");
    const analysis = await analyzeInvention(parsed.input, parsed.credentials);
    const options = resolveOptions({ analysis, options: undefined });
    const ctx = toWorkflowContext(analysis, options, parsed.input.projectName);
    const protectionPoints = deriveProtectionPoints(ctx);

    return NextResponse.json({
      invention_analysis: analysis,
      protection_points: protectionPoints,
      workflow: {
        ...createEmptyWorkflowState(),
        workflowStep: "analyzed",
        protectionPoints
      }
    });
  } catch (error) {
    return apiErrorResponse(error, "자료 분석 API 오류");
  }
}
