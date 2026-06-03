import { NextResponse } from "next/server";
import { createFullDraft } from "@/lib/patentDraftService";
import type { InventionInput } from "@/types/patentDraft";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as InventionInput;
    const result = await createFullDraft(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "전체 초안 생성 API 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
