"use client";

import { useMobileShellStore } from "@/store/mobileShellStore";

export function MobileTopBar() {
  const toggleSidebar = useMobileShellStore((s) => s.toggleSidebar);
  const toggleSettings = useMobileShellStore((s) => s.toggleSettings);
  const sidebarOpen = useMobileShellStore((s) => s.sidebarOpen);
  const settingsOpen = useMobileShellStore((s) => s.settingsOpen);

  return (
    <div className="mobile-top-bar">
      <button
        type="button"
        className="mobile-top-bar-btn"
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-label="작업 기록 열기"
      >
        <span className="mobile-top-bar-icon" aria-hidden>
          ☰
        </span>
        <span className="mobile-top-bar-btn-label">기록</span>
      </button>
      <span className="mobile-top-bar-title">Patent Draft AI</span>
      <button
        type="button"
        className="mobile-top-bar-btn"
        onClick={toggleSettings}
        aria-expanded={settingsOpen}
        aria-label="설정·파일·생성 열기"
      >
        <span className="mobile-top-bar-icon" aria-hidden>
          ⚙
        </span>
        <span className="mobile-top-bar-btn-label">설정</span>
      </button>
    </div>
  );
}
