import { NextResponse } from "next/server";
import { getServerErrorLogs } from "@/lib/diagnostics/serverErrorLog";
import type { DiagnosticsReport, ErrorLogEntry } from "@/lib/diagnostics/types";

export const runtime = "nodejs";

function buildSummary(entries: ErrorLogEntry[]): string[] {
  const lines: string[] = [];
  if (entries.length === 0) {
    lines.push("서버에 기록된 최근 오류가 없습니다.");
    return lines;
  }

  const byContext = new Map<string, number>();
  for (const e of entries) {
    byContext.set(e.context, (byContext.get(e.context) ?? 0) + 1);
  }
  lines.push(`최근 서버 오류 ${entries.length}건`);
  for (const [ctx, n] of byContext) {
    lines.push(`  · ${ctx}: ${n}건`);
  }
  const latest = entries[0];
  if (latest?.hint) lines.push(`최신 추정: ${latest.hint}`);
  return lines;
}

export async function GET() {
  const devUrl = process.env.DEV_URL ?? "http://127.0.0.1:3000/";
  const entries = getServerErrorLogs(40);
  const report: DiagnosticsReport = {
    generatedAt: new Date().toISOString(),
    devUrl,
    serverReachable: true,
    entries,
    summary: buildSummary(entries)
  };
  return NextResponse.json(report);
}

export async function DELETE() {
  const { clearServerErrorLogs } = await import("@/lib/diagnostics/serverErrorLog");
  clearServerErrorLogs();
  return NextResponse.json({ ok: true });
}
