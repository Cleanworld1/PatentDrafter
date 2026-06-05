import "server-only";

import { buildOpenAiUserContentParts } from "@/lib/ai/multimodalRequestBuilder";
import { createMultimodalLlmClientFromResolved } from "@/lib/ai/openaiClient";
import { requireOpenAiCredentials } from "@/lib/ai/resolveOpenAiCredentials";
import { capMultimodalPreparedInputs } from "@/lib/fileInput/capMultimodalInputs";
import type { IncomingMaterialFile } from "@/lib/ai/patentDraftAiService";
import { prepareAllMaterials } from "@/lib/ai/patentDraftAiService";
import { parseJsonWithFallback } from "@/lib/jsonSchema";
import { buildSupplementChatPrompt } from "@/prompts/supplementChat";
import type {
  SupplementChatRequestPayload,
  SupplementChatResponsePayload
} from "@/types/supplementChat";
import type { OpenAiCredentialInput } from "@/types/openAiCredentials";
import type { TextInputs } from "@/types/patentDraft";

const emptyResponse: SupplementChatResponsePayload = {
  reply: "응답을 처리하지 못했습니다. 다시 시도해 주세요.",
  section_updates: []
};

export async function runSupplementChat(
  payload: SupplementChatRequestPayload,
  userMessage: string,
  files: IncomingMaterialFile[],
  credentials?: OpenAiCredentialInput
): Promise<SupplementChatResponsePayload> {
  const resolved = requireOpenAiCredentials(credentials);
  const client = createMultimodalLlmClientFromResolved(resolved);

  const prepared = await capMultimodalPreparedInputs(await prepareAllMaterials(files));
  const prompt = buildSupplementChatPrompt(payload, userMessage);

  const textInputs: TextInputs = {
    overview: "",
    coreIdea: "",
    existingProblems: "",
    differentiators: "",
    embodimentNotes: "",
    otherNotes: userMessage
  };

  const parts = buildOpenAiUserContentParts(
    prompt,
    payload.projectName,
    textInputs,
    prepared
  );

  const raw = await client.generateJsonFromParts(parts);
  const { data } = parseJsonWithFallback<SupplementChatResponsePayload>(raw, emptyResponse);

  return {
    reply: typeof data.reply === "string" ? data.reply.trim() : emptyResponse.reply,
    section_updates: Array.isArray(data.section_updates) ? data.section_updates : []
  };
}
