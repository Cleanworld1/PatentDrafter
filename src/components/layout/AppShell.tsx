"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainWorkspace } from "@/components/layout/MainWorkspace";
import { OpenAiConfigLoader } from "@/components/settings/OpenAiConfigLoader";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import type { OpenAiPublicConfig } from "@/lib/ai/getOpenAiPublicConfig";

interface AppShellProps {
  initialOpenAiConfig: OpenAiPublicConfig;
}

export function AppShell({ initialOpenAiConfig }: AppShellProps) {
  return (
    <div className="app-shell">
      <OpenAiConfigLoader initialConfig={initialOpenAiConfig} />
      <Sidebar />
      <MainWorkspace />
      <LoadingOverlay />
    </div>
  );
}
