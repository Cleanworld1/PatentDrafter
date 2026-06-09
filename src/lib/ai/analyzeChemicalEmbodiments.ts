import { buildOpenAiUserContentParts } from "@/lib/ai/multimodalRequestBuilder";
import { createMultimodalLlmClientFromResolved } from "@/lib/ai/openaiClient";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { capMultimodalPreparedInputs } from "@/lib/fileInput/capMultimodalInputs";
import type { IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";
import { prepareAllMaterials } from "@/lib/ai/patentDraftAiService";
import { buildChemicalEmbodimentFromAnalysis } from "@/lib/contentAwareChemicalEmbodiment";
import type { AnalyzeMaterialsPayload } from "@/lib/fileInput/fileInputTypes";
import { parseJsonWithFallback } from "@/lib/jsonSchema";
import { normalizeChemicalEmbodimentAnalysis } from "@/lib/jsonSchema";
import { buildAnalyzeChemicalEmbodimentsPrompt } from "@/prompts/analyzeChemicalEmbodiments";
import type { ChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import { emptyChemicalEmbodimentAnalysis } from "@/types/chemicalEmbodimentAnalysis";
import type { InventionAnalysis, TextInputs } from "@/types/patentDraft";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";
import type { PreparedAiInput } from "@/lib/fileInput/fileInputTypes";

export interface AnalyzeChemicalEmbodimentsPayload extends AnalyzeMaterialsPayload {
  invention_analysis: InventionAnalysis;
}

export async function analyzeChemicalEmbodimentsWithAi(
  payload: AnalyzeChemicalEmbodimentsPayload,
  files: IncomingMaterialFile[],
  credentials?: OpenAiCredentialInput
): Promise<{ result: ChemicalEmbodimentAnalysis; prepared: PreparedAiInput[] }> {
  const resolved = requireOpenAiCredentials(credentials);
  const client = createMultimodalLlmClientFromResolved(resolved);
  const prepared = await prepareAllMaterials(files);
  const preparedForApi = await capMultimodalPreparedInputs(prepared);
  const prompt = buildAnalyzeChemicalEmbodimentsPrompt(
    payload.invention_analysis,
    preparedForApi,
    payload
  );

  const textInputs: TextInputs = {
    overview: payload.userTextInputs.overview,
    coreIdea: payload.userTextInputs.coreIdea,
    existingProblems: payload.userTextInputs.existingProblems,
    differentiators: payload.userTextInputs.differentiators,
    embodimentNotes: payload.userTextInputs.embodimentNotes,
    otherNotes: payload.userTextInputs.otherNotes
  };

  const parts = buildOpenAiUserContentParts(
    prompt,
    payload.projectName,
    textInputs,
    preparedForApi,
    { chemicalInventionEnabled: true }
  );
  const raw = await client.generateJsonFromParts(parts, "analyze");
  const { data } = parseJsonWithFallback<ChemicalEmbodimentAnalysis>(
    raw,
    emptyChemicalEmbodimentAnalysis()
  );
  return {
    result: normalizeChemicalEmbodimentAnalysis(data),
    prepared: preparedForApi
  };
}

export async function analyzeChemicalEmbodimentsOrMock(
  payload: AnalyzeChemicalEmbodimentsPayload,
  files: IncomingMaterialFile[],
  credentials?: OpenAiCredentialInput,
  useDevMock?: boolean
): Promise<ChemicalEmbodimentAnalysis> {
  if (useDevMock) {
    return buildChemicalEmbodimentFromAnalysis(payload.invention_analysis);
  }
  const { result } = await analyzeChemicalEmbodimentsWithAi(payload, files, credentials);
  return result;
}
