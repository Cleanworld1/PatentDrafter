import { NextResponse } from "next/server";
import { isAnalyzeTimeoutError } from "@/lib/ai/analyzeTimeout";
import { FetchTimeoutError } from "@/lib/ai/fetchWithTimeout";
import { OpenAiKeyRequiredError } from "@/lib/ai/resolveOpenAiCredentials";
import { sanitizeErrorMessage } from "@/lib/ai/sanitizeAiError";

export function apiErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof OpenAiKeyRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  const message =
    error instanceof FetchTimeoutError
      ? error.message
      : sanitizeErrorMessage(error) || fallback;
  if (error instanceof FetchTimeoutError || isAnalyzeTimeoutError(message)) {
    return NextResponse.json({ error: message, code: "ANALYZE_TIMEOUT" }, { status: 504 });
  }
  return NextResponse.json({ error: message }, { status: 500 });
}
