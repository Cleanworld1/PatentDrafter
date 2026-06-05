import { NextResponse } from "next/server";
import { parseAnalyzeRequest } from "@/lib/api/parseAnalyzeRequest";
import {
  isDevMockWithoutKeyAllowed,
  requireOpenAiCredentials,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import { analyzeChemicalEmbodimentsOrMock } from "@/lib/ai/analyzeChemicalEmbodiments";
import { normalizeChemicalEmbodimentAnalysis, normalizeInventionAnalysis } from "@/lib/jsonSchema";
import type { InventionAnalysis } from "@/types/patentDraft";
import { isChemicalInventionEnabled } from "@/knowledge/chemicalInventionRules";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const parsed = await parseAnalyzeRequest(request);
    if (parsed.kind !== "materials") {
      return NextResponse.json(
        { error: "실시예/비교예 분석은 자료 업로드(multipart) 분석 후에만 실행할 수 있습니다." },
        { status: 400 }
      );
    }

    if (!isChemicalInventionEnabled(parsed.payload.options.chemicalInventionEnabled)) {
      return NextResponse.json(
        { error: "화학 발명 옵션이 활성화되어 있지 않습니다." },
        { status: 400 }
      );
    }

    const analysisRaw = (parsed.payload as { invention_analysis?: InventionAnalysis })
      .invention_analysis;
    if (!analysisRaw) {
      return NextResponse.json(
        { error: "1단계 invention_analysis가 필요합니다." },
        { status: 400 }
      );
    }

    const invention_analysis = normalizeInventionAnalysis(analysisRaw);
    const resolved = resolveOpenAiCredentials(parsed.credentials);
    const useDevMock = !resolved && isDevMockWithoutKeyAllowed();

    if (!resolved && !useDevMock) {
      requireOpenAiCredentials(parsed.credentials);
    }

    const chemical_embodiment_analysis = normalizeChemicalEmbodimentAnalysis(
      await analyzeChemicalEmbodimentsOrMock(
        { ...parsed.payload, invention_analysis },
        parsed.files,
        parsed.credentials,
        useDevMock
      )
    );

    return NextResponse.json({
      chemical_embodiment_analysis,
      ...(useDevMock
        ? {
            dev_mock: true,
            notice: "OpenAI API Key 없음 — 개발용 mock 실시예/비교예 분석입니다."
          }
        : {})
    });
  } catch (error) {
    return apiErrorResponse(
      error,
      "실시예/비교예 분석 처리 중 오류가 발생했습니다.",
      "api/analyze-chemical-embodiments"
    );
  }
}
