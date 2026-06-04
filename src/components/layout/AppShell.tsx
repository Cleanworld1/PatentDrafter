"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { GeminiConfigLoader } from "@/components/settings/GeminiConfigLoader";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

export function AppShell() {
  return (
    <div className="app-shell">
      <OpenAiConfigLoader />
      <GeminiConfigLoader />
      <Sidebar />
      <MainWorkspace />
      <LoadingOverlay />
    </div>
  );
}
