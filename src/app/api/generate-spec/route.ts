import { NextResponse } from "next/server";
import { generateSpecification } from "@/lib/patentDraftService";
import type { GenerateSpecOptions, InventionAnalysis } from "@/types/patentDraft";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { analysis: InventionAnalysis; options: GenerateSpecOptions };
    const result = await generateSpecification(body.analysis, body.options);
    return NextResponse.json({ specification: result.specification, markdown: result.markdown });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "명세서 생성 API 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
