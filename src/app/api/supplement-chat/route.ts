import { NextResponse } from "next/server";
import { parseOpenAiFromFormData } from "@/lib/api/parseOpenAiCredentials";
import { apiErrorResponse } from "@/lib/api/apiRouteErrors";
import { runSupplementChat } from "@/lib/supplement/runSupplementChat";
import type { SupplementChatRequestPayload } from "@/types/supplementChat";
import type { IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";
import { MATERIAL_TYPES } from "@/types/patentDraft";
import type { MaterialType } from "@/types/patentDraft";

export const runtime = "nodejs";
export const maxDuration = 300;

function parsePayload(raw: FormDataEntryValue | null): SupplementChatRequestPayload | null {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as SupplementChatRequestPayload;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const credentials = parseOpenAiFromFormData(formData);
    const payload = parsePayload(formData.get("payload"));
    const userMessage = formData.get("userMessage");

    if (!payload) {
      return NextResponse.json({ error: "payload가 필요합니다." }, { status: 400 });
    }
    if (typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "userMessage가 필요합니다." }, { status: 400 });
    }

    const files: IncomingMaterialFile[] = [];
    for (const meta of payload.materials ?? []) {
      const entry = formData.get(meta.fileId);
      if (!entry || !(entry instanceof File)) continue;
      const buffer = Buffer.from(await entry.arrayBuffer());
      const materialType = MATERIAL_TYPES.includes(meta.materialType as MaterialType)
        ? (meta.materialType as MaterialType)
        : "기타";
      files.push({
        fileId: meta.fileId,
        buffer,
        name: entry.name || meta.name,
        mimeType: entry.type || meta.mimeType,
        size: entry.size || meta.size,
        materialType
      });
    }

    const result = await runSupplementChat(
      payload,
      userMessage.trim(),
      files,
      credentials
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error, "보완 채팅 처리 중 오류가 발생했습니다.", "api/supplement-chat");
  }
}
