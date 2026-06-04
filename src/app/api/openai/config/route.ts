import { NextResponse } from "next/server";
import { getConfiguredOpenAiScope } from "@/lib/ai/openAiRequestHeaders";
import { OPENAI_MODEL_GROUPS } from "@/lib/ai/openAiModelCatalog";
import {
  getDefaultModelName,
  isDevMockWithoutKeyAllowed,
  isServerOpenAiConfigured
} from "@/lib/ai/resolveOpenAiCredentials";

export const runtime = "nodejs";

export async function GET() {
  const scope = getConfiguredOpenAiScope();
  const serverConfigured = isServerOpenAiConfigured();
  return NextResponse.json({
    suggestedModel: getDefaultModelName(),
    envProjectConfigured: scope.hasProject,
    envOrganizationConfigured: scope.hasOrganization,
    modelGroups: OPENAI_MODEL_GROUPS,
    serverFallbackAvailable: serverConfigured,
    serverFallbackConfigured: serverConfigured,
    devMockAllowed: isDevMockWithoutKeyAllowed()
  });
}
