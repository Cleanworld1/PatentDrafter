import { NextResponse } from "next/server";
import { OpenAiKeyRequiredError } from "@/lib/ai/resolveOpenAiCredentials";
import { sanitizeErrorMessage } from "@/lib/ai/sanitizeAiError";
import { recordServerError } from "@/lib/diagnostics/serverErrorLog";

export function apiErrorResponse(
  error: unknown,
  fallback: string,
  context = "api"
): NextResponse {
  recordServerError(context, error);
  if (error instanceof OpenAiKeyRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json(
    { error: sanitizeErrorMessage(error) || fallback },
    { status: 500 }
  );
}
