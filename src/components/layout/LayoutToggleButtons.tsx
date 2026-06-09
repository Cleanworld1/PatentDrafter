"use client";

import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";

function ProjectsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.05 1.41 1.15H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LayoutToggleButtons() {
  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);
  const sidebarOpen = useResponsiveLayoutStore((s) => s.sidebarOpen);
  const settingsOpen = useResponsiveLayoutStore((s) => s.settingsOpen);
  const toggleSidebar = useResponsiveLayoutStore((s) => s.toggleSidebar);
  const toggleSettings = useResponsiveLayoutStore((s) => s.toggleSettings);

  if (!isCompact) return null;

  return (
    <div className="layout-toggle-group">
      <button
        type="button"
        className={`layout-toggle-btn${sidebarOpen ? " is-active" : ""}`}
        onClick={toggleSidebar}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
      >
        <ProjectsIcon />
        <span>프로젝트</span>
      </button>
      <button
        type="button"
        className={`layout-toggle-btn${settingsOpen ? " is-active" : ""}`}
        onClick={toggleSettings}
        aria-expanded={settingsOpen}
        aria-controls="app-settings-panel"
      >
        <SettingsIcon />
        <span>설정</span>
      </button>
    </div>
  );
}
