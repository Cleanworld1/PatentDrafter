import { NextResponse } from "next/server";
import { getConfiguredOpenAiScope } from "@/lib/ai/openAiRequestHeaders";
import { OPENAI_MODEL_GROUPS } from "@/lib/ai/openAiModelCatalog";
import { getVercelAnalyzeDeploymentHints } from "@/lib/ai/analyzeTimeout";
import {
  getDefaultModelName,
  isDevMockWithoutKeyAllowed,
  isServerOpenAiConfigured
} from "@/lib/ai/resolveOpenAiCredentials";

export const runtime = "nodejs";

export async function GET() {
  const scope = getConfiguredOpenAiScope();
  const serverConfigured = isServerOpenAiConfigured();
  const vercel = getVercelAnalyzeDeploymentHints();

  return NextResponse.json({
    suggestedModel: getDefaultModelName(),
    envProjectConfigured: scope.hasProject,
    envOrganizationConfigured: scope.hasOrganization,
    modelGroups: OPENAI_MODEL_GROUPS,
    serverFallbackAvailable: serverConfigured,
    serverFallbackConfigured: serverConfigured,
    devMockAllowed: isDevMockWithoutKeyAllowed(),
    hostedOnVercel: vercel.hostedOnVercel,
    analyzeTimeoutMs: vercel.analyzeTimeoutMs,
    needsProTimeoutEnv: vercel.needsProTimeoutEnv,
    proTimeoutEnvExample: vercel.proTimeoutEnvExample
  });
}
