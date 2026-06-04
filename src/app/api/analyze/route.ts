import { NextResponse } from "next/server";
import { analyzeInvention, analyzeInventionMaterials } from "@/lib/patentDraftService";
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
    const resolved = resolveOpenAiCredentials(parsed.credentials);
    const useDevMock = !resolved && isDevMockWithoutKeyAllowed();

    if (!resolved && !useDevMock) {
      requireOpenAiCredentials(parsed.credentials);
    }

    if (parsed.kind === "materials") {
      if (useDevMock) {
        const { buildAnalysisFromMaterials } = await import("@/lib/contentAwareAnalysis");
        const { prepareAllMaterials } = await import("@/lib/ai/patentDraftAiService");
        const { buildLegacyInventionInput } = await import("@/lib/ai/patentDraftAiService");
        const { normalizeInventionAnalysis } = await import("@/lib/jsonSchema");
        const prepared = await prepareAllMaterials(parsed.files);
        const legacyInput = buildLegacyInventionInput(parsed.payload, prepared);
        const analysis = normalizeInventionAnalysis(
          buildAnalysisFromMaterials(parsed.payload, prepared, legacyInput)
        );
        const materials_meta = prepared.map((p) => ({
          fileId: p.fileId,
          name: p.name,
          mimeType: p.mimeType,
          extension: p.extension,
          aiInputMode: p.aiInputMode,
          fallbackUsed: p.fallbackUsed,
          analysisNotes: p.analysisNotes,
          extractedText: p.fallbackText ?? ""
        }));
        return NextResponse.json({
          invention_analysis: analysis,
          materials_meta,
          dev_mock: true,
          notice: "OpenAI API Key 없음 — 개발용 mock 분석 결과입니다."
        });
      }

      const { analyzeMaterialsWithAi } = await import("@/lib/ai/patentDraftAiService");
      const { analysis, prepared } = await analyzeMaterialsWithAi(
        parsed.payload,
        parsed.files,
        parsed.credentials
      );
      const materials_meta = prepared.map((p) => ({
        fileId: p.fileId,
        name: p.name,
        mimeType: p.mimeType,
        extension: p.extension,
        aiInputMode: p.aiInputMode,
        fallbackUsed: p.fallbackUsed,
        analysisNotes: p.analysisNotes,
        extractedText: p.fallbackText ?? ""
      }));
      return NextResponse.json({ invention_analysis: analysis, materials_meta });
    }

    const invention_analysis = await analyzeInvention(parsed.input, parsed.credentials);
    return NextResponse.json({ invention_analysis });
  } catch (error) {
    return apiErrorResponse(error, "분석 API 처리 중 오류가 발생했습니다.");
  }
}
