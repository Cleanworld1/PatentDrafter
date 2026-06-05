import { NextResponse } from "next/server";
import { getConfiguredOpenAiScope } from "@/lib/ai/openAiRequestHeaders";
import { OPENAI_MODEL_GROUPS } from "@/lib/ai/openAiModelCatalog";
import {
  getReasoningEffortFromEnv,
  modelSupportsReasoningEffort,
  REASONING_EFFORT_LABELS,
  resolveReasoningEffortForModel
} from "@/lib/ai/openAiCompletionParams";
import {
  getDefaultModelName,
  isDevMockWithoutKeyAllowed,
  isServerOpenAiConfigured
} from "@/lib/ai/resolveOpenAiCredentials";

export const runtime = "nodejs";

export async function GET() {
  const scope = getConfiguredOpenAiScope();
  const serverConfigured = isServerOpenAiConfigured();
  const suggestedModel = getDefaultModelName();
  const configuredReasoningEffort = getReasoningEffortFromEnv() ?? null;
  const activeReasoningEffort = resolveReasoningEffortForModel(suggestedModel) ?? null;

  return NextResponse.json({
    suggestedModel,
    configuredReasoningEffort,
    activeReasoningEffort,
    reasoningEffortSupported: modelSupportsReasoningEffort(suggestedModel),
    reasoningEffortLabels: REASONING_EFFORT_LABELS,
    envProjectConfigured: scope.hasProject,
    envOrganizationConfigured: scope.hasOrganization,
    modelGroups: OPENAI_MODEL_GROUPS,
    serverFallbackAvailable: serverConfigured,
    serverFallbackConfigured: serverConfigured,
    devMockAllowed: isDevMockWithoutKeyAllowed()
  });
}
