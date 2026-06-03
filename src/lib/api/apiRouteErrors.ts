import { NextResponse } from "next/server";
import { OpenAiKeyRequiredError } from "@/lib/ai/resolveOpenAiCredentials";
import { sanitizeErrorMessage } from "@/lib/ai/sanitizeAiError";

export function apiErrorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof OpenAiKeyRequiredError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
  return NextResponse.json(
    { error: sanitizeErrorMessage(error) || fallback },
    { status: 500 }
  );
}
