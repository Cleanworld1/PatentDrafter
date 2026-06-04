"use client";

import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { MobileShellBackdrop } from "@/components/layout/MobileShellBackdrop";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { GeminiConfigLoader } from "@/components/settings/GeminiConfigLoader";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function AppShell() {
  return (
    <div className="app-shell">
      <OpenAiConfigLoader />
      <GeminiConfigLoader />
      <MobileShellBackdrop />
      <Sidebar />
      <div className="app-shell-main">
        <MobileTopBar />
        <MainWorkspace />
      </div>
      <LoadingOverlay />
    </div>
  );
}
