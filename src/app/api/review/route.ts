import { NextResponse } from "next/server";
import { reviewSpecification } from "@/lib/patentDraftService";
import type { SpecificationDraft } from "@/types/patentDraft";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { specification: SpecificationDraft };
    const review = await reviewSpecification(body.specification);
    return NextResponse.json({ review });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "정합성 검토 API 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
