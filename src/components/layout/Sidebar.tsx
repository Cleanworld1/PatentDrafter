"use client";

import { useEffect } from "react";
import { HistoryList } from "@/components/history/HistoryList";
import { NewDraftButton } from "@/components/history/NewDraftButton";
import { FALLBACK_DEFAULT_MODEL } from "@/lib/ai/openAiModelCatalog";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function Sidebar() {
  const setServerConfig = useSessionApiKeyStore((s) => s.setServerConfig);
  const serverFallbackAvailable = useSessionApiKeyStore((s) => s.serverFallbackAvailable);
  const devMockAllowed = useSessionApiKeyStore((s) => s.devMockAllowed);

  useEffect(() => {
    void fetch("/api/openai/config")
      .then((r) => r.json())
      .then(
        (data: {
          suggestedModel?: string;
          serverFallbackAvailable?: boolean;
          devMockAllowed?: boolean;
        }) => {
          setServerConfig({
            suggestedModel: data.suggestedModel ?? FALLBACK_DEFAULT_MODEL,
            serverFallbackAvailable: Boolean(data.serverFallbackAvailable),
            devMockAllowed: Boolean(data.devMockAllowed)
          });
        }
      )
      .catch(() => undefined);
  }, [setServerConfig]);

  const statusLabel = serverFallbackAvailable
    ? "OpenAI · 서버 연결"
    : devMockAllowed
      ? "OpenAI · 개발 mock"
      : "OpenAI · 미설정";

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Patent Draft AI</div>
        <p className="sidebar-subtitle">특허명세서 자동작성</p>
      </div>
      <NewDraftButton />
      <HistoryList />
      <div className="sidebar-footer">
        <p className={`sidebar-footer-status ${serverFallbackAvailable || devMockAllowed ? "ok" : "warn"}`}>
          {statusLabel}
        </p>
      </div>
    </aside>
  );
}
