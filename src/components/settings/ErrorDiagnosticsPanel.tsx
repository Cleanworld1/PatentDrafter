"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearClientErrorLogs,
  exportErrorLogsAsText,
  getClientErrorLogs,
  recordClientError
} from "@/lib/client/appErrorLog";
import type { DiagnosticsReport, ErrorLogEntry } from "@/lib/diagnostics/types";
import { usePatentDraftStore } from "@/store/patentDraftStore";

function mergeEntries(client: ErrorLogEntry[], server: ErrorLogEntry[]): ErrorLogEntry[] {
  return [...client, ...server].sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 50);
}

export function ErrorDiagnosticsPanel() {
  const uiError = usePatentDraftStore((s) => s.error);
  const loadingStage = usePatentDraftStore((s) => s.loadingStage);
  const fileCount = usePatentDraftStore((s) => s.uploadedFiles.length);

  const [open, setOpen] = useState(false);
  const [serverReport, setServerReport] = useState<DiagnosticsReport | null>(null);
  const [loadError, setLoadError] = useState("");
  const [copied, setCopied] = useState(false);
  const [clientLogs, setClientLogs] = useState<ErrorLogEntry[]>([]);

  const refresh = useCallback(async () => {
    setClientLogs(getClientErrorLogs());
    setLoadError("");
    try {
      const res = await fetch("/api/diagnostics");
      if (!res.ok) {
        throw new Error(`진단 API HTTP ${res.status}`);
      }
      setServerReport((await res.json()) as DiagnosticsReport);
    } catch (err) {
      recordClientError("diagnostics.fetch", err);
      setLoadError("서버 진단 로그를 불러오지 못했습니다. dev 서버 실행 여부를 확인하세요.");
      setServerReport(null);
    }
  }, []);

  useEffect(() => {
    if (uiError) {
      recordClientError(loadingStage ? `ui.${loadingStage}` : "ui.error", uiError, {
        fileCount
      });
      setClientLogs(getClientErrorLogs());
    }
  }, [uiError, loadingStage, fileCount]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  const merged = mergeEntries(clientLogs, serverReport?.entries ?? []);

  const copyAll = async () => {
    const text = [
      exportErrorLogsAsText(),
      "",
      "## 서버 (최근)",
      ...(serverReport?.entries.length
        ? serverReport.entries.flatMap((e) => [
            `### ${e.at} — ${e.context}`,
            e.message,
            e.hint ? `힌트: ${e.hint}` : "",
            ""
          ])
        : ["(없음)"]),
      "",
      "## 요약",
      ...(serverReport?.summary ?? ["서버 미연결"])
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="settings-card diagnostics-card">
      <button
        type="button"
        className="diagnostics-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? "▼" : "▶"} 오류 진단 로그
      </button>

      {open && (
        <div className="diagnostics-body">
          <p className="settings-card-hint">
            클라이언트·서버에 쌓인 최근 오류입니다. 「발명 분석」 실패 시 여기서 원인 힌트를 확인하세요.
          </p>
          {uiError && (
            <div className="diagnostics-current-error" role="alert">
              <strong>현재 화면 오류</strong>
              <p>{uiError}</p>
            </div>
          )}
          {loadError && <p className="upload-error">{loadError}</p>}
          {serverReport?.summary.map((line) => (
            <p key={line} className="diagnostics-summary-line">
              {line}
            </p>
          ))}
          <div className="diagnostics-actions">
            <button type="button" className="btn-secondary btn-secondary--small" onClick={() => void refresh()}>
              새로고침
            </button>
            <button type="button" className="btn-secondary btn-secondary--small" onClick={() => void copyAll()}>
              {copied ? "복사됨" : "로그 복사"}
            </button>
            <button
              type="button"
              className="btn-secondary btn-secondary--small"
              onClick={() => {
                clearClientErrorLogs();
                setClientLogs([]);
              }}
            >
              클라이언트 로그 지우기
            </button>
          </div>
          <ul className="diagnostics-log-list">
            {merged.length === 0 ? (
              <li className="diagnostics-log-empty">기록된 오류가 없습니다.</li>
            ) : (
              merged.map((e) => (
                <li key={e.id} className={`diagnostics-log-item diagnostics-log-item--${e.source}`}>
                  <span className="diagnostics-log-meta">
                    {e.source === "client" ? "클라이언트" : "서버"} · {e.context} ·{" "}
                    {new Date(e.at).toLocaleString("ko-KR")}
                  </span>
                  <p className="diagnostics-log-message">{e.message}</p>
                  {e.hint && <p className="diagnostics-log-hint">{e.hint}</p>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
