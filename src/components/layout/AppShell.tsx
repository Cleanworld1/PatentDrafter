"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function AppShell() {
  return (
    <div className="app-shell">
      <OpenAiConfigLoader />
      <Sidebar />
      <MainWorkspace />
      <LoadingOverlay />
    </div>
  );
}
