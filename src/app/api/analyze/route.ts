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
    let parsed;
    try {
      parsed = await parseAnalyzeRequest(request);
    } catch (parseErr) {
      const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (/body exceeded|413|too large|payload/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              "업로드 용량이 너무 큽니다. 파일 수를 줄이거나 PDF/이미지 크기를 줄인 뒤 다시 시도해 주세요."
          },
          { status: 413 }
        );
      }
      throw parseErr;
    }

    if (parsed.kind === "materials") {
      const expected = parsed.payload.materials?.length ?? 0;
      if (expected > 0 && parsed.files.length === 0) {
        const { recordServerError } = await import("@/lib/diagnostics/serverErrorLog");
        const errMsg =
          "업로드 파일이 서버에 전달되지 않았습니다. 파일을 다시 올린 뒤 분석해 주세요. (히스토리만 불러온 경우 재업로드 필요)";
        recordServerError("api/analyze", new Error(errMsg), { expected, received: 0 });
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
      if (expected > 0 && parsed.files.length < expected) {
        const { recordServerError } = await import("@/lib/diagnostics/serverErrorLog");
        const errMsg = `업로드 파일 ${expected}개 중 ${parsed.files.length}개만 전달되었습니다. 용량·개수를 줄이거나 dev 서버를 재시작한 뒤 다시 시도해 주세요.`;
        recordServerError("api/analyze", new Error(errMsg), {
          expected,
          received: parsed.files.length
        });
        return NextResponse.json({ error: errMsg }, { status: 400 });
      }
    }
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
    return apiErrorResponse(error, "분석 API 처리 중 오류가 발생했습니다.", "api/analyze");
  }
}
