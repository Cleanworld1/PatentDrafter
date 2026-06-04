import { NextResponse } from "next/server";
import { createFullDraft, createFullDraftFromMaterials } from "@/lib/patentDraftService";
import { parseAnalyzeRequest } from "@/lib/api/parseAnalyzeRequest";
import {
  isDevMockWithoutKeyAllowed,
  requireOpenAiCredentials,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const parsed = await parseAnalyzeRequest(request);

    if (parsed.kind === "materials") {
      const expected = parsed.payload.materials?.length ?? 0;
      if (expected > 0 && parsed.files.length < expected) {
        return NextResponse.json(
          {
            error: `업로드 파일 ${expected}개 중 ${parsed.files.length}개만 전달되었습니다. 용량·개수를 줄이거나 dev 서버를 재시작한 뒤 다시 시도해 주세요.`
          },
          { status: 400 }
        );
      }
    }
    const resolved = resolveOpenAiCredentials(parsed.credentials);

    if (!resolved && !isDevMockWithoutKeyAllowed()) {
      requireOpenAiCredentials(parsed.credentials);
    }

    if (parsed.kind === "materials") {
      if (!resolved && isDevMockWithoutKeyAllowed()) {
        const { executeWorkflowFromAnalysis, toWorkflowContext } = await import(
          "@/lib/workflow/patentWorkflowService"
        );
        const { assembleSpecificationFromWorkflow } = await import(
          "@/lib/workflow/assembleSpecification"
        );
        const { formatFullDraftMarkdown } = await import("@/lib/markdownFormatter");
        const { buildAnalysisFromMaterials } = await import("@/lib/contentAwareAnalysis");
        const { prepareAllMaterials, buildLegacyInventionInput } = await import(
          "@/lib/ai/patentDraftAiService"
        );
        const { normalizeInventionAnalysis } = await import("@/lib/jsonSchema");
        const prepared = await prepareAllMaterials(parsed.files);
        const legacyInput = buildLegacyInventionInput(parsed.payload, prepared);
        const analysis = normalizeInventionAnalysis(
          buildAnalysisFromMaterials(parsed.payload, prepared, legacyInput)
        );
        const ctx = toWorkflowContext(analysis, parsed.payload.options, parsed.payload.projectName);
        const workflow = await executeWorkflowFromAnalysis(ctx);
        const specification = assembleSpecificationFromWorkflow(workflow, analysis);
        const review = workflow.finalReview!;
        const base = {
          analysis,
          specification,
          claims: workflow.claimDrafts,
          drawing_prompts: workflow.drawingPrompts,
          review,
          workflow
        };
        return NextResponse.json({
          ...base,
          markdown: formatFullDraftMarkdown(base),
          dev_mock: true,
          notice: "OpenAI API Key 없음 — 개발용 mock 워크플로우 결과입니다."
        });
      }

      const result = await createFullDraftFromMaterials(
        parsed.payload,
        parsed.files,
        parsed.credentials
      );
      return NextResponse.json(result);
    }

    const result = await createFullDraft(parsed.input, parsed.credentials);
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "전체 초안 생성 API 처리 중 오류가 발생했습니다.");
  }
}
