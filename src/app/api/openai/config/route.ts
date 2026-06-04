import { NextResponse } from "next/server";
import { getOpenAiPublicConfig } from "@/lib/ai/getOpenAiPublicConfig";
import { OPENAI_MODEL_GROUPS } from "@/lib/ai/openAiModelCatalog";
import { isServerOpenAiConfigured } from "@/lib/ai/resolveOpenAiCredentials";

export const runtime = "nodejs";

export async function GET() {
  const publicConfig = getOpenAiPublicConfig();
  const serverConfigured = isServerOpenAiConfigured();
  return NextResponse.json({
    ...publicConfig,
    modelGroups: OPENAI_MODEL_GROUPS,
    serverFallbackConfigured: serverConfigured
  });
}
