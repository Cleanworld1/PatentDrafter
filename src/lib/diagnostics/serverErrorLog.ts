import "server-only";

import { inferErrorHint } from "@/lib/diagnostics/analyzeErrorHint";
import type { ErrorLogEntry } from "@/lib/diagnostics/types";
import { redactApiKeys } from "@/lib/ai/sanitizeAiError";

const MAX_ENTRIES = 80;
const entries: ErrorLogEntry[] = [];

function newId(): string {
  return `srv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function recordServerError(
  context: string,
  error: unknown,
  meta?: Record<string, string | number | boolean>
): void {
  const message = redactApiKeys(
    error instanceof Error ? error.message : String(error ?? "unknown error")
  );
  const stack =
    error instanceof Error && error.stack
      ? redactApiKeys(error.stack).slice(0, 2000)
      : undefined;

  const entry: ErrorLogEntry = {
    id: newId(),
    at: new Date().toISOString(),
    source: "server",
    context,
    message,
    stack,
    meta,
    hint: inferErrorHint(message, context)
  };

  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;

  console.error(`[PatentDrafter][${context}]`, message, meta ?? "");
  if (stack) console.error(stack);
}

export function getServerErrorLogs(limit = 30): ErrorLogEntry[] {
  return entries.slice(0, limit);
}

export function clearServerErrorLogs(): void {
  entries.length = 0;
}
