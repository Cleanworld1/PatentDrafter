import { NextResponse } from "next/server";
import { extractTextFromBuffer, MAX_UPLOAD_BYTES } from "@/lib/server/fileParser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "파일이 필요합니다." }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_UPLOAD_BYTES / 1024 / 1024}MB 이하여야 합니다.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.name);

    return NextResponse.json({
      fileName: file.name,
      text,
      charCount: text.length
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "파일 텍스트 추출 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
