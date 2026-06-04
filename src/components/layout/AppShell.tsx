"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { MobileShellBar } from "@/components/layout/MobileShellBar";
import { GeminiConfigLoader } from "@/components/settings/GeminiConfigLoader";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { useMobileShellBodyLock } from "@/lib/client/useMobileShellBodyLock";
import { useMobileShellStore } from "@/store/mobileShellStore";

export function AppShell() {
  useMobileShellBodyLock();

  const sidebarOpen = useMobileShellStore((s) => s.sidebarOpen);
  const settingsOpen = useMobileShellStore((s) => s.settingsOpen);
  const closeAllPanels = useMobileShellStore((s) => s.closeAllPanels);

  const panelOpen = sidebarOpen || settingsOpen;

  return (
    <div
      className={`app-shell${sidebarOpen ? " is-sidebar-open" : ""}${settingsOpen ? " is-settings-open" : ""}`}
    >
      <OpenAiConfigLoader />
      <GeminiConfigLoader />
      <button
        type="button"
        className="mobile-shell-backdrop"
        aria-label="패널 닫기"
        tabIndex={panelOpen ? 0 : -1}
        aria-hidden={!panelOpen}
        onClick={closeAllPanels}
      />
      <Sidebar />
      <div className="app-shell-main">
        <MobileShellBar />
        <MainWorkspace />
      </div>
      <LoadingOverlay />
    </div>
  );
}
