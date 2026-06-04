"use client";

import { useMobileShellStore } from "@/store/mobileShellStore";

export function MobileShellBar() {
  const toggleSidebar = useMobileShellStore((s) => s.toggleSidebar);
  const toggleSettings = useMobileShellStore((s) => s.toggleSettings);

  return (
    <div className="mobile-shell-bar" role="toolbar" aria-label="모바일 메뉴">
      <button
        type="button"
        className="mobile-shell-bar-btn"
        onClick={toggleSidebar}
        aria-label="작업 기록 열기"
      >
        <span className="mobile-shell-bar-icon" aria-hidden>
          ☰
        </span>
        <span className="mobile-shell-bar-label">기록</span>
      </button>
      <span className="mobile-shell-bar-title">Patent Draft AI</span>
      <button
        type="button"
        className="mobile-shell-bar-btn"
        onClick={toggleSettings}
        aria-label="설정·업로드 열기"
      >
        <span className="mobile-shell-bar-icon" aria-hidden>
          ⚙
        </span>
        <span className="mobile-shell-bar-label">설정</span>
      </button>
    </div>
  );
}
