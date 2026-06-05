"use client";

import { inferErrorHint } from "@/lib/diagnostics/analyzeErrorHint";
import type { ErrorLogEntry } from "@/lib/diagnostics/types";

const STORAGE_KEY = "patent-drafter-error-log";
const MAX_ENTRIES = 40;

function newId(): string {
  return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): ErrorLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ErrorLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: ErrorLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    // quota exceeded — drop oldest half
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, Math.floor(MAX_ENTRIES / 2))));
  }
}

export function recordClientError(
  context: string,
  error: unknown,
  meta?: Record<string, string | number | boolean>
): void {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "알 수 없는 오류";

  const entry: ErrorLogEntry = {
    id: newId(),
    at: new Date().toISOString(),
    source: "client",
    context,
    message,
    stack: error instanceof Error ? error.stack?.slice(0, 2000) : undefined,
    meta,
    hint: inferErrorHint(message, context)
  };

  const next = [entry, ...readAll()].slice(0, MAX_ENTRIES);
  writeAll(next);

  if (process.env.NODE_ENV === "development") {
    console.warn(`[PatentDrafter][client][${context}]`, message, meta ?? "");
  }
}

export function getClientErrorLogs(): ErrorLogEntry[] {
  return readAll();
}

export function clearClientErrorLogs(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

export function exportErrorLogsAsText(): string {
  const client = getClientErrorLogs();
  const lines = [
    `# Patent Drafter — 오류 로그 (${new Date().toISOString()})`,
    "",
    "## 클라이언트",
    ...(client.length
      ? client.flatMap((e) => [
          `### ${e.at} — ${e.context}`,
          e.message,
          e.hint ? `힌트: ${e.hint}` : "",
          e.meta ? `meta: ${JSON.stringify(e.meta)}` : "",
          e.stack ? "```\n" + e.stack + "\n```" : "",
          ""
        ])
      : ["(없음)", ""])
  ];
  return lines.join("\n");
}
