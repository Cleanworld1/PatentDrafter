import { buildOpenAiUserContentParts } from "@/lib/ai/multimodalRequestBuilder";
import { createMultimodalLlmClientFromResolved } from "@/lib/ai/openaiClient";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { prepareAiFileInput, type PrepareFileOptions } from "@/lib/fileInput/prepareAiFileInput";
import type { AnalyzeMaterialsPayload, PreparedAiInput } from "@/lib/fileInput/fileInputTypes";
import { buildAnalyzeInventionPrompt } from "@/prompts/analyzeInvention";
import { emptyInventionAnalysis, normalizeInventionAnalysis, parseJsonWithFallback } from "@/lib/jsonSchema";
import type { InventionAnalysis, InventionInput } from "@/types/patentDraft";
import { materialTypeToSourceType } from "@/lib/fileInput/fileInputTypes";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";

export interface IncomingMaterialFile {
  fileId: string;
  buffer: Buffer;
  name: string;
  mimeType: string;
  size: number;
  materialType: import("@/types/patentDraft").MaterialType;
}

export async function prepareAllMaterials(
  files: IncomingMaterialFile[]
): Promise<PreparedAiInput[]> {
  const results: PreparedAiInput[] = [];
  for (const file of files) {
    const opts: PrepareFileOptions = {
      fileId: file.fileId,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      sourceType: materialTypeToSourceType(file.materialType)
    };
    results.push(await prepareAiFileInput(file.buffer, opts));
  }
  return results;
}

export function buildLegacyInventionInput(
  payload: AnalyzeMaterialsPayload,
  prepared: PreparedAiInput[]
): InventionInput {
  const attachmentParts = prepared.map((p) => {
    const body =
      p.fallbackUsed && p.fallbackText
        ? `[fallback] ${p.fallbackText}`
        : `[${p.aiInputMode} 원본 분석] ${p.analysisNotes}`;
    return `[${p.sourceType}] ${p.name}\n${body}`;
  });

  const textParts = [
    payload.userTextInputs.overview && `발명 개요: ${payload.userTextInputs.overview}`,
    payload.userTextInputs.coreIdea && `핵심 아이디어: ${payload.userTextInputs.coreIdea}`,
    payload.userTextInputs.existingProblems && `기존 문제점: ${payload.userTextInputs.existingProblems}`,
    payload.userTextInputs.differentiators && `차별점: ${payload.userTextInputs.differentiators}`,
    payload.userTextInputs.embodimentNotes && `실시예 메모: ${payload.userTextInputs.embodimentNotes}`,
    payload.userTextInputs.otherNotes && `기타: ${payload.userTextInputs.otherNotes}`
  ].filter(Boolean);

  return {
    projectName: payload.projectName,
    inventionContent: textParts.join("\n\n"),
    attachmentText: attachmentParts.join("\n\n"),
    materialType: payload.materials[0]?.materialType ?? "발명제안서",
    desiredClaimCount: payload.options.claimCount,
    desiredDrawingCount: payload.options.drawingCount,
    inventionType: payload.options.inventionType,
    inventionMakingEnabled: payload.options.inventionMakingEnabled ?? false
  };
}

export async function analyzeMaterialsWithAi(
  payload: AnalyzeMaterialsPayload,
  files: IncomingMaterialFile[],
  credentials?: OpenAiCredentialInput
): Promise<{ analysis: InventionAnalysis; prepared: PreparedAiInput[] }> {
  const prepared = await prepareAllMaterials(files);
  const legacyInput = buildLegacyInventionInput(payload, prepared);
  const prompt = buildAnalyzeInventionPrompt(legacyInput, prepared);
  const resolved = requireOpenAiCredentials(credentials);
  const client = createMultimodalLlmClientFromResolved(resolved);
  const parts = buildOpenAiUserContentParts(
    prompt,
    payload.projectName,
    payload.userTextInputs,
    prepared
  );
  const raw = await client.generateJsonFromParts(parts);
  const { data: parsed } = parseJsonWithFallback<InventionAnalysis>(raw, emptyInventionAnalysis);
  return { analysis: normalizeInventionAnalysis(parsed), prepared };
}
