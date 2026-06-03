import { NextResponse } from "next/server";
import { analyzeInvention } from "@/lib/patentDraftService";
import type { InventionInput } from "@/types/patentDraft";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as InventionInput;
    const invention_analysis = await analyzeInvention(input);
    return NextResponse.json({ invention_analysis });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "분석 API 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
