import { NextResponse } from "next/server";
import { analyzeInvention, analyzeInventionMaterials } from "@/lib/patentDraftService";
import { parseAnalyzeRequest } from "@/lib/api/parseAnalyzeRequest";
import {
  isDevMockWithoutKeyAllowed,
  requireOpenAiCredentials,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import { getAnalyzeOpenAiTimeoutMs } from "@/lib/ai/analyzeTimeout";
import { runWithServerlessTimeout } from "@/lib/ai/fetchWithTimeout";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_BODY_BYTES = 4.5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const bytes = Number(contentLength);
      if (Number.isFinite(bytes) && bytes > MAX_BODY_BYTES) {
        return NextResponse.json(
          {
            error:
              "업로드 용량이 Vercel 서버 한도(약 4.5MB)를 초과했습니다. 파일을 줄이거나 텍스트만 입력해 주세요.",
            code: "PAYLOAD_TOO_LARGE"
          },
          { status: 413 }
        );
      }
    }

    return await runWithServerlessTimeout("발명 분석", getAnalyzeOpenAiTimeoutMs(), async () => {
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
    });
  } catch (error) {
    return apiErrorResponse(error, "분석 API 처리 중 오류가 발생했습니다.");
  }
}
