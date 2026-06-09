"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import { GuidedDraftBanner } from "@/components/ui/GuidedDraftBanner";
import { useResponsiveLayout } from "@/lib/client/useResponsiveLayout";
import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";

export function AppShell() {
  useResponsiveLayout();

  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);
  const sidebarOpen = useResponsiveLayoutStore((s) => s.sidebarOpen);
  const settingsOpen = useResponsiveLayoutStore((s) => s.settingsOpen);
  const closePanels = useResponsiveLayoutStore((s) => s.closePanels);

  const shellClass = [
    "app-shell",
    isCompact && "app-shell--compact",
    sidebarOpen && "app-shell--sidebar-open",
    settingsOpen && "app-shell--settings-open"
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      <OpenAiConfigLoader />
      {isCompact && (sidebarOpen || settingsOpen) && (
        <button
          type="button"
          className="layout-overlay"
          aria-label="패널 닫기"
          onClick={closePanels}
        />
      )}
      <Sidebar />
      <MainWorkspace />
      <GuidedDraftBanner />
      <LoadingOverlay />
    </div>
  );
}
