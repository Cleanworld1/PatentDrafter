import {
  createMultimodalLlmClientFromResolved,
  type MultimodalLlmClient
} from "@/lib/ai/openaiClient";
import {
  OpenAiKeyRequiredError,
  requireOpenAiCredentials,
  resolveOpenAiCredentials
} from "@/lib/ai/resolveOpenAiCredentials";
import type { OpenAiCredentialInput, ResolvedOpenAiCredentials } from "@/types/openAiCredentials";

export { OpenAiKeyRequiredError };

export function createOpenAiMultimodalClient(
  input?: OpenAiCredentialInput
): MultimodalLlmClient {
  const resolved = requireOpenAiCredentials(input);
  return createMultimodalLlmClientFromResolved(resolved);
}

export function tryResolveOpenAiCredentials(
  input?: OpenAiCredentialInput
): ResolvedOpenAiCredentials | null {
  return resolveOpenAiCredentials(input);
}
