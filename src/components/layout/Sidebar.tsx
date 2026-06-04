"use client";

import { HistoryList } from "@/components/history/HistoryList";
import { NewDraftButton } from "@/components/history/NewDraftButton";
import { useMobileShellStore } from "@/store/mobileShellStore";
import { useSessionApiKeyStore } from "@/store/sessionApiKeyStore";

export function Sidebar() {
  const sidebarOpen = useMobileShellStore((s) => s.sidebarOpen);
  const serverFallbackAvailable = useSessionApiKeyStore((s) => s.serverFallbackAvailable);
  const devMockAllowed = useSessionApiKeyStore((s) => s.devMockAllowed);
  const configLoaded = useSessionApiKeyStore((s) => s.configLoaded);
  const configError = useSessionApiKeyStore((s) => s.configError);

  const statusLabel = !configLoaded
    ? "OpenAI · 확인 중"
    : configError
      ? "OpenAI · 설정 오류"
      : serverFallbackAvailable
        ? "OpenAI · 서버 연결"
        : devMockAllowed
          ? "OpenAI · 개발 mock"
          : "OpenAI · 미설정";

  return (
    <aside className={`sidebar${sidebarOpen ? " is-open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">Patent Draft AI</div>
        <p className="sidebar-subtitle">특허명세서 자동작성</p>
      </div>
      <NewDraftButton />
      <HistoryList />
      <div className="sidebar-footer">
        <p
          className={`sidebar-footer-status ${
            !configLoaded || configError
              ? "pending"
              : serverFallbackAvailable || devMockAllowed
                ? "ok"
                : "warn"
          }`}
        >
          {statusLabel}
        </p>
      </div>
    </aside>
  );
}
