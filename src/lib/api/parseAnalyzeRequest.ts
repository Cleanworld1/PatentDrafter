import "server-only";

import { parseOpenAiFromFormData, parseOpenAiFromJsonBody } from "@/lib/api/parseOpenAiCredentials";
import type { IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";
import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import type { DraftOptions, MaterialType, TextInputs } from "@/types/patentDraft";
import { INVENTION_TYPES, MATERIAL_TYPES } from "@/types/patentDraft";
import type { InventionInput } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";

export type ParsedAnalyzeRequest =
  | {
      kind: "materials";
      payload: AnalyzeMaterialsPayload;
      files: IncomingMaterialFile[];
      credentials: OpenAiCredentialInput;
    }
  | { kind: "legacy"; input: InventionInput; credentials: OpenAiCredentialInput };

function parseJsonField<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function defaultTextInputs(): TextInputs {
  return {
    overview: "",
    coreIdea: "",
    existingProblems: "",
    differentiators: "",
    embodimentNotes: "",
    otherNotes: ""
  };
}

function defaultOptions(): DraftOptions {
  return {
    claimCount: 5,
    drawingCount: 5,
    inventionType: "자동 판단",
    detailLevel: "normal",
    claimStyle: "balanced",
    autoRecommendDrawingType: true,
    generateAdditionalQuestions: true
  };
}

export async function parseAnalyzeRequest(request: Request): Promise<ParsedAnalyzeRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    const body = (await request.json()) as InventionInput & Record<string, unknown>;
    const credentials = parseOpenAiFromJsonBody(body);
    const input = body as InventionInput;
    return { kind: "legacy", input, credentials };
  }

  const formData = await request.formData();
  const credentials = parseOpenAiFromFormData(formData);
  const payloadRaw = formData.get("payload");
  const payload = parseJsonField<AnalyzeMaterialsPayload>(
    typeof payloadRaw === "string" ? payloadRaw : null,
    {
      task: "analyze_invention_materials",
      projectName: "새 명세서",
      userTextInputs: defaultTextInputs(),
      options: defaultOptions(),
      materials: []
    }
  );

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

  for (const [key, value] of formData.entries()) {
    if (key === "payload" || !value || !(value instanceof File)) continue;
    if (files.some((f) => f.fileId === key)) continue;

    const buffer = Buffer.from(await value.arrayBuffer());
    files.push({
      fileId: key,
      buffer,
      name: value.name,
      mimeType: value.type,
      size: value.size,
      materialType: "기타"
    });
  }

  if (payload.options.inventionType && !INVENTION_TYPES.includes(payload.options.inventionType)) {
    payload.options.inventionType = "자동 판단";
  }

  return { kind: "materials", payload, files, credentials };
}
